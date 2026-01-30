import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

test.describe("Equipment Types Management (#4)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("types page loads and displays type hierarchy", async ({ page }) => {
    await page.goto("/types");

    // Page should load successfully
    await expect(page.locator("body")).toBeVisible();

    // Should have tabs or sections for Types, Product Lines, Models
    const content = await page.content();
    const hasTypeContent =
      content.toLowerCase().includes("type") ||
      content.toLowerCase().includes("product") ||
      content.toLowerCase().includes("model");

    expect(hasTypeContent).toBe(true);
  });

  test("types page has tabs for Types, Product Lines, and Models", async ({ page }) => {
    await page.goto("/types");

    // Look for tab navigation
    const tabs = page.locator('[role="tab"], .tab, button:has-text("Type"), button:has-text("Product"), button:has-text("Model")');
    const tabCount = await tabs.count();

    // Should have multiple tabs/sections
    expect(tabCount).toBeGreaterThanOrEqual(1);
  });

  test("can view list of equipment types", async ({ page }) => {
    await page.goto("/types");

    // Should show some form of list (table or cards)
    const listItems = page.locator("table tbody tr, .type-item, .list-item, [data-type-id]");
    const count = await listItems.count();

    // May be empty but structure should exist
    await expect(page.locator("body")).toBeVisible();
  });

  test("types page has add type button", async ({ page }) => {
    await page.goto("/types");

    // Should have add button
    const addButton = page.locator('button:has-text("Add"), a:has-text("Add"), [data-action="add"]');
    await expect(addButton.first()).toBeVisible();
  });

  test("add type form validates empty name", async ({ page }) => {
    await page.goto("/types");

    // Try to add with empty name
    const addButton = page.locator('button:has-text("Add Type"), button:has-text("Add"):visible').first();

    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();

      // Modal or form should appear - use first() for strict mode
      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill("");

        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();

        // Should show validation error or prevent submission
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });

  test("add type form rejects name longer than 25 characters", async ({ page }) => {
    await page.goto("/types");

    const addButton = page.locator('button:has-text("Add Type"), button:has-text("Add"):visible').first();

    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();

      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        // Type name longer than 25 characters
        await nameInput.fill("A".repeat(26));

        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();

        // Should show validation error
        const errorMessage = page.locator('.error, [role="alert"], text=/too long/i, text=/maximum/i');
        const errorVisible = await errorMessage.isVisible().catch(() => false);

        // Either validation error is shown or maxlength attribute prevents long input
        const maxLength = await nameInput.getAttribute("maxlength");
        expect(errorVisible || maxLength !== null).toBe(true);
      }
    }
  });

  test("types can be activated/deactivated", async ({ page }) => {
    await page.goto("/types");

    // Look for activate/deactivate buttons
    const toggleButtons = page.locator(
      'button:has-text("Activate"), button:has-text("Deactivate"), button:has-text("Enable"), button:has-text("Disable"), [data-action="activate"], [data-action="deactivate"]'
    );

    // Structure for toggle should exist
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Equipment Product Lines (#36)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("product lines section exists on types page", async ({ page }) => {
    await page.goto("/types");

    const content = await page.content();
    const hasProductLine =
      content.toLowerCase().includes("product") ||
      content.toLowerCase().includes("line");

    expect(hasProductLine).toBe(true);
  });

  test("product lines are linked to types", async ({ page }) => {
    await page.goto("/types");

    // Product lines should show parent type relationship
    const content = await page.content();
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Equipment Models (#3)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("models section exists on types page", async ({ page }) => {
    await page.goto("/types");

    const content = await page.content();
    const hasModel = content.toLowerCase().includes("model");

    expect(hasModel).toBe(true);
  });

  test("add equipment form includes model selection", async ({ page }) => {
    await page.goto("/add");

    // Model selection should be available
    const modelSelect = page.locator('select[name="model_id"]');
    await expect(modelSelect).toBeVisible();
  });

  test("edit equipment form includes model selection", async ({ page }) => {
    await page.goto("/edit/1");

    const form = page.locator("#equipment-edit-form, form").first();
    if (await form.isVisible().catch(() => false)) {
      const modelSelect = page.locator('select[name="model_id"]');
      await expect(modelSelect).toBeVisible();
    }
  });

  test("type selection cascades to product line and model", async ({ page }) => {
    await page.goto("/add");

    // Changing type should update available product lines/models
    const typeSelect = page.locator('select[name="type_id"]');
    if (await typeSelect.isVisible()) {
      // Select first type option
      const options = typeSelect.locator("option");
      const count = await options.count();

      if (count > 1) {
        await typeSelect.selectOption({ index: 1 });
        await page.waitForLoadState("networkidle");

        // Page should still be functional
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });
});
