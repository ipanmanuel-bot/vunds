// Minimal HTML → plain-text converter.
//
// Enough for bank email bodies (mostly tables of key/value pairs). We don't
// pull in a dependency because:
//   * our inputs are tightly bounded (one bank at a time)
//   * robustness is more about field-extraction regex than DOM fidelity
//   * dropping dependencies is a stated project principle

const BLOCK_TAGS = new Set([
  "br",
  "tr",
  "td",
  "th",
  "p",
  "div",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

export function htmlToText(html: string): string {
  if (!html) return "";

  // Strip <script> and <style> blocks whole.
  let out = html.replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");

  // Insert newlines before block-level opening tags and after their closes.
  out = out.replace(/<\/?([a-zA-Z0-9]+)[^>]*>/g, (_, tag: string) => {
    return BLOCK_TAGS.has(tag.toLowerCase()) ? "\n" : "";
  });

  // Decode a handful of common entities. Not a full XML entity table — we
  // only care about what shows up in bank mails.
  out = out
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

  // Collapse whitespace, keep line breaks.
  out = out.replace(/[ \t]+/g, " ").replace(/\n\s+/g, "\n").trim();
  return out;
}
