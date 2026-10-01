import { Card } from "@/components/ui/Card";

// Default loading UI. Next.js shows this during server-component data fetches
// before the first byte of a route arrives. Kept intentionally minimal —
// one card-shaped shimmer that matches the resting layout rhythm.
export default function Loading() {
  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="pt-6">
          <div className="h-3 w-24 rounded-full bg-surface-tint" />
          <div className="mt-2 h-8 w-40 rounded-md bg-surface-tint" />
        </header>

        <main className="mt-6 flex flex-col gap-5">
          <Card className="p-6">
            <div className="h-3 w-28 rounded-full bg-surface-tint" />
            <div className="mt-3 h-10 w-48 rounded-md bg-surface-tint" />
            <div className="mt-5 h-16 rounded-xl bg-surface-tint" />
          </Card>
          <Card className="p-5">
            <div className="h-3 w-24 rounded-full bg-surface-tint" />
            <div className="mt-4 h-28 rounded-xl bg-surface-tint" />
          </Card>
        </main>
      </div>
    </div>
  );
}
