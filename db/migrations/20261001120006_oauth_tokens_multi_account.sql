-- Allow multiple Gmail accounts per household.
--
-- Each physical card can be linked to a different Gmail inbox, so we need to
-- let a household connect two (or more) Google accounts simultaneously. The
-- old uniqueness `(household_id, member_id, provider)` capped it at one.
--
-- New uniqueness: `(household_id, provider, account_email)` — one row per
-- distinct Google mailbox per household. member_id stays for attribution.
--
-- account_email becomes NOT NULL. The OAuth callback has always fetched it
-- via /oauth2/v2/userinfo and we only ever stored it with that call having
-- succeeded; we now rely on it in the key.

-- Nobody has real connections yet in dev (the fixture flow doesn't touch
-- oauth_tokens), so dropping the constraint and backfilling isn't a concern.

alter table oauth_tokens
  drop constraint oauth_tokens_household_id_member_id_provider_key;

alter table oauth_tokens
  alter column account_email set not null;

alter table oauth_tokens
  add constraint oauth_tokens_household_provider_email_key
  unique (household_id, provider, account_email);
