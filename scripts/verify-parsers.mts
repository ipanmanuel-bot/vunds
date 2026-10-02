// Verify parsers against the user's real .eml samples. Decode each eml to
// a FlattenedMessage-like shape, run the registry, and print what the
// parser extracted. This is a smoke-test, not a committed test — real
// bodies include PII we don't want in version control.

import { readFileSync } from "node:fs";
import { htmlToText } from "../src/lib/parsers/html";
import { findParser } from "../src/lib/parsers/registry";

interface Flat {
  id: string;
  threadId?: string;
  internalDate?: string;
  from: string;
  subject: string;
  bodyText: string;
  bodyHtml?: string;
}

function parseEml(path: string): Flat {
  const raw = readFileSync(path, "utf8");
  const lines = raw.split(/\r?\n/);

  // Walk headers until the first blank line
  let i = 0;
  const headers: Record<string, string> = {};
  let currentKey: string | null = null;
  while (i < lines.length && lines[i] !== "") {
    const line = lines[i]!;
    if (/^\s/.test(line) && currentKey) {
      headers[currentKey] += " " + line.trim();
    } else {
      const m = /^([A-Za-z-]+):\s*(.*)$/.exec(line);
      if (m) {
        currentKey = m[1]!.toLowerCase();
        headers[currentKey] = m[2]!;
      }
    }
    i++;
  }

  const from = headers.from ?? "";
  const subject = headers.subject ?? "";

  // Hunt for an HTML part — just search for "<html" and strip around it.
  const htmlStart = raw.toLowerCase().indexOf("<html");
  const htmlEnd = raw.toLowerCase().lastIndexOf("</html>");
  let bodyHtml: string | undefined;
  if (htmlStart !== -1 && htmlEnd !== -1) {
    const chunk = raw.slice(htmlStart, htmlEnd + 7).replace(/=\r?\n/g, "");
    // Quoted-printable → bytes → UTF-8. Each ASCII char is its own byte;
    // each =XX escape is one hex byte. The combined byte array decodes
    // back as UTF-8, which is what Gmail's base64url path produces in
    // production.
    const bytes: number[] = [];
    for (let j = 0; j < chunk.length; j++) {
      const c = chunk[j]!;
      if (c === "=" && /^[0-9A-F]{2}$/i.test(chunk.slice(j + 1, j + 3))) {
        bytes.push(parseInt(chunk.slice(j + 1, j + 3), 16));
        j += 2;
      } else {
        bytes.push(c.charCodeAt(0) & 0xff);
      }
    }
    bodyHtml = Buffer.from(bytes).toString("utf8");
  }

  const bodyText = bodyHtml ? htmlToText(bodyHtml) : "";
  return { id: path, from, subject, bodyText, bodyHtml };
}

const files = [
  "Credit Card Transaction Notification.eml",
  "Credit Card Transaction Notification (1).eml",
  "Credit Card Transaction Notification (2).eml",
  "Internet Transaction Journal.eml",
  "Transaksimu Pakai blu Berhasil.eml",
  "Transaksimu Pakai blu Berhasil (1).eml",
  "Successful QR Payment to Gerobak Betawi, Ruko Cord.eml",
];

for (const f of files) {
  const path = `${process.env.HOME}/Downloads/${f}`;
  console.log("=".repeat(80));
  console.log("FILE:", f);
  try {
    const msg = parseEml(path);
    console.log("  From:", msg.from.slice(0, 100));
    console.log("  Subject:", msg.subject.slice(0, 100));
    const parser = findParser(msg);
    if (!parser) {
      console.log("  NO PARSER MATCHED");
      continue;
    }
    const parsed = parser.parse(msg);
    if (!parsed) {
      console.log("  PARSER:", parser.provider, "→ null");
      continue;
    }
    console.log("  PARSER:", parser.provider, "confidence:", parsed.confidence);
    console.log("    amount:", parsed.amount);
    console.log("    merchant:", parsed.merchant);
    console.log("    date:", parsed.transactionDate.toISOString().slice(0, 10));
    console.log("    accountIdentifier:", parsed.accountIdentifier);
    console.log("    reference:", parsed.providerReference);
  } catch (e) {
    console.log("  ERROR:", e instanceof Error ? e.message : e);
  }
}
