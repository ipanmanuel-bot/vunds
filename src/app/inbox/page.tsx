import { GmailConnections } from "@/components/inbox/GmailConnections";
import { InboxItem } from "@/components/inbox/InboxItem";
import { Card } from "@/components/ui/Card";
import { listTokens } from "@/lib/gmail-tokens";
import { listPending } from "@/lib/inbox-data";

export const dynamic = "force-dynamic";

// Gmail sync can touch dozens of messages; the default 10s function budget
// is too tight. 60s is Vercel Hobby's max.
export const maxDuration = 60;

function parseFlash(sp: Record<string, string | string[] | undefined>): {
  kind: "sync" | "oauth" | null;
  message: string | null;
} {
  const first = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;

  const sync = first(sp.sync);
  if (sync) {
    // sync=source=fixtures|fetched=4|pending=2|…
    const bits = Object.fromEntries(
      sync.split("|").map((p) => p.split("=") as [string, string]),
    ) as Record<string, string>;
    const label = bits.source === "fixtures" ? "fixture sync" : "Gmail sync";
    const summary =
      `${label}: ${bits.pending ?? 0} new pending, ` +
      `${bits.partial ?? 0} partial, ` +
      `${bits.unknown ?? 0} unknown, ` +
      `${bits.duplicates ?? 0} duplicates skipped` +
      (bits.errors ? `, ${bits.errors} errors` : "");
    return { kind: "sync", message: summary };
  }

  const gmail = first(sp.gmail);
  const email = first(sp.email);
  if (gmail === "connected") {
    return {
      kind: "oauth",
      message: email ? `Gmail connected: ${email}` : "Gmail connected.",
    };
  }
  if (gmail === "disconnected") {
    return { kind: "oauth", message: "Gmail disconnected. Tokens removed." };
  }
  if (gmail) {
    return { kind: "oauth", message: `OAuth error: ${gmail}` };
  }
  return { kind: null, message: null };
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const flash = parseFlash(sp);

  const oauthReady = Boolean(
    process.env.AUTH_GOOGLE_CLIENT_ID &&
      process.env.AUTH_GOOGLE_CLIENT_SECRET &&
      process.env.AUTH_GOOGLE_REDIRECT_URI,
  );

  const [items, tokens] = await Promise.all([
    listPending(),
    listTokens().catch(() => []),
  ]);
  const connections = tokens.map((t) => ({
    id: t.id,
    accountEmail: t.accountEmail,
    scope: t.scope,
  }));

  const needsCategory = items.filter((i) => i.suggestion == null);
  const suggested = items.filter((i) => i.suggestion != null);

  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="pt-6">
          <p className="text-xs text-muted">Household finance</p>
          <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">
            Money Inbox
          </h1>
          <p className="mt-1 text-xs text-muted">
            Imported transactions waiting for review. Unknown merchants stay
            UNKNOWN until you set a category.
          </p>
        </header>

        <main className="mt-5 flex flex-col gap-5">
          <GmailConnections
            connections={connections}
            oauthReady={oauthReady}
            flash={{ message: flash.message }}
          />

          {items.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-muted">
                Nothing to review. All imported transactions have been resolved.
              </p>
            </Card>
          ) : (
            <>
              {needsCategory.length > 0 ? (
                <section>
                  <h2 className="mb-2 text-[11px] font-medium tracking-wide text-muted uppercase">
                    Needs category ({needsCategory.length})
                  </h2>
                  <div className="flex flex-col gap-2">
                    {needsCategory.map((i) => (
                      <InboxItem key={i.id} item={i} />
                    ))}
                  </div>
                </section>
              ) : null}

              {suggested.length > 0 ? (
                <section>
                  <h2 className="mb-2 text-[11px] font-medium tracking-wide text-muted uppercase">
                    Suggested ({suggested.length})
                  </h2>
                  <div className="flex flex-col gap-2">
                    {suggested.map((i) => (
                      <InboxItem key={i.id} item={i} />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
