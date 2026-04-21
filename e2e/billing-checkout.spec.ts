import { test, expect } from "@playwright/test";
import { ensureTestUser, login, workspacePath } from "./helpers/session";

test.beforeAll(ensureTestUser);

test("billing page renders plan status + upgrade actions", async ({ page }) => {
  await login(page);
  await page.goto(workspacePath("/billing"), {
    waitUntil: "domcontentloaded",
  });
  await expect(
    page.getByRole("heading", { name: /billing|plan/i }).first(),
  ).toBeVisible();

  // The upgrade or manage button must be present for any plan state
  const buttons = page.getByRole("button", {
    name: /upgrade|manage|choose|switch plan/i,
  });
  const buttonCount = await buttons.count();
  expect(buttonCount).toBeGreaterThan(0);
});
