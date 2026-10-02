// Build the Gmail search query that targets bank-notification mails.
//
// We push filtering server-side (Gmail evaluates the query) so we don't
// download the whole mailbox. The query is derived from the registered
// parsers' sender hints — adding a bank parser extends this query
// automatically via `fromClause`.

export interface GmailFetcherOptions {
  // Explicit list of sender domains / addresses to look at. Empty = anything.
  fromHints: string[];
  // How many days back to search. Defaults to 30 — plenty for a dev app.
  daysBack?: number;
  maxResults?: number;
}

export function buildQuery(opts: GmailFetcherOptions): string {
  const parts: string[] = [];
  if (opts.fromHints.length > 0) {
    const or = opts.fromHints.map((h) => `from:${h}`).join(" OR ");
    parts.push(`(${or})`);
  }
  parts.push(`newer_than:${opts.daysBack ?? 30}d`);
  parts.push("-in:spam -in:trash");
  return parts.join(" ");
}

// Known sender hints per bank. Keep this list conservative; a parser's
// canHandle() is still the gate — this is just to narrow the Gmail query.
export const BANK_FROM_HINTS = [
  "bca.co.id",
  "blubybcadigital.id",
  "ocbc.id",
];
