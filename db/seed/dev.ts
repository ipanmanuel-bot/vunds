// Development seed data for the "Ivan & Vero (dev)" household.
//
// Separation from production data:
//   * All seed UUIDs begin with "deadbeef-" so you can grep for them:
//       select * from accounts where id::text like 'deadbeef%';
//   * The household is explicitly named "Ivan & Vero (dev)".
//   * Seed users use `*-dev@vunds.local` emails — distinct from any real
//     Google-OAuth user that signs in later.
//   * This script is idempotent: it wipes the dev household (cascading all
//     scoped rows via FKs) and reloads fresh. Running it never touches any
//     other household or any non-seed rows.

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

// Namespaced UUID generator. Namespaces separate entity classes so collisions
// are impossible across types.
const uuid = (ns: number, idx: number): string =>
  `deadbeef-${ns.toString(16).padStart(4, "0")}-0000-0000-${idx
    .toString(16)
    .padStart(12, "0")}`;

// -------------------------------------------------------------------------
// Fixed IDs
// -------------------------------------------------------------------------

const HOUSEHOLD_ID = uuid(0x0001, 1);

const USER_IVAN = uuid(0x0002, 1);
const USER_VERO = uuid(0x0002, 2);

const MEMBER_IVAN = uuid(0x0003, 1);
const MEMBER_VERO = uuid(0x0003, 2);

const ACC_BCA_IVAN = uuid(0x0004, 1);
const ACC_BCA_VERO = uuid(0x0004, 2);
const ACC_CASH = uuid(0x0004, 3);
const ACC_CC_IVAN = uuid(0x0004, 4);

const FUND_WEDDING = uuid(0x0005, 1);
const FUND_HOUSE = uuid(0x0005, 2);
const FUND_EMERGENCY = uuid(0x0005, 3);
const FUND_VACATION = uuid(0x0005, 4);

// -------------------------------------------------------------------------
// Category tree (docs/product-spec.md)
// -------------------------------------------------------------------------

interface CatNode {
  name: string;
  kind: "income" | "expense";
  children?: string[];
}

const categoryTree: CatNode[] = [
  { name: "Income", kind: "income", children: ["Salary", "Bonus", "Other"] },
  {
    name: "Food",
    kind: "expense",
    children: ["Groceries", "Dining", "Delivery", "Coffee"],
  },
  {
    name: "Transport",
    kind: "expense",
    children: ["Fuel", "Toll", "Parking", "Ride Hailing", "Public Transport"],
  },
  {
    name: "Shopping",
    kind: "expense",
    children: ["Clothing", "Electronics", "Household", "Other"],
  },
  {
    name: "Bills",
    kind: "expense",
    children: ["Electricity", "Internet", "Phone", "Insurance"],
  },
  {
    name: "Entertainment",
    kind: "expense",
    children: ["Streaming", "Games", "Movies", "Events"],
  },
  {
    name: "Travel",
    kind: "expense",
    children: ["Flight", "Hotel", "Transport", "Other"],
  },
  {
    name: "Wedding",
    kind: "expense",
    children: [
      "Venue",
      "Catering",
      "Decoration",
      "Photography",
      "Videography",
      "Attire",
      "Invitation",
      "Entertainment",
      "Other",
    ],
  },
  { name: "Education", kind: "expense" },
  { name: "Health", kind: "expense" },
  { name: "Subscriptions", kind: "expense" },
  { name: "Other", kind: "expense" },
];

const categoryIds = new Map<string, string>();
{
  let seq = 0;
  for (const parent of categoryTree) {
    seq++;
    categoryIds.set(parent.name, uuid(0x0006, seq));
    for (const child of parent.children ?? []) {
      seq++;
      categoryIds.set(`${parent.name}/${child}`, uuid(0x0006, seq));
    }
  }
}

const catId = (path: string): string => {
  const id = categoryIds.get(path);
  if (!id) throw new Error(`Unknown category: ${path}`);
  return id;
};

interface CategoryRow {
  id: string;
  household_id: string;
  parent_id: string | null;
  name: string;
  kind: "income" | "expense";
  sort_order: number;
}

const categoryRows: CategoryRow[] = categoryTree.flatMap((parent, i) => {
  const parentId = catId(parent.name);
  const rows: CategoryRow[] = [
    {
      id: parentId,
      household_id: HOUSEHOLD_ID,
      parent_id: null,
      name: parent.name,
      kind: parent.kind,
      sort_order: i * 100,
    },
  ];
  (parent.children ?? []).forEach((childName, j) => {
    rows.push({
      id: catId(`${parent.name}/${childName}`),
      household_id: HOUSEHOLD_ID,
      parent_id: parentId,
      name: childName,
      kind: parent.kind,
      sort_order: j,
    });
  });
  return rows;
});

// -------------------------------------------------------------------------
// Budgets (September + October 2026)
//
// Monthly budgets for the top-level expense categories most households
// actively track as recurring spend. Total 7M IDR/month. Wedding is NOT
// here — per docs/financial-logic.md §8 (envelope rule), wedding is a
// fund (sinking savings pot), not a monthly budget category.
// -------------------------------------------------------------------------

interface BudgetRow {
  id: string;
  household_id: string;
  category_id: string;
  period_year: number;
  period_month: number;
  amount: number;
  currency: string;
}

const budgetDefs: Array<{ category: string; amount: number }> = [
  { category: "Food", amount: 2_500_000 },
  { category: "Transport", amount: 1_000_000 },
  { category: "Shopping", amount: 1_500_000 },
  { category: "Bills", amount: 1_500_000 },
  { category: "Entertainment", amount: 500_000 },
];

const budgetRows: BudgetRow[] = [];
let budgetSeq = 0;
for (const { year, month } of [
  { year: 2026, month: 9 },
  { year: 2026, month: 10 },
]) {
  for (const def of budgetDefs) {
    budgetSeq++;
    budgetRows.push({
      id: uuid(0x0008, budgetSeq),
      household_id: HOUSEHOLD_ID,
      category_id: catId(def.category),
      period_year: year,
      period_month: month,
      amount: def.amount,
      currency: "IDR",
    });
  }
}

// -------------------------------------------------------------------------
// Merchant rules
//
// Seeded rules the categorizer uses to suggest categories on the Money Inbox.
// Lower `priority` wins; most are `contains` (keyword) so they tolerate the
// slight variations we see in Gmail payloads ("Starbucks" vs "STARBUCKS
// GRAND INDONESIA"). Netflix is `exact` to demonstrate that match type too.
// -------------------------------------------------------------------------

interface MerchantRuleRow {
  id: string;
  household_id: string;
  pattern: string;
  match_type: "exact" | "contains" | "regex";
  category_id: string;
  fund_id: string | null;
  priority: number;
}

const ruleDefs: Array<{
  pattern: string;
  matchType: "exact" | "contains" | "regex";
  category: string;
  fund?: string;
  priority?: number;
}> = [
  { pattern: "Starbucks",    matchType: "contains", category: "Food/Coffee" },
  { pattern: "McDonald",     matchType: "contains", category: "Food/Dining" },
  { pattern: "Pizza Hut",    matchType: "contains", category: "Food/Dining" },
  { pattern: "KFC",          matchType: "contains", category: "Food/Dining" },
  { pattern: "Ranch Market", matchType: "contains", category: "Food/Groceries" },
  { pattern: "Hero",         matchType: "exact",    category: "Food/Groceries" },
  { pattern: "Grab",         matchType: "contains", category: "Transport/Ride Hailing" },
  { pattern: "Pertamina",    matchType: "contains", category: "Transport/Fuel" },
  { pattern: "PLN",          matchType: "contains", category: "Bills/Electricity" },
  { pattern: "Indihome",     matchType: "contains", category: "Bills/Internet" },
  { pattern: "Netflix",      matchType: "exact",    category: "Entertainment/Streaming" },
];

const ruleRows: MerchantRuleRow[] = ruleDefs.map((d, i) => ({
  id: uuid(0x0009, i + 1),
  household_id: HOUSEHOLD_ID,
  pattern: d.pattern,
  match_type: d.matchType,
  category_id: catId(d.category),
  fund_id: null,
  priority: d.priority ?? 100,
}));

// -------------------------------------------------------------------------
// Pending imports
//
// Simulated Gmail arrivals: each has an `imported_messages` row (the dedup
// anchor) and a matching `transactions` row with status='pending'. Three
// should auto-suggest a category via the rules above; two have no matching
// rule and must stay UNKNOWN until the user categorises them.
// -------------------------------------------------------------------------

interface ImportedMessageRow {
  id: string;
  household_id: string;
  source: "gmail";
  source_message_id: string;
  provider: string;
  parse_status: "parsed" | "partial" | "unknown" | "failed";
  raw_metadata: Record<string, string | number | boolean | null>;
}

interface PendingDef {
  merchant: string;        // what the parser extracted (will be matched against rules)
  amount: number;
  accountId: string;       // which account the parser identified
  date: string;            // YYYY-MM-DD
  parseStatus: "parsed" | "partial" | "unknown";
  provider: string;        // e.g. "bca", "mandiri"
}

const pendingDefs: PendingDef[] = [
  // Rule-matched: Starbucks (contains) → Food/Coffee
  {
    merchant: "Starbucks Grand Indonesia",
    amount: 92_000,
    accountId: ACC_CC_IVAN,
    date: "2026-09-28",
    parseStatus: "parsed",
    provider: "bca-cc",
  },
  // Rule-matched: Netflix (exact) → Entertainment/Streaming
  {
    merchant: "Netflix",
    amount: 186_000,
    accountId: ACC_CC_IVAN,
    date: "2026-09-29",
    parseStatus: "parsed",
    provider: "bca-cc",
  },
  // Rule-matched: Grab (contains) → Transport/Ride Hailing
  {
    merchant: "GRAB*trip 2026-09-30",
    amount: 42_000,
    accountId: ACC_BCA_IVAN,
    date: "2026-09-30",
    parseStatus: "parsed",
    provider: "bca",
  },
  // No rule — must stay UNKNOWN
  {
    merchant: "Blibli",
    amount: 450_000,
    accountId: ACC_BCA_VERO,
    date: "2026-09-30",
    parseStatus: "parsed",
    provider: "mandiri",
  },
  // No rule — must stay UNKNOWN
  {
    merchant: "Tokopedia",
    amount: 215_000,
    accountId: ACC_BCA_IVAN,
    date: "2026-10-01",
    parseStatus: "parsed",
    provider: "bca",
  },
];

const importedMessageRows: ImportedMessageRow[] = pendingDefs.map((d, i) => ({
  id: uuid(0x000a, i + 1),
  household_id: HOUSEHOLD_ID,
  source: "gmail",
  // Format: gmail-<provider>-<seq>. Real messages use Gmail's message id; this
  // keeps the shape (unique per source, idempotent on reseed) without pulling
  // in a fake Gmail id generator.
  source_message_id: `gmail-${d.provider}-${(i + 1).toString().padStart(4, "0")}`,
  provider: d.provider,
  parse_status: d.parseStatus,
  raw_metadata: {
    merchant: d.merchant,
    amount: d.amount,
    date: d.date,
    account_hint: d.accountId.slice(-4),
  },
}));

const pendingTxDefs = pendingDefs.map((d, i) => ({
  importMessageId: importedMessageRows[i]!.id,
  def: d,
}));

// -------------------------------------------------------------------------
// Transactions
//
// Most activity lives in September 2026 (last complete month). A few October
// 2026 transactions give the dashboard "this month" data (today is 2026-10-01
// per CLAUDE.md currentDate). Each type listed in the user's brief appears at
// least once: income, expense, transfer, credit card purchase, credit card
// payment, fund allocation, wedding expense (expense attached to a fund).
// -------------------------------------------------------------------------

interface TxRow {
  id: string;
  household_id: string;
  created_by_member_id: string | null;
  type: string;
  status: string;
  amount: number;
  currency: string;
  transaction_date: string;
  account_id: string | null;
  counter_account_id: string | null;
  category_id: string | null;
  fund_id: string | null;
  counter_fund_id: string | null;
  refund_of_transaction_id: string | null;
  merchant: string | null;
  note: string | null;
  imported_message_id: string | null;
}

let txSeq = 0;
const tx = (
  p: Partial<TxRow> & Pick<TxRow, "type" | "amount" | "transaction_date">,
): TxRow => ({
  id: uuid(0x0007, ++txSeq),
  household_id: HOUSEHOLD_ID,
  created_by_member_id: null,
  status: "confirmed",
  currency: "IDR",
  account_id: null,
  counter_account_id: null,
  category_id: null,
  fund_id: null,
  counter_fund_id: null,
  refund_of_transaction_id: null,
  merchant: null,
  note: null,
  imported_message_id: null,
  ...p,
});

const transactions: TxRow[] = [
  // -------- Fund allocations: seed each fund (Sep 1) --------
  tx({
    type: "fund_allocation",
    amount: 10_000_000,
    transaction_date: "2026-09-01",
    counter_fund_id: FUND_WEDDING,
    created_by_member_id: MEMBER_IVAN,
    note: "Initial wedding allocation",
  }),
  tx({
    type: "fund_allocation",
    amount: 25_000_000,
    transaction_date: "2026-09-01",
    counter_fund_id: FUND_HOUSE,
    created_by_member_id: MEMBER_IVAN,
    note: "Initial house allocation",
  }),
  tx({
    type: "fund_allocation",
    amount: 15_000_000,
    transaction_date: "2026-09-01",
    counter_fund_id: FUND_EMERGENCY,
    created_by_member_id: MEMBER_IVAN,
    note: "Initial emergency allocation",
  }),
  tx({
    type: "fund_allocation",
    amount: 5_000_000,
    transaction_date: "2026-09-01",
    counter_fund_id: FUND_VACATION,
    created_by_member_id: MEMBER_IVAN,
    note: "Initial vacation allocation",
  }),

  // -------- September income --------
  tx({
    type: "income",
    amount: 20_000_000,
    transaction_date: "2026-09-01",
    account_id: ACC_BCA_IVAN,
    category_id: catId("Income/Salary"),
    created_by_member_id: MEMBER_IVAN,
    merchant: "Employer A",
    note: "September salary",
  }),
  tx({
    type: "income",
    amount: 15_000_000,
    transaction_date: "2026-09-01",
    account_id: ACC_BCA_VERO,
    category_id: catId("Income/Salary"),
    created_by_member_id: MEMBER_VERO,
    merchant: "Employer B",
    note: "September salary",
  }),

  // -------- September debit/cash expenses --------
  tx({
    type: "expense",
    amount: 450_000,
    transaction_date: "2026-09-03",
    account_id: ACC_BCA_IVAN,
    category_id: catId("Food/Groceries"),
    merchant: "Ranch Market",
    created_by_member_id: MEMBER_IVAN,
  }),
  tx({
    type: "expense",
    amount: 180_000,
    transaction_date: "2026-09-05",
    account_id: ACC_BCA_VERO,
    category_id: catId("Food/Dining"),
    merchant: "Pizza Hut",
    created_by_member_id: MEMBER_VERO,
  }),
  tx({
    type: "expense",
    amount: 300_000,
    transaction_date: "2026-09-10",
    account_id: ACC_CASH,
    category_id: catId("Transport/Fuel"),
    merchant: "Pertamina",
    created_by_member_id: MEMBER_IVAN,
  }),
  tx({
    type: "expense",
    amount: 55_000,
    transaction_date: "2026-09-11",
    account_id: ACC_BCA_VERO,
    category_id: catId("Transport/Ride Hailing"),
    merchant: "Grab",
    created_by_member_id: MEMBER_VERO,
  }),
  tx({
    type: "expense",
    amount: 650_000,
    transaction_date: "2026-09-12",
    account_id: ACC_BCA_IVAN,
    category_id: catId("Bills/Electricity"),
    merchant: "PLN",
    created_by_member_id: MEMBER_IVAN,
  }),
  tx({
    type: "expense",
    amount: 400_000,
    transaction_date: "2026-09-12",
    account_id: ACC_BCA_IVAN,
    category_id: catId("Bills/Internet"),
    merchant: "Indihome",
    created_by_member_id: MEMBER_IVAN,
  }),
  tx({
    type: "expense",
    amount: 320_000,
    transaction_date: "2026-09-17",
    account_id: ACC_BCA_VERO,
    category_id: catId("Food/Groceries"),
    merchant: "Hero",
    created_by_member_id: MEMBER_VERO,
  }),
  tx({
    type: "expense",
    amount: 450_000,
    transaction_date: "2026-09-22",
    account_id: ACC_CASH,
    category_id: catId("Shopping/Household"),
    merchant: "Informa",
    created_by_member_id: MEMBER_VERO,
  }),

  // -------- September credit card purchases --------
  tx({
    type: "expense",
    amount: 85_000,
    transaction_date: "2026-09-07",
    account_id: ACC_CC_IVAN,
    category_id: catId("Food/Coffee"),
    merchant: "Starbucks",
    created_by_member_id: MEMBER_IVAN,
  }),
  tx({
    type: "expense",
    amount: 186_000,
    transaction_date: "2026-09-15",
    account_id: ACC_CC_IVAN,
    category_id: catId("Entertainment/Streaming"),
    merchant: "Netflix",
    created_by_member_id: MEMBER_IVAN,
  }),
  tx({
    type: "expense",
    amount: 240_000,
    transaction_date: "2026-09-19",
    account_id: ACC_CC_IVAN,
    category_id: catId("Food/Dining"),
    merchant: "Sushi Tei",
    created_by_member_id: MEMBER_IVAN,
  }),

  // -------- September transfer --------
  tx({
    type: "transfer",
    amount: 2_000_000,
    transaction_date: "2026-09-18",
    account_id: ACC_BCA_IVAN,
    counter_account_id: ACC_BCA_VERO,
    created_by_member_id: MEMBER_IVAN,
    note: "Joint household contribution",
  }),

  // -------- September CC payment (clears 85K+186K+240K = 511K) --------
  tx({
    type: "credit_card_payment",
    amount: 511_000,
    transaction_date: "2026-09-25",
    account_id: ACC_BCA_IVAN,
    counter_account_id: ACC_CC_IVAN,
    created_by_member_id: MEMBER_IVAN,
    note: "September CC payment",
  }),

  // -------- Wedding expense: expense tagged to Wedding fund --------
  tx({
    type: "expense",
    amount: 10_000_000,
    transaction_date: "2026-09-20",
    account_id: ACC_BCA_VERO,
    category_id: catId("Wedding/Venue"),
    fund_id: FUND_WEDDING,
    merchant: "The Venue Jakarta",
    created_by_member_id: MEMBER_VERO,
    note: "Venue deposit",
  }),

  // -------- October: current-month activity --------
  tx({
    type: "income",
    amount: 20_000_000,
    transaction_date: "2026-10-01",
    account_id: ACC_BCA_IVAN,
    category_id: catId("Income/Salary"),
    created_by_member_id: MEMBER_IVAN,
    merchant: "Employer A",
    note: "October salary",
  }),
  tx({
    type: "income",
    amount: 15_000_000,
    transaction_date: "2026-10-01",
    account_id: ACC_BCA_VERO,
    category_id: catId("Income/Salary"),
    created_by_member_id: MEMBER_VERO,
    merchant: "Employer B",
    note: "October salary",
  }),
  tx({
    type: "expense",
    amount: 380_000,
    transaction_date: "2026-10-02",
    account_id: ACC_BCA_IVAN,
    category_id: catId("Food/Groceries"),
    merchant: "Ranch Market",
    created_by_member_id: MEMBER_IVAN,
  }),
  tx({
    type: "expense",
    amount: 90_000,
    transaction_date: "2026-10-03",
    account_id: ACC_CC_IVAN,
    category_id: catId("Food/Coffee"),
    merchant: "Starbucks",
    created_by_member_id: MEMBER_IVAN,
  }),

  // -------- Pending imports (Money Inbox demo) --------
  // Status=pending, no category — they wait for the user to review.
  ...pendingTxDefs.map(({ importMessageId, def }) =>
    tx({
      type: "expense",
      status: "pending",
      amount: def.amount,
      transaction_date: def.date,
      account_id: def.accountId,
      merchant: def.merchant,
      imported_message_id: importMessageId,
      created_by_member_id: null,
    }),
  ),
];

// -------------------------------------------------------------------------
// Seed (wipe & reload)
// -------------------------------------------------------------------------

async function seed() {
  console.log(`Seeding dev household ${HOUSEHOLD_ID}`);

  await sql.begin(async (db) => {
    // 1. Wipe prior dev data.
    //    Deleting the household cascades to every household-scoped row
    //    (members, accounts, categories, funds, budgets, transactions,
    //    merchant_rules, imported_messages).
    await db`delete from households where id = ${HOUSEHOLD_ID}`;
    await db`
      delete from auth.users where id in (${USER_IVAN}, ${USER_VERO})
    `;

    // 2. Users
    await db`
      insert into auth.users ${db(
        [
          { id: USER_IVAN, email: "ivan-dev@vunds.local", name: "Ivan" },
          { id: USER_VERO, email: "vero-dev@vunds.local", name: "Vero" },
        ],
        "id",
        "email",
        "name",
      )}
    `;

    // 3. Household
    await db`
      insert into households (id, name, base_currency)
      values (${HOUSEHOLD_ID}, 'Ivan & Vero (dev)', 'IDR')
    `;

    // 4. Members
    await db`
      insert into household_members ${db(
        [
          {
            id: MEMBER_IVAN,
            household_id: HOUSEHOLD_ID,
            user_id: USER_IVAN,
            display_name: "Ivan",
            role: "owner",
          },
          {
            id: MEMBER_VERO,
            household_id: HOUSEHOLD_ID,
            user_id: USER_VERO,
            display_name: "Vero",
            role: "owner",
          },
        ],
        "id",
        "household_id",
        "user_id",
        "display_name",
        "role",
      )}
    `;

    // 5. Accounts
    await db`
      insert into accounts ${db(
        [
          {
            id: ACC_BCA_IVAN,
            household_id: HOUSEHOLD_ID,
            owner_member_id: MEMBER_IVAN,
            name: "BCA Ivan",
            type: "debit",
            opening_balance: 5_000_000,
            credit_limit: null,
          },
          {
            id: ACC_BCA_VERO,
            household_id: HOUSEHOLD_ID,
            owner_member_id: MEMBER_VERO,
            name: "BCA Vero",
            type: "debit",
            opening_balance: 3_000_000,
            credit_limit: null,
          },
          {
            id: ACC_CASH,
            household_id: HOUSEHOLD_ID,
            owner_member_id: null,
            name: "Cash",
            type: "cash",
            opening_balance: 1_000_000,
            credit_limit: null,
          },
          {
            id: ACC_CC_IVAN,
            household_id: HOUSEHOLD_ID,
            owner_member_id: MEMBER_IVAN,
            name: "Credit Card Ivan",
            type: "credit",
            opening_balance: 0,
            credit_limit: 15_000_000,
          },
        ],
        "id",
        "household_id",
        "owner_member_id",
        "name",
        "type",
        "opening_balance",
        "credit_limit",
      )}
    `;

    // 6. Categories (parents and children in one statement; FK is checked at
    //    end-of-statement in Postgres so order within the array doesn't matter,
    //    but we keep parent-before-child for readability).
    await db`
      insert into categories ${db(
        categoryRows,
        "id",
        "household_id",
        "parent_id",
        "name",
        "kind",
        "sort_order",
      )}
    `;

    // 7. Funds
    await db`
      insert into funds ${db(
        [
          {
            id: FUND_WEDDING,
            household_id: HOUSEHOLD_ID,
            name: "Wedding",
            target_amount: 50_000_000,
            currency: "IDR",
          },
          {
            id: FUND_HOUSE,
            household_id: HOUSEHOLD_ID,
            name: "House",
            target_amount: 500_000_000,
            currency: "IDR",
          },
          {
            id: FUND_EMERGENCY,
            household_id: HOUSEHOLD_ID,
            name: "Emergency",
            target_amount: 60_000_000,
            currency: "IDR",
          },
          {
            id: FUND_VACATION,
            household_id: HOUSEHOLD_ID,
            name: "Vacation",
            target_amount: 20_000_000,
            currency: "IDR",
          },
        ],
        "id",
        "household_id",
        "name",
        "target_amount",
        "currency",
      )}
    `;

    // 8. Budgets
    await db`
      insert into budgets ${db(
        budgetRows,
        "id",
        "household_id",
        "category_id",
        "period_year",
        "period_month",
        "amount",
        "currency",
      )}
    `;

    // 9. Merchant rules
    await db`
      insert into merchant_rules ${db(
        ruleRows,
        "id",
        "household_id",
        "pattern",
        "match_type",
        "category_id",
        "fund_id",
        "priority",
      )}
    `;

    // 10. Imported messages (parent of pending transactions via FK).
    //     `raw_metadata` is jsonb — pass as a JSON-stringified value via sql.json.
    await db`
      insert into imported_messages ${db(
        importedMessageRows.map((r) => ({
          ...r,
          raw_metadata: db.json(r.raw_metadata),
        })),
        "id",
        "household_id",
        "source",
        "source_message_id",
        "provider",
        "parse_status",
        "raw_metadata",
      )}
    `;

    // 11. Transactions
    await db`
      insert into transactions ${db(
        transactions,
        "id",
        "household_id",
        "created_by_member_id",
        "type",
        "status",
        "amount",
        "currency",
        "transaction_date",
        "account_id",
        "counter_account_id",
        "category_id",
        "fund_id",
        "counter_fund_id",
        "refund_of_transaction_id",
        "merchant",
        "note",
        "imported_message_id",
      )}
    `;
  });

  console.log(`  household      1`);
  console.log(`  members        2`);
  console.log(`  accounts       4`);
  console.log(`  categories     ${categoryRows.length}`);
  console.log(`  funds          4`);
  console.log(`  budgets        ${budgetRows.length}`);
  console.log(`  merchant rules ${ruleRows.length}`);
  console.log(`  imports        ${importedMessageRows.length}`);
  console.log(`  transactions   ${transactions.length}  (${pendingTxDefs.length} pending)`);
  console.log("Done.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
