# Vunds

Household finance dashboard for managing income, expenses, accounts, budgets,
funds/goals, and shared household finances.

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS 4
- Neon (serverless Postgres)
- Auth.js (NextAuth) with Google OAuth
- Vitest
- Vercel (deploy target)

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL + Google OAuth values
pnpm dev
```

Scripts:

- `pnpm dev` — Next.js dev server
- `pnpm build` — production build
- `pnpm start` — run production build
- `pnpm test` — run vitest suite
- `pnpm typecheck` — TypeScript check
- `pnpm lint` — ESLint

## Gmail integration setup

The Money Inbox can import transactions from Gmail. The architecture is in
place; to actually connect your Gmail you need Google OAuth credentials.

Everything works **without** this setup via the "Sync fixture messages (dev)"
button on `/inbox` — same pipeline, bundled sample bank emails.

### Google Cloud Console

1. Create (or pick) a project at <https://console.cloud.google.com>.
2. **APIs & Services → Library** → enable **Gmail API**.
3. **APIs & Services → OAuth consent screen**:
   - User type: External (unless you're on a Workspace).
   - Add yourself under *Test users*.
   - Add scope: `https://www.googleapis.com/auth/gmail.readonly`.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: Web application.
   - Authorized redirect URI: `http://localhost:3000/api/gmail/oauth/callback`.
5. Copy the client id + secret into `.env.local`:

   ```
   AUTH_GOOGLE_CLIENT_ID=…
   AUTH_GOOGLE_CLIENT_SECRET=…
   AUTH_GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/oauth/callback
   ```

6. Generate a token-encryption key:

   ```
   openssl rand -hex 32
   ```

   Store it as `TOKEN_ENCRYPTION_KEY` in `.env.local`. OAuth refresh tokens are
   AES-256-GCM encrypted with this key before being written to Postgres.

7. Restart `pnpm dev`. The *Connect Gmail* button on `/inbox` becomes active.

### What's imported

Only parsers in `src/lib/parsers/` know how to turn an email into a
transaction. Phase 7 ships one parser (BCA). Adding a bank is a new file
implementing `BankParser` plus one line in `src/lib/parsers/registry.ts`.

Low-confidence or unrecognised messages are stored in `imported_messages`
with `parse_status = 'partial' | 'unknown' | 'failed'` and never become a
transaction row — fabrication is not allowed (see
[`docs/financial-logic.md`](docs/financial-logic.md) §15).

## Source of truth

Before changing anything, read the relevant spec:

- [`docs/financial-logic.md`](docs/financial-logic.md) — transaction and money-movement semantics
- [`docs/product-spec.md`](docs/product-spec.md) — product behavior and UI direction
- [`docs/gmail-integration.md`](docs/gmail-integration.md) — Gmail import architecture

Project-wide rules and MVP scope live in [`CLAUDE.md`](CLAUDE.md).
