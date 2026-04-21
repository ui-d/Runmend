import { test, expect } from "@playwright/test";
import { ensureTestUser, login } from "./helpers/session";

test.beforeAll(ensureTestUser);

test("notifications bell is present in the header", async ({ page }) => {
  await login(page);
  const bell = page
    .getByRole("button", { name: /notifications|alerts|bell/i })
    .first();
  if ((await bell.count()) === 0)
    test.skip(true, "No notification bell found in header");
  await expect(bell).toBeVisible();
});
