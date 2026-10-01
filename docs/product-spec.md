# Vunds Product Specification

## Product

Vunds is a household finance dashboard.

Primary goal:

Help a couple understand where their money is going, how much they can spend,
and what money has been allocated for future goals.

The app should reduce financial friction without hiding financial decisions from
the user.

---

# MVP Navigation

Recommended:

Home
Transactions
Accounts
Goals
More

Money Inbox should be easily accessible from the Home dashboard.

---

# HOME

The dashboard should answer the most important questions immediately.

## Hero

Remaining Monthly Budget

Example:

Budget       Rp48.0M
Spent        Rp35.4M
Remaining    Rp12.6M

Show a clear progress indicator.

Do NOT confuse this with available cash.

---

## Spending Comparison

Show monthly spending comparison.

Example:

June
July
August
September

Future versions may allow toggling:

- Expenses
- Income
- Net Cash Flow

Keep the initial chart simple.

---

## Accounts

Debit accounts:

BCA Ivan
Rp12,500,000

BCA Vero
Rp8,200,000

Credit accounts:

CC Ivan
Outstanding Rp4,500,000
Available Rp10,500,000
Limit Rp15,000,000

---

## Funds

Examples:

Wedding
House
Emergency
Vacation

Show allocated amount and optionally progress.

---

## Recent Transactions

Show:

merchant/title
category
account
amount
date

Use clear visual differentiation between income and expenses.

---

## Money Inbox

Imported transactions requiring attention.

Example:

Grab
Rp85,000
Suggested:
Transport → Ride Hailing

Actions:

Confirm
Edit
Reject

The system should automate repetitive work while keeping the user aware of
their finances.

---

# TRANSACTION FORM

## Expense

Fields:

- Amount
- Account
- Category
- Subcategory
- Fund (optional)
- Date
- Note

## Income

Fields:

- Amount
- Destination account
- Income category
- Date
- Note

## Transfer

Fields:

- From account
- To account
- Amount
- Date
- Note

Do not show Category or Fund for transfers.

## Credit Card Payment

Fields:

- Bank account
- Credit card
- Amount
- Date

Do not show Category.

---

# CATEGORIES

Initial categories:

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
- Public Transport

Shopping
- Clothing
- Electronics
- Household
- Other

Bills
- Electricity
- Internet
- Phone
- Insurance

Entertainment
- Streaming
- Games
- Movies
- Events

Travel
- Flight
- Hotel
- Transport
- Other

Wedding
- Venue
- Catering
- Decoration
- Photography
- Videography
- Attire
- Invitation
- Entertainment
- Other

Education
Health
Subscriptions
Other

Categories should eventually be customizable.

---

# HOUSEHOLD

Household members can have ownership:

- Ivan
- Vero
- Joint

Dashboard should primarily represent the household.

Allow filtering by:

- Household
- Ivan
- Vero

Do not build complex contribution accounting in MVP.

---

# UI

Reference visual direction:

Modern
Minimal
Premium
Calm
High information clarity

Use:

- generous spacing
- strong typography
- rounded cards
- subtle borders
- restrained accent colors
- clear hierarchy

Avoid:

- excessive gradients
- excessive charts
- unnecessary animations
- dense tables on mobile
- decorative UI that does not communicate information

---

# MOBILE

Design mobile-first.

Primary interactions should be easy with one hand.

The app should be PWA-ready.

Potential future iOS home-screen widget support should not influence MVP
architecture unless technically required.

---

# PRODUCT PRINCIPLE

Automation should remove data-entry friction,
not remove financial awareness.

Imported transactions should therefore remain reviewable.