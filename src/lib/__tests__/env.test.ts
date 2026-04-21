import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getStripeWebhookSecret, getEncryptionKey } from "@/lib/env";

const HEX_64 = "0".repeat(64);

describe("getStripeWebhookSecret", () => {
  let original: string | undefined;
  beforeEach(() => {
    original = process.env.STRIPE_WEBHOOK_SECRET;
  });
  afterEach(() => {
    process.env.STRIPE_WEBHOOK_SECRET = original ?? "whsec_test_123";
  });

  it("returns the env value when present", () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_abc";
    expect(getStripeWebhookSecret()).toBe("whsec_abc");
  });

  it("throws when missing", () => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
    expect(() => getStripeWebhookSecret()).toThrow(
      /Missing required environment variable: STRIPE_WEBHOOK_SECRET/,
    );
  });
});

describe("getEncryptionKey", () => {
  let original: string | undefined;
  beforeEach(() => {
    original = process.env.ENCRYPTION_KEY;
  });
  afterEach(() => {
    process.env.ENCRYPTION_KEY = original ?? HEX_64;
  });

  it("returns the env value when it is a 64-char hex string", () => {
    process.env.ENCRYPTION_KEY = HEX_64;
    expect(getEncryptionKey()).toBe(HEX_64);
  });

  it("throws when missing", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => getEncryptionKey()).toThrow(/Missing required environment variable/);
  });

  it("throws when wrong length", () => {
    process.env.ENCRYPTION_KEY = "abcd";
    expect(() => getEncryptionKey()).toThrow(/64-character hex/);
  });

  it("throws when not hex", () => {
    process.env.ENCRYPTION_KEY = "zz".repeat(32);
    expect(() => getEncryptionKey()).toThrow(/64-character hex/);
  });
});
