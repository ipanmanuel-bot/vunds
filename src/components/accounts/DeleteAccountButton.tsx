"use client";

import { deleteAccountAction } from "@/app/accounts/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

// Confirms before submitting so a stray tap on a danger button doesn't wipe
// an account. The server action still gates with a transaction-count check,
// so even bypassing this dialog can't delete an account that has history.
export function DeleteAccountButton({ accountId }: { accountId: string }) {
  return (
    <form
      action={deleteAccountAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "Permanently delete this account? This only works if no transactions reference it.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="accountId" value={accountId} />
      <SubmitButton
        idleLabel="Delete account"
        pendingLabel="Deleting…"
        tone="danger"
      />
    </form>
  );
}
