// Single-user mode constants. Vunds is ready for real use but hasn't yet
// been wired to Auth.js, so every data query uses this hardcoded household
// and member. When sign-in lands these come from the session instead.

export const DEV_HOUSEHOLD_ID = "deadbeef-0001-0000-0000-000000000001";
export const DEV_MEMBER_IVAN = "deadbeef-0003-0000-0000-000000000001";
export const DEV_MEMBER_VERO = "deadbeef-0003-0000-0000-000000000002";

// Current calendar month in UTC. The dashboard and budgets page default to
// this when no explicit period is in the URL. Using UTC avoids a timezone-
// boundary bug on day 1 of a new month in the user's local timezone.
export function currentPeriod(): { year: number; month: number } {
  const now = new Date();
  return {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
  };
}

// "Signed in as" placeholder until Auth.js lands.
export const DEV_VIEWER = {
  memberId: DEV_MEMBER_IVAN,
  displayName: "Ivan",
} as const;
