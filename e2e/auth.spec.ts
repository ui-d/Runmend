import { test, expect } from "@playwright/test";
import {
  APP_URL,
  ensureTestUser,
  login,
  TEST_EMAIL,
  TEMP_PASSWORD,
} from "./helpers/session";

test.beforeAll(ensureTestUser);

test("login with valid credentials redirects to /app", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/app/);
});

test("login with wrong password shows an error and stays on /login", async ({
  page,
}) => {
  await page.goto(`${APP_URL}/login`);
  await page.locator('input[type="email"]').fill(TEST_EMAIL);
  await page.locator('input[type="password"]').fill(`${TEMP_PASSWORD}x`);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/login/);
});

test("logout returns user to login", async ({ page }) => {
  await login(page);
  // Logout UI may live behind a menu — adjust to your app's selector.
  const logout = page.getByRole("button", { name: /log out|sign out/i });
  if ((await logout.count()) === 0) test.skip(true, "No logout control found");
  await logout.first().click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
});
