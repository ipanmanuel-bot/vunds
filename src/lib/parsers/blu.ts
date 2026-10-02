// blu parser (BCA Digital).
//
// blu notification emails use a label-above-value structure. The HTML
// decomposes to blocks like:
//
//     Total
//     Rp124.000,00
//     Ivan Manuel Hermawan
//     bluAccount
//     KIOSK_SOLARIA ALSUT LG 2
//     TANGERANG
//     Nominal Tagihan
//     Rp124.000,00
//     Tgl & Jam Transaksi
//     29 Sep 2026 10:45:43 WIB
//     Tipe Transaksi
//     QRIS
//     No. Ref blu
//     6535 4253 4336
//
// blu is app-only — no card number appears in the body. Pending transactions
// get account_id=NULL and the user picks the account on the confirm form.

import { htmlToText } from "./html";
import type { BankParser, GmailMessage, ParsedTransaction } from "./types";

const BLU_FROM_PATTERNS = [
  /@blubybcadigital\.id/i,
  /receipts@blu/i,
];

const AMOUNT_PATTERN = /^Rp\s*([\d.,]+)/;
const INDO_DATE_PATTERN =
  /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Mei|Jun|Jul|Aug|Agu|Sep|Oct|Okt|Nov|Dec|Des)[a-z]*\s+(\d{4})/i;

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, mei: 4, jun: 5,
  jul: 6, aug: 7, agu: 7, sep: 8, oct: 9, okt: 9, nov: 10, dec: 11, des: 11,
};

function parseAmount(raw: string): number | null {
  const stripped = raw.replace(/^Rp\s*/i, "").trim();
  if (!/^[\d.,]+$/.test(stripped)) return null;
  // Indonesian: "." thousands, "," decimal → strip "." then replace "," with "."
  const normalised = stripped.replace(/\./g, "").replace(",", ".");
  const n = Number(normalised);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function parseIndoDate(raw: string): Date | null {
  const m = INDO_DATE_PATTERN.exec(raw);
  if (!m) return null;
  const day = Number(m[1]);
  const month = MONTH_INDEX[m[2]!.toLowerCase().slice(0, 3)];
  const year = Number(m[3]);
  if (month === undefined) return null;
  return new Date(Date.UTC(year, month, day));
}

// Find the index of the first line that equals or starts with the given label.
function findLabel(lines: string[], label: string | RegExp): number {
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    if (typeof label === "string") {
      if (l === label || l.startsWith(label)) return i;
    } else {
      if (label.test(l)) return i;
    }
  }
  return -1;
}

function valueAfter(lines: string[], label: string | RegExp): string | null {
  const idx = findLabel(lines, label);
  if (idx === -1 || idx + 1 >= lines.length) return null;
  return lines[idx + 1]!;
}

export const bluParser: BankParser = {
  provider: "blu",

  canHandle(message: GmailMessage): boolean {
    return BLU_FROM_PATTERNS.some((p) => p.test(message.from));
  },

  parse(message: GmailMessage): ParsedTransaction | null {
    const text = message.bodyText || htmlToText(message.bodyHtml ?? "");
    if (!text || text.length < 20) return null;

    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // ---- Amount ----
    // Prefer "Nominal Tagihan" (the authoritative transaction value) over
    // "Total" (which may include fees). Fall back to the first standalone
    // "Rp..." line if neither label is found.
    let amountRaw =
      valueAfter(lines, "Nominal Tagihan") ??
      valueAfter(lines, "Nominal") ??
      valueAfter(lines, "Total");
    if (!amountRaw) {
      amountRaw = lines.find((l) => AMOUNT_PATTERN.test(l)) ?? null;
    }
    const amount = amountRaw ? parseAmount(amountRaw) : null;
    if (amount === null) return null;

    // ---- Date ----
    // "Tgl & Jam Transaksi" → next line is "29 Sep 2026 HH:MM:SS WIB".
    const dateRaw =
      valueAfter(lines, /^Tgl\s*&?\s*Jam/i) ??
      valueAfter(lines, /^Tanggal/i);
    const parsedDate = dateRaw ? parseIndoDate(dateRaw) : null;
    const transactionDate =
      parsedDate ??
      (message.internalDate
        ? new Date(Number(message.internalDate))
        : new Date());

    // ---- Merchant ----
    // Appears right after "bluAccount" (and before "Nominal"). The next 1-2
    // lines are the merchant name and often a city — join both into one
    // display string.
    let merchant: string | undefined;
    const merchantIdx = findLabel(lines, /^bluAccount|^Account$/);
    if (merchantIdx !== -1) {
      const parts: string[] = [];
      // Collect lines until we hit the "Nominal" or similar section header.
      for (let i = merchantIdx + 1; i < lines.length && parts.length < 2; i++) {
        const l = lines[i]!;
        if (/^(Nominal|Total|Tipe|No\.?\s*Ref|Tgl)/i.test(l)) break;
        parts.push(l);
      }
      merchant = parts.join(" ").trim() || undefined;
    }

    // ---- Reference ----
    const referenceRaw = valueAfter(lines, /^No\.?\s*Ref/i);
    const providerReference = referenceRaw?.replace(/\s+/g, "") || undefined;

    // ---- Type ----
    // We only confidently classify as 'expense' for QRIS/payment/purchase
    // emails. "Transfer Keluar" style outgoing transfers could be modelled
    // as expense too — but a bank-to-bank transfer isn't spending, and
    // double-counting with a counterparty's incoming email is a real risk.
    // Keep that out of scope for the first pass.
    const txType = valueAfter(lines, /^Tipe Transaksi/i)?.toLowerCase() ?? "";
    const isPurchase =
      /qris|pembayaran|payment|belanja|purchase/i.test(message.subject) ||
      /qris|pembayaran|payment|purchase/i.test(txType);
    if (!isPurchase) return null;

    const confidence: "high" | "low" =
      merchant && parsedDate ? "high" : "low";

    return {
      provider: "blu",
      providerReference,
      type: "expense",
      amount,
      currency: "IDR",
      // No card tail in blu notifications — account_id resolution happens
      // via the user picking it on the Inbox confirm form.
      accountIdentifier: undefined,
      merchant,
      transactionDate,
      confidence,
      rawMetadata: {
        subject: message.subject,
        merchant_raw: merchant ?? null,
        date_raw: dateRaw ?? null,
        amount_raw: amountRaw ?? null,
        tx_type: txType || null,
      },
    };
  },
};
