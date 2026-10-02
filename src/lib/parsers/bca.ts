// BCA parser.
//
// Three real-world variants we extract from (sanitized sample at ../../../
// docs/parser-samples.md if you need to see one):
//
//   1. BCAelectronic@bca.co.id / notification@bca.co.id — classic debit
//      card purchase. HTML table that strips to a column of label / ":" /
//      value triples.
//
//   2. KartuKreditBCA@klikbca.com — credit card purchase. Same label /
//      ":" / value shape:
//          Nomor Kartu   :   455633XXXX8409
//          Merchant / ATM:   APPLE.COM/BILL
//          Pada Tanggal  :   13-08-2026 08:33:19 WIB
//          Sejumlah      :   IDR 85.000
//
//   3. bca@bca.co.id "Internet Transaction Journal" — myBCA QRIS payment:
//          Payment to       :   CEMILAN KERATON
//          Source of Fund   :   TAHAPAN - 6044****98
//          Total Payment    :   IDR 86,000.00
//          Transaction Date :   28 Sep 2026 12:52:33
//
// Returning `confidence: 'low'` leaves the message as a `partial` import
// without a transaction row (docs/financial-logic.md §15).

import { htmlToText } from "./html";
import {
  extractAccountId,
  findLabelIdx,
  parseDate,
  parseMoney,
  readMultiLineAmount,
  toLines,
  valueAfter,
} from "./shared";
import type { BankParser, GmailMessage, ParsedTransaction } from "./types";

const BCA_FROM_PATTERNS = [
  /@bca\.co\.id/i,
  /BCAelectronic/i,
  /KlikBCA/i,
  /KartuKreditBCA/i,
  /@klikbca\.com/i,
  /notification@bca/i,
];

// Labels that identify a transaction amount. More specific (longer) labels
// are tried first so "Total Payment" wins over bare "Total".
const AMOUNT_LABELS: RegExp[] = [
  /^Total Payment\b/i, // myBCA QRIS
  /^Sejumlah\b/i,      // BCA CC (KartuKreditBCA)
  /^Nominal\b/i,
  /^Jumlah\b/i,
  /^Amount\b/i,
  /^Total\b/i,
];

const MERCHANT_LABELS: RegExp[] = [
  /^Payment to\b/i,          // myBCA QRIS
  /^Merchant\s*\/\s*ATM\b/i, // KartuKreditBCA
  /^Merchant\b/i,
  /^Pedagang\b/i,
  /^Nama Toko\b/i,
];

const DATE_LABELS: RegExp[] = [
  /^Transaction Date\b/i, // myBCA QRIS
  /^Pada Tanggal\b/i,     // KartuKreditBCA
  /^Tanggal\b/i,
  /^Date\b/i,
  /^Tgl\b/i,
];

const ACCOUNT_LABELS: RegExp[] = [
  /^Source of Fund\b/i, // myBCA QRIS
  /^Nomor Kartu\b/i,    // KartuKreditBCA
  /^No\.?\s*Kartu\b/i,
  /^Kartu\b/i,
  /^Account\b/i,
];

const REFERENCE_LABELS: RegExp[] = [
  /^Reference No\.?\b/i,
  /^No\.?\s*Ref(?:erence)?\b/i,
  /^Ref\b/i,
];

function readAmount(lines: string[]): string | null {
  for (const label of AMOUNT_LABELS) {
    const idx = findLabelIdx(lines, label);
    if (idx === -1) continue;
    const multi = readMultiLineAmount(lines, idx + 1);
    if (multi) return multi;
    // Inline: "Nominal: Rp 92.000,00"
    const line = lines[idx]!;
    const colonIdx = line.indexOf(":");
    if (colonIdx !== -1) {
      const inline = line.slice(colonIdx + 1).trim();
      if (/^(Rp|IDR)/i.test(inline)) return inline;
    }
    // "Label" / ":" / "Rp 92.000"
    if (/^:\s*$/.test(lines[idx + 1] ?? "")) {
      const v = lines[idx + 2]?.trim();
      if (v && /^(Rp|IDR)/i.test(v)) return v;
    }
    // Fallback — next line is the value
    const next = lines[idx + 1]?.trim();
    if (next && /^(Rp|IDR)/i.test(next)) return next;
  }
  // Last-resort: a standalone "Rp 42.000" anywhere in the body. Used when
  // the body has no clear label (synthetic "low-confidence" samples).
  for (const l of lines) {
    const m = /((?:Rp|IDR)\s*[\d.,]{3,})/i.exec(l);
    if (m) return m[1]!;
  }
  return null;
}

function firstHit(lines: string[], labels: RegExp[]): string | undefined {
  for (const label of labels) {
    const v = valueAfter(lines, label);
    if (v) return v;
  }
  return undefined;
}

export const bcaParser: BankParser = {
  provider: "bca",

  canHandle(message: GmailMessage): boolean {
    return BCA_FROM_PATTERNS.some((p) => p.test(message.from));
  },

  parse(message: GmailMessage): ParsedTransaction | null {
    const text = message.bodyText || htmlToText(message.bodyHtml ?? "");
    if (!text || text.length < 20) return null;
    const lines = toLines(text);

    // Scope: outgoing transfers aren't purchases. If the subject screams
    // "Transfer" and nothing in the body indicates a purchase/payment,
    // bail. (Catching both ends avoids double-counting with a counterparty
    // notification.)
    const haystack = `${message.subject}\n${text}`;
    if (
      /\btransfer\b/i.test(message.subject) &&
      !/(purchase|pembayaran|belanja|qris|credit card|kartu kredit)/i.test(
        haystack,
      )
    ) {
      return null;
    }

    const amountRaw = readAmount(lines);
    if (!amountRaw) return null;
    const amount = parseMoney(amountRaw);
    if (amount === null) return null;

    const merchantRaw = firstHit(lines, MERCHANT_LABELS);
    const dateRaw = firstHit(lines, DATE_LABELS);
    const accountSource = firstHit(lines, ACCOUNT_LABELS);
    const referenceRaw = firstHit(lines, REFERENCE_LABELS);

    const accountIdentifier = accountSource
      ? extractAccountId(accountSource)
      : undefined;
    const parsedDate = dateRaw ? parseDate(dateRaw) : null;
    const transactionDate =
      parsedDate ??
      (message.internalDate
        ? new Date(Number(message.internalDate))
        : new Date());

    const confidence: "high" | "low" =
      merchantRaw && parsedDate ? "high" : "low";

    return {
      provider: "bca",
      providerReference: referenceRaw?.replace(/\s+/g, " ").trim() || undefined,
      type: "expense",
      amount,
      currency: "IDR",
      accountIdentifier,
      merchant: merchantRaw ?? undefined,
      transactionDate,
      confidence,
      rawMetadata: {
        subject: message.subject,
        amount_raw: amountRaw,
        merchant_raw: merchantRaw ?? null,
        date_raw: dateRaw ?? null,
        account_raw: accountSource ?? null,
        reference_raw: referenceRaw ?? null,
      },
    };
  },
};
