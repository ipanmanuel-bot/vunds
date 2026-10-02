"use client";

import Link from "next/link";
import { useState } from "react";

import { createAccountAction } from "@/app/accounts/actions";
import { Card } from "@/components/ui/Card";
import {
  FormField,
  inputClass,
  selectClass,
} from "@/components/ui/FormField";
import type { MemberOption } from "@/lib/transactions-data";

type AccountType = "debit" | "cash" | "credit";

export interface AccountDefaults {
  name?: string;
  type?: AccountType;
  ownerMemberId?: string | null;
  openingBalance?: number;
  creditLimit?: number | null;
  externalIdentifier?: string | null;
}

export function AccountForm({
  members,
  defaults,
  action = createAccountAction,
  accountId,
  // In edit mode we lock the type (converting between debit/credit after
  // transactions exist breaks the balance math — safer to archive and
  // create a new account if you really mis-typed it).
  isEdit = false,
  submitLabel = "Create account",
  cancelHref = "/accounts",
}: {
  members: MemberOption[];
  defaults?: AccountDefaults;
  action?: (fd: FormData) => Promise<void>;
  accountId?: string;
  isEdit?: boolean;
  submitLabel?: string;
  cancelHref?: string;
}) {
  // Local state so the conditional fields (credit limit, identifier) react
  // to the type dropdown without a form submit.
  const [type, setType] = useState<AccountType>(defaults?.type ?? "debit");

  const isCredit = type === "credit";
  const isCash = type === "cash";

  return (
    <Card className="p-5">
      <form action={action} className="flex flex-col gap-4">
        {accountId ? (
          <input type="hidden" name="accountId" value={accountId} />
        ) : null}

        <FormField label="Name" htmlFor="name">
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={60}
            defaultValue={defaults?.name ?? ""}
            placeholder="e.g. BCA Ivan"
            className={inputClass}
          />
        </FormField>

        <FormField
          label="Type"
          htmlFor="type"
          hint={
            isEdit
              ? "Type is locked after creation — archive and recreate if you need to change it."
              : "Debit = bank account. Cash = physical cash. Credit = credit card."
          }
        >
          <select
            id="type"
            name="type"
            required
            value={type}
            onChange={(e) => setType(e.target.value as AccountType)}
            disabled={isEdit}
            className={selectClass}
          >
            <option value="debit">Debit (bank)</option>
            <option value="cash">Cash</option>
            <option value="credit">Credit card</option>
          </select>
          {isEdit ? (
            // When the <select> is disabled it is excluded from the submitted
            // FormData — surface the value via a hidden input so the server
            // still sees it.
            <input type="hidden" name="type" value={type} />
          ) : null}
        </FormField>

        <FormField label="Owner" htmlFor="ownerMemberId">
          <select
            id="ownerMemberId"
            name="ownerMemberId"
            defaultValue={defaults?.ownerMemberId ?? ""}
            className={selectClass}
          >
            <option value="">Joint (whole household)</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Opening balance (IDR)"
          htmlFor="openingBalance"
          hint={
            isCredit
              ? "For a credit card this is the opening outstanding (usually 0 for a fresh card)."
              : "The amount in this account on day one. Not counted as income."
          }
        >
          <input
            id="openingBalance"
            name="openingBalance"
            type="number"
            inputMode="numeric"
            step="1"
            min="0"
            required
            defaultValue={defaults?.openingBalance ?? 0}
            className={inputClass}
          />
        </FormField>

        {isCredit ? (
          <FormField
            label="Credit limit (IDR)"
            htmlFor="creditLimit"
            hint="Required for credit cards. Available credit is limit − outstanding."
          >
            <input
              id="creditLimit"
              name="creditLimit"
              type="number"
              inputMode="numeric"
              step="1"
              min="1"
              required
              defaultValue={defaults?.creditLimit ?? ""}
              className={inputClass}
            />
          </FormField>
        ) : null}

        {!isCash ? (
          <FormField
            label="Card / account identifier (optional)"
            htmlFor="externalIdentifier"
            hint="Last 4 digits of the card or account number. Used to match Gmail import notifications to this account."
          >
            <input
              id="externalIdentifier"
              name="externalIdentifier"
              type="text"
              inputMode="numeric"
              maxLength={8}
              defaultValue={defaults?.externalIdentifier ?? ""}
              placeholder="e.g. 1234"
              className={inputClass}
            />
          </FormField>
        ) : null}

        <div className="mt-2 flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-foreground py-3 text-sm font-medium text-background"
          >
            {submitLabel}
          </button>
          <Link
            href={cancelHref}
            className="rounded-xl bg-surface-tint px-5 py-3 text-sm font-medium text-muted-strong"
          >
            Cancel
          </Link>
        </div>
      </form>
    </Card>
  );
}
