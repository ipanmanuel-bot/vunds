"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { renameCategoryAction } from "@/app/categories/actions";

// Autosaving name input. Saves after a short debounce when the user stops
// typing, on blur, and on Enter. No visible Save button — the pending
// transition subtly dims the field while the server call is in flight.
export function AutosaveName({
  id,
  initialName,
  className,
  ariaLabel,
}: {
  id: string;
  initialName: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [name, setName] = useState(initialName);
  const [lastSaved, setLastSaved] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const save = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === lastSaved) return;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("name", trimmed);
    startTransition(async () => {
      await renameCategoryAction(fd);
      setLastSaved(trimmed);
    });
  };

  useEffect(() => () => clearTimer(), []);

  return (
    <input
      type="text"
      value={name}
      onChange={(e) => {
        setName(e.target.value);
        clearTimer();
        const next = e.target.value;
        timer.current = setTimeout(() => save(next), 600);
      }}
      onBlur={() => {
        clearTimer();
        save(name);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          setName(lastSaved);
          clearTimer();
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      maxLength={60}
      aria-label={ariaLabel ?? "Category name"}
      aria-busy={pending}
      className={`${className ?? ""} ${pending ? "opacity-70" : ""}`.trim()}
    />
  );
}
