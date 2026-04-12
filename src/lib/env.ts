/**
 * Validates critical environment variables at import time.
 * Import this module in any route that depends on these vars
 * to fail fast instead of at runtime.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requireHexKey(name: string, expectedLength: number): string {
  const value = requireEnv(name);
  if (value.length !== expectedLength || !/^[0-9a-fA-F]+$/.test(value)) {
    throw new Error(
      `${name} must be a ${expectedLength}-character hex string`
    );
  }
  return value;
}

/** Validates Stripe webhook secret is present. Call before constructEvent. */
export function getStripeWebhookSecret(): string {
  return requireEnv("STRIPE_WEBHOOK_SECRET");
}

/** Validates encryption key format. */
export function getEncryptionKey(): string {
  return requireHexKey("ENCRYPTION_KEY", 64);
}
