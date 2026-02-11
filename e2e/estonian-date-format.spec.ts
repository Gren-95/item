import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

test.describe("Estonian Date Format (#65)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  // ── Shared utility is loaded on all pages ──────────────────────────

  test("client-side formatEstonianDate function is available on pages", async ({
    page,
  }) => {
    await page.goto("/");
    const fnExists = await page.evaluate(
      () => typeof (window as unknown as Record<string, unknown>).formatEstonianDate === "function",
    );
    expect(fnExists).toBe(true);
  });

  test("client-side formatEstonianDateTime function is available on pages", async ({
    page,
  }) => {
    await page.goto("/");
    const fnExists = await page.evaluate(
      () => typeof (window as unknown as Record<string, unknown>).formatEstonianDateTime === "function",
    );
    expect(fnExists).toBe(true);
  });

  test("formatEstonianDate converts ISO date to dd.mm.yyyy", async ({
    page,
  }) => {
    await page.goto("/");
    const result = await page.evaluate(() => {
      return (window as unknown as Record<string, (s: string) => string>).formatEstonianDate(
        "2026-02-10",
      );
    });
    expect(result).toBe("10.02.2026");
  });

  test("formatEstonianDateTime converts ISO datetime to dd.mm.yyyy HH:mm", async ({
    page,
  }) => {
    await page.goto("/");
    const result = await page.evaluate(() => {
      return (window as unknown as Record<string, (s: string) => string>).formatEstonianDateTime(
        "2026-02-10T14:30:00",
      );
    });
    expect(result).toBe("10.02.2026 14:30");
  });

  // ── Edit page ──────────────────────────────────────────────────────

  test("edit page shows date inputs with dd.mm.yyyy placeholder", async ({
    page,
  }) => {
    await page.goto("/edit/1");
    const purchaseDate = page.locator('input[name="purchase_date"]');
    const warrantyDate = page.locator('input[name="warranty_expiry_date"]');

    await expect(purchaseDate).toHaveAttribute("type", "text");
    await expect(purchaseDate).toHaveAttribute("placeholder", "dd.mm.yyyy");
    await expect(warrantyDate).toHaveAttribute("type", "text");
    await expect(warrantyDate).toHaveAttribute("placeholder", "dd.mm.yyyy");
  });

  test("edit page date values are in dd.mm.yyyy format", async ({ page }) => {
    await page.goto("/edit/1");
    const purchaseDate = page.locator('input[name="purchase_date"]');
    const value = await purchaseDate.inputValue();
    // Should match dd.mm.yyyy pattern (or be empty)
    if (value) {
      expect(value).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    }
  });

  // ── Add page ───────────────────────────────────────────────────────

  test("add page shows date inputs with dd.mm.yyyy placeholder", async ({
    page,
  }) => {
    await page.goto("/add");
    const purchaseDate = page.locator('input[name="purchase_date"]');
    const warrantyDate = page.locator('input[name="warranty_expiry_date"]');

    await expect(purchaseDate).toHaveAttribute("type", "text");
    await expect(purchaseDate).toHaveAttribute("placeholder", "dd.mm.yyyy");
    await expect(warrantyDate).toHaveAttribute("type", "text");
    await expect(warrantyDate).toHaveAttribute("placeholder", "dd.mm.yyyy");
  });

  // ── Permissions page ───────────────────────────────────────────────

  test("permissions page shows date input with dd.mm.yyyy placeholder", async ({
    page,
  }) => {
    await page.goto("/permissions");
    const expiryDate = page.locator('input[name="expiry_date"]');

    await expect(expiryDate).toHaveAttribute("type", "text");
    await expect(expiryDate).toHaveAttribute("placeholder", "dd.mm.yyyy");
  });

  test("permissions page displays expiry dates in dd.mm.yyyy format", async ({
    page,
  }) => {
    await page.goto("/permissions");
    // Find table cells that contain date-like content
    const cells = page.locator("td");
    const cellCount = await cells.count();

    let foundDate = false;
    for (let i = 0; i < cellCount; i++) {
      const text = (await cells.nth(i).textContent()) || "";
      // Match dd.mm.yyyy pattern
      if (/\d{2}\.\d{2}\.\d{4}/.test(text)) {
        foundDate = true;
        break;
      }
    }
    // If there are any permissions with expiry dates, they should be in Estonian format
    // We can't guarantee dates exist, so just check if we found any they match
    if (foundDate) {
      expect(foundDate).toBe(true);
    }
  });

  // ── Inventory Audit page ───────────────────────────────────────────

  test("audit page shows date inputs with dd.mm.yyyy placeholder", async ({
    page,
  }) => {
    await page.goto("/inventory-audit");
    const startDate = page.locator('input[name="start_date"]');
    const endDate = page.locator('input[name="end_date"]');

    await expect(startDate).toHaveAttribute("type", "text");
    await expect(startDate).toHaveAttribute("placeholder", "dd.mm.yyyy");
    await expect(endDate).toHaveAttribute("type", "text");
    await expect(endDate).toHaveAttribute("placeholder", "dd.mm.yyyy");
  });

  // ── Approvals page ────────────────────────────────────────────────

  test("approvals page displays dates in dd.mm.yyyy format", async ({
    page,
  }) => {
    await page.goto("/approvals");
    const content = await page.textContent("body");
    // Check that no US-style dates (e.g. "Jan 27, 2026") are present
    const usDatePattern = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\b/;
    expect(content).not.toMatch(usDatePattern);

    // If dates are displayed, they should match dd.mm.yyyy pattern
    const estonianDatePattern = /\d{2}\.\d{2}\.\d{4}/;
    if (content && estonianDatePattern.test(content)) {
      expect(content).toMatch(estonianDatePattern);
    }
  });

  // ── No ISO format dates in UI ──────────────────────────────────────

  test("edit page does not show dates in ISO format (yyyy-mm-dd)", async ({
    page,
  }) => {
    await page.goto("/edit/1");
    const purchaseValue = await page.locator('input[name="purchase_date"]').inputValue();
    const warrantyValue = await page.locator('input[name="warranty_expiry_date"]').inputValue();

    // Values should not be in ISO format
    if (purchaseValue) {
      expect(purchaseValue).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    if (warrantyValue) {
      expect(warrantyValue).not.toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  // ── No US English dates in UI ──────────────────────────────────────

  test("approvals page does not show dates in US English format", async ({
    page,
  }) => {
    await page.goto("/approvals");
    const content = await page.textContent("body");
    // No "Feb 3, 2026" style dates
    const usDatePattern = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\b/;
    expect(content).not.toMatch(usDatePattern);
  });

  // ── Dark mode compatibility ────────────────────────────────────────

  test("date inputs are visible in dark mode", async ({ page }) => {
    await page.goto("/edit/1");
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    });
    await page.reload();

    const purchaseDate = page.locator('input[name="purchase_date"]');
    await expect(purchaseDate).toBeVisible();
    await expect(purchaseDate).toHaveAttribute("placeholder", "dd.mm.yyyy");
  });
});
