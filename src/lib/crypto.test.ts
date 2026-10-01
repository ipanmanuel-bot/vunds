import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { decrypt, encrypt } from "./crypto";

const prev = process.env.TOKEN_ENCRYPTION_KEY;

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("hex");
});

afterAll(() => {
  if (prev == null) delete process.env.TOKEN_ENCRYPTION_KEY;
  else process.env.TOKEN_ENCRYPTION_KEY = prev;
});

describe("crypto (AES-256-GCM)", () => {
  it("round-trips a string", () => {
    const plaintext = "refresh-token-abcdef0123456789";
    const ct = encrypt(plaintext);
    expect(decrypt(ct)).toBe(plaintext);
  });

  it("produces a different ciphertext each call (random IV)", () => {
    const plaintext = "same-input";
    expect(encrypt(plaintext)).not.toBe(encrypt(plaintext));
  });

  it("rejects tampered ciphertext (auth tag catches modification)", () => {
    const ct = encrypt("hello");
    // Flip a byte near the end (within the auth-tag region).
    const buf = Buffer.from(ct, "base64");
    buf[buf.length - 1]! ^= 0x01;
    const tampered = buf.toString("base64");
    expect(() => decrypt(tampered)).toThrow();
  });

  it("rejects obviously-short input", () => {
    expect(() => decrypt("")).toThrow();
    expect(() => decrypt(Buffer.from([1, 2, 3]).toString("base64"))).toThrow();
  });

  it("fails loudly without a key", () => {
    const saved = process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.TOKEN_ENCRYPTION_KEY;
    try {
      expect(() => encrypt("x")).toThrow(/TOKEN_ENCRYPTION_KEY/);
    } finally {
      process.env.TOKEN_ENCRYPTION_KEY = saved;
    }
  });
});
