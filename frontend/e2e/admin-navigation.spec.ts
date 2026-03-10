import { test, expect, type Page } from "@playwright/test";

async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByPlaceholder(/メール|email/i).fill("admin@recta2.jp");
  await page.getByPlaceholder(/パスワード|password/i).fill("password");
  await page.getByRole("button", { name: /ログイン/i }).click();
  await page.waitForURL(/\/admin$/);
}

test.describe("Admin Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await adminLogin(page);
  });

  const navItems = [
    { label: "ユーザー管理", url: "/admin/users" },
    { label: "店舗管理", url: "/admin/shops" },
    { label: "口コミ管理", url: "/admin/reviews" },
    { label: "AIチャット設定", url: "/admin/ai-chat" },
    { label: "管理ユーザー", url: "/admin/admin-users" },
  ];

  for (const item of navItems) {
    test(`can navigate to ${item.label}`, async ({ page }) => {
      // Open sidebar on mobile if needed
      const menuButton = page.locator("button").filter({ has: page.locator("svg") }).first();
      if (await menuButton.isVisible()) {
        // Desktop: sidebar is always visible
      }
      await page.click(`text=${item.label}`);
      await page.waitForURL(new RegExp(item.url));
    });
  }

  test("shows breadcrumbs", async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page.locator("text=ユーザー管理")).toBeVisible();
  });

  test("can logout", async ({ page }) => {
    await page.click("text=ログアウト");
    await page.waitForURL(/\/admin\/login/);
  });
});
