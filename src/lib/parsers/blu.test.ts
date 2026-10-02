import { describe, expect, it } from "vitest";

import { bluParser } from "./blu";
import type { GmailMessage } from "./types";

function msg(partial: Partial<GmailMessage>): GmailMessage {
  return {
    id: "test",
    from: "blu <receipts@blubybcadigital.id>",
    subject: "Transaksimu Pakai blu Berhasil",
    bodyText: "",
    ...partial,
  };
}

const EXAMPLE_QRIS_BODY = [
  "Hai Adi,",
  "Terima kasih sudah menggunakan blu untuk transaksimu.",
  "Total",
  "Rp124.000,00",
  "Adi Putra",
  "bluAccount",
  "KIOSK_SAMPLE MERCHANT",
  "TANGERANG",
  "Nominal Tagihan",
  "Rp124.000,00",
  "Tgl & Jam Transaksi",
  "29 Sep 2026 10:45:43 WIB",
  "Tipe Transaksi",
  "QRIS",
  "No. Ref blu",
  "6535 4253 4336",
].join("\n");

describe("bluParser.canHandle", () => {
  it("accepts blubybcadigital.id variants", () => {
    expect(
      bluParser.canHandle(msg({ from: "blu <receipts@blubybcadigital.id>" })),
    ).toBe(true);
    expect(
      bluParser.canHandle(msg({ from: "noreply@blubybcadigital.id" })),
    ).toBe(true);
  });

  it("rejects non-blu senders", () => {
    expect(bluParser.canHandle(msg({ from: "noreply@bca.co.id" }))).toBe(false);
    expect(bluParser.canHandle(msg({ from: "notifikasi@ocbc.id" }))).toBe(false);
  });
});

describe("bluParser.parse — QRIS payment", () => {
  it("extracts amount, merchant, date, reference at high confidence", () => {
    const parsed = bluParser.parse(msg({ bodyText: EXAMPLE_QRIS_BODY }));
    expect(parsed).not.toBeNull();
    expect(parsed!.provider).toBe("blu");
    expect(parsed!.type).toBe("expense");
    expect(parsed!.amount).toBe(124_000);
    expect(parsed!.currency).toBe("IDR");
    expect(parsed!.merchant).toBe("KIOSK_SAMPLE MERCHANT TANGERANG");
    expect(parsed!.providerReference).toBe("653542534336");
    expect(parsed!.transactionDate.toISOString().slice(0, 10)).toBe("2026-09-29");
    expect(parsed!.confidence).toBe("high");
    // No card tail in blu notifications.
    expect(parsed!.accountIdentifier).toBeUndefined();
  });
});

describe("bluParser.parse — failure paths", () => {
  it("returns null without an amount (never fabricates)", () => {
    const parsed = bluParser.parse(
      msg({
        bodyText: "Hai Adi, transaksimu berhasil. Terima kasih.",
      }),
    );
    expect(parsed).toBeNull();
  });

  it("rejects a transfer notification (out of scope)", () => {
    const parsed = bluParser.parse(
      msg({
        subject: "Transfer Keluar Berhasil",
        bodyText: [
          "Nominal Tagihan",
          "Rp500.000,00",
          "Tgl & Jam Transaksi",
          "29 Sep 2026 10:00:00 WIB",
          "Tipe Transaksi",
          "Transfer Keluar",
        ].join("\n"),
      }),
    );
    expect(parsed).toBeNull();
  });

  it("flags low confidence when merchant is missing", () => {
    const parsed = bluParser.parse(
      msg({
        bodyText: [
          "Nominal Tagihan",
          "Rp50.000,00",
          "Tgl & Jam Transaksi",
          "29 Sep 2026 10:00:00 WIB",
          "Tipe Transaksi",
          "QRIS",
        ].join("\n"),
      }),
    );
    expect(parsed).not.toBeNull();
    expect(parsed!.amount).toBe(50_000);
    expect(parsed!.merchant).toBeUndefined();
    expect(parsed!.confidence).toBe("low");
  });
});
