import { NextResponse, type NextRequest } from "next/server";

import { syncGmail } from "@/lib/gmail/sync";

// Scheduled Gmail import. Registered in vercel.json. Vercel invokes this
// endpoint from its own cron infrastructure; it attaches the CRON_SECRET
// as an Authorization header so unauthenticated internet traffic hitting
// this URL cannot trigger it.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const expected = process.env.CRON_SECRET;
  const got = req.headers.get("authorization");

  // Only enforce in prod — allows local manual invocation without the header.
  if (process.env.NODE_ENV === "production") {
    if (!expected) {
      return NextResponse.json(
        { ok: false, error: "CRON_SECRET not set" },
        { status: 500 },
      );
    }
    if (got !== `Bearer ${expected}`) {
      return NextResponse.json(
        { ok: false, error: "unauthorised" },
        { status: 401 },
      );
    }
  }

  // Phase: single household only (DEV_HOUSEHOLD). When Auth.js lands and
  // we support multiple households, iterate here.
  try {
    const result = await syncGmail();
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("cron sync-gmail failed", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
