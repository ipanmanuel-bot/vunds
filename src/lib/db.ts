import { neon, Pool, types, type PoolClient } from "@neondatabase/serverless";

// Return Postgres `date` columns (OID 1082) as "YYYY-MM-DD" strings instead
// of JS Date objects. The finance library compares by UTC month, and
// consumers wrap in `new Date(\`${s}T00:00:00.000Z\`)` to force UTC midnight
// — a Date-typed value here would get a toString → "[object Object]" and
// produce an Invalid Date. Matches the old postgres.js config.
types.setTypeParser(1082, (val: string) => val);

// Server-only Postgres client, Neon serverless driver.
//
// Why not postgres.js: it opens a TCP+TLS+Postgres-auth session per cold
// Vercel Lambda, costing ~500ms on every warm-up — the dominant source of
// perceived latency in production. The Neon driver uses:
//
//   - HTTP (`neon()`) for single queries: one HTTP request per query, no
//     persistent connection, cold-start is ~50ms. 90% of our queries.
//   - WebSocket pool (`Pool`) for multi-query transactions: needed when we
//     have to read a row and then conditionally write based on the result.
//     Only 4 call sites in the whole app.
//
// Phase 3 note: we connect as `neondb_owner`, which bypasses RLS. The RLS
// policies in db/migrations/*_rls.sql still exist and are the correct
// target for Phase 5 when Auth.js lands and we switch to a non-owner role
// plus a per-request `SET LOCAL app.user_id = '<uuid>'`.

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Compatibility shape with the previous `postgres` library's tagged-template
// generic: callers write `sql<RowType[]>\`select ...\`` and T is the ARRAY
// type (what the Promise resolves to). This matches postgres.js so no
// existing call sites need rewriting.
type SqlFn = <T = Record<string, unknown>[]>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T>;

const neonSql = neon(connectionString);
export const sql = neonSql as unknown as SqlFn;

// Multi-query transaction helper. Opens a WebSocket pool connection, runs
// BEGIN / your callback / COMMIT, releases the client. On exception,
// ROLLBACK and re-throw.
//
// The callback receives a `txn` that acts like `sql` — tagged template that
// returns a typed row array — but every call runs through the same
// transactional connection, so RETURNING clauses can inform conditional
// follow-up writes.
//
// Pool is lazily constructed so pure read paths (which don't touch
// transactions) don't pay the WebSocket setup cost even in a cold Lambda.
let pool: Pool | null = null;
function getPool(): Pool {
  if (pool) return pool;
  pool = new Pool({ connectionString });
  return pool;
}

export type TxnFn = <T = Record<string, unknown>[]>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T>;

export async function withTx<T>(fn: (txn: TxnFn) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  const txn = taggedTemplateFromClient(client);
  try {
    await client.query("BEGIN");
    const result = await fn(txn);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore — original error below is what matters
    }
    throw e;
  } finally {
    client.release();
  }
}

// Translate a tagged-template call into a parameterised pg query:
//   txn`select * from users where id = ${userId}`
//     → client.query('select * from users where id = $1', [userId])
// Matches postgres.js and @neondatabase/serverless HTTP driver semantics so
// transactional code reads the same as non-transactional code.
function taggedTemplateFromClient(client: PoolClient): TxnFn {
  return (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    let text = "";
    for (let i = 0; i < strings.length; i++) {
      text += strings[i]!;
      if (i < values.length) text += `$${i + 1}`;
    }
    const res = await client.query({
      text,
      values: values as unknown[],
    });
    return res.rows;
  }) as TxnFn;
}
