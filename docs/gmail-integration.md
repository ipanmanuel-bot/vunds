# Vunds Gmail Integration

## Goal

Automatically detect transaction notification emails from supported banks and
convert them into reviewable Vunds transactions.

Use Gmail API + OAuth.

Do not use paid email parsing services for MVP.

---

# FLOW

Gmail
 ↓
Gmail API
 ↓
Fetch relevant messages
 ↓
Identify bank/provider
 ↓
Provider-specific parser
 ↓
Normalized transaction
 ↓
Deduplication
 ↓
PENDING transaction
 ↓
Merchant categorization
 ↓
Money Inbox
 ↓
User confirmation
 ↓
CONFIRMED transaction

---

# OAUTH

Request the minimum Gmail permissions necessary.

Do not store Gmail passwords.

Store OAuth tokens securely.

Never expose access tokens to the browser.

Gmail API communication should happen server-side.

---

# PARSER ARCHITECTURE

Use a common parser interface.

Example concept:

BankParser

parse(message) → ParsedTransaction | null

Implement provider-specific adapters:

BCAParser
MandiriParser

Additional providers can be added later.

Do not put provider-specific parsing logic throughout the application.

---

# NORMALIZED TRANSACTION

A parsed transaction should contain information such as:

- source
- source_message_id
- provider
- account_id
- transaction_type
- amount
- currency
- merchant
- transaction_date
- provider_reference
- raw_metadata

Not every field must be available.

Never invent missing values.

---

# EMAIL FILTERING

Prefer server-side filtering using Gmail search queries where possible.

Example concepts:

from
subject
bank keywords
transaction keywords

Do not download the entire mailbox unnecessarily.

---

# DEDUPLICATION

Use a stable source identifier.

Preferred:

Gmail message ID

Additional identifiers:

provider transaction reference
deterministic content hash

A message processed multiple times must result in one transaction.

---

# PARSING FAILURE

If the parser cannot confidently determine:

- amount
- transaction type
- account

do not create a confirmed transaction.

Create a reviewable pending item or record the failed import.

Never guess financial values.

---

# CATEGORIZATION

After parsing:

1. Normalize merchant name.
2. Check exact merchant rule.
3. Check keyword rule.
4. Check learned/user-created rule.
5. Otherwise mark category as UNKNOWN.

Optional AI categorization may be added later only if it is genuinely free.

AI is never required for the system to function.

---

# SECURITY

- OAuth tokens server-side only.
- Use encrypted/secure storage where appropriate.
- Do not log email bodies containing sensitive financial information.
- Do not expose raw bank email contents unnecessarily.
- Follow least-privilege access.