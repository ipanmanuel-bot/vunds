// blu parser (BCA Digital).
//
// Two notification shapes seen in the wild:
//
//   QRIS (bluAccount source, no card tail):
//     Total
//     Rp
//     124.000
//     ,00
//     bluAccount
//     KIOSK_SOLARIA ALSUT LG 2
//     TANGERANG
//     Nominal Tagihan
//     Rp 124.000,00
//     Tgl & Jam Transaksi
//     29 Sep 2026 10:45:43 WIB
//     Tipe Transaksi
//     QRIS
//
//   Debit Online (bluDebit card source, has a card tail):
//     Total Bayar
//     Rp
//     411.865
//     ,00
//     bluAccount
//     Grab* 2-C8JHRXTWSA63TJ
//     Garuda x bluDebit Card
//     •••• •••• •••• 2919
//     Tgl & Jam Transaksi
//     30 Sep 2026 20:33:36 WIB
//     Tipe Transaksi
//     Debit Online
//
// Note the amount is split across up to three lines in the real HTML emails
// — see readMultiLineAmount in ./shared.ts.

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

const BLU_FROM_PATTERNS = [/@blubybcadigital\.id/i, /receipts@blu/i];

// Preference order: the authoritative transaction value first, display totals
// after. "Nominal Tagihan" and "Total Bayar" are the two labels blu uses for
// the transaction value; "Total" is a summary that typically equals it.
const AMOUNT_LABELS: RegExp[] = [
  /^Nominal Tagihan\b/i,
  /^Total Bayar\b/i,
  /^Total\b/i,
  /^Nominal\b/i,
];

function readAmount(lines: string[]): string | null {
  for (const label of AMOUNT_LABELS) {
    const idx = findLabelIdx(lines, label);
    if (idx === -1) continue;
    const multi = readMultiLineAmount(lines, idx + 1);
    if (multi) return multi;
    const next = lines[idx + 1]?.trim();
    if (next && /^(Rp|IDR)\s*[\d.,]/i.test(next)) return next;
  }
  return null;
}

// Merchant is the line(s) between "bluAccount" and the next section (card
// tail or Tgl/Nominal/Tipe/No. Ref). We cap at 2 lines because blu uses
// "<merchant>" + "<city>" for QRIS and "<merchant>" + "<card name>" for
// Debit Online — in the latter case the card-name line is the start of a
// section we actually want to skip, so we look for a "card tail" line
// (dots/digits-only) to detect it.
function readMerchant(lines: string[]): string | undefined {
  const idx = findLabelIdx(lines, /^bluAccount\b/i);
  if (idx === -1) return undefined;
  const parts: string[] = [];
  for (let i = idx + 1; i < lines.length && parts.length < 2; i++) {
    const l = lines[i]!;
    if (/^(Nominal|Total|Tipe|No\.?\s*Ref|Tgl|Lokasi)/i.test(l)) break;
    if (/^(Garuda|.* Card$)/i.test(l)) break; // card-name marker on Debit Online
    // Card tail line: "•••• •••• •••• 2919" (U+2022 bullet, U+00A0 nbsp)
    if (/^[\s*•·• ]+\d{3,}\s*$/.test(l)) break;
    parts.push(l);
  }
  return parts.join(" ").trim() || undefined;
}

// Debit Online emails include "•••• •••• •••• 2919" (last 4 of the card).
// QRIS emails have no card tail — accountIdentifier stays undefined and
// the user resolves it on the inbox form.
function readCardTail(lines: string[]): string | undefined {
  // Masked card tail line: "•••• •••• •••• 2919". Masking character set
  // includes U+2022 (bullet), U+00B7 (middle dot), U+2027 (hyphenation
  // point), ASCII `*`, and U+00A0 (nbsp).
  const match = lines.find((l) => /^[\s*•·‧ •]+\d{3,}\s*$/.test(l));
  return match ? extractAccountId(match) : undefined;
}

export const bluParser: BankParser = {
  provider: "blu",

  canHandle(message: GmailMessage): boolean {
    return BLU_FROM_PATTERNS.some((p) => p.test(message.from));
  },

  parse(message: GmailMessage): ParsedTransaction | null {
    const text = message.bodyText || htmlToText(message.bodyHtml ?? "");
    if (!text || text.length < 20) return null;
    const lines = toLines(text);

    const amountRaw = readAmount(lines);
    if (!amountRaw) return null;
    const amount = parseMoney(amountRaw);
    if (amount === null) return null;

    const dateRaw =
      valueAfter(lines, /^Tgl\s*&?\s*Jam/i) ??
      valueAfter(lines, /^Tanggal\b/i);
    const parsedDate = dateRaw ? parseDate(dateRaw) : null;
    const transactionDate =
      parsedDate ??
      (message.internalDate
        ? new Date(Number(message.internalDate))
        : new Date());

    const merchant = readMerchant(lines);
    const accountIdentifier = readCardTail(lines);

    const txType = valueAfter(lines, /^Tipe Transaksi\b/i)?.toLowerCase() ?? "";
    // Bank-to-bank outgoing transfers aren't spending (and would double-
    // count against the counterparty). Everything else blu notifies on
    // (QRIS, Debit Online, pembayaran) is a purchase.
    if (/^transfer\b/i.test(txType) || /\btransfer\b/i.test(message.subject)) {
      return null;
    }
    const isPurchase =
      /qris|pembayaran|payment|belanja|purchase|debit\s+online|transaksi/i.test(
        message.subject,
      ) ||
      /qris|pembayaran|payment|purchase|debit\s+online/i.test(txType);
    if (!isPurchase) return null;

    const referenceRaw = valueAfter(lines, /^No\.?\s*Ref\b/i);
    const providerReference = referenceRaw?.replace(/\s+/g, "") || undefined;

    const confidence: "high" | "low" =
      merchant && parsedDate ? "high" : "low";

    return {
      provider: "blu",
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
        merchant_raw: merchant ?? null,
        date_raw: dateRaw ?? null,
        amount_raw: amountRaw,
        tx_type: txType || null,
        card_tail: accountIdentifier ?? null,
      },
    };
  },
};
