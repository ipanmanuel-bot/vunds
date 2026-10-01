import {
  disconnectGmailAction,
  syncFixturesAction,
  syncGmailAction,
} from "@/app/inbox/actions";
import { Card } from "@/components/ui/Card";

interface GmailStatusProps {
  connected: boolean;
  accountEmail: string | null;
  tokenScope: string | null;
  oauthReady: boolean;
  flash: {
    kind: "sync" | "oauth" | null;
    message: string | null;
  };
}

export function GmailStatus({
  connected,
  accountEmail,
  tokenScope,
  oauthReady,
  flash,
}: GmailStatusProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected
                  ? "bg-[color:var(--accent-strong)]"
                  : "bg-[color:var(--muted)]"
              }`}
              aria-hidden
            />
            <p className="text-sm font-semibold">Gmail import</p>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {connected
              ? `Connected${accountEmail ? ` as ${accountEmail}` : ""}`
              : oauthReady
                ? "Not connected. Grants read-only Gmail access only."
                : "Not configured. Set AUTH_GOOGLE_* in .env.local, or try fixtures."}
          </p>
          {connected && tokenScope ? (
            <p className="mt-1 text-[10px] text-muted">
              Scope: <span className="font-mono">{tokenScope}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {connected ? (
          <>
            <form action={syncGmailAction}>
              <button
                type="submit"
                className="w-full rounded-xl bg-foreground py-3 text-sm font-medium text-background"
              >
                Sync Gmail now
              </button>
            </form>
            <form action={disconnectGmailAction}>
              <button
                type="submit"
                className="w-full rounded-xl bg-surface-tint py-2 text-xs font-medium text-muted-strong"
              >
                Disconnect
              </button>
            </form>
          </>
        ) : (
          <a
            href={oauthReady ? "/api/gmail/oauth/start" : "#"}
            aria-disabled={!oauthReady}
            className={`block w-full rounded-xl py-3 text-center text-sm font-medium ${
              oauthReady
                ? "bg-foreground text-background"
                : "bg-surface-tint text-muted"
            }`}
          >
            Connect Gmail (read-only)
          </a>
        )}

        <form action={syncFixturesAction}>
          <button
            type="submit"
            className="w-full rounded-xl bg-surface-tint py-2 text-xs font-medium text-muted-strong"
            title="Dev-only: runs the same sync pipeline against bundled sample bank emails."
          >
            Sync fixture messages (dev)
          </button>
        </form>
      </div>

      {flash.message ? (
        <p className="mt-3 rounded-xl bg-surface-tint px-3 py-2 text-[11px] text-muted-strong">
          {flash.message}
        </p>
      ) : null}
    </Card>
  );
}
