-- Pending expenses and income may have no category.
--
-- The Money Inbox stores imported transactions as `status = 'pending'` while
-- the user reviews them. If the parser couldn't categorise the merchant,
-- `category_id` is NULL — this is the "unknown stays UNKNOWN" principle from
-- docs/financial-logic.md §15 and docs/gmail-integration.md §PARSING FAILURE.
--
-- Confirm flow sets `category_id` and bumps status to 'confirmed' in a single
-- update, so the invariant "confirmed expense/income has a category" still
-- holds for any row ever used in reporting.

alter table transactions drop constraint transactions_type_shape;

alter table transactions
  add constraint transactions_type_shape check (
    (
      type = 'income'
      and account_id is not null
      and counter_account_id is null
      and (category_id is not null or status = 'pending')
      and fund_id is null
      and counter_fund_id is null
      and refund_of_transaction_id is null
    )
    or (
      type = 'expense'
      and account_id is not null
      and counter_account_id is null
      and (category_id is not null or status = 'pending')
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
  );
