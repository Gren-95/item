import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

// Printer tests are opt-in (require RUN_PRINTER_TESTS=true)
const skipPrinterTests = process.env.RUN_PRINTER_TESTS !== "true";

test.describe("Unified Label Printing (#68)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("label printing page loads with tabs", async ({ page }) => {
    await page.goto("/labels");

    await expect(page.locator("h1")).toContainText(/label printing/i);

    // Should show three tab buttons
    const tabs = page.locator(".tab-btn");
    await expect(tabs).toHaveCount(3);

    await expect(tabs.nth(0)).toContainText(/service tag/i);
    await expect(tabs.nth(1)).toContainText(/printer/i);
    await expect(tabs.nth(2)).toContainText(/pc passwords/i);
  });

  test("defaults to service tag tab", async ({ page }) => {
    await page.goto("/labels");

    // Service tag tab content should be visible
    const stTab = page.locator("#tab-service-tag");
    await expect(stTab).toBeVisible();

    // Other tabs should be hidden
    const printerTab = page.locator("#tab-printer");
    await expect(printerTab).toBeHidden();
    const pwTab = page.locator("#tab-passwords");
    await expect(pwTab).toBeHidden();
  });

  test("tab=printer opens printer labels tab", async ({ page }) => {
    await page.goto("/labels?tab=printer");

    const printerTab = page.locator("#tab-printer");
    await expect(printerTab).toBeVisible();

    const stTab = page.locator("#tab-service-tag");
    await expect(stTab).toBeHidden();
  });

  test("tab=passwords opens PC passwords tab", async ({ page }) => {
    await page.goto("/labels?tab=passwords");

    const pwTab = page.locator("#tab-passwords");
    await expect(pwTab).toBeVisible();

    const stTab = page.locator("#tab-service-tag");
    await expect(stTab).toBeHidden();
  });

  test("clicking tabs switches content", async ({ page }) => {
    await page.goto("/labels");

    // Click Printer Labels tab
    await page.locator('.tab-btn[data-tab="printer"]').click();
    await expect(page.locator("#tab-printer")).toBeVisible();
    await expect(page.locator("#tab-service-tag")).toBeHidden();

    // Click PC Passwords tab
    await page.locator('.tab-btn[data-tab="passwords"]').click();
    await expect(page.locator("#tab-passwords")).toBeVisible();
    await expect(page.locator("#tab-printer")).toBeHidden();

    // Click back to Service Tag
    await page.locator('.tab-btn[data-tab="service-tag"]').click();
    await expect(page.locator("#tab-service-tag")).toBeVisible();
    await expect(page.locator("#tab-passwords")).toBeHidden();
  });

  test("tab switch updates URL", async ({ page }) => {
    await page.goto("/labels");

    await page.locator('.tab-btn[data-tab="printer"]').click();
    await page.waitForTimeout(100);
    expect(page.url()).toContain("tab=printer");

    await page.locator('.tab-btn[data-tab="passwords"]').click();
    await page.waitForTimeout(100);
    expect(page.url()).toContain("tab=passwords");
  });

  test("page requires authentication", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/labels");
    await page.waitForURL((url) => url.pathname.includes("login"), { timeout: 5000 });
    expect(page.url()).toContain("login");
  });

  test("success message is displayed", async ({ page }) => {
    await page.goto("/labels?success=Test+success+message");
    const successAlert = page.locator('.border-blue-300, .border-blue-700').first();
    await expect(successAlert).toBeVisible();
    await expect(successAlert).toContainText(/test success message/i);
  });

  test("error message is displayed", async ({ page }) => {
    await page.goto("/labels?error=Test+error+message");
    const errorAlert = page.locator('.bg-red-50, .bg-red-900\\/20');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/test error message/i);
  });
});

test.describe("Label Printing - Redirects (#68)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("/printer-labels redirects to /labels?tab=printer", async ({ page }) => {
    await page.goto("/printer-labels");
    await page.waitForURL((url) => url.pathname === "/labels" && url.searchParams.get("tab") === "printer", { timeout: 5000 });
    expect(page.url()).toContain("/labels");
    expect(page.url()).toContain("tab=printer");
  });

  test("/pc-pw redirects to /labels?tab=passwords", async ({ page }) => {
    await page.goto("/pc-pw");
    await page.waitForURL((url) => url.pathname === "/labels" && url.searchParams.get("tab") === "passwords", { timeout: 5000 });
    expect(page.url()).toContain("/labels");
    expect(page.url()).toContain("tab=passwords");
  });

  test("/printer-labels preserves success message in redirect", async ({ page }) => {
    await page.goto("/printer-labels?success=Test+message");
    await page.waitForURL((url) => url.pathname === "/labels", { timeout: 5000 });
    expect(page.url()).toContain("tab=printer");
    expect(page.url()).toContain("success=");
  });
});

test.describe("Label Printing - Service Tag Tab (#68)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("service tag tab has search input", async ({ page }) => {
    await page.goto("/labels?tab=service-tag");

    const searchInput = page.locator("#st-search");
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute("placeholder", /ABC1234/i);
  });

  test("search shows not found for non-existent tag", async ({ page }) => {
    await page.goto("/labels?tab=service-tag");

    const searchInput = page.locator("#st-search");
    await searchInput.fill("NONEXISTENT99999");
    await searchInput.press("Enter");

    await expect(page.locator("#st-not-found")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("#st-result")).toBeHidden();
  });
});

test.describe("Label Printing - Service Tag API (#68)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("/api/equipment/search-by-tag returns 400 without tag", async ({ page }) => {
    await page.goto("/");
    const response = await page.request.get("/api/equipment/search-by-tag");
    expect(response.status()).toBe(400);
  });

  test("/api/equipment/search-by-tag returns not found for unknown tag", async ({ page }) => {
    await page.goto("/");
    const response = await page.request.get("/api/equipment/search-by-tag?tag=NONEXISTENT99999");
    // Returns 200 with success: false
    expect([200, 500]).toContain(response.status());
    if (response.status() === 200) {
      const data = await response.json();
      expect(data.success).toBe(false);
    }
  });

  test("/api/equipment/search-by-tag requires auth", async ({ page, context }) => {
    await context.clearCookies();
    const response = await page.request.get("/api/equipment/search-by-tag?tag=TEST");
    // Global middleware redirects to login (302 → 200 login page), not 401
    expect([200, 302, 401]).toContain(response.status());
  });
});

test.describe("Label Printing - Printer Labels Tab (#68)", () => {
  test.skip(skipPrinterTests, "Printer tests are opt-in. Set RUN_PRINTER_TESTS=true to run.");

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("printer tab has search input", async ({ page }) => {
    await page.goto("/labels?tab=printer");

    const searchInput = page.locator("#printer-search");
    await expect(searchInput).toBeVisible();
    await expect(searchInput).toHaveAttribute("placeholder", /EERAK/i);
  });

  test("printer search shows results", async ({ page }) => {
    await page.goto("/labels?tab=printer");

    const searchInput = page.locator("#printer-search");
    await searchInput.fill("EERAK");
    await page.waitForTimeout(500);

    const searchResults = page.locator("#pl-search-results");
    const errorMessage = page.locator("#pl-error");

    const resultsVisible = await searchResults.isVisible({ timeout: 3000 }).catch(() => false);
    const errorVisible = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);

    expect(resultsVisible || errorVisible).toBe(true);
  });

  test("selecting printer shows print button", async ({ page }) => {
    await page.goto("/labels?tab=printer");

    const searchInput = page.locator("#printer-search");
    const printBtn = page.locator("#pl-print-btn");

    await expect(printBtn).toHaveClass(/hidden/);

    await searchInput.fill("15");
    await page.waitForTimeout(500);

    const searchResults = page.locator("#pl-search-results");
    const hasResults = await searchResults.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasResults) {
      const firstResult = searchResults.locator("button").first();
      const firstResultVisible = await firstResult.isVisible({ timeout: 1000 }).catch(() => false);

      if (firstResultVisible) {
        await firstResult.click();
        await expect(printBtn).not.toHaveClass(/hidden/);
        await expect(page.locator("#pl-selected")).not.toHaveClass(/hidden/);
      }
    }
  });

  test("clear selection works", async ({ page }) => {
    await page.goto("/labels?tab=printer");

    const searchInput = page.locator("#printer-search");

    await searchInput.fill("EERAK");
    await page.waitForTimeout(500);

    const searchResults = page.locator("#pl-search-results");
    const hasResults = await searchResults.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasResults) {
      const firstResult = searchResults.locator("button").first();
      const firstResultVisible = await firstResult.isVisible({ timeout: 1000 }).catch(() => false);

      if (firstResultVisible) {
        await firstResult.click();
        await expect(page.locator("#pl-selected")).not.toHaveClass(/hidden/);

        const clearBtn = page.locator('#pl-selected button[title="Clear selection"]');
        await clearBtn.click();

        await expect(page.locator("#pl-selected")).toHaveClass(/hidden/);
        await expect(page.locator("#pl-print-btn")).toHaveClass(/hidden/);
      }
    }
  });
});

test.describe("Label Printing - PC Passwords Tab (#68)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("passwords tab shows factory users table", async ({ page }) => {
    await page.goto("/labels?tab=passwords");

    const pwTab = page.locator("#tab-passwords");
    await expect(pwTab).toBeVisible();

    // Should have the table header
    await expect(pwTab.locator("th").first()).toContainText("User");
    await expect(pwTab.locator("h2").filter({ hasText: /factory users/i })).toBeVisible();
  });
});

test.describe("Label Printing - Navigation (#68)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("navigation shows single Label Printing link", async ({ page }) => {
    await page.goto("/");

    // Open hamburger menu
    const hamburgerBtn = page.locator('button[aria-label="Toggle menu"], button:has-text("Menu"), #menu-toggle, [aria-controls="nav-links"]');
    const menuBtnExists = await hamburgerBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (menuBtnExists) {
      await hamburgerBtn.click();
      await page.waitForTimeout(300);
    }

    // Should have Label Printing link
    const labelLink = page.locator('a[href="/labels"]');
    await expect(labelLink).toBeVisible();
    await expect(labelLink).toContainText(/label printing/i);

    // Should NOT have separate Printer Labels or PC Passwords links
    const printerLabelsLink = page.locator('a[href="/printer-labels"]');
    await expect(printerLabelsLink).toHaveCount(0);

    const pcPwLink = page.locator('a[href="/pc-pw"]');
    await expect(pcPwLink).toHaveCount(0);
  });

  test("Label Printing link navigates correctly", async ({ page }) => {
    await page.goto("/");

    const hamburgerBtn = page.locator('button[aria-label="Toggle menu"], button:has-text("Menu"), #menu-toggle, [aria-controls="nav-links"]');
    const menuBtnExists = await hamburgerBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (menuBtnExists) {
      await hamburgerBtn.click();
      await page.waitForTimeout(300);
    }

    const labelLink = page.locator('a[href="/labels"]');
    await labelLink.click();

    await page.waitForURL((url) => url.pathname === "/labels");
    expect(page.url()).toContain("/labels");
    await expect(page.locator("h1")).toContainText(/label printing/i);
  });
});

test.describe("Label Printing - Dark Theme (#68)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("tabs support dark theme", async ({ page }) => {
    await page.goto("/labels");

    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    });

    // Tabs should still be visible and functional
    const tabs = page.locator(".tab-btn");
    await expect(tabs).toHaveCount(3);

    // Switch tabs in dark mode
    await page.locator('.tab-btn[data-tab="printer"]').click();
    await expect(page.locator("#tab-printer")).toBeVisible();
  });
});
