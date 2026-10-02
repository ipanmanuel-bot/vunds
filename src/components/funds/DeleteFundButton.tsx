"use client";

import { deleteFundAction } from "@/app/goals/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

// Mirror of DeleteAccountButton. Browser confirm before posting; the
// server action still gates with a transaction-reference check so even
// bypassing the dialog can't delete a fund with history.
export function DeleteFundButton({ fundId }: { fundId: string }) {
  return (
    <form
      action={deleteFundAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "Permanently delete this fund? Only works if no transactions reference it.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="fundId" value={fundId} />
      <SubmitButton
        idleLabel="Delete fund"
        pendingLabel="Deleting…"
        tone="danger"
      />
    </form>
  );
}
