# Vunds Financial Logic

This document is the source of truth for transaction and money movement
semantics.

The primary rule is:

> Every real-world financial event must be represented exactly once.

Avoid double counting.

---

# 1. Core Entities

## Account

Represents a real financial account.

Examples:

- BCA Ivan
- BCA Vero
- Cash
- BCA Credit Card
- Mandiri

An account has:

- owner
- type
- balance/opening balance
- currency
- active status

Credit accounts additionally have:

- credit limit
- outstanding liability
- available credit

---

## Category

Describes what an expense or income represents.

Example:

Food
- Groceries
- Dining
- Delivery
- Coffee

Transport
- Fuel
- Toll
- Parking
- Ride Hailing

Wedding
- Venue
- Catering
- Decoration
- Photography

Category answers:

> What was this money for?

---

## Fund

Represents a virtual purpose/allocation.

Examples:

- Wedding
- House
- Emergency
- Vacation

Fund answers:

> What is this money intended for?

A Fund does NOT need to correspond to a bank account.

---

## Budget

Represents planned spending for a period.

Example:

September Food Budget = Rp4,000,000

Budget answers:

> How much do we plan to spend?

Budget does not represent actual cash.

---

# 2. Transaction Types

Supported types:

- INCOME
- EXPENSE
- TRANSFER
- CREDIT_CARD_PAYMENT
- FUND_ALLOCATION
- REFUND

Implementation may internally model CREDIT_CARD_PAYMENT as a specialized
TRANSFER if that makes the system simpler, as long as reporting correctly
excludes it from expenses.

---

# 3. Expense

Example:

Dinner:
Rp200,000
Paid from BCA

Effects:

BCA = -200,000
Expense = +200,000

This is counted in monthly spending.

---

# 4. Credit Card Purchase

Example:

Dinner:
Rp200,000
Paid with credit card

Effects:

Credit liability = +200,000
Expense = +200,000
Cash = unchanged

This is counted in monthly spending.

---

# 5. Credit Card Payment

Example:

Pay CC:
Rp200,000
BCA → CC

Effects:

BCA = -200,000
CC liability = -200,000
Expense = unchanged

This must NOT appear as another expense.

---

# 6. Transfer

Example:

BCA Ivan → BCA Vero
Rp5,000,000

Effects:

BCA Ivan = -5,000,000
BCA Vero = +5,000,000

Income = unchanged
Expense = unchanged

Transfers should not distort monthly spending or income reports.

---

# 7. Fund Allocation

Example:

General Savings → Wedding
Rp10,000,000

Effects:

General fund allocation = -10,000,000
Wedding fund allocation = +10,000,000

Bank accounts = unchanged
Income = unchanged
Expense = unchanged

This is a virtual allocation.

---

# 8. Expense Assigned to Fund (envelope rule)

Funds are sinking funds — money the household saves up in advance for a
specific purpose. Spending from a fund draws from that saved pot and must
NOT consume the monthly budget. The monthly budget is for recurring,
in-the-moment categories (food, transport, bills); goals get their own pot.

Example:

Wedding venue:
Rp10,000,000
Paid from BCA
Fund = Wedding
Category = Wedding / Venue

Effects:

BCA = -10,000,000                    (real cash still leaves the account)
Wedding fund remaining = -10,000,000 (fund draws down)
Monthly expense total = unchanged     (fund-attached, excluded)
Monthly budget = unchanged            (ditto)

The category is preserved so historical reporting can still answer
"where did the wedding money go?" — but the category does NOT consume
a monthly budget allocation when a fund is attached.

A fund-attached expense is reported in `fundSpent(fundId)` and excluded
from `monthlyExpense()`.

---

# 9. Refund

A refund should reverse/reduce the original expense.

Example:

Original expense = Rp500,000
Refund = Rp100,000

Net expense = Rp400,000

Do not classify the refund as ordinary income.

Whenever possible, connect the refund to the original transaction.

---

# 10. Opening Balance

Example:

BCA opening balance = Rp10,000,000

Effects:

Account balance = Rp10,000,000
Income = Rp0
Expense = Rp0

Opening balances must never affect monthly income/expense reports.

---

# 11. Budget Calculation

For a selected month:

budget_remaining =
monthly_budget - confirmed_expenses

Pending transactions should not be treated as confirmed spending unless the
product explicitly defines a separate pending-spend view.

Refunds reduce net expenses.

Transfers, fund allocations, and credit card payments do not reduce budget.

---

# 12. Account Balance

For a debit/cash account:

balance =
opening_balance
+ confirmed_income
+ confirmed_incoming_transfers
- confirmed_expenses
- confirmed_outgoing_transfers
- confirmed_credit_card_payments
+ confirmed_refunds

For credit cards:

outstanding =
opening_outstanding
+ credit_card_purchases
- credit_card_payments
- applicable_refunds

The exact implementation may use transaction ledger entries instead of direct
calculation, but the resulting behavior must match these rules.

---

# 13. Reporting

Monthly Expenses include:

- confirmed expenses with NO fund attached
- net of refunds for those non-fund expenses

Monthly Expenses exclude:

- expenses attached to a fund (envelope rule, §8 — those draw from
  the fund's own pot, not the monthly budget)
- refunds of fund-attached expenses (symmetrical to the above)
- transfers
- credit card payments
- fund allocations
- opening balances

Monthly Income includes:

- actual income

Monthly Income excludes:

- transfers
- opening balances
- credit card payments
- fund allocations

---

# 14. Transaction Status

PENDING:
Imported but not confirmed.

CONFIRMED:
Included in normal reporting.

REJECTED:
Ignored for normal reporting.

REVERSED:
Original financial effect has been reversed.

REFUNDED:
Original expense has been partially or fully refunded.

---

# 15. Idempotency

Every imported transaction must have a stable unique identity.

Potential identity:

source + source_message_id

or:

provider + provider_transaction_reference

or:

source + deterministic_hash

The system must safely process the same email multiple times without creating
duplicate transactions.

---

# 16. Examples / Acceptance Tests

## Test 1 — Salary

Income:
Rp20,000,000
To BCA

Expected:

BCA +20M
Income +20M
Expense unchanged

---

## Test 2 — Debit Expense

Food:
Rp100,000
BCA

Expected:

BCA -100K
Expense +100K

---

## Test 3 — Credit Card Expense

Food:
Rp100,000
CC

Expected:

CC liability +100K
Expense +100K
Cash unchanged

---

## Test 4 — CC Payment

BCA → CC:
Rp100,000

Expected:

BCA -100K
CC liability -100K
Expense unchanged

---

## Test 5 — Transfer

Ivan BCA → Vero BCA:
Rp5M

Expected:

Ivan BCA -5M
Vero BCA +5M
Income unchanged
Expense unchanged

---

## Test 6 — Fund Allocation

General → Wedding:
Rp5M

Expected:

General allocation -5M
Wedding allocation +5M
Bank balances unchanged
Income unchanged
Expense unchanged

---

## Test 7 — Wedding Expense (fund-attached, envelope rule)

Wedding venue:
Rp3M
BCA
Wedding Fund

Expected:

BCA -3M                   (real cash still leaves the account)
Monthly expense unchanged (fund-attached, excluded per §8/§13)
Wedding fund spent +3M    (draws from the pot)

---

## Test 8 — Duplicate Gmail Email

Same Gmail message processed twice.

Expected:

Exactly one transaction.

---

## Test 9 — Unknown Merchant

Unknown transaction imported.

Expected:

Transaction becomes PENDING/UNKNOWN.

No fabricated category.

---

## Test 10 — Refund

Expense:
Rp500K

Refund:
Rp100K

Expected:

Net expense = Rp400K

Refund is not ordinary income.

---

## Test 11 — Opening Balance

Opening balance:
Rp10M

Expected:

Balance = Rp10M
Income = Rp0
Expense = Rp0