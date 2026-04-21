import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import type { Page } from "@playwright/test";

config({ path: resolve(process.cwd(), ".env.local") });

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "test@flowcheck.dev";
export const TEST_USER_ID =
  process.env.E2E_TEST_USER_ID ?? "b4c37ee9-3662-45bb-9cac-e9cf570979de";
export const WORKSPACE_SLUG = process.env.E2E_WORKSPACE_SLUG ?? "test";
export const APP_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
export const TEMP_PASSWORD =
  process.env.E2E_TEST_PASSWORD ?? "TriageSmoke!2026";

export const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function ensureTestUser(): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error(
      "E2E requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  const { error } = await admin.auth.admin.updateUserById(TEST_USER_ID, {
    password: TEMP_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
}

export async function login(page: Page): Promise<void> {
  await page.goto(`${APP_URL}/login`);
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(TEMP_PASSWORD);
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith("/app"), {
      timeout: 15_000,
    }),
    page.locator('button[type="submit"]').click(),
  ]);
}

export function workspacePath(path: string): string {
  return `${APP_URL}/app/${WORKSPACE_SLUG}${path}`;
}
