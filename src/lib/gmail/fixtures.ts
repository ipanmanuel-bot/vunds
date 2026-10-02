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

  // blu QRIS — no card tail in the body, so the imported transaction has
  // account_id=NULL and the user picks the account on the confirm form.
  {
    id: "fixture-blu-0005",
    threadId: "fixture-blu-0005",
    internalDate: String(Date.UTC(2026, 8, 29, 10, 45)),
    from: "blu <receipts@blubybcadigital.id>",
    subject: "Transaksimu Pakai blu Berhasil",
    bodyText: [
      "Hai Sample,",
      "Terima kasih sudah menggunakan blu untuk transaksimu.",
      "Total",
      "Rp124.000,00",
      "Sample User",
      "bluAccount",
      "KIOSK_SAMPLE_MERCHANT",
      "TANGERANG",
      "Nominal Tagihan",
      "Rp124.000,00",
      "Tgl & Jam Transaksi",
      "29 Sep 2026 10:45:43 WIB",
      "Tipe Transaksi",
      "QRIS",
      "No. Ref blu",
      "6535 4253 4336",
    ].join("\n"),
  },

  // OCBC Credit Card purchase — identifier "1774" matches on your OCBC CC
  // account's external_identifier (if you add one).
  {
    id: "fixture-ocbc-cc-0006",
    threadId: "fixture-ocbc-cc-0006",
    internalDate: String(Date.UTC(2026, 8, 30, 9, 0)),
    from: "Notifikasi OCBC <notifikasi@ocbc.id>",
    subject: "Credit Card Transaction Notification",
    bodyText: [
      "Dear Mr./Mrs./Ms. SAMPLE USER,",
      "Your transaction using OCBC Credit Card was successful.",
      "Credit Card Number",
      "Nomor Kartu Kredit",
      "-1774",
      "Date   Merchant Name   -   Amount",
      "30/09/26  ADOBE *ADOBE 800-333  -  IDR214,008.00",
    ].join("\n"),
  },

  // OCBC QR Payment — last-4 "7332" from the savings account number tail.
  {
    id: "fixture-ocbc-qr-0007",
    threadId: "fixture-ocbc-qr-0007",
    internalDate: String(Date.UTC(2026, 8, 29, 16, 30)),
    from: "Notifikasi OCBC <notifikasi@ocbc.id>",
    subject: "Successful QR Payment to Sample Merchant",
    bodyText: [
      "QR Payment Successful",
      "Dear Mr / Mrs / Ms SAMPLE USER,",
      "FROM SAMPLE USER",
      "IDR 634810187332 Savings",
      "TO",
      "QR Payment",
      "Merchant PAN 9360091430001309515",
      "Sample Merchant, Sample Branch",
      "JAKARTA UTARA, 14470",
      "Terminal No. A01",
      "Acquirer Name DOMPET ANAK BANGSA",
      "Amount Pay IDR 109499.00",
      "Payment Date: 29/09/2026",
      "Reference No.: MB202609291649418788",
    ].join("\n"),
  },
];
