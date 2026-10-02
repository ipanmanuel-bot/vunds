// Parser registry.
//
// Add a bank by (a) implementing a BankParser and (b) registering it here.
// Order doesn't matter for correctness — `canHandle` is specific per bank —
// but we keep providers alphabetical for predictability.

import { bcaParser } from "./bca";
import { bluParser } from "./blu";
import { ocbcParser } from "./ocbc";
import type { BankParser, GmailMessage } from "./types";

export const parsers: readonly BankParser[] = [bcaParser, bluParser, ocbcParser];

export function findParser(message: GmailMessage): BankParser | null {
  for (const p of parsers) {
    if (p.canHandle(message)) return p;
  }
  return null;
}
