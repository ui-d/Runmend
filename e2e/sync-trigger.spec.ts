import { test, expect } from "@playwright/test";
import { ensureTestUser, login, workspacePath } from "./helpers/session";

test.beforeAll(ensureTestUser);

test("profile page exposes a Sync now action", async ({ page }) => {
  await login(page);
  await page.goto(workspacePath("/profiles"), {
    waitUntil: "domcontentloaded",
  });

  // Click into the first profile row
  const firstProfile = page.getByRole("link").first();
  const count = await firstProfile.count();
  if (count === 0) test.skip(true, "No profiles seeded to sync");
  await firstProfile.click();

  await expect(
    page.getByRole("button", { name: /sync/i }).first(),
  ).toBeVisible();
});
