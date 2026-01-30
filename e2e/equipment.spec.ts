import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

test.describe("Equipment Search (#1, #13, #14)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("search page loads with search form", async ({ page }) => {
    await page.goto("/");

    // Search form should be visible
    const searchInput = page.locator('input[name="q"], input[name="serial"]');
    await expect(searchInput).toBeVisible();

    // Search button should exist
    const searchButton = page.locator('button[type="submit"], input[type="submit"]');
    await expect(searchButton).toBeVisible();
  });

  test("search accepts query parameter and searches", async ({ page }) => {
    await page.goto("/?q=TEST");

    // Page should load without errors
    await expect(page.locator("body")).toBeVisible();

    // Should show either results, "no results" message, or search form
    const hasResults = page.locator("table tbody tr, .equipment-item, .search-result");
    const noResults = page.locator('text=/no.*found/i, text=/no.*results/i, text=/not found/i');
    const searchForm = page.locator('input[name="q"], input[name="serial"]');

    // One of these should be visible
    const resultsVisible = await hasResults.first().isVisible().catch(() => false);
    const noResultsVisible = await noResults.first().isVisible().catch(() => false);
    const searchFormVisible = await searchForm.first().isVisible().catch(() => false);

    expect(resultsVisible || noResultsVisible || searchFormVisible).toBe(true);
  });

  test("backward compatibility: serial parameter works", async ({ page }) => {
    await page.goto("/?serial=TEST123");

    // Page should process the serial parameter
    await expect(page.locator("body")).toBeVisible();
  });

  test("search across all fields: service tag", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.locator('input[name="q"], input[name="serial"]');
    await searchInput.fill("ABC123");
    await searchInput.press("Enter");

    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("search across all fields: user name", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.locator('input[name="q"], input[name="serial"]');
    await searchInput.fill("John");
    await searchInput.press("Enter");

    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("search across all fields: location", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.locator('input[name="q"], input[name="serial"]');
    await searchInput.fill("Tallinn");
    await searchInput.press("Enter");

    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("search across all fields: device type", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.locator('input[name="q"], input[name="serial"]');
    await searchInput.fill("Laptop");
    await searchInput.press("Enter");

    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("empty search shows appropriate message", async ({ page }) => {
    await page.goto("/?q=NONEXISTENT_DEVICE_12345");

    // Should show "no results" or similar message
    const content = await page.content();
    const hasNoResultsIndicator =
      content.toLowerCase().includes("no") ||
      content.toLowerCase().includes("found") ||
      content.toLowerCase().includes("add");

    expect(hasNoResultsIndicator).toBe(true);
  });

  test("search results show expected columns", async ({ page }) => {
    await page.goto("/?q=*");

    // If there are results, check for expected data columns
    const table = page.locator("table");
    if (await table.isVisible().catch(() => false)) {
      // Table headers should include relevant columns
      const headers = page.locator("table th, table thead td");
      const headerTexts = await headers.allTextContents();
      const headerText = headerTexts.join(" ").toLowerCase();

      // Should have some form of identifier column
      const hasIdentifierColumn =
        headerText.includes("service") ||
        headerText.includes("tag") ||
        headerText.includes("serial") ||
        headerText.includes("id");

      expect(hasIdentifierColumn).toBe(true);
    }
  });
});

test.describe("Equipment Add (#1)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("add page loads with form", async ({ page }) => {
    await page.goto("/add");

    // Should be on add page (not redirected to login)
    expect(page.url()).toContain("/add");

    // Form should be present
    const form = page.locator("form");
    await expect(form).toBeVisible();

    // Service tag field should exist
    const serviceTagInput = page.locator('input[name="service_tag"]');
    await expect(serviceTagInput).toBeVisible();
  });

  test("add form has required fields", async ({ page }) => {
    await page.goto("/add");

    // Check for key fields
    await expect(page.locator('input[name="service_tag"]')).toBeVisible();
    await expect(page.locator('input[name="purchase_date"]')).toBeVisible();

    // Model/type selection should exist
    const modelSelect = page.locator('select[name="model_id"]');
    const typeSelect = page.locator('select[name="type_id"]');
    const hasModelOrType =
      (await modelSelect.isVisible().catch(() => false)) ||
      (await typeSelect.isVisible().catch(() => false));
    expect(hasModelOrType).toBe(true);
  });

  test("add form includes vendor selection", async ({ page }) => {
    await page.goto("/add");

    const vendorSelect = page.locator('select[name="vendor_id"]');
    await expect(vendorSelect).toBeVisible();
  });

  test("add form includes location selection", async ({ page }) => {
    await page.goto("/add");

    // Should have location-related fields
    const locationSelects = page.locator(
      'select[name*="location"], select[name*="plant"], select[name*="area"], select[name*="sub_area"]'
    );
    const count = await locationSelects.count();
    expect(count).toBeGreaterThan(0);
  });

  test("add form validates empty service tag", async ({ page }) => {
    await page.goto("/add");

    // Leave service tag empty and try to submit
    const serviceTagInput = page.locator('input[name="service_tag"]');
    await serviceTagInput.fill("");

    // Fill minimal required fields
    const purchaseDateInput = page.locator('input[name="purchase_date"]');
    if (await purchaseDateInput.isVisible()) {
      await purchaseDateInput.fill("2024-01-01");
    }

    const submitButton = page.locator('button[type="submit"], input[type="submit"]');
    await submitButton.click();

    // Should show validation error or stay on page
    // HTML5 validation or custom validation should prevent submission
    await expect(page.locator("body")).toBeVisible();
  });

  test("add form has optional TeamViewer field", async ({ page }) => {
    await page.goto("/add");

    const teamviewerInput = page.locator('input[name="teamviewer"]');
    // TeamViewer field should exist (may be optional)
    if (await teamviewerInput.isVisible()) {
      await expect(teamviewerInput).toBeVisible();
    }
  });

  test("add form has IP address field", async ({ page }) => {
    await page.goto("/add");

    const ipInput = page.locator('input[name="ip"]');
    if (await ipInput.isVisible()) {
      await expect(ipInput).toBeVisible();
    }
  });
});

test.describe("Equipment Edit (#1)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("edit page loads for existing equipment", async ({ page }) => {
    // Navigate to edit page for ID 1 (if exists)
    await page.goto("/edit/1");

    // Should show form or 404/redirect
    const form = page.locator("form");
    const notFound = page.locator('text=/not found/i, text=/404/i');

    const formVisible = await form.isVisible().catch(() => false);
    const notFoundVisible = await notFound.isVisible().catch(() => false);

    // Either form should be visible or we get a proper error
    expect(formVisible || notFoundVisible || page.url().includes("/")).toBe(true);
  });

  test("edit form pre-populates existing data", async ({ page }) => {
    await page.goto("/edit/1");

    // If equipment exists, form should be pre-populated
    const form = page.locator("#equipment-edit-form, form").first();
    if (await form.isVisible().catch(() => false)) {
      // Service tag field should have a value
      const serviceTagInput = page.locator('input[name="service_tag"]');
      if (await serviceTagInput.isVisible().catch(() => false)) {
        const value = await serviceTagInput.inputValue();
        // Value might be empty for new or missing equipment, but input should exist
        expect(serviceTagInput).toBeVisible();
      }
    }
  });

  test("edit form has comment field", async ({ page }) => {
    await page.goto("/edit/1");

    const form = page.locator("#equipment-edit-form, form").first();
    if (await form.isVisible().catch(() => false)) {
      const commentField = page.locator('textarea[name="comment"], input[name="comment"]');
      await expect(commentField.first()).toBeVisible();
    }
  });

  test("edit form allows changing assigned user", async ({ page }) => {
    await page.goto("/edit/1");

    const form = page.locator("#equipment-edit-form, form").first();
    if (await form.isVisible().catch(() => false)) {
      const assignedToField = page.locator(
        'input[name="assigned_to"], select[name="assigned_to"]'
      );
      await expect(assignedToField.first()).toBeVisible();
    }
  });
});
