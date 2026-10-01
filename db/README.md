# Vunds — Database

Postgres schema, RLS, and migrations for the Vunds app. Target: **Neon**
(serverless Postgres). The SQL is standard Postgres — portable to any
Postgres host if we ever move.

## Files

```
db/
└── migrations/
    ├── 20261001120000_initial_schema.sql   -- auth schema, tables, enums, indexes, constraints
    └── 20261001120001_rls.sql              -- helper fns + RLS policies
```

Design notes and per-type transaction invariants are inline as comments in the
migration files.

## Applying migrations to Neon

1. Create a Neon project (region closest to you — likely Singapore).
2. Copy the **pooled connection string** from the Neon console
   (`postgresql://...@...neon.tech/...?sslmode=require`). Put it in
   `.env.local` as `DATABASE_URL`.
3. From the Neon console → **SQL Editor**, paste each migration file in
   filename order and run it. Or use `psql`:

   ```bash
   psql "$DATABASE_URL" -f db/migrations/20261001120000_initial_schema.sql
   psql "$DATABASE_URL" -f db/migrations/20261001120001_rls.sql
   ```

## Auth model

- The `auth.users` table is ours (not Auth.js's). Auth.js runs in JWT mode
  and upserts into `auth.users` from a sign-in callback. Phase 3 wires this.
- RLS reads the current user from the Postgres session variable
  `app.user_id`, which the Next.js data layer sets per request.

## Dev seed data

```bash
pnpm db:seed
```

Seeds a dev household ("Ivan & Vero (dev)") with members, accounts, the full
category tree from `docs/product-spec.md`, four funds, and realistic
September/October 2026 transactions covering every transaction type.

Idempotent: wipes and reloads the dev household on each run. All seed UUIDs
begin with `deadbeef-` so you can isolate seeded rows:

```sql
select * from accounts where id::text like 'deadbeef%';
```

Script lives in `db/seed/dev.ts`. It only ever touches the dev household
(fixed UUID `deadbeef-0001-...`) and the two dev `auth.users`; it will never
delete or modify any other household's data.

## Extending the schema

Add a new file `db/migrations/YYYYMMDDHHMMSS_description.sql`. Never edit an
applied migration in place; add a new one that alters or replaces.
