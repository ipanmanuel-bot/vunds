import { describe, expect, it } from "vitest";

import { bcaParser } from "./bca";
import type { GmailMessage } from "./types";

function msg(partial: Partial<GmailMessage>): GmailMessage {
  return {
    id: "test",
    from: "BCAelectronic@bca.co.id",
    subject: "Notifikasi Transaksi Debit BCA",
    bodyText: "",
    ...partial,
  };
}

describe("bcaParser.canHandle", () => {
  it("accepts BCA sender variants", () => {
    expect(bcaParser.canHandle(msg({ from: "BCAelectronic@bca.co.id" }))).toBe(true);
    expect(bcaParser.canHandle(msg({ from: "notification@bca.co.id" }))).toBe(true);
    expect(bcaParser.canHandle(msg({ from: "KlikBCA notice <no-reply@bca.co.id>" }))).toBe(true);
  });

  it("rejects non-BCA senders", () => {
    expect(bcaParser.canHandle(msg({ from: "noreply@mandiri.co.id" }))).toBe(false);
    expect(bcaParser.canHandle(msg({ from: "receipts@grab.com" }))).toBe(false);
  });
});

describe("bcaParser.parse — high-confidence paths", () => {
  it("parses a classic BCA card purchase (amount + merchant + date)", () => {
    const parsed = bcaParser.parse(
      msg({
        bodyText: [
          "Transaksi BCA Card",
          "Tanggal: 28/09/2026",
          "Merchant: STARBUCKS GRAND INDONESIA",
          "Nominal: Rp 92.000,00",
          "Kartu: XXXX XXXX XXXX 1234",
          "Ref: 20260928-ABC123",
        ].join("\n"),
      }),
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.provider).toBe("bca");
    expect(parsed!.type).toBe("expense");
    expect(parsed!.amount).toBe(92_000);
    expect(parsed!.currency).toBe("IDR");
    expect(parsed!.merchant).toBe("STARBUCKS GRAND INDONESIA");
    expect(parsed!.accountIdentifier).toBe("1234");
    expect(parsed!.providerReference).toBe("20260928-ABC123");
    expect(parsed!.transactionDate.toISOString().slice(0, 10)).toBe("2026-09-28");
    expect(parsed!.confidence).toBe("high");
  });

  it("falls back to htmlToText when bodyText is missing", () => {
    const parsed = bcaParser.parse(
      msg({
        bodyText: "",
        bodyHtml: `
          <html><body>
          <p>Transaksi BCA</p>
          <table>
            <tr><td>Tanggal</td><td>:</td><td>29/09/2026</td></tr>
            <tr><td>Pedagang</td><td>:</td><td>NETFLIX.COM</td></tr>
            <tr><td>Nominal</td><td>:</td><td>Rp 186.000</td></tr>
          </table>
          </body></html>
        `,
      }),
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.merchant).toBe("NETFLIX.COM");
    expect(parsed!.amount).toBe(186_000);
    expect(parsed!.confidence).toBe("high");
  });
});

describe("bcaParser.parse — low confidence and failure", () => {
  it("flags low confidence when merchant is missing", () => {
    const parsed = bcaParser.parse(
      msg({
        bodyText: "Transaksi debit BCA. Nominal: Rp 42.000. Tanggal: 30/09/2026.",
      }),
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.amount).toBe(42_000);
    expect(parsed!.merchant).toBeUndefined();
    expect(parsed!.confidence).toBe("low");
  });

  it("flags low confidence when date is missing (uses Gmail internalDate as fallback)", () => {
    const parsed = bcaParser.parse(
      msg({
        internalDate: String(Date.UTC(2026, 9, 1, 12)), // 2026-10-01T12:00Z
        bodyText: "Merchant: GRAB TRIP. Nominal: Rp 55.000.",
      }),
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.confidence).toBe("low");
    expect(parsed!.transactionDate.toISOString().slice(0, 10)).toBe("2026-10-01");
  });

  it("returns null when no amount is present (NEVER fabricates)", () => {
    const parsed = bcaParser.parse(
      msg({
        bodyText:
          "Transaksi BCA berhasil. Terima kasih telah berbelanja di STARBUCKS.",
      }),
    );
    expect(parsed).toBeNull();
  });

  it("returns null for empty / very short bodies", () => {
    expect(bcaParser.parse(msg({ bodyText: "" }))).toBeNull();
    expect(bcaParser.parse(msg({ bodyText: "ok" }))).toBeNull();
  });

  it("returns null for pure transfer-notification subject (not our scope)", () => {
    const parsed = bcaParser.parse(
      msg({
        subject: "Notifikasi Transfer BCA Berhasil",
        bodyText:
          "Transfer berhasil. Jumlah: Rp 500.000. Tanggal: 30/09/2026.",
      }),
    );
    expect(parsed).toBeNull();
  });

  it("rejects obviously implausible amount formats", () => {
    const parsed = bcaParser.parse(
      msg({
        bodyText:
          "Transaksi BCA. Merchant: STARBUCKS. Nominal: Rp abcdef. Tanggal: 28/09/2026.",
      }),
    );
    expect(parsed).toBeNull();
  });
});
