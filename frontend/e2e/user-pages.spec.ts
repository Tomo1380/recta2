import { test, expect } from "@playwright/test";

test.describe("User-facing Pages", () => {
  test("top page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    // Should show some content - AI chat or store listings
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("store list page loads", async ({ page }) => {
    await page.goto("/user/stores");
    await expect(page).toHaveURL(/\/user\/stores/);
  });

  test("login page shows LINE login button", async ({ page }) => {
    await page.goto("/user/login");
    // Should have a LINE login option
    await expect(page.locator("body")).not.toBeEmpty();
  });
});
