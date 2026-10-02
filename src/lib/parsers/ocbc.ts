// OCBC parser.
//
// Handles two email variants from `notifikasi@ocbc.id`:
//
//   1. "Credit Card Transaction Notification" — a purchase on an OCBC CC.
//      Shape (after HTML → text):
//         Credit Card Number
//         Nomor Kartu Kredit
//         -1774                           ← last 4 digits
//         Date   Merchant Name   -   Amount
//         Tanggal
//         30/09/26  ADOBE *ADOBE 800-333  -  IDR214,008.00
//
//   2. "Successful QR Payment to <merchant>" — a QRIS payment from an OCBC
//      savings account. Shape:
//         FROM
//         <Full Name>
//         IDR 634810187332 Savings       ← source account number
//         ...
//         TO
//         QR Payment
//         Merchant PAN <long number>
//         <Merchant Name>
//         <City>, <Postcode>
//         ...
//         Amount Pay IDR 109499.00
//         ...
//         Payment Date: 29/09/2026
//         Reference No.: MB...

import { htmlToText } from "./html";
import type { BankParser, GmailMessage, ParsedTransaction } from "./types";

const OCBC_FROM_PATTERNS = [
  /notifikasi@ocbc\.id/i,
  /@ocbc\.id/i,
  /@ocbcnisp\./i,
];

// =========================================================================
// Shared amount parsing
// =========================================================================

// OCBC uses "IDR214,008.00" (US-style thousands + decimal). Different from
// BCA's Indonesian "Rp214.008,00".
function parseOcbcAmount(raw: string): number | null {
  const stripped = raw.replace(/^IDR\s*/i, "").trim();
  if (!/^[\d.,]+$/.test(stripped)) return null;
  // Last "." is the decimal if followed by 1-2 digits; "," is thousands.
  const normalised = stripped.replace(/,/g, "");
  const n = Number(normalised);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

function parseIsoLikeDate(raw: string): Date | null {
  // DD/MM/YY or DD/MM/YYYY — both are present in OCBC emails.
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(raw);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += 2000;
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

// =========================================================================
// Credit Card Transaction Notification
// =========================================================================

function parseCreditCard(
  message: GmailMessage,
  text: string,
): ParsedTransaction | null {
  // Last 4 digits — appears on its own line as "-1774".
  const cardMatch = /(?:^|\s)-(\d{4})(?:\s|$)/m.exec(text);
  const accountIdentifier = cardMatch?.[1];

  // Transaction row: date, merchant, amount, often inline in the table body
  // after the HTML strip. Pattern tolerates "-" or whitespace separators.
  const rowMatch =
    /(\d{2}\/\d{2}\/\d{2,4})\s+(.{3,80}?)\s*-\s*IDR\s*([\d.,]+)/i.exec(text);
  if (!rowMatch) return null;

  const dateRaw = rowMatch[1]!;
  const merchantRaw = rowMatch[2]!.trim();
  const amountRaw = rowMatch[3]!;

  const amount = parseOcbcAmount(amountRaw);
  if (amount === null) return null;

  const parsedDate = parseIsoLikeDate(dateRaw);
  const transactionDate =
    parsedDate ??
    (message.internalDate
      ? new Date(Number(message.internalDate))
      : new Date());

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
// QR Payment Successful
// =========================================================================

function parseQrPayment(
  message: GmailMessage,
  text: string,
): ParsedTransaction | null {
  const amountMatch = /Amount Pay\s+IDR\s*([\d.,]+)/i.exec(text);
  if (!amountMatch) return null;
  const amount = parseOcbcAmount(amountMatch[1]!);
  if (amount === null) return null;

  // Source account number: "IDR 634810187332 Savings" — grab the digits.
  const accountMatch = /IDR\s+(\d{6,20})\s+Savings/i.exec(text);
  // Use the last 4 digits as the identifier so it matches our
  // external_identifier convention.
  const fullAccount = accountMatch?.[1];
  const accountIdentifier = fullAccount?.slice(-4);

  // Merchant: between "Merchant PAN <digits>" and the first upper-case city
  // line followed by a postcode. We fall back to subject if that fails.
  let merchant: string | undefined;
  const merchantMatch = /Merchant PAN\s+\d+\s+([\s\S]+?)\s+(?:Terminal No\.|Acquirer Name)/i.exec(
    text,
  );
  if (merchantMatch) {
    merchant = merchantMatch[1]!
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || undefined;
  }
  if (!merchant) {
    const subjMatch = /to\s+(.{3,100})$/i.exec(message.subject);
    if (subjMatch) merchant = subjMatch[1]!.trim();
  }

  // Date: "Payment Date: 29/09/2026"
  const dateMatch =
    /Payment Date\s*:\s*(\d{2}\/\d{2}\/\d{2,4})/i.exec(text) ||
    /Instruction Date\s*:\s*(\d{2}\/\d{2}\/\d{2,4})/i.exec(text);
  const parsedDate = dateMatch ? parseIsoLikeDate(dateMatch[1]!) : null;
  const transactionDate =
    parsedDate ??
    (message.internalDate
      ? new Date(Number(message.internalDate))
      : new Date());

  const referenceMatch =
    /Reference No\.?\s*:\s*([A-Za-z0-9-]+)/i.exec(text) ||
    /Reff No\.\s*([0-9]+)/i.exec(text);

  const confidence: "high" | "low" =
    merchant && parsedDate ? "high" : "low";

  return {
    provider: "ocbc",
    providerReference: referenceMatch?.[1],
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
      amount_raw: amountMatch[1]!,
      merchant_raw: merchant ?? null,
      date_raw: dateMatch?.[1] ?? null,
      account_full: fullAccount ?? null,
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
