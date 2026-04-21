import { test, expect } from "@playwright/test";
import { ensureTestUser, login, workspacePath } from "./helpers/session";

test.beforeAll(ensureTestUser);

test("connections page loads and shows add connection control", async ({
  page,
}) => {
  await login(page);
  await page.goto(workspacePath("/connections"), {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: /connections/i })).toBeVisible();

  // Every workspace should at least show an option to add a new connection.
  const addButton = page.getByRole("button", { name: /add|connect/i }).first();
  await expect(addButton).toBeVisible();
});
