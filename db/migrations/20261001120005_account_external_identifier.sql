-- Accounts carry an optional external identifier (typically the last 4 digits
-- of the card number for debit/credit, or a tail of the bank account number).
-- The Gmail import pipeline matches parsed "card ending in 1234" strings
-- against this column to assign imported transactions to the correct account.
--
-- Nullable: cash accounts never have one. Not unique: in rare cases two cards
-- can end in the same digits across different accounts; the sync layer uses
-- the first match (deterministic by account.name sort) and the user can
-- correct from the Inbox.

alter table accounts
  add column external_identifier text;

create index accounts_external_identifier_idx
  on accounts(household_id, external_identifier)
  where external_identifier is not null;
