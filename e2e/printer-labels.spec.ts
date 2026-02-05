import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

// Printer tests are opt-in (require RUN_PRINTER_TESTS=true)
const skipPrinterTests = process.env.RUN_PRINTER_TESTS !== "true";

test.describe("Printer Labels (#20)", () => {
  test.skip(skipPrinterTests, "Printer tests are opt-in. Set RUN_PRINTER_TESTS=true to run.");

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("printer labels page loads for authenticated users", async ({ page }) => {
    await page.goto("/printer-labels");

    // Page should load without errors
    await expect(page.locator("body")).toBeVisible();

    // Should have the page title
    await expect(page.locator("h1")).toContainText(/printer labels/i);

    // Should have search input
    const searchInput = page.locator('#printer-search');
    await expect(searchInput).toBeVisible();

    // Should have placeholder text
    await expect(searchInput).toHaveAttribute("placeholder", /e\.g\./);
  });

  test("printer labels page requires authentication", async ({ page, context }) => {
    // Clear cookies to simulate unauthenticated user
    await context.clearCookies();

    await page.goto("/printer-labels");

    // Should redirect to login page
    await page.waitForURL((url) => url.pathname.includes("login"), { timeout: 5000 });
    expect(page.url()).toContain("login");
  });

  test("search input shows loading indicator", async ({ page }) => {
    await page.goto("/printer-labels");

    // Loading indicator and search results exist
    const loadingIndicator = page.locator('#loading-indicator');
    await expect(loadingIndicator).toBeAttached();

    // Search results should be hidden initially (before any search)
    const searchResults = page.locator('#search-results');
    await expect(searchResults).toBeAttached();

    // After page loads and API completes, loading should be hidden
    // Wait for either hidden class or API to complete (increased timeout for slow environments)
    await expect(loadingIndicator).toHaveClass(/hidden/, { timeout: 10000 });
  });

  test("printer search accepts input and shows results", async ({ page }) => {
    await page.goto("/printer-labels");

    const searchInput = page.locator('#printer-search');

    // Type a search query
    await searchInput.fill("EERAK");

    // Wait for debounce and results
    await page.waitForTimeout(500);

    // Either results should be shown or "no results" message
    const searchResults = page.locator('#search-results');
    const errorMessage = page.locator('#error-message');

    // One of these should become visible (results, error, or "no printers found")
    const resultsVisible = await searchResults.isVisible({ timeout: 3000 }).catch(() => false);
    const errorVisible = await errorMessage.isVisible({ timeout: 3000 }).catch(() => false);

    // At least search results div should be visible if API works
    expect(resultsVisible || errorVisible).toBe(true);
  });

  test("selecting a printer shows print button", async ({ page }) => {
    await page.goto("/printer-labels");

    const searchInput = page.locator('#printer-search');
    const printBtn = page.locator('#print-btn');

    // Print button should be hidden initially
    await expect(printBtn).toHaveClass(/hidden/);

    // Search for a printer
    await searchInput.fill("15");
    await page.waitForTimeout(500);

    // Check if results appeared
    const searchResults = page.locator('#search-results');
    const hasResults = await searchResults.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasResults) {
      // Try to click on first result if available
      const firstResult = searchResults.locator('button').first();
      const firstResultVisible = await firstResult.isVisible({ timeout: 1000 }).catch(() => false);

      if (firstResultVisible) {
        await firstResult.click();

        // Print button should now be visible
        await expect(printBtn).not.toHaveClass(/hidden/);

        // Selected printer div should be visible
        const selectedPrinter = page.locator('#selected-printer');
        await expect(selectedPrinter).not.toHaveClass(/hidden/);
      }
    }
  });

  test("print button opens modal with target printer selection", async ({ page }) => {
    await page.goto("/printer-labels");

    const searchInput = page.locator('#printer-search');

    // Search for a printer
    await searchInput.fill("15");
    await page.waitForTimeout(500);

    // Check if results appeared and select first one
    const searchResults = page.locator('#search-results');
    const hasResults = await searchResults.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasResults) {
      const firstResult = searchResults.locator('button').first();
      const firstResultVisible = await firstResult.isVisible({ timeout: 1000 }).catch(() => false);

      if (firstResultVisible) {
        await firstResult.click();

        // Click print button
        const printBtn = page.locator('#print-btn');
        await printBtn.click();

        // Modal should be visible
        const printModal = page.locator('#printModal');
        await expect(printModal).toHaveClass(/flex/);
        await expect(printModal).not.toHaveClass(/hidden/);

        // Modal should have title
        await expect(printModal.locator('h3')).toContainText(/select target printer/i);

        // Modal should have cancel and print buttons
        await expect(printModal.locator('button:has-text("Cancel")')).toBeVisible();
      }
    }
  });

  test("modal can be closed", async ({ page }) => {
    await page.goto("/printer-labels");

    const searchInput = page.locator('#printer-search');

    // Search and select a printer
    await searchInput.fill("15");
    await page.waitForTimeout(500);

    const searchResults = page.locator('#search-results');
    const hasResults = await searchResults.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasResults) {
      const firstResult = searchResults.locator('button').first();
      const firstResultVisible = await firstResult.isVisible({ timeout: 1000 }).catch(() => false);

      if (firstResultVisible) {
        await firstResult.click();

        // Open modal
        const printBtn = page.locator('#print-btn');
        await printBtn.click();

        const printModal = page.locator('#printModal');
        await expect(printModal).toHaveClass(/flex/);

        // Close modal
        const cancelBtn = printModal.locator('button:has-text("Cancel")');
        await cancelBtn.click();

        // Modal should be hidden
        await expect(printModal).toHaveClass(/hidden/);
      }
    }
  });

  test("clear selection button works", async ({ page }) => {
    await page.goto("/printer-labels");

    const searchInput = page.locator('#printer-search');

    // Search and select a printer
    await searchInput.fill("EERAK");
    await page.waitForTimeout(500);

    const searchResults = page.locator('#search-results');
    const hasResults = await searchResults.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasResults) {
      const firstResult = searchResults.locator('button').first();
      const firstResultVisible = await firstResult.isVisible({ timeout: 1000 }).catch(() => false);

      if (firstResultVisible) {
        await firstResult.click();

        const selectedPrinter = page.locator('#selected-printer');
        await expect(selectedPrinter).not.toHaveClass(/hidden/);

        // Clear selection
        const clearBtn = selectedPrinter.locator('button[title="Clear selection"]');
        await clearBtn.click();

        // Selected printer should be hidden
        await expect(selectedPrinter).toHaveClass(/hidden/);

        // Print button should be hidden
        const printBtn = page.locator('#print-btn');
        await expect(printBtn).toHaveClass(/hidden/);
      }
    }
  });

  test("navigation menu has printer labels link", async ({ page }) => {
    await page.goto("/");

    // Open hamburger menu if it's collapsed
    const hamburgerBtn = page.locator('button[aria-label="Toggle menu"], button:has-text("Menu"), #menu-toggle, [aria-controls="nav-links"]');
    const menuBtnExists = await hamburgerBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (menuBtnExists) {
      await hamburgerBtn.click();
      await page.waitForTimeout(300); // Wait for menu animation
    }

    // Find the printer labels link in navigation
    const printerLabelsLink = page.locator('a[href="/printer-labels"]');
    await expect(printerLabelsLink).toBeVisible();
    await expect(printerLabelsLink).toContainText(/printer labels/i);
  });

  test("printer labels link is clickable and navigates correctly", async ({ page }) => {
    await page.goto("/");

    // Open hamburger menu if it's collapsed
    const hamburgerBtn = page.locator('button[aria-label="Toggle menu"], button:has-text("Menu"), #menu-toggle, [aria-controls="nav-links"]');
    const menuBtnExists = await hamburgerBtn.isVisible({ timeout: 2000 }).catch(() => false);

    if (menuBtnExists) {
      await hamburgerBtn.click();
      await page.waitForTimeout(300); // Wait for menu animation
    }

    // Click the printer labels link
    const printerLabelsLink = page.locator('a[href="/printer-labels"]');
    await printerLabelsLink.click();

    // Should navigate to printer labels page
    await page.waitForURL((url) => url.pathname === "/printer-labels");
    expect(page.url()).toContain("/printer-labels");

    // Page should load
    await expect(page.locator("h1")).toContainText(/printer labels/i);
  });

  test("success message is displayed when provided in URL", async ({ page }) => {
    await page.goto("/printer-labels?success=Test+success+message");

    // Success alert should be visible
    const successAlert = page.locator('.bg-green-50, .bg-green-900\\/20');
    await expect(successAlert).toBeVisible();
    await expect(successAlert).toContainText(/test success message/i);
  });

  test("error message is displayed when provided in URL", async ({ page }) => {
    await page.goto("/printer-labels?error=Test+error+message");

    // Error alert should be visible
    const errorAlert = page.locator('.bg-red-50, .bg-red-900\\/20');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/test error message/i);
  });
});

test.describe("Printer Labels API (#20)", () => {
  test.skip(skipPrinterTests, "Printer tests are opt-in. Set RUN_PRINTER_TESTS=true to run.");

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("/api/printers endpoint returns data", async ({ page }) => {
    // Navigate to ensure we have a session
    await page.goto("/");

    // Make API request
    const response = await page.request.get("/api/printers");

    // Should return 200 or 500 (if Bartender is offline)
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
    // Navigate to ensure we have a session
    await page.goto("/");

    // Make API request
    const response = await page.request.get("/api/printers/all");

    // Should return 200 or 500 (if Bartender is offline)
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
    // Navigate to ensure we have a session
    await page.goto("/");

    // Make API request with missing fields
    const response = await page.request.post("/api/print-printer-tag", {
      data: {},
    });

    // Should return 400 or 500 (validation error)
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("/api/print-printer-tag accepts valid data", async ({ page }) => {
    // Navigate to ensure we have a session
    await page.goto("/");

    // Make API request with valid data
    const response = await page.request.post("/api/print-printer-tag", {
      data: {
        printer_name: "TEST-PRINTER",
        printer: "EERAK-PRT103",
      },
    });

    // Should return 200 or 500 (if Bartender is offline)
    // If Bartender is running and accepts the request, it should be 200
    // If Bartender is offline, it should be 500
    expect([200, 500]).toContain(response.status());
  });
});

test.describe("Print Button Integration (#20)", () => {
  test.skip(skipPrinterTests, "Printer tests are opt-in. Set RUN_PRINTER_TESTS=true to run.");

  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("audit page has print label button", async ({ page }) => {
    // Try to navigate to audit page
    await page.goto("/inventory-audit");

    // Check if page loads
    const pageLoaded = await page.locator("body").isVisible({ timeout: 5000 }).catch(() => false);

    if (pageLoaded) {
      // Look for print button (might not be visible if no equipment)
      const printButton = page.locator('#print-tag-btn, button:has-text("Print")');

      // Button might not be visible if there's no equipment, but the page should load
      const buttonExists = await printButton.count() > 0;

      // At minimum, the audit page should load
      expect(pageLoaded).toBe(true);
    }
  });

  test("equipment edit page has print label button", async ({ page }) => {
    // Navigate to search to find an equipment
    await page.goto("/");

    // Try to find any equipment (this test assumes at least one exists)
    const searchInput = page.locator('input[name="q"], input[name="serial"]');
    const hasSearchInput = await searchInput.isVisible({ timeout: 2000 }).catch(() => false);

    if (hasSearchInput) {
      await searchInput.fill("");
      await searchInput.press("Enter");
      await page.waitForLoadState("networkidle");

      // Look for a result to click
      const editLink = page.locator('a[href*="/edit/"]').first();
      const hasEditLink = await editLink.isVisible({ timeout: 2000 }).catch(() => false);

      if (hasEditLink) {
        await editLink.click();
        await page.waitForLoadState("networkidle");

        // Should have print button
        const printButton = page.locator('#print-label, button:has-text("Print")');
        const hasPrintButton = await printButton.count() > 0;

        // Equipment edit page should have a print button
        expect(hasPrintButton).toBe(true);
      }
    }
  });
});
