import { describe, expect, it } from "vitest";

import { ocbcParser } from "./ocbc";
import type { GmailMessage } from "./types";

function msg(partial: Partial<GmailMessage>): GmailMessage {
  return {
    id: "test",
    from: "Notifikasi OCBC <notifikasi@ocbc.id>",
    subject: "Credit Card Transaction Notification",
    bodyText: "",
    ...partial,
  };
}

describe("ocbcParser.canHandle", () => {
  it("accepts notifikasi@ocbc.id variants", () => {
    expect(ocbcParser.canHandle(msg({ from: "notifikasi@ocbc.id" }))).toBe(true);
    expect(
      ocbcParser.canHandle(
        msg({ from: "Notifikasi OCBC <notifikasi@ocbc.id>" }),
      ),
    ).toBe(true);
  });

  it("rejects non-OCBC senders", () => {
    expect(ocbcParser.canHandle(msg({ from: "noreply@bca.co.id" }))).toBe(false);
    expect(ocbcParser.canHandle(msg({ from: "receipts@blubybcadigital.id" }))).toBe(
      false,
    );
  });
});

describe("ocbcParser — Credit Card Transaction", () => {
  const CC_BODY = [
    "Dear Mr./Mrs./Ms. SAMPLE USER,",
    "Thank you for your trusting in OCBC as your banking partner.",
    "Your transaction using OCBC Credit Card was successful. Here are the details:",
    "Credit Card Number",
    "Nomor Kartu Kredit",
    "-1774",
    "Date   Merchant Name   -   Amount",
    "Tanggal",
    "30/09/26  ADOBE *ADOBE 800-333  -  IDR214,008.00",
    "You can convert your transaction into installments...",
  ].join("\n");

  it("extracts amount, merchant, date, and card tail at high confidence", () => {
    const parsed = ocbcParser.parse(
      msg({
        subject: "Credit Card Transaction Notification",
        bodyText: CC_BODY,
      }),
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.provider).toBe("ocbc");
    expect(parsed!.type).toBe("expense");
    expect(parsed!.amount).toBe(214_008);
    expect(parsed!.currency).toBe("IDR");
    expect(parsed!.accountIdentifier).toBe("1774");
    expect(parsed!.merchant).toBe("ADOBE *ADOBE 800-333");
    expect(parsed!.transactionDate.toISOString().slice(0, 10)).toBe("2026-09-30");
    expect(parsed!.confidence).toBe("high");
  });

  it("returns null without the amount row", () => {
    const parsed = ocbcParser.parse(
      msg({
        subject: "Credit Card Transaction Notification",
        bodyText: "Credit Card Number -1774 Thank you",
      }),
    );
    expect(parsed).toBeNull();
  });
});

describe("ocbcParser — QR Payment", () => {
  const QR_BODY = [
    "QR Payment Successful",
    "Dear Mr / Mrs / Ms SAMPLE USER,",
    "FROM SAMPLE USER",
    "IDR 634810187332 Savings",
    "IDR",
    "IDR 109,499",
    "TO",
    "QR Payment",
    "Merchant PAN 9360091430001309515",
    "Sample Merchant, Sample Branch",
    "JAKARTA UTARA, 14470",
    "Terminal No. A01",
    "Acquirer Name DOMPET ANAK BANGSA",
    "Amount Pay IDR 109499.00",
    "Tip IDR 0.00",
    "Reff No. 000049260108 was successfully done",
    "Payment Date: 29/09/2026",
    "Instruction Date : 29/09/2026",
    "Reference No.: MB202609291649418788",
  ].join("\n");

  it("extracts amount, merchant, date, source-account tail at high confidence", () => {
    const parsed = ocbcParser.parse(
      msg({
        subject: "Successful QR Payment to Sample Merchant",
        bodyText: QR_BODY,
      }),
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.amount).toBe(109_499);
    // Last 4 of the full account number 634810187332 → 7332
    expect(parsed!.accountIdentifier).toBe("7332");
    expect(parsed!.merchant).toContain("Sample Merchant");
    expect(parsed!.transactionDate.toISOString().slice(0, 10)).toBe("2026-09-29");
    expect(parsed!.providerReference).toBe("MB202609291649418788");
    expect(parsed!.confidence).toBe("high");
  });

  it("returns null when 'Amount Pay' is missing", () => {
    const parsed = ocbcParser.parse(
      msg({
        subject: "Successful QR Payment to Example",
        bodyText: "FROM USER TO Merchant Payment Date: 29/09/2026",
      }),
    );
    expect(parsed).toBeNull();
  });
});

describe("ocbcParser — unrecognised subject", () => {
  it("returns null for subjects we don't handle yet", () => {
    const parsed = ocbcParser.parse(
      msg({
        subject: "Monthly Statement",
        bodyText: "IDR 100,000",
      }),
    );
    expect(parsed).toBeNull();
  });
});
