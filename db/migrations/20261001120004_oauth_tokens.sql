-- OAuth tokens, one row per (household, member, provider).
--
-- `refresh_token` and `access_token` are AES-256-GCM encrypted at rest. The
-- app layer handles encryption/decryption using TOKEN_ENCRYPTION_KEY from
-- the env — Neon encrypts the storage volume, this is defense in depth so
-- a leaked SQL dump does not reveal credentials.
--
-- `access_token_expires_at` is in UTC. The refresh happens app-side when the
-- current access token is within a short safety window of expiry.
--
-- `scope` is the exact space-separated scope string Google returned, so we
-- can detect missing scopes (e.g. after a re-consent).

create table oauth_tokens (
  id                       uuid primary key default gen_random_uuid(),
  household_id             uuid not null references households(id) on delete cascade,
  member_id                uuid not null references household_members(id) on delete cascade,
  provider                 text not null check (provider in ('google')),
  access_token_encrypted   text not null,
  refresh_token_encrypted  text,
  access_token_expires_at  timestamptz not null,
  scope                    text not null,
  account_email            text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (household_id, member_id, provider)
);

create index oauth_tokens_member_idx on oauth_tokens(household_id, member_id);

create trigger set_updated_at before update on oauth_tokens
  for each row execute function moddatetime(updated_at);

alter table oauth_tokens enable row level security;

create policy "oauth_tokens: household access"
  on oauth_tokens for all
  using (household_id in (select public.user_household_ids()))
  with check (household_id in (select public.user_household_ids()));
