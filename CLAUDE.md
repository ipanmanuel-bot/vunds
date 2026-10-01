# Vunds

Vunds is a modern household finance dashboard for managing income, expenses,
accounts, budgets, funds/goals, and shared household finances.

The product is designed for Ivan and Vero but should support multiple household
members.

## Stack

- Next.js
- TypeScript
- Neon (serverless Postgres)
- Auth.js (NextAuth) with Google OAuth
- Tailwind CSS
- Vercel
- PWA-ready
- Mobile-first responsive UI

Prefer simple, maintainable solutions over unnecessary abstractions.

---

# CORE FINANCIAL MODEL

These concepts MUST remain separate:

- Account = where money physically exists or a liability exists.
- Transaction = an actual financial event.
- Category = what money was spent on.
- Budget = planned spending for a period.
- Fund = virtual allocation/purpose of money.
- Credit liability = money owed on a credit account.

Never merge Budget and Fund.

Never double-count money.

---

# NON-NEGOTIABLE TRANSACTION RULES

## Expense

A purchase of goods/services.

Example:
Rp200,000 dinner from BCA.

Result:
- BCA balance decreases Rp200,000
- Expense increases Rp200,000

## Credit Card Purchase

A credit card purchase is an EXPENSE.

Example:
Rp200,000 dinner using credit card.

Result:
- Expense increases Rp200,000
- Credit card outstanding increases Rp200,000
- Cash/bank balance does not change

## Credit Card Payment

Paying a credit card is NOT an expense.

Example:
Rp200,000 from BCA to credit card.

Result:
- BCA decreases Rp200,000
- Credit card liability decreases Rp200,000
- No new expense

## Transfer

Moving money between accounts is NOT income or expense.

Example:
BCA Ivan → BCA Vero Rp5,000,000.

Result:
- Source account decreases
- Destination account increases
- Income unchanged
- Expense unchanged

## Fund Allocation

Moving money between virtual funds is NOT income or expense.

Example:
General Savings → Wedding Fund Rp10,000,000.

Result:
- Fund allocations change
- Bank balances do not change
- Income unchanged
- Expense unchanged

## Expense With Fund

An expense may optionally belong to a Fund.

Example:
Wedding venue Rp10,000,000 from BCA.

Result:
- BCA decreases Rp10,000,000
- Expense increases Rp10,000,000
- Wedding spending increases Rp10,000,000
- Wedding fund available allocation decreases accordingly

Fund and Category are independent concepts.

Example:
Wedding Fund + Travel Category is valid.

---

# IMPORTANT ACCOUNTING PRINCIPLES

- Opening balance is NOT income.
- Refund reduces the original expense/net spending.
- Transfers are never income or expenses.
- Credit card payments are never expenses.
- Fund allocations are never expenses.
- Investment features are OUT OF MVP.
- Never fabricate categories when parsing transaction data.
- Unknown transactions must remain reviewable.
- Imported transactions must be idempotent.
- Duplicate emails must never create duplicate transactions.

All financial calculations should be deterministic and testable.

---

# TRANSACTION STATES

Use explicit transaction states such as:

- PENDING
- CONFIRMED
- REJECTED
- REVERSED
- REFUNDED

Imported Gmail transactions should normally enter PENDING first.

The user can review, categorize, assign a fund, edit, and confirm.

---

# CATEGORIZATION

Use rule-based categorization first.

Examples:

McDonald's → Food → Dining
Starbucks → Food → Coffee
Grab → Transport → Ride Hailing
Netflix → Entertainment → Streaming

Merchant rules should be stored in the database.

User corrections should be able to improve merchant rules.

AI categorization is OPTIONAL.

Do not introduce a paid AI API dependency.

If a genuinely free/local AI solution is unavailable, use rule-based
categorization and leave unknown transactions for manual review.

---

# GMAIL IMPORT

Use Gmail API + OAuth.

Do not use paid email parsing services for MVP.

Architecture should support provider-specific parsers such as:

- BCAParser
- MandiriParser
- etc.

Normalize parsed emails into a common transaction format.

Every imported transaction must have a reliable deduplication key such as:

- Gmail message ID
- provider transaction reference
- source ID
- deterministic hash

Never create a duplicate transaction because the same email was processed twice.

Parsing failure must result in REVIEW/UNKNOWN state, not fabricated data.

---

# MVP SCOPE

MVP includes:

- Household
- Members
- Accounts
- Income
- Expenses
- Transfers
- Credit card purchases
- Credit card payments
- Budgets
- Funds/goals
- Categories/subcategories
- Transaction history
- Money Inbox
- Gmail transaction import
- Rule-based categorization
- Dashboard
- Basic reconciliation capability

MVP DOES NOT include:

- Stocks
- Crypto
- Trading
- Investment portfolio tracking
- Complex net worth tracking
- Automated financial advice
- Paid AI dependencies

Leave the architecture extensible for future investments, but do not build them now.

---

# DASHBOARD PRIORITY

The dashboard should primarily answer:

1. How much can I still spend this month according to my budget?
2. How much have I spent?
3. Where did the money go?
4. How much money is in each account?
5. What money is allocated to each fund?
6. Are there transactions that need my attention?

Important distinction:

Budget Remaining ≠ Available Cash.

Do not label them as the same thing.

Suggested dashboard hierarchy:

1. Remaining Monthly Budget
2. Spending comparison
3. Account balances
4. Funds/goals
5. Recent transactions
6. Money Inbox

---

# ACCOUNTS

Support:

- Debit/bank accounts
- Cash
- Credit cards

Debit/cash accounts show balance.

Credit cards show:

- Outstanding
- Available
- Limit

Do not treat credit card outstanding as cash.

Account balances should ideally be derivable from opening balance + confirmed
transactions rather than relying only on blind mutable balances.

---

# UI PRINCIPLES

Visual direction:

- Modern
- Minimal
- Premium
- Calm
- Clean typography
- Rounded cards
- Subtle borders
- Restrained colors
- Mobile-first
- Responsive
- PWA-ready

Avoid unnecessary dashboards, charts, cards, and decorative UI.

Prioritize information hierarchy and readability.

---

# DEVELOPMENT RULES

Before modifying financial logic:

1. Read `docs/financial-logic.md`.
2. Check existing implementation.
3. Reuse existing abstractions where appropriate.
4. Do not duplicate business logic.
5. Add/update tests for financial behavior.
6. Do not silently change financial semantics.

Before modifying product/UI behavior:

1. Read `docs/product-spec.md`.

Before modifying Gmail:

1. Read `docs/gmail-integration.md`.

Never rewrite large parts of the application without first inspecting the
existing code.

Prefer small, incremental changes.

After implementation:

- Run tests.
- Run type checking.
- Run linting.
- Fix errors before considering the task complete.

Do not add dependencies unless necessary.

Do not introduce paid services without explicit approval.

---

# SOURCE OF TRUTH

Financial semantics:
`docs/financial-logic.md`

Product behavior:
`docs/product-spec.md`

Gmail architecture:
`docs/gmail-integration.md`

If implementation conflicts with these documents, stop and resolve the conflict
rather than silently choosing a new behavior.