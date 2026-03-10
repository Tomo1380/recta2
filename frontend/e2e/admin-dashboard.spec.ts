import { test, expect, type Page } from "@playwright/test";

async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByPlaceholder(/メール|email/i).fill("admin@recta2.jp");
  await page.getByPlaceholder(/パスワード|password/i).fill("password");
  await page.getByRole("button", { name: /ログイン/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe("Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  test("shows stats cards", async ({ page }) => {
    await expect(page.locator("text=登録ユーザー数")).toBeVisible();
    await expect(page.locator("text=店舗数")).toBeVisible();
    await expect(page.locator("text=口コミ件数")).toBeVisible();
    await expect(page.locator("text=本日のチャット")).toBeVisible();
  });

  test("shows LINE stats card", async ({ page }) => {
    await expect(page.locator("text=公式LINE")).toBeVisible();
    await expect(page.locator("text=友だち数")).toBeVisible();
  });

  test("shows messages section", async ({ page }) => {
    await expect(page.locator("text=メッセージ")).toBeVisible();
  });

  test("shows activity log", async ({ page }) => {
    await expect(page.locator("text=アクティビティ")).toBeVisible();
  });
});
