import Link from "next/link";

import { Card } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="pt-6">
          <p className="text-xs text-muted">404</p>
          <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-tight">
            Page not found
          </h1>
          <p className="mt-1 text-xs text-muted">
            The route you tried does not exist in Vunds.
          </p>
        </header>

        <main className="mt-5">
          <Card className="p-5">
            <p className="text-sm text-muted-strong">
              If you got here from a link inside Vunds, that is a bug —
              please let us know what you clicked.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background"
            >
              Back to dashboard
            </Link>
          </Card>
        </main>
      </div>
    </div>
  );
}
