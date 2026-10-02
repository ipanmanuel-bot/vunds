// One-shot: wipe demo content from the Ivan & Vero household so the app is
// ready for real use.
//
// Keeps: household (renamed), members, auth.users, categories (starter set),
// merchant_rules (common Indonesian merchants).
// Clears: accounts, transactions, imported_messages, funds, budgets,
// oauth_tokens.

import postgres from "postgres";

const HOUSEHOLD = "deadbeef-0001-0000-0000-000000000001";

const sql = postgres(
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  { max: 1, prepare: false, onnotice: () => {} },
);

async function count(
  table: string,
  extra = "",
): Promise<number> {
  const rows = await sql.unsafe<{ count: string }[]>(
    `select count(*)::text as count from ${table} where household_id = '${HOUSEHOLD}' ${extra}`,
  );
  return Number(rows[0]?.count ?? 0);
}

async function main() {
  console.log("Before:");
  console.log(`  accounts         ${await count("accounts")}`);
  console.log(`  transactions     ${await count("transactions")}`);
  console.log(`  imported_messages ${await count("imported_messages")}`);
  console.log(`  funds            ${await count("funds")}`);
  console.log(`  budgets          ${await count("budgets")}`);
  console.log(`  merchant_rules   ${await count("merchant_rules")}`);
  console.log(`  categories       ${await count("categories")}`);
  console.log(`  oauth_tokens     ${await count("oauth_tokens")}`);

  console.log("\nCleaning…");

  await sql.begin(async (db) => {
    // Delete order matters for FKs. transactions references imported_messages
    // (on delete set null), so clear transactions first then imported_messages.
    await db`delete from transactions where household_id = ${HOUSEHOLD}`;
    await db`delete from imported_messages where household_id = ${HOUSEHOLD}`;
    await db`delete from budgets where household_id = ${HOUSEHOLD}`;
    await db`delete from funds where household_id = ${HOUSEHOLD}`;
    await db`delete from accounts where household_id = ${HOUSEHOLD}`;
    await db`delete from oauth_tokens where household_id = ${HOUSEHOLD}`;

    // Rename the household so the UI says "Ivan & Vero" (not "(dev)")
    await db`
      update households set name = 'Ivan & Vero'
      where id = ${HOUSEHOLD}
    `;
  });

  console.log("\nAfter:");
  console.log(`  accounts         ${await count("accounts")}`);
  console.log(`  transactions     ${await count("transactions")}`);
  console.log(`  imported_messages ${await count("imported_messages")}`);
  console.log(`  funds            ${await count("funds")}`);
  console.log(`  budgets          ${await count("budgets")}`);
  console.log(`  merchant_rules   ${await count("merchant_rules")} (kept)`);
  console.log(`  categories       ${await count("categories")} (kept)`);
  console.log(`  oauth_tokens     ${await count("oauth_tokens")}`);

  const [h] = await sql<{ name: string }[]>`
    select name from households where id = ${HOUSEHOLD}
  `;
  console.log(`\nHousehold name: ${h?.name}`);
  console.log("Done.");
}

main().finally(() => sql.end());
