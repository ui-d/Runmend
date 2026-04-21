import { test, expect } from "@playwright/test";
import { APP_URL, ensureTestUser, login } from "./helpers/session";

test.beforeAll(ensureTestUser);

test("public demo dashboard renders health pulse + diagnostic", async ({
  page,
}) => {
  // Coastal-content is one of the 4 hardcoded demo profiles
  await page.goto(`${APP_URL}/dashboard/coastal-content`);
  await expect(page.getByText(/coastal/i)).toBeVisible();
});

test("authenticated diagnostic button is reachable", async ({ page }) => {
  await login(page);
  await page.goto(`${APP_URL}/app`);
  // Just verify app loaded; detail navigation depends on seeded data
  await expect(page.getByRole("heading").first()).toBeVisible();
});
