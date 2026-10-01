// Bank parser contract.
//
// Design per docs/gmail-integration.md §PARSER ARCHITECTURE: one adapter per
// bank, all producing the same normalised shape. Adding a bank is a new file
// implementing `BankParser` plus a registry entry.
//
// Return `null` on failure. Return `confidence: 'low'` on partial parses. In
// both cases the sync code records the raw message as `imported_messages`
// with status `unknown` or `partial` and creates NO transaction row — the
// "unknown stays UNKNOWN" principle.

import type { TransactionType } from "@/lib/finance";

export interface GmailMessage {
  // Gmail message id — the authoritative dedup key.
  id: string;
  threadId?: string;
  // Milliseconds since epoch as a string, from Gmail's `internalDate`.
  internalDate?: string;
  from: string;
  subject: string;
  // Decoded text content, best-effort. The HTML version is passed too so
  // parsers can fall back to it if needed.
  bodyText: string;
  bodyHtml?: string;
}

export interface ParsedTransaction {
  provider: string; // 'bca', 'mandiri', ...
  providerReference?: string; // bank-internal transaction reference
  type: TransactionType;
  amount: number; // positive
  currency: string;
  // Masked identifier the bank included for the user's account (e.g. last 4
  // digits). The sync layer maps this to one of the household's accounts.
  accountIdentifier?: string;
  merchant?: string;
  transactionDate: Date;
  confidence: "high" | "low";
  // Everything the parser noticed. Stored on imported_messages.raw_metadata
  // so review flows can show the raw source if needed.
  rawMetadata: Record<string, string | number | boolean | null>;
}

export interface BankParser {
  provider: string;
  // Fast check against the message headers so we don't run heavy parsing on
  // obviously non-bank mail.
  canHandle(message: GmailMessage): boolean;
  // Return a ParsedTransaction on a high-confidence match, a low-confidence
  // ParsedTransaction if we only got some fields, or null if the message
  // doesn't look like a transaction at all.
  parse(message: GmailMessage): ParsedTransaction | null;
}
