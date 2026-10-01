import postgres from "postgres";

// Server-only Postgres client. Uses the pooled Neon connection string so each
// request pays the pgbouncer-amortized connect cost. `prepare: false` is
// required for pgbouncer transaction-pooling mode.
//
// Phase 3 note: we connect as `neondb_owner`, which bypasses RLS. The RLS
// policies in db/migrations/*_rls.sql still exist and are the correct target
// for Phase 5 when Auth.js lands and we switch to a non-owner role plus a
// per-request `SET LOCAL app.user_id = '<uuid>'`.

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const globalForSql = globalThis as unknown as {
  __vundsSql?: ReturnType<typeof postgres>;
};

export const sql =
  globalForSql.__vundsSql ??
  postgres(connectionString, {
    prepare: false,
    onnotice: () => {},
    types: {
      // Return Postgres `date` as a "YYYY-MM-DD" string instead of a Date,
      // so we avoid local-midnight timezone drift when the finance library
      // compares by UTC month.
      date: {
        to: 1082,
        from: [1082],
        serialize: (v: Date | string) =>
          v instanceof Date ? v.toISOString().slice(0, 10) : v,
        parse: (v: string) => v,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForSql.__vundsSql = sql;
}
