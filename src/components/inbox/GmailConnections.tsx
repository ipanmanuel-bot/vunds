import {
  disconnectGmailAction,
  syncFixturesAction,
  syncGmailAction,
} from "@/app/inbox/actions";
import { SubmitButton } from "@/components/inbox/SubmitButton";
import { Card } from "@/components/ui/Card";

export interface GmailConnection {
  id: string;
  accountEmail: string;
  scope: string;
}

export function GmailConnections({
  connections,
  oauthReady,
  flash,
}: {
  connections: GmailConnection[];
  oauthReady: boolean;
  flash: { message: string | null };
}) {
  const hasAny = connections.length > 0;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                hasAny
                  ? "bg-[color:var(--accent-strong)]"
                  : "bg-[color:var(--muted)]"
              }`}
              aria-hidden
            />
            <p className="text-sm font-semibold">Gmail import</p>
          </div>
          <p className="mt-1 text-[11px] text-muted">
            {hasAny
              ? `${connections.length} inbox${connections.length === 1 ? "" : "es"} connected · read-only`
              : oauthReady
                ? "Not connected. Grants read-only Gmail access only."
                : "Not configured. Set AUTH_GOOGLE_* in Vercel env, or try fixtures."}
          </p>
        </div>
      </div>

      {hasAny ? (
        <ul className="mt-4 flex flex-col gap-2">
          {connections.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-xl bg-surface-tint px-3 py-2"
            >
              <span className="min-w-0 truncate text-xs font-medium">
                {c.accountEmail}
              </span>
              <form action={disconnectGmailAction}>
                <input type="hidden" name="tokenId" value={c.id} />
                <button
                  type="submit"
                  className="shrink-0 rounded-md bg-surface px-2 py-1 text-[11px] font-medium text-muted-strong hover:text-[color:var(--danger)]"
                >
                  Disconnect
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-col gap-2">
        {hasAny ? (
          <form action={syncGmailAction}>
            <SubmitButton
              idleLabel="Sync all inboxes now"
              pendingLabel="Syncing — this can take up to a minute…"
            />
          </form>
        ) : null}

        <a
          href={oauthReady ? "/api/gmail/oauth/start" : "#"}
          aria-disabled={!oauthReady}
          className={`block w-full rounded-xl py-3 text-center text-sm font-medium ${
            oauthReady
              ? hasAny
                ? "bg-surface-tint text-muted-strong"
                : "bg-foreground text-background"
              : "bg-surface-tint text-muted"
          }`}
        >
          {hasAny ? "Connect another Gmail" : "Connect Gmail (read-only)"}
        </a>

        <form action={syncFixturesAction}>
          <SubmitButton
            idleLabel="Sync fixture messages (dev)"
            pendingLabel="Syncing fixtures…"
            tone="muted"
          />
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
