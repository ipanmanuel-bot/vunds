-- CHECK constraint update for the adjustment types added in the previous
-- migration. See 20261001120007 for the rationale on splitting.
--
-- Balance correction. Only touches an account; no category, fund, or
-- counter-account. Direction (increase/decrease) carried in the type.

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
    or (
      type in ('adjustment_increase', 'adjustment_decrease')
      and account_id is not null
      and counter_account_id is null
      and category_id is null
      and fund_id is null
      and counter_fund_id is null
      and refund_of_transaction_id is null
    )
  );
