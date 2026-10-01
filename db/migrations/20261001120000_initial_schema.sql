-- Vunds initial schema.
--
-- Source of truth: docs/financial-logic.md and docs/product-spec.md.
--
-- Money is stored as NUMERIC(18,2). Currency defaults to IDR. Transaction
-- amounts are always positive; direction is derived from `type`.
--
-- account_id / counter_account_id convention on transactions:
--   income   | expense | refund          -> account_id set,   counter NULL
--   transfer | credit_card_payment       -> account_id = FROM, counter = TO
--   fund_allocation                      -> both NULL (fund movement only)

create extension if not exists "pgcrypto";
create extension if not exists "moddatetime";

-- =========================================================================
-- Auth schema
--
-- We own the users table. Auth.js (Google OAuth) upserts rows here from a
-- JWT sign-in callback. We deliberately do NOT use Auth.js's built-in PG
-- adapter tables, which would collide with our financial `accounts` table
-- in `public` and lock us into Auth.js's schema.
-- =========================================================================

create schema if not exists auth;

create table auth.users (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  name           text,
  image          text,
  email_verified timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger set_updated_at before update on auth.users
  for each row execute function moddatetime(updated_at);

-- =========================================================================
-- Enums
-- =========================================================================

create type account_type as enum ('debit', 'cash', 'credit');

create type transaction_type as enum (
  'income',
  'expense',
  'transfer',
  'credit_card_payment',
  'fund_allocation',
  'refund'
);

create type transaction_status as enum (
  'pending',
  'confirmed',
  'rejected',
  'reversed',
  'refunded'
);

create type import_source as enum ('manual', 'gmail');

create type parse_status as enum ('parsed', 'partial', 'unknown', 'failed');

-- =========================================================================
-- Households and members
-- =========================================================================

create table households (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  base_currency text not null default 'IDR',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table household_members (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  display_name  text not null,
  role          text not null default 'member' check (role in ('owner', 'member')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (household_id, user_id)
);

create index household_members_user_idx on household_members(user_id);

-- =========================================================================
-- Accounts
--
-- Debit / cash accounts: opening_balance is the starting cash amount.
-- Credit accounts: opening_balance represents opening outstanding liability
-- (typically 0 for a new card). credit_limit is the card's total limit.
-- =========================================================================

create table accounts (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references households(id) on delete cascade,
  owner_member_id   uuid references household_members(id) on delete set null,
  name              text not null,
  type              account_type not null,
  currency          text not null default 'IDR',
  opening_balance   numeric(18,2) not null default 0,
  credit_limit      numeric(18,2),
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint accounts_credit_limit_only_on_credit
    check (
      (type = 'credit' and credit_limit is not null and credit_limit > 0)
      or (type <> 'credit' and credit_limit is null)
    )
);

create index accounts_household_idx on accounts(household_id);
create index accounts_owner_idx on accounts(owner_member_id);

-- =========================================================================
-- Categories (self-referential parent_id gives top-level + subcategory)
--
-- kind = 'income' or 'expense'. Refund uses expense categories.
-- =========================================================================

create table categories (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  parent_id     uuid references categories(id) on delete cascade,
  name          text not null,
  kind          text not null check (kind in ('income', 'expense')),
  sort_order    integer not null default 0,
  is_archived   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (household_id, parent_id, name)
);

create index categories_household_idx on categories(household_id);
create index categories_parent_idx on categories(parent_id);

-- =========================================================================
-- Funds (virtual allocations / goals)
-- =========================================================================

create table funds (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  name          text not null,
  target_amount numeric(18,2),
  currency      text not null default 'IDR',
  is_archived   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (household_id, name)
);

create index funds_household_idx on funds(household_id);

-- =========================================================================
-- Budgets (planned monthly spending per category)
-- =========================================================================

create table budgets (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  category_id   uuid not null references categories(id) on delete cascade,
  period_year   integer not null check (period_year between 2000 and 2100),
  period_month  integer not null check (period_month between 1 and 12),
  amount        numeric(18,2) not null check (amount >= 0),
  currency      text not null default 'IDR',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (household_id, category_id, period_year, period_month)
);

create index budgets_household_period_idx
  on budgets(household_id, period_year, period_month);

-- =========================================================================
-- Imported messages (Gmail + future providers)
--
-- Deduplication anchor. One row per external message, regardless of whether
-- a transaction was ultimately created. Idempotency: (household_id, source,
-- source_message_id) is unique.
-- =========================================================================

create table imported_messages (
  id                uuid primary key default gen_random_uuid(),
  household_id      uuid not null references households(id) on delete cascade,
  source            import_source not null,
  source_message_id text not null,
  provider          text,
  parse_status      parse_status not null default 'unknown',
  parsed_at         timestamptz,
  raw_metadata      jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (household_id, source, source_message_id)
);

create index imported_messages_household_idx on imported_messages(household_id);
create index imported_messages_status_idx on imported_messages(parse_status);

-- =========================================================================
-- Transactions
--
-- Every real-world financial event is exactly one row here.
-- CHECK constraint enforces per-type field requirements.
-- =========================================================================

create table transactions (
  id                        uuid primary key default gen_random_uuid(),
  household_id              uuid not null references households(id) on delete cascade,
  created_by_member_id      uuid references household_members(id) on delete set null,
  type                      transaction_type not null,
  status                    transaction_status not null default 'confirmed',
  amount                    numeric(18,2) not null check (amount > 0),
  currency                  text not null default 'IDR',
  transaction_date          date not null,
  note                      text,
  merchant                  text,

  -- account roles
  account_id                uuid references accounts(id) on delete restrict,
  counter_account_id        uuid references accounts(id) on delete restrict,

  -- categorization
  category_id               uuid references categories(id) on delete set null,

  -- fund attachment / movement
  fund_id                   uuid references funds(id) on delete set null,
  counter_fund_id           uuid references funds(id) on delete set null,

  -- refund back-reference
  refund_of_transaction_id  uuid references transactions(id) on delete set null,

  -- import provenance
  imported_message_id       uuid references imported_messages(id) on delete set null,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  -- Per-type invariants. Keeps callers honest and enforces the semantics in
  -- docs/financial-logic.md at the database level.
  constraint transactions_type_shape check (
    (
      type = 'income'
      and account_id is not null
      and counter_account_id is null
      and category_id is not null
      and fund_id is null
      and counter_fund_id is null
      and refund_of_transaction_id is null
    )
    or (
      type = 'expense'
      and account_id is not null
      and counter_account_id is null
      and category_id is not null
      and counter_fund_id is null
      and refund_of_transaction_id is null
    )
    or (
      type = 'transfer'
      and account_id is not null
      and counter_account_id is not null
      and account_id <> counter_account_id
      and category_id is null
      and fund_id is null
      and counter_fund_id is null
      and refund_of_transaction_id is null
    )
    or (
      type = 'credit_card_payment'
      and account_id is not null
      and counter_account_id is not null
      and account_id <> counter_account_id
      and category_id is null
      and fund_id is null
      and counter_fund_id is null
      and refund_of_transaction_id is null
    )
    or (
      type = 'fund_allocation'
      and account_id is null
      and counter_account_id is null
      and category_id is null
      and (fund_id is not null or counter_fund_id is not null)
      and (fund_id is null or counter_fund_id is null or fund_id <> counter_fund_id)
      and refund_of_transaction_id is null
    )
    or (
      type = 'refund'
      and account_id is not null
      and counter_account_id is null
      and refund_of_transaction_id is not null
      and counter_fund_id is null
    )
  )
);

create index transactions_household_date_idx
  on transactions(household_id, transaction_date desc);

create index transactions_household_status_idx
  on transactions(household_id, status);

create index transactions_household_type_idx
  on transactions(household_id, type);

create index transactions_account_idx on transactions(account_id);
create index transactions_counter_account_idx on transactions(counter_account_id);
create index transactions_category_idx on transactions(category_id);
create index transactions_fund_idx on transactions(fund_id);
create index transactions_counter_fund_idx on transactions(counter_fund_id);
create index transactions_refund_of_idx on transactions(refund_of_transaction_id);
create index transactions_imported_message_idx on transactions(imported_message_id);

-- =========================================================================
-- Merchant categorization rules
--
-- Rule-based categorization per docs/gmail-integration.md. User confirmations
-- can create or refine rules via `created_from_transaction_id`.
-- =========================================================================

create table merchant_rules (
  id                          uuid primary key default gen_random_uuid(),
  household_id                uuid not null references households(id) on delete cascade,
  pattern                     text not null,
  match_type                  text not null default 'contains'
                              check (match_type in ('exact', 'contains', 'regex')),
  category_id                 uuid references categories(id) on delete set null,
  priority                    integer not null default 100,
  created_from_transaction_id uuid references transactions(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (household_id, pattern, match_type)
);

create index merchant_rules_household_priority_idx
  on merchant_rules(household_id, priority);

-- =========================================================================
-- updated_at triggers (moddatetime extension)
-- =========================================================================

create trigger set_updated_at before update on households
  for each row execute function moddatetime(updated_at);
create trigger set_updated_at before update on household_members
  for each row execute function moddatetime(updated_at);
create trigger set_updated_at before update on accounts
  for each row execute function moddatetime(updated_at);
create trigger set_updated_at before update on categories
  for each row execute function moddatetime(updated_at);
create trigger set_updated_at before update on funds
  for each row execute function moddatetime(updated_at);
create trigger set_updated_at before update on budgets
  for each row execute function moddatetime(updated_at);
create trigger set_updated_at before update on transactions
  for each row execute function moddatetime(updated_at);
create trigger set_updated_at before update on merchant_rules
  for each row execute function moddatetime(updated_at);
create trigger set_updated_at before update on imported_messages
  for each row execute function moddatetime(updated_at);
