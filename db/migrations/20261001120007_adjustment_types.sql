-- Add adjustment transaction types.
--
-- Postgres doesn't let newly added enum values be referenced in the same
-- transaction they were added in — so this file ONLY adds the enum values.
-- The follow-up migration (20261001120008) swaps in the updated CHECK
-- constraint that references them.

alter type transaction_type add value if not exists 'adjustment_increase';
alter type transaction_type add value if not exists 'adjustment_decrease';
