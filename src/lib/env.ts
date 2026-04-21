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

/**
 * Validate critical environment variables at boot. Call from
 * instrumentation.ts so a missing value crashes the deployment
 * instead of 500-ing on first request.
 *
 * Kept as a separate exported function rather than top-level code
 * because some tests import this module in contexts where these
 * vars are intentionally unset.
 */
export function assertProductionEnv(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ENCRYPTION_KEY",
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_STARTER",
    "STRIPE_PRICE_PRO",
    "STRIPE_PRICE_LTD",
    "CRON_SECRET",
  ];

  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required production env vars: ${missing.join(", ")}`,
    );
  }

  // Encryption key format: 64-char hex
  const encKey = process.env.ENCRYPTION_KEY!;
  if (encKey.length !== 64 || !/^[0-9a-fA-F]+$/.test(encKey)) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string");
  }
}
