import { test, expect, type Page } from "@playwright/test";

async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByPlaceholder(/メール|email/i).fill("admin@recta2.jp");
  await page.getByPlaceholder(/パスワード|password/i).fill("password");
  await page.getByRole("button", { name: /ログイン/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe("Admin Shops", () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test("can navigate to shops page", async ({ page }) => {
    await page.click("text=店舗管理");
    await page.waitForURL(/\/admin\/shops/);
    await expect(page.locator("text=店舗管理")).toBeVisible();
  });

  test("shows shops list", async ({ page }) => {
    await page.goto("/admin/shops");
    // Should have a table or list of shops
    await expect(page.locator("table, [role='table']").first()).toBeVisible();
  });

  test("can navigate to new shop page", async ({ page }) => {
    await page.goto("/admin/shops");
    await page.click("text=新規作成");
    await page.waitForURL(/\/admin\/shops\/new/);
  });
});
