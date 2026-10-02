import Link from "next/link";

import { createFundAction } from "@/app/goals/actions";
import { AmountInput } from "@/components/ui/AmountInput";
import { Card } from "@/components/ui/Card";
import { FormField, inputClass } from "@/components/ui/FormField";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ArrowRightIcon } from "@/components/ui/icons";

export const dynamic = "force-dynamic";

export default function NewFundPage() {
  return (
    <div className="min-h-dvh pb-28">
      <div className="mx-auto max-w-md px-5">
        <header className="pt-6">
          <Link
            href="/goals"
            className="inline-flex items-center gap-1 text-xs text-muted"
          >
            <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" /> Goals
          </Link>
          <h1 className="mt-2 text-[28px] leading-tight font-semibold tracking-tight">
            New fund
          </h1>
          <p className="mt-1 text-xs text-muted">
            A fund is a virtual pocket — what you intend money for, independent
            of which account it sits in.
          </p>
        </header>

        <main className="mt-5">
          <Card className="p-5">
            <form action={createFundAction} className="flex flex-col gap-4">
              <FormField label="Name" htmlFor="name">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  maxLength={60}
                  placeholder="e.g. Wedding, Emergency, Reimbursables"
                  className={inputClass}
                />
              </FormField>

              <FormField
                label="Target amount (IDR, optional)"
                htmlFor="targetAmount"
                hint="Leave empty for an ongoing pocket (no finish line). Add a target when this is a savings goal."
              >
                <AmountInput id="targetAmount" name="targetAmount" />
              </FormField>

              <div className="mt-2 flex gap-2">
                <div className="flex-1">
                  <SubmitButton
                    idleLabel="Create fund"
                    pendingLabel="Creating…"
                  />
                </div>
                <Link
                  href="/goals"
                  className="rounded-xl bg-surface-tint px-5 py-3 text-sm font-medium text-muted-strong"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </Card>
        </main>
      </div>
    </div>
  );
}
