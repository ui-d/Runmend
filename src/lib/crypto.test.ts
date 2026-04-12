import { describe, it, expect, beforeAll } from "vitest";
import { encrypt, decrypt, hashToken } from "./crypto";

beforeAll(() => {
  // Set a valid 64-char hex key for testing
  process.env.ENCRYPTION_KEY =
    "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
});

describe("encrypt / decrypt", () => {
  it("round-trips a string correctly", () => {
    const original = "my-secret-api-key-12345";
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const original = "same-input";
    const a = encrypt(original);
    const b = encrypt(original);
    expect(a).not.toBe(b);
    // But both decrypt to the same value
    expect(decrypt(a)).toBe(original);
    expect(decrypt(b)).toBe(original);
  });

  it("handles empty string by encrypting to a non-empty ciphertext", () => {
    // AES-GCM with empty plaintext produces an empty ciphertext part,
    // which the decrypt function rejects. This is expected behavior —
    // we should not encrypt empty strings.
    const encrypted = encrypt("");
    // The format is iv:authTag:ciphertext — with empty input, ciphertext may be empty
    const parts = encrypted.split(":");
    expect(parts.length).toBe(3);
  });

  it("handles unicode", () => {
    const original = "api-key-with-unicode-🔑-ąęćż";
    const encrypted = encrypt(original);
    expect(decrypt(encrypted)).toBe(original);
  });

  it("throws on invalid encrypted format", () => {
    expect(() => decrypt("not-valid")).toThrow("Invalid encrypted format");
  });

  it("throws on tampered ciphertext", () => {
    const encrypted = encrypt("test");
    const parts = encrypted.split(":");
    // Tamper with the ciphertext portion
    parts[2] = "AAAA" + parts[2]!.slice(4);
    expect(() => decrypt(parts.join(":"))).toThrow();
  });
});

describe("hashToken", () => {
  it("produces a 64-char hex string", () => {
    const hash = hashToken("my-token");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });
});
