// Sample Gmail messages for local development.
//
// The sync orchestrator runs these through the exact same pipeline as real
// Gmail messages — parsers, dedup, pending-transaction creation. Lets us
// demo the full flow without a Google Cloud Console setup.
//
// Each fixture represents one "arrival." On re-sync, the dedup layer skips
// them (unique on (household_id, source, source_message_id)), so re-running
// is safe.

import type { FlattenedMessage } from "./client";

export const fixtureMessages: FlattenedMessage[] = [
  // High-confidence BCA credit card purchase: Starbucks
  {
    id: "fixture-bca-cc-0001",
    threadId: "fixture-bca-cc-0001",
    internalDate: String(Date.UTC(2026, 8, 28, 10, 15)),
    from: "BCAelectronic@bca.co.id",
    subject: "Notifikasi Transaksi Credit Card BCA",
    bodyText: [
      "Transaksi BCA Credit Card",
      "Tanggal: 28/09/2026",
      "Merchant: STARBUCKS GRAND INDONESIA",
      "Nominal: Rp 92.000,00",
      "Kartu: XXXX XXXX XXXX 4567",
      "Ref: 20260928-BCA-STAR-001",
    ].join("\n"),
  },

  // High-confidence BCA debit purchase: Grab (HTML body — exercises htmlToText)
  {
    id: "fixture-bca-debit-0002",
    threadId: "fixture-bca-debit-0002",
    internalDate: String(Date.UTC(2026, 8, 30, 7, 45)),
    from: "notification@bca.co.id",
    subject: "Notifikasi Transaksi Debit BCA",
    bodyText: "",
    bodyHtml: `
      <html><body>
        <p>Transaksi berhasil.</p>
        <table>
          <tr><td>Tanggal</td><td>:</td><td>30/09/2026</td></tr>
          <tr><td>Pedagang</td><td>:</td><td>GRAB RIDE JAKARTA</td></tr>
          <tr><td>Nominal</td><td>:</td><td>Rp 42.000</td></tr>
          <tr><td>Kartu</td><td>:</td><td>**** **** **** 8899</td></tr>
          <tr><td>Ref</td><td>:</td><td>GRB-30092026-123</td></tr>
        </table>
      </body></html>
    `,
  },

  // Low-confidence BCA message: amount only, no merchant / no date.
  // Parser will return confidence='low' → imported_messages status=partial,
  // NO transaction created.
  {
    id: "fixture-bca-partial-0003",
    threadId: "fixture-bca-partial-0003",
    internalDate: String(Date.UTC(2026, 9, 1, 9, 0)),
    from: "BCAelectronic@bca.co.id",
    subject: "Notifikasi BCA",
    bodyText: "Transaksi debit BCA. Nominal: Rp 215.000. Terima kasih.",
  },

  // Non-bank sender → no parser → imported_messages status=unknown, no tx.
  {
    id: "fixture-unknown-0004",
    threadId: "fixture-unknown-0004",
    internalDate: String(Date.UTC(2026, 9, 1, 12, 30)),
    from: "noreply@random-sender.com",
    subject: "Your receipt",
    bodyText: "Thanks for your purchase of Rp 100.000 at EXAMPLE STORE",
  },
];
