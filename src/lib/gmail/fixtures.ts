// Sample Gmail messages for local development.
//
// The sync orchestrator runs these through the exact same pipeline as real
// Gmail messages — parsers, dedup, pending-transaction creation. Lets us
// demo the full flow without a Google Cloud Console setup.
//
// Each fixture represents one "arrival." On re-sync, the dedup layer skips
// them (unique on (household_id, source, source_message_id)), so re-running
// is safe. Bodies here are sanitized copies of real email shapes — see
// src/lib/parsers/*.ts headers for the structural notes.

import type { FlattenedMessage } from "./client";

export const fixtureMessages: FlattenedMessage[] = [
  // myBCA "Internet Transaction Journal" — real-world QRIS payment shape.
  {
    id: "fixture-bca-mybca-0001",
    threadId: "fixture-bca-mybca-0001",
    internalDate: String(Date.UTC(2026, 8, 28, 12, 52)),
    from: "BCA <bca@bca.co.id>",
    subject: "Internet Transaction Journal",
    bodyText: [
      "Hello SAMPLE USER,",
      "You just made a transaction through myBCA.",
      "Status",
      ":",
      "Successful",
      "Transaction Date",
      ":",
      "28 Sep 2026 12:52:33",
      "Transaction Type",
      ":",
      "QRIS Payment",
      "Payment to",
      ":",
      "KIOSK SAMPLE MERCHANT",
      "Source of Fund",
      ":",
      "TAHAPAN - 6044****98",
      "Total Payment",
      ":",
      "IDR 86,000.00",
      "Reference No.",
      ":",
      "9527120260928125229883QRS1230425899",
    ].join("\n"),
  },

  // KartuKreditBCA credit card purchase — "Nomor Kartu" / ":" / tail-digits
  // shape that strips out of the HTML table on the real emails.
  {
    id: "fixture-bca-cc-0002",
    threadId: "fixture-bca-cc-0002",
    internalDate: String(Date.UTC(2026, 7, 13, 8, 33)),
    from: "KartuKreditBCA@klikbca.com",
    subject: "Credit Card Transaction Notification",
    bodyText: [
      "Yth. Pemegang Kartu Kredit BCA,",
      "Terima kasih telah bertransaksi menggunakan Kartu Kredit BCA:",
      "Nomor Kartu",
      ":",
      "455633XXXX8409",
      "Merchant / ATM",
      ":",
      "APPLE.COM/BILL",
      "Pada Tanggal",
      ":",
      "13-08-2026 08:33:19 WIB",
      "Sejumlah",
      ":",
      "IDR 85.000",
    ].join("\n"),
  },

  // Low-confidence BCA message: amount only, no merchant / no date.
  // Parser returns confidence='low' → imported_messages status=partial,
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

  // blu QRIS — multi-line amount ("Rp" / "124.000" / ",00") as in real
  // emails. No card tail → account_id resolved by the user on confirm.
  {
    id: "fixture-blu-qris-0005",
    threadId: "fixture-blu-qris-0005",
    internalDate: String(Date.UTC(2026, 8, 29, 10, 45)),
    from: "blu <receipts@blubybcadigital.id>",
    subject: "Transaksimu Pakai blu Berhasil",
    bodyText: [
      "Hai Sample,",
      "Terima kasih sudah menggunakan blu untuk transaksimu.",
      "Total",
      "Rp",
      "124.000",
      ",00",
      "Sample User",
      "bluAccount",
      "KIOSK_SAMPLE_MERCHANT",
      "TANGERANG",
      "Nominal Tagihan",
      "Rp",
      "124.000,00",
      "Tgl & Jam Transaksi",
      "29 Sep 2026 10:45:43 WIB",
      "Tipe Transaksi",
      "QRIS",
      "No. Ref blu",
      "6535 4253 4336",
    ].join("\n"),
  },

  // blu Debit Online — "Total Bayar", card tail "•••• •••• •••• 2919".
  {
    id: "fixture-blu-debit-0006",
    threadId: "fixture-blu-debit-0006",
    internalDate: String(Date.UTC(2026, 8, 30, 20, 33)),
    from: "blu <receipts@blubybcadigital.id>",
    subject: "Transaksimu Pakai blu Berhasil",
    bodyText: [
      "Hai Sample,",
      "Terima kasih sudah menggunakan blu untuk transaksimu.",
      "Total Bayar",
      "Rp",
      "411.865",
      ",00",
      "Sample User",
      "bluAccount",
      "Grab* 2-SAMPLE-RIDE-ID",
      "Garuda x bluDebit Card",
      "•••• •••• •••• 2919",
      "Tgl & Jam Transaksi",
      "30 Sep 2026 20:33:36 WIB",
      "Tipe Transaksi",
      "Debit Online",
      "No. Ref blu",
      "627313259559",
    ].join("\n"),
  },

  // OCBC Credit Card — date on its own line (real HTML strip), merchant /
  // amount on the next line. Identifier "1774" matches an OCBC CC account
  // if you set external_identifier.
  {
    id: "fixture-ocbc-cc-0007",
    threadId: "fixture-ocbc-cc-0007",
    internalDate: String(Date.UTC(2026, 8, 30, 9, 0)),
    from: "Notifikasi OCBC <notifikasi@ocbc.id>",
    subject: "Credit Card Transaction Notification",
    bodyText: [
      "Dear Mr./Mrs./Ms. SAMPLE USER,",
      "Your transaction using OCBC Credit Card was successful. Here are the details:",
      "Credit Card Number",
      "Nomor Kartu Kredit",
      "-1774",
      "Date",
      "Tanggal",
      "Merchant Name - Amount",
      "Nama Merchant - Jumlah",
      "30/09/26",
      "ADOBE *ADOBE 800-333 - IDR214,008.00",
    ].join("\n"),
  },

  // OCBC QR Payment — label-above-value shape. Last 4 "7332" from the
  // 12-digit savings account.
  {
    id: "fixture-ocbc-qr-0008",
    threadId: "fixture-ocbc-qr-0008",
    internalDate: String(Date.UTC(2026, 8, 29, 16, 30)),
    from: "Notifikasi OCBC <notifikasi@ocbc.id>",
    subject: "Successful QR Payment to Sample Merchant",
    bodyText: [
      "QR Payment Successful",
      "Dear Mr / Mrs / Ms SAMPLE USER,",
      "FROM",
      "SAMPLE USER",
      "IDR",
      "634810187332",
      "Savings",
      "IDR",
      "IDR 109,499",
      "TO",
      "QR Payment",
      "Merchant PAN",
      "9360091430001309515",
      "Sample Merchant, Sample Branch",
      "JAKARTA UTARA, 14470",
      "Terminal No.",
      "A01",
      "Acquirer Name",
      "DOMPET ANAK BANGSA",
      "Amount Pay",
      "IDR 109499.00",
      "Tip",
      "IDR 0.00",
      "Reff No.",
      "000049260108",
      "Payment Date:",
      "29/09/2026",
      "Instruction Date :",
      "29/09/2026",
      "Reference No.: MB202609291649418788",
    ].join("\n"),
  },
];
