import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "Missing DATABASE_URL_UNPOOLED / DATABASE_URL. Did you load .env.local?",
  );
  process.exit(1);
}

const sql = postgres(connectionString, {
  max: 1,
  prepare: false,
  onnotice: () => {},
});

const migrationsDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "db",
  "migrations",
);

async function main() {
  await sql`
    create table if not exists public.schema_migrations (
      filename   text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const appliedRows = await sql<{ filename: string }[]>`
    select filename from public.schema_migrations
  `;
  const applied = new Set(appliedRows.map((r) => r.filename));

  const pending = files.filter((f) => !applied.has(f));
  if (pending.length === 0) {
    console.log("No pending migrations.");
    return;
  }

  for (const file of pending) {
    const path = join(migrationsDir, file);
    const content = await readFile(path, "utf8");
    console.log(`Applying ${file}...`);
    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`
        insert into public.schema_migrations (filename) values (${file})
      `;
    });
    console.log(`  ok`);
  }

  console.log(`Applied ${pending.length} migration(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
