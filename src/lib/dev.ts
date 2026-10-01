// Dev-only constants. Phase 3 serves the dashboard for a single hardcoded
// household + period so the UI has realistic data to render before Auth.js
// (Phase 5) and the real "current month" logic (Phase 4+) land.

export const DEV_HOUSEHOLD_ID = "deadbeef-0001-0000-0000-000000000001";
export const DEV_MEMBER_IVAN = "deadbeef-0003-0000-0000-000000000001";
export const DEV_MEMBER_VERO = "deadbeef-0003-0000-0000-000000000002";

// Default dashboard period: September 2026. Today's seeded "current month"
// (October 2026) only has three days of data — September gives the Hero and
// comparison bars a mid-month-shaped data set.
export const DEV_PERIOD = { year: 2026, month: 9 } as const;

// "Signed in as" placeholder until Auth.js lands.
export const DEV_VIEWER = {
  memberId: DEV_MEMBER_IVAN,
  displayName: "Ivan",
} as const;
