import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const TEST_EMAIL = "test@flowcheck.dev";
const TEST_USER_ID = "b4c37ee9-3662-45bb-9cac-e9cf570979de";
const WORKSPACE_SLUG = "test";
const APP_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const TEMP_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "TriageSmoke!2026";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

test.beforeAll(async () => {
  const { error } = await admin.auth.admin.updateUserById(TEST_USER_ID, {
    password: TEMP_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
});

async function login(page: Page) {
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

test("profiles triage page renders with all key landmarks", async ({ page }) => {
  page.on("pageerror", (err) => console.error("PAGE ERROR:", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("CONSOLE ERROR:", msg.text());
  });

  await login(page);
  await page.goto(`${APP_URL}/app/${WORKSPACE_SLUG}/profiles`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.getByRole("heading", { name: "Profiles" })).toBeVisible();

  // Filter chips
  for (const chip of [
    "Needs attention",
    "Criticals",
    "Stale sync",
    "Snoozed",
    "Healthy",
  ]) {
    await expect(
      page.getByRole("button", { name: new RegExp(chip, "i") }),
    ).toBeVisible();
  }

  // Sortable headers
  for (const header of ["Name", "Health", "Automations", "Issues", "Last sync"]) {
    await expect(
      page.getByRole("button", { name: new RegExp(`^${header}`, "i") }).first(),
    ).toBeVisible();
  }

  // Density toggle
  await expect(page.getByRole("button", { name: "Compact" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Comfortable" })).toBeVisible();

  // Seeded profile rows
  for (const name of [
    "acme client - prod",
    "growth ops",
    "client - northwind",
    "lead enrichment",
  ]) {
    await expect(page.getByRole("link", { name })).toBeVisible();
  }

  // Search via "/" hotkey
  await page.keyboard.press("/");
  await page.keyboard.type("acme");
  await expect(page.getByRole("link", { name: "acme client - prod" })).toBeVisible();
  await expect(page.getByRole("link", { name: "growth ops" })).toHaveCount(0);
  await page.locator('input[type="text"]').first().fill("");

  // Toggle Criticals chip — narrows to acme only
  await page.getByRole("button", { name: /Criticals/i }).click();
  await expect(page.getByRole("link", { name: "acme client - prod" })).toBeVisible();
  await expect(page.getByRole("link", { name: "lead enrichment" })).toHaveCount(0);
  await page.getByRole("button", { name: /Criticals/i }).click();

  // Click Health header to sort, screenshot full table
  await page
    .getByRole("button", { name: /^Health/i })
    .first()
    .click();
  await page.waitForTimeout(200);
  await page.screenshot({
    path: "e2e/__screenshots__/profiles-triage.png",
    fullPage: true,
  });
});
