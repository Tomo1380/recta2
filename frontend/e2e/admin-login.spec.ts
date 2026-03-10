import { test, expect } from "@playwright/test";

test.describe("Admin Login", () => {
  test("shows login page", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.locator("h1, h2")).toContainText(/ログイン|Recta/);
    await expect(page.getByPlaceholder(/メール|email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/パスワード|password/i)).toBeVisible();
  });

  test("rejects invalid credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByPlaceholder(/メール|email/i).fill("wrong@example.com");
    await page.getByPlaceholder(/パスワード|password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /ログイン/i }).click();
    // Should show error or stay on login page
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("can login with valid credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByPlaceholder(/メール|email/i).fill("admin@recta2.jp");
    await page.getByPlaceholder(/パスワード|password/i).fill("password");
    await page.getByRole("button", { name: /ログイン/i }).click();
    // Should redirect to dashboard
    await page.waitForURL(/\/admin$/);
    await expect(page.locator("text=ダッシュボード")).toBeVisible();
  });
});
