-- Merchant rules can suggest an optional fund in addition to a category.
--
-- Used by the Money Inbox: when a rule matches a parsed merchant, both the
-- category and (if set) the fund are prefilled on the confirmation form.
--
-- NULL is the common case — most rules only suggest a category.

alter table merchant_rules
  add column fund_id uuid references funds(id) on delete set null;

create index merchant_rules_fund_idx on merchant_rules(fund_id);
