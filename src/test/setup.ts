import { beforeEach, vi } from "vitest";

// Stable test env defaults so modules that read process.env at import time
// (e.g. src/lib/env.ts, supabase clients, stripe client) do not throw.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.ENCRYPTION_KEY ??=
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.STRIPE_SECRET_KEY ??= "sk_test_123";
process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_test_123";
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??= "pk_test_123";
process.env.CRON_SECRET ??= "test-cron-secret";
process.env.ANTHROPIC_API_KEY ??= "sk-ant-test";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
process.env.RESEND_API_KEY ??= "re_test_123";

beforeEach(() => {
  vi.clearAllMocks();
});
