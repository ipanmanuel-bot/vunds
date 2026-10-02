// Shared parser helpers.
//
// Bank-notification emails all look vaguely similar after HTML stripping:
// label and value lines, sometimes with a bare ":" line between them. These
// helpers encode that shape without each adapter re-inventing it.

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, mei: 4, jun: 5,
  jul: 6, aug: 7, agu: 7, sep: 8, oct: 9, okt: 9, nov: 10, dec: 11, des: 11,
};

export function toLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

// Index of the first line matching `label`. Regex is anchored (`/^Foo\b/`) by
// the caller — this keeps callers explicit about prefix vs exact matches.
export function findLabelIdx(lines: string[], label: RegExp): number {
  for (let i = 0; i < lines.length; i++) {
    if (label.test(lines[i]!)) return i;
  }
  return -1;
}

// Return the value that follows a label. Handles three real-world shapes:
//
//   (a) "Label: value"           — inline, colon on same line
//   (b) "Label" / ":" / "value"  — table-ish, bare colon between
//   (c) "Label" / "value"        — label row + value row
export function valueAfter(lines: string[], label: RegExp): string | null {
  const idx = findLabelIdx(lines, label);
  if (idx === -1) return null;
  const line = lines[idx]!;

  // (a) inline after a colon on the same line
  const colonIdx = line.indexOf(":");
  if (colonIdx !== -1) {
    const after = line.slice(colonIdx + 1).trim();
    if (after.length > 0) return after;
  }

  // (b) ":" alone on next line → value on line after
  const next1 = lines[idx + 1]?.trim() ?? "";
  if (/^:\s*$/.test(next1)) {
    const v = lines[idx + 2]?.trim();
    return v && !/^:\s*$/.test(v) ? v : null;
  }

  // (c) next line is the value
  if (next1 && !/^:\s*$/.test(next1)) return next1;
  return null;
}

// Rupiah amounts in bank emails come in several wire shapes:
//   "Rp 92.000,00"             — Indonesian locale (BCA, blu subject lines)
//   "IDR214,008.00"            — US-style (OCBC)
//   "Rp\n124.000\n,00"         — blu HTML emails split the mantissa and
//                                the fractional part across lines
//
// Returns a positive integer-rupiah amount, or null when the input doesn't
// look like money (NEVER fabricate — per docs/financial-logic.md §15).
export function parseMoney(raw: string): number | null {
  const stripped = raw.replace(/^(Rp|IDR)\s*/i, "").replace(/\s+/g, "").trim();
  if (!/^[\d.,]+$/.test(stripped)) return null;

  const lastDot = stripped.lastIndexOf(".");
  const lastComma = stripped.lastIndexOf(",");
  const decimalPos = Math.max(lastDot, lastComma);

  let normalised: string;
  if (decimalPos === -1) {
    normalised = stripped;
  } else {
    const after = stripped.slice(decimalPos + 1);
    // Treat the last separator as a decimal only if 1-2 digits follow.
    if (after.length === 1 || after.length === 2) {
      normalised =
        stripped.slice(0, decimalPos).replace(/[.,]/g, "") + "." + after;
    } else {
      normalised = stripped.replace(/[.,]/g, "");
    }
  }

  const n = Number(normalised);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

// Starting at `startIdx`, read a "Rp ..." amount that may be split across up
// to three lines ("Rp" / "124.000" / ",00"). Returns the reassembled raw
// string (not yet parsed to a number), or null if nothing amount-shaped is
// in reach.
export function readMultiLineAmount(
  lines: string[],
  startIdx: number,
): string | null {
  const line1 = lines[startIdx]?.trim();
  if (!line1) return null;

  // (a) one line already contains the whole amount
  if (/^(Rp|IDR)\s*[\d.,]+/i.test(line1)) return line1;

  // (b) "Rp" alone — mantissa on next line, optional ",NN" after that
  if (/^(Rp|IDR)\s*$/i.test(line1)) {
    const line2 = lines[startIdx + 1]?.trim();
    if (!line2 || !/^[\d.,]+$/.test(line2)) return null;
    const line3 = lines[startIdx + 2]?.trim() ?? "";
    if (/^,\d{1,2}$/.test(line3)) return `${line1} ${line2}${line3}`;
    return `${line1} ${line2}`;
  }

  return null;
}

// Parse a transaction date out of the various bank-mail formats:
//   "28 Sep 2026 12:52:33 WIB"      — Indonesian abbreviated-month style
//   "30/09/26" / "30/09/2026"       — DD/MM/YY or DD/MM/YYYY
//   "13-08-2026 08:33:19 WIB"       — dashes
//   "2026-09-28"                    — ISO
export function parseDate(raw: string): Date | null {
  const trimmed = raw.trim();

  const indo = /^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/.exec(trimmed);
  if (indo) {
    const d = Number(indo[1]);
    const m = MONTH_INDEX[indo[2]!.toLowerCase().slice(0, 3)];
    const y = Number(indo[3]);
    if (m !== undefined) return new Date(Date.UTC(y, m, d));
  }

  const dmy = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/.exec(trimmed);
  if (dmy) {
    const d = Number(dmy[1]);
    const m = Number(dmy[2]);
    let y = Number(dmy[3]);
    if (y < 100) y += 2000;
    if (d < 1 || d > 31 || m < 1 || m > 12) return null;
    return new Date(Date.UTC(y, m - 1, d));
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    return new Date(
      Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])),
    );
  }

  return null;
}

// Reduce a masked account/card string to the household's external_identifier.
//
//   "455633XXXX8409"             → "8409"  (BCA credit card)
//   "6044****98"                 → "6044"  (BCA Tahapan, myBCA journal)
//   "•••• •••• •••• 2919"        → "2919"  (blu Debit Online)
//   "XXXX XXXX XXXX 1234"        → "1234"  (synthetic test fixtures)
//   "634810187332"               → "7332"  (OCBC Savings, full number)
//
// Rule: when the string has multiple digit groups AND the last group is
// exactly 4 digits, use that tail. When the last tail is <4 but the first
// group is ≥4, use the first-four (the Indonesian "first N visible"
// variant). Otherwise fall back to the last four of whatever we found.
export function extractAccountId(raw: string): string | undefined {
  if (!raw) return undefined;
  const groups = raw.match(/\d+/g);
  if (!groups || groups.length === 0) return undefined;

  const last = groups[groups.length - 1]!;
  if (last.length === 4) return last;

  const first = groups[0]!;
  if (first.length >= 4 && groups.length > 1) return first.slice(0, 4);

  if (last.length >= 4) return last.slice(-4);
  return undefined;
}
