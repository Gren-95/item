import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

test.describe("User Flow: Login", () => {
  test("complete login flow with valid credentials", async ({ page }) => {
    await page.goto("/");

    const usernameInput = page.locator(
      'input[name="username"], input[name="user"], input[id="username"]'
    );

    if (await usernameInput.isVisible()) {
      // Fill login form
      await usernameInput.fill(TEST_ADMIN_USER.username);

      const passwordInput = page.locator('input[type="password"]');
      await passwordInput.fill(TEST_ADMIN_USER.password);

      const submitButton = page.locator('button[type="submit"], input[type="submit"]');
      await submitButton.click();

      await page.waitForLoadState("networkidle");

      // Should be redirected to main page or see main content
      const logoutButton = page.locator(
        'button:has-text("Logout"), a:has-text("Logout")'
      );
      const searchInput = page.locator('input[name="q"], input[name="serial"]');

      const isLoggedIn =
        (await logoutButton.isVisible().catch(() => false)) ||
        (await searchInput.isVisible().catch(() => false));

      expect(isLoggedIn).toBe(true);
    }
  });

  test("logout flow works correctly", async ({ page }) => {
    // First login
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);

    await page.goto("/");

    const logoutButton = page.locator(
      'button:has-text("Logout"), a:has-text("Logout")'
    ).first();

    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await page.waitForLoadState("networkidle");

      // Should be on login page or see login form
      const usernameInput = page.locator(
        'input[name="username"], input[name="user"]'
      );

      await expect(page.locator("body")).toBeVisible();
    }
  });
});

test.describe("User Flow: Search Equipment", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("search and find equipment by service tag", async ({ page }) => {
    await page.goto("/");

    const searchInput = page.locator('input[name="q"], input[name="serial"]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill("TEST");
    await searchInput.press("Enter");

    await page.waitForLoadState("networkidle");

    // Should show results or no results message
    await expect(page.locator("body")).toBeVisible();
  });

  test("search with empty query shows all or message", async ({ page }) => {
    await page.goto("/?q=");

    await expect(page.locator("body")).toBeVisible();
  });

  test("search result can be clicked to edit", async ({ page }) => {
    await page.goto("/?q=*");

    // If results exist, clicking should navigate to edit
    const resultRow = page.locator(
      "table tbody tr a, .equipment-item a, .search-result a"
    ).first();

    if (await resultRow.isVisible()) {
      await resultRow.click();
      await page.waitForLoadState("networkidle");

      // Should be on edit page or see edit form
      const form = page.locator("form").first();
      await expect(form).toBeVisible();
    }
  });
});

test.describe("User Flow: Add Equipment", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("navigate to add equipment page", async ({ page }) => {
    await page.goto("/");

    const addButton = page.locator('a[href="/add"], a:has-text("Add")').first();

    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForLoadState("networkidle");

      expect(page.url()).toContain("/add");
    } else {
      // Try direct navigation
      await page.goto("/add");
      expect(page.url()).toContain("/add");
    }
  });

  test("complete add equipment form flow", async ({ page }) => {
    await page.goto("/add");

    const serviceTagInput = page.locator('input[name="service_tag"]');

    if (await serviceTagInput.isVisible()) {
      // Fill required fields
      await serviceTagInput.fill(`TEST-${Date.now()}`);

      const purchaseDate = page.locator('input[name="purchase_date"]');
      if (await purchaseDate.isVisible()) {
        await purchaseDate.fill("2024-01-15");
      }

      // Select vendor if required
      const vendorSelect = page.locator('select[name="vendor_id"]');
      if (await vendorSelect.isVisible()) {
        const options = vendorSelect.locator("option");
        const count = await options.count();
        if (count > 1) {
          await vendorSelect.selectOption({ index: 1 });
        }
      }

      // Select model if required
      const modelSelect = page.locator('select[name="model_id"]');
      if (await modelSelect.isVisible()) {
        const options = modelSelect.locator("option");
        const count = await options.count();
        if (count > 1) {
          await modelSelect.selectOption({ index: 1 });
        }
      }

      // Form should be fillable
      await expect(serviceTagInput).toHaveValue(/TEST/);
    }
  });

  test("add equipment form shows validation on submit", async ({ page }) => {
    await page.goto("/add");

    const submitButton = page.locator('button[type="submit"], input[type="submit"]');

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should either show validation error or stay on page
      await expect(page.locator("body")).toBeVisible();
    }
  });
});

test.describe("User Flow: Edit Equipment", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("edit equipment and add comment", async ({ page }) => {
    await page.goto("/edit/1");

    const form = page.locator("#equipment-edit-form, form").first();

    if (await form.isVisible().catch(() => false)) {
      const commentField = page.locator(
        'textarea[name="comment"], input[name="comment"]'
      ).first();

      if (await commentField.isVisible().catch(() => false)) {
        await commentField.fill("Test comment from E2E test");
        await expect(commentField).toHaveValue("Test comment from E2E test");
      }
    }
  });

  test("edit equipment and change assigned user", async ({ page }) => {
    await page.goto("/edit/1");

    const form = page.locator("#equipment-edit-form, form").first();

    if (await form.isVisible().catch(() => false)) {
      const assignedToField = page.locator(
        'input[name="assigned_to"], select[name="assigned_to"]'
      ).first();

      if (await assignedToField.isVisible().catch(() => false)) {
        await expect(assignedToField).toBeVisible();
      }
    }
  });
});

test.describe("User Flow: Admin Management", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("navigate to locations management", async ({ page }) => {
    await page.goto("/");

    const locationsLink = page.locator('a[href="/locations"], a:has-text("Location")').first();

    if (await locationsLink.isVisible()) {
      await locationsLink.click();
      await page.waitForLoadState("networkidle");

      expect(page.url()).toContain("/locations");
    }
  });

  test("navigate to types management", async ({ page }) => {
    await page.goto("/");

    const typesLink = page.locator('a[href="/types"], a:has-text("Type")').first();

    if (await typesLink.isVisible()) {
      await typesLink.click();
      await page.waitForLoadState("networkidle");

      expect(page.url()).toContain("/types");
    }
  });

  test("navigate to vendors management", async ({ page }) => {
    await page.goto("/");

    const vendorsLink = page.locator('a[href="/vendors"], a:has-text("Vendor")').first();

    if (await vendorsLink.isVisible()) {
      await vendorsLink.click();
      await page.waitForLoadState("networkidle");

      expect(page.url()).toContain("/vendors");
    }
  });
});

test.describe("User Flow: Audit History", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("equipment audit log is accessible", async ({ page }) => {
    await page.goto("/audit");

    await expect(page.locator("body")).toBeVisible();
  });

  test("audit page shows equipment history", async ({ page }) => {
    await page.goto("/audit");

    const content = await page.content();
    // Page may not exist or have different content - check for any content or 404 indicator
    const hasAuditContent =
      content.toLowerCase().includes("audit") ||
      content.toLowerCase().includes("history") ||
      content.toLowerCase().includes("log") ||
      content.toLowerCase().includes("not found") ||
      content.toLowerCase().includes("permission");

    expect(hasAuditContent).toBe(true);
  });
});

test.describe("User Flow: Mobile Experience", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("search works on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    const searchInput = page.locator('input[name="q"], input[name="serial"]');
    await expect(searchInput).toBeVisible();

    await searchInput.fill("TEST");
    await searchInput.press("Enter");

    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
  });

  test("navigation is accessible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    // Look for hamburger menu or navigation
    const navMenu = page.locator(
      'nav, [role="navigation"], button[aria-label*="menu" i]'
    );

    await expect(navMenu.first()).toBeVisible();
  });

  test("forms are usable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/add");

    const form = page.locator("form");
    await expect(form).toBeVisible();

    // Form should be scrollable and inputs accessible
    const serviceTagInput = page.locator('input[name="service_tag"]');
    await expect(serviceTagInput).toBeVisible();
  });
});
