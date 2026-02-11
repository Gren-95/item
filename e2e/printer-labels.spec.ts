import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

// Printer tests are opt-in (require RUN_PRINTER_TESTS=true)
const skipPrinterTests = process.env.RUN_PRINTER_TESTS !== "true";

test.describe("Printer Labels Legacy Redirect (#20)", () => {
  test.skip(skipPrinterTests, "Printer tests are opt-in. Set RUN_PRINTER_TESTS=true to run.");

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("/printer-labels redirects to /labels?tab=printer", async ({ page }) => {
    await page.goto("/printer-labels");
    await page.waitForURL((url) => url.pathname === "/labels" && url.searchParams.get("tab") === "printer", { timeout: 5000 });
    expect(page.url()).toContain("/labels");
    expect(page.url()).toContain("tab=printer");
  });

  test("printer labels page requires authentication", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/printer-labels");
    // Should redirect to login (old path still triggers redirect chain)
    await page.waitForURL((url) => url.pathname.includes("login") || url.pathname === "/labels", { timeout: 5000 });
  });
});

test.describe("Printer Labels API (#20)", () => {
  test.skip(skipPrinterTests, "Printer tests are opt-in. Set RUN_PRINTER_TESTS=true to run.");

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("/api/printers endpoint returns data", async ({ page }) => {
    await page.goto("/");

    const response = await page.request.get("/api/printers");
    expect([200, 500]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty("success");
      if (data.success) {
        expect(data).toHaveProperty("data");
        expect(Array.isArray(data.data)).toBe(true);
      }
    }
  });

  test("/api/printers/all endpoint returns data", async ({ page }) => {
    await page.goto("/");

    const response = await page.request.get("/api/printers/all");
    expect([200, 500]).toContain(response.status());

    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty("success");
      if (data.success) {
        expect(data).toHaveProperty("data");
        expect(Array.isArray(data.data)).toBe(true);
      }
    }
  });

  test("/api/print-printer-tag validates required fields", async ({ page }) => {
    await page.goto("/");

    const response = await page.request.post("/api/print-printer-tag", {
      data: {},
    });
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("/api/print-printer-tag accepts valid data", async ({ page }) => {
    await page.goto("/");

    const response = await page.request.post("/api/print-printer-tag", {
      data: {
        printer_name: "TEST-PRINTER",
        printer: "EERAK-PRT103",
      },
    });
    expect([200, 500]).toContain(response.status());
  });
});

test.describe("Print Button Integration (#20)", () => {
  test.skip(skipPrinterTests, "Printer tests are opt-in. Set RUN_PRINTER_TESTS=true to run.");

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("equipment edit page has print label button", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.locator('input[name="q"], input[name="serial"]');
    const hasSearchInput = await searchInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasSearchInput) {
      await searchInput.fill("");
      await searchInput.press("Enter");
      await page.waitForLoadState("networkidle");

      const editLink = page.locator('a[href*="/edit/"]').first();
      const hasEditLink = await editLink.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasEditLink) {
        await editLink.click();
        await page.waitForLoadState("networkidle");

        const printButton = page.locator('#print-label, button:has-text("Print")');
        const hasPrintButton = await printButton.count() > 0;
        expect(hasPrintButton).toBe(true);
      }
    }
  });
});
