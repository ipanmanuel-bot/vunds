// OCBC parser (notifikasi@ocbc.id).
//
// Two subject variants:
//
//   "Credit Card Transaction Notification" — OCBC CC purchase. HTML table
//   that strips to:
//       Credit Card Number
//       Nomor Kartu Kredit
//       -1774                      ← last 4 of the card
//       Date
//       Tanggal
//       Merchant Name - Amount
//       Nama Merchant - Jumlah
//       30/09/26                   ← date (its own line)
//       ADOBE *ADOBE 800-333 - IDR214,008.00
//
//   "Successful QR Payment to <merchant>" — OCBC savings QRIS. Strips to:
//       FROM
//       <Full Name>
//       IDR
//       634810187332               ← source account (full number)
//       Savings
//       …
//       Merchant PAN
//       9360091430001309515
//       <Merchant Name>
//       <City>, <Postcode>
//       Amount Pay
//       IDR 109499.00
//       Payment Date:
//       29/09/2026
//       Reference No.: MB…

import { htmlToText } from "./html";
import {
  extractAccountId,
  findLabelIdx,
  parseDate,
  parseMoney,
  toLines,
  valueAfter,
} from "./shared";
import type { BankParser, GmailMessage, ParsedTransaction } from "./types";

const OCBC_FROM_PATTERNS = [
  /notifikasi@ocbc\.id/i,
  /@ocbc\.id/i,
  /@ocbcnisp\./i,
];

// =========================================================================
// Credit Card Transaction Notification
// =========================================================================

function parseCreditCard(
  message: GmailMessage,
  text: string,
): ParsedTransaction | null {
  const lines = toLines(text);

  // Last-4 of the card: shown as "-1774" on its own line in HTML emails.
  // Fallback: inline "...-1774..." in plain-text clients.
  const cardLine = lines.find((l) => /^-\s*\d{4}$/.test(l));
  const cardInline =
    cardLine ?? /(?:^|\s)-(\d{4})(?:\s|$)/m.exec(text)?.[0] ?? "";
  const accountIdentifier =
    cardLine?.replace(/\D/g, "") || extractAccountId(cardInline);

  // Transaction row: "<merchant> - IDR<amount>". ".+?" non-greedy so an
  // internal dash (e.g. "ADOBE 800-333") doesn't eat the separator.
  const rowMatch = /([^\n]+?)\s+-\s+IDR\s*([\d,.]+)/i.exec(text);
  if (!rowMatch) return null;

  // The amount line may be preceded by a date on the same line in some
  // email clients; strip that off before using as the merchant.
  let merchantRaw = rowMatch[1]!.trim();
  const inlineDate = /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+/.exec(merchantRaw);
  const amountRaw = rowMatch[2]!;

  if (inlineDate) merchantRaw = merchantRaw.slice(inlineDate[0].length).trim();

  const amount = parseMoney(amountRaw);
  if (amount === null) return null;

  // Date: either inlined on the amount row, or on a standalone line (real
  // emails put it on its own line between the header and the amount row).
  const dateFromLine = lines.find((l) => /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(l));
  const dateRaw = inlineDate?.[1] ?? dateFromLine ?? null;
  const parsedDate = dateRaw ? parseDate(dateRaw) : null;
  const transactionDate =
    parsedDate ??
    (message.internalDate ? new Date(Number(message.internalDate)) : new Date());

  const confidence: "high" | "low" =
    merchantRaw && parsedDate ? "high" : "low";

  return {
    provider: "ocbc",
    type: "expense",
    amount,
    currency: "IDR",
    accountIdentifier,
    merchant: merchantRaw,
    transactionDate,
    confidence,
    rawMetadata: {
      subject: message.subject,
      variant: "credit_card",
      amount_raw: amountRaw,
      date_raw: dateRaw,
      merchant_raw: merchantRaw,
      card_raw: accountIdentifier ?? null,
    },
  };
}

// =========================================================================
// Successful QR Payment
// =========================================================================

// Source savings-account number: appears as a bare 10-16 digit line
// followed by "Savings" / "Giro" / "Tabungan". We take the last 4 of the
// full number to match our external_identifier convention.
function findSourceAccount(lines: string[]): string | undefined {
  for (let i = 0; i < lines.length - 1; i++) {
    if (/^\d{10,16}$/.test(lines[i]!) &&
        /^(Savings|Giro|Tabungan)/i.test(lines[i + 1]!)) {
      return lines[i]!.slice(-4);
    }
  }
  // Fallback: "IDR 634810187332 Savings" inline (old fixture / plain-text).
  const inlineMatch = /IDR\s+(\d{10,16})\s+(Savings|Giro|Tabungan)/i.exec(
    lines.join("\n"),
  );
  return inlineMatch?.[1]?.slice(-4);
}

// Merchant name: on the line below the Merchant PAN digits. When the body
// has "Merchant PAN <digits>" inline, the merchant is on the very next line.
function findMerchant(
  lines: string[],
  subject: string,
): string | undefined {
  const idx = findLabelIdx(lines, /^Merchant PAN\b/i);
  if (idx !== -1) {
    const inlineRest = lines[idx]!.replace(/^Merchant PAN\s*/i, "").trim();
    // Case A: "Merchant PAN <digits>" inline → merchant on next line.
    if (/^\d{10,}$/.test(inlineRest)) {
      return lines[idx + 1]?.trim();
    }
    // Case B: "Merchant PAN" alone, digits on next line, merchant on line
    // after.
    const next = lines[idx + 1]?.trim();
    if (next && /^\d{10,}$/.test(next)) return lines[idx + 2]?.trim();
    // Case C: unusual — treat whatever follows the label as merchant.
    if (next) return next;
  }
  const subjMatch = /\bto\s+(.{3,100})$/i.exec(subject);
  return subjMatch?.[1]?.trim();
}

function parseQrPayment(
  message: GmailMessage,
  text: string,
): ParsedTransaction | null {
  const lines = toLines(text);

  // Amount: "Amount Pay" / "IDR 109499.00"  (or inline "Amount Pay IDR …")
  const amountRaw = valueAfter(lines, /^Amount Pay\b/i);
  if (!amountRaw) return null;
  const amount = parseMoney(amountRaw);
  if (amount === null) return null;

  const accountIdentifier = findSourceAccount(lines);
  const merchant = findMerchant(lines, message.subject);

  // Date: "Payment Date:" / "29/09/2026"  (or inline)
  const dateRaw =
    valueAfter(lines, /^Payment Date\b/i) ??
    valueAfter(lines, /^Instruction Date\b/i);
  const parsedDate = dateRaw ? parseDate(dateRaw) : null;
  const transactionDate =
    parsedDate ??
    (message.internalDate ? new Date(Number(message.internalDate)) : new Date());

  const referenceRaw =
    valueAfter(lines, /^Reference No\.?\b/i) ??
    valueAfter(lines, /^Reff No\.?\b/i);
  const providerReference = referenceRaw
    ? referenceRaw.replace(/\s+was successfully.*$/i, "").trim()
    : undefined;

  const confidence: "high" | "low" =
    merchant && parsedDate ? "high" : "low";

  return {
    provider: "ocbc",
    providerReference,
    type: "expense",
    amount,
    currency: "IDR",
    accountIdentifier,
    merchant,
    transactionDate,
    confidence,
    rawMetadata: {
      subject: message.subject,
      variant: "qr_payment",
      amount_raw: amountRaw,
      merchant_raw: merchant ?? null,
      date_raw: dateRaw ?? null,
      account_tail: accountIdentifier ?? null,
    },
  };
}

// =========================================================================
// Public parser — dispatches by subject.
// =========================================================================

export const ocbcParser: BankParser = {
  provider: "ocbc",

  canHandle(message: GmailMessage): boolean {
    return OCBC_FROM_PATTERNS.some((p) => p.test(message.from));
  },

  parse(message: GmailMessage): ParsedTransaction | null {
    const text = message.bodyText || htmlToText(message.bodyHtml ?? "");
    if (!text || text.length < 20) return null;

    const subject = message.subject;
    if (/Credit Card Transaction/i.test(subject)) {
      return parseCreditCard(message, text);
    }
    if (/QR Payment/i.test(subject)) {
      return parseQrPayment(message, text);
    }
    return null;
  },
};
