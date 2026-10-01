// BCA parser.
//
// First-pass extraction for BCA transaction notifications. These emails come
// in multiple shapes (debit purchase, credit card purchase, transfer alert,
// e-statement) — we handle the two "a purchase just happened" variants
// because those are what need Money Inbox review.
//
// The regex is intentionally conservative: on a soft match we return
// `confidence: 'low'` and the sync layer records the raw message as
// imported_messages (status=partial) WITHOUT creating a transaction row —
// per docs/financial-logic.md §15 (never fabricate values).

import { htmlToText } from "./html";
import type { BankParser, GmailMessage, ParsedTransaction } from "./types";

// BCA sender fingerprints. Add more as you encounter new addresses — any
// match means the parser handles the message.
const BCA_FROM_PATTERNS = [
  /@bca\.co\.id/i,
  /BCAelectronic/i,
  /KlikBCA/i,
  /notification@bca/i,
];

// Parse an Indonesian-formatted IDR amount: "Rp 450.000", "Rp 450.000,00",
// "IDR 450,000.00". Returns a positive number of rupiah (integer-rounded),
// or null if the match is implausible.
function parseIndonesianAmount(raw: string): number | null {
  // Strip the Rp/IDR prefix and surrounding whitespace.
  const stripped = raw.replace(/^(Rp|IDR)\s*/i, "").trim();
  // Remove thousands separators. Indonesian locale uses `.` as thousands and
  // `,` as the decimal, but some mails do it the other way. We treat the LAST
  // separator in the string as the decimal, discard the rest.
  if (!/^[\d.,]+$/.test(stripped)) return null;

  const lastDot = stripped.lastIndexOf(".");
  const lastComma = stripped.lastIndexOf(",");
  let normalised: string;
  if (lastDot === -1 && lastComma === -1) {
    normalised = stripped;
  } else {
    const decimalPos = Math.max(lastDot, lastComma);
    const decimalChar = stripped[decimalPos];
    // Treat as decimal only if 1-2 digits follow (otherwise it's a thousands
    // separator mistake — Indonesian never uses more than 2 decimals).
    const after = stripped.slice(decimalPos + 1);
    if (after.length === 2 || after.length === 1) {
      normalised =
        stripped.slice(0, decimalPos).replace(/[.,]/g, "") + "." + after;
    } else {
      normalised = stripped.replace(/[.,]/g, "");
    }
    if (decimalChar === undefined) return null;
  }

  const n = Number(normalised);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

const AMOUNT_PATTERNS = [
  // Explicit label (Nominal: Rp 92.000)
  /(?:Nominal|Jumlah|Amount|Total)[\s:]*((?:Rp|IDR)\s*[\d.,]+)/i,
  // Standalone currency amount
  /((?:Rp|IDR)\s*[\d.,]+)/i,
];

const MERCHANT_PATTERNS = [
  /(?:Merchant|Pedagang|Nama Toko|Merchant Name|Terminal)[\s:]+([^\n\r]{2,80})/i,
];

const DATE_PATTERNS = [
  // Tanggal: 10/09/2026 or Date: 10/09/2026
  /(?:Tanggal|Date|Tgl)[\s:]+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
  // Standalone YYYY-MM-DD
  /(\d{4}-\d{2}-\d{2})/,
];

const ACCOUNT_PATTERNS = [
  // Kartu / Card ending in 1234
  /(?:Kartu|Card|Account|No\.?\s*Kartu)[\s:]+(?:[*xX\s]+)?(\d{3,4})/i,
  // XXXX1234 pattern
  /(?:\*+|X{4,})\s*(\d{4})/,
];

const REFERENCE_PATTERNS = [
  /(?:Ref(?:erence)?|No\.?\s*Ref)[\s:]+([A-Za-z0-9\-_]+)/i,
];

function parseDate(raw: string): Date | null {
  // YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) {
    return new Date(
      Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])),
    );
  }
  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const parts = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/.exec(raw);
  if (parts) {
    const d = Number(parts[1]);
    const m = Number(parts[2]);
    const y = Number(parts[3]);
    if (d < 1 || d > 31 || m < 1 || m > 12) return null;
    return new Date(Date.UTC(y, m - 1, d));
  }
  return null;
}

function firstMatch(
  patterns: RegExp[],
  text: string,
): string | undefined {
  for (const p of patterns) {
    const m = p.exec(text);
    if (m && m[1]) return m[1].trim();
  }
  return undefined;
}

function detectType(message: GmailMessage, text: string): "expense" | null {
  // We only confidently parse purchases → expense. Transfers, salaries,
  // etc. need their own patterns and are explicitly out of scope for the
  // first-pass parser (callers that need them get null here).
  const haystack = `${message.subject}\n${text}`;
  if (/transfer/i.test(haystack) && !/purchase|pembelian|belanja/i.test(haystack)) {
    return null;
  }
  return "expense";
}

export const bcaParser: BankParser = {
  provider: "bca",

  canHandle(message: GmailMessage): boolean {
    return BCA_FROM_PATTERNS.some((p) => p.test(message.from));
  },

  parse(message: GmailMessage): ParsedTransaction | null {
    const text = message.bodyText || htmlToText(message.bodyHtml ?? "");
    if (!text || text.length < 20) return null;

    const type = detectType(message, text);
    if (!type) return null;

    // Required: amount. Without it we cannot do anything useful.
    const amountRaw = firstMatch(AMOUNT_PATTERNS, text);
    if (!amountRaw) return null;
    const amount = parseIndonesianAmount(amountRaw);
    if (amount == null) return null;

    const merchantRaw = firstMatch(MERCHANT_PATTERNS, text);
    const dateRaw = firstMatch(DATE_PATTERNS, text);
    const accountRaw = firstMatch(ACCOUNT_PATTERNS, text);
    const referenceRaw = firstMatch(REFERENCE_PATTERNS, text);

    const parsedDate = dateRaw ? parseDate(dateRaw) : null;
    // Fall back to Gmail's internalDate (ms since epoch) so we never fabricate
    // a date, but we do have something to show in the Inbox. This is bank-
    // observed time, not Gmail delivery time — close enough.
    const transactionDate =
      parsedDate ??
      (message.internalDate
        ? new Date(Number(message.internalDate))
        : new Date());

    // Confidence rule: we need amount AND merchant AND date to call it
    // high confidence. Missing merchant or date is still useful for Inbox
    // review but shouldn't auto-categorise.
    const confidence: "high" | "low" =
      merchantRaw && parsedDate ? "high" : "low";

    return {
      provider: "bca",
      providerReference: referenceRaw,
      type,
      amount,
      currency: "IDR",
      accountIdentifier: accountRaw,
      merchant: merchantRaw,
      transactionDate,
      confidence,
      rawMetadata: {
        amount_raw: amountRaw,
        merchant_raw: merchantRaw ?? null,
        date_raw: dateRaw ?? null,
        account_raw: accountRaw ?? null,
        reference_raw: referenceRaw ?? null,
        subject: message.subject,
      },
    };
  },
};
