"use client";

import { useRouter } from "next/navigation";

import { Card } from "@/components/ui/Card";

// Root error boundary. Catches thrown errors from server components and
// server actions so the user sees a styled explanation instead of Next.js's
// default error page. Deliberately generic — no stack, no error.digest in the
// UI; those details stay in server logs.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="pt-6">
          <p className="text-xs text-muted">Something broke</p>
          <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">
            Hit a snag loading this view
          </h1>
          <p className="mt-1 text-xs text-muted">
            The server reported an error. Your financial data is unchanged.
          </p>
        </header>

        <main className="mt-5 flex flex-col gap-3">
          <Card className="p-5">
            <p className="text-sm text-muted-strong">
              Try again; if it keeps failing, check the server logs for the
              root cause. The problem is almost always transient (database
              timeout, missing env var, etc.).
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={reset}
                className="flex-1 rounded-xl bg-foreground py-3 text-sm font-medium text-background"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-xl bg-surface-tint px-5 py-3 text-sm font-medium text-muted-strong"
              >
                Go home
              </button>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
