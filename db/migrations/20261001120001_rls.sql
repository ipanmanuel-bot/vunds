-- Row-level security policies.
--
-- Model: every app row is scoped to a household. A user has access to a row
-- iff they belong to the household.
--
-- Auth integration: the Next.js layer sets a per-request Postgres session
-- variable `app.user_id` to the authenticated user's uuid (from the Auth.js
-- JWT). All policies derive the caller from that variable via
-- `public.current_user_id()`.
--
-- `public.user_household_ids()` is SECURITY DEFINER so the membership lookup
-- does not recurse through RLS on `household_members`.

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

create or replace function public.user_household_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select household_id
  from public.household_members
  where user_id = public.current_user_id()
$$;

revoke all on function public.current_user_id() from public;
revoke all on function public.user_household_ids() from public;
grant execute on function public.current_user_id() to public;
grant execute on function public.user_household_ids() to public;

-- =========================================================================
-- Enable RLS
-- =========================================================================

alter table households         enable row level security;
alter table household_members  enable row level security;
alter table accounts           enable row level security;
alter table categories         enable row level security;
alter table funds              enable row level security;
alter table budgets            enable row level security;
alter table transactions       enable row level security;
alter table merchant_rules     enable row level security;
alter table imported_messages  enable row level security;

-- =========================================================================
-- households
-- =========================================================================

create policy "households: select member"
  on households for select
  using (id in (select public.user_household_ids()));

create policy "households: insert authenticated"
  on households for insert
  with check (public.current_user_id() is not null);

create policy "households: update member"
  on households for update
  using (id in (select public.user_household_ids()))
  with check (id in (select public.user_household_ids()));

create policy "households: delete member"
  on households for delete
  using (id in (select public.user_household_ids()));

-- =========================================================================
-- household_members
-- =========================================================================

create policy "members: select own or same household"
  on household_members for select
  using (
    user_id = public.current_user_id()
    or household_id in (select public.user_household_ids())
  );

create policy "members: insert self or same household"
  on household_members for insert
  with check (
    user_id = public.current_user_id()
    or household_id in (select public.user_household_ids())
  );

create policy "members: update same household"
  on household_members for update
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));

create policy "members: delete same household"
  on household_members for delete
  using (household_id in (select public.user_household_ids()));

-- =========================================================================
-- Household-scoped resources
-- =========================================================================

create policy "accounts: household access"
  on accounts for all
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));

create policy "categories: household access"
  on categories for all
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));

create policy "funds: household access"
  on funds for all
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));

create policy "budgets: household access"
  on budgets for all
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));

create policy "transactions: household access"
  on transactions for all
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));

create policy "merchant_rules: household access"
  on merchant_rules for all
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));

create policy "imported_messages: household access"
  on imported_messages for all
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));
