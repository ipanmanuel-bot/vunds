"use client";

import { useEffect, useState, useTransition } from "react";

import { archiveCategoryAction } from "@/app/categories/actions";
import { XIcon } from "@/components/ui/icons";

interface ArchiveButtonProps {
  categoryId: string;
  categoryName: string;
  // Total transactions blocking archive. For a parent category this must
  // include the parent's own transactions AND every descendant's
  // transactions (archiving cascades to subcategories).
  transactionCount: number;
  isParent: boolean;
}

export function ArchiveButton({
  categoryId,
  categoryName,
  transactionCount,
  isParent,
}: ArchiveButtonProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const blocked = transactionCount > 0;

  const close = () => {
    if (pending) return;
    setOpen(false);
    setError(null);
  };

  const handleArchive = () => {
    const fd = new FormData();
    fd.set("id", categoryId);
    startTransition(async () => {
      try {
        await archiveCategoryAction(fd);
        setOpen(false);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Something went wrong archiving this category.",
        );
      }
    });
  };

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pending]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Archive ${categoryName}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-tint hover:text-[color:var(--danger)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong"
      >
        <XIcon className="h-4 w-4" />
      </button>

      {open ? (
        <Dialog onDismiss={close}>
          {blocked ? (
            <BlockedBody
              categoryName={categoryName}
              transactionCount={transactionCount}
              isParent={isParent}
              onDismiss={close}
            />
          ) : (
            <ConfirmBody
              categoryName={categoryName}
              isParent={isParent}
              pending={pending}
              error={error}
              onCancel={close}
              onConfirm={handleArchive}
            />
          )}
        </Dialog>
      ) : null}
    </>
  );
}

// =========================================================================
// Dialog chrome — fixed overlay + centred card, closes on backdrop click.
// =========================================================================
function Dialog({
  children,
  onDismiss,
}: {
  children: React.ReactNode;
  onDismiss: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
      onClick={onDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-[var(--radius-card)] bg-surface p-6 shadow-[0_10px_40px_-10px_rgba(15,42,31,0.3)]"
      >
        {children}
      </div>
    </div>
  );
}

// =========================================================================
// "Can't archive — has transactions" body
// =========================================================================
function BlockedBody({
  categoryName,
  transactionCount,
  isParent,
  onDismiss,
}: {
  categoryName: string;
  transactionCount: number;
  isParent: boolean;
  onDismiss: () => void;
}) {
  const noun = transactionCount === 1 ? "transaction" : "transactions";
  const where = isParent
    ? "to this category or one of its subcategories"
    : "to this category";

  return (
    <>
      <h2 className="text-sm font-semibold">
        Can&rsquo;t archive &ldquo;{categoryName}&rdquo;
      </h2>
      <p className="mt-2 text-xs text-muted-strong">
        There {transactionCount === 1 ? "is" : "are"}{" "}
        <span className="font-semibold text-foreground">
          {transactionCount} {noun}
        </span>{" "}
        attached {where}. Vunds keeps the category available so your historical
        reports stay intact.
      </p>
      <p className="mt-2 text-[11px] text-muted">
        Reassign those transactions to a different category first, then try
        again.
      </p>
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-xl bg-foreground px-5 py-3 text-sm font-medium text-background"
        >
          Got it
        </button>
      </div>
    </>
  );
}

// =========================================================================
// Confirm-archive body
// =========================================================================
function ConfirmBody({
  categoryName,
  isParent,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  categoryName: string;
  isParent: boolean;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <>
      <h2 className="text-sm font-semibold">
        Archive &ldquo;{categoryName}&rdquo;?
      </h2>
      <p className="mt-2 text-xs text-muted-strong">
        {isParent
          ? "This hides the category and any subcategories under it from new transaction forms."
          : "This hides the subcategory from new transaction forms."}{" "}
        Nothing is deleted — historical reports keep their references.
      </p>
      {error ? (
        <p className="mt-3 rounded-xl bg-surface-tint px-3 py-2 text-[11px] text-[color:var(--danger)]">
          {error}
        </p>
      ) : null}
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-xl bg-surface-tint px-4 py-3 text-sm font-medium text-muted-strong"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="rounded-xl bg-[color:var(--danger)] px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Archiving…" : "Archive"}
        </button>
      </div>
    </>
  );
}
