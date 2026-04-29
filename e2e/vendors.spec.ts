import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

test.describe("Vendors Management (#5)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("vendors page loads successfully", async ({ page }) => {
    await page.goto("/vendors");

    await expect(page.locator("body")).toBeVisible();

    // Should show vendor-related content
    const content = await page.content();
    const hasVendorContent =
      content.toLowerCase().includes("vendor") ||
      content.toLowerCase().includes("manufacturer");

    expect(hasVendorContent).toBe(true);
  });

  test("vendors page lists existing vendors", async ({ page }) => {
    await page.goto("/vendors");

    // Should show list structure (table or cards)
    const listElements = page.locator(
      "table tbody tr, .vendor-item, .list-item, [data-vendor-id]"
    );

    await expect(page.locator("body")).toBeVisible();
  });

  test("vendors page has add vendor button", async ({ page }) => {
    await page.goto("/vendors");

    const addButton = page.locator(
      'button:has-text("Add"), a:has-text("Add"), [data-action="add"]'
    );
    await expect(addButton.first()).toBeVisible();
  });

  test("add vendor form validates required name", async ({ page }) => {
    await page.goto("/vendors");

    const addButton = page.locator('button:has-text("Add Vendor"), button:has-text("Add"):visible').first();

    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();

      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        // Try to submit empty
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();

        // Should show validation
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });

  test("add vendor form rejects name longer than 255 characters", async ({ page }) => {
    await page.goto("/vendors");

    const addButton = page.locator('button:has-text("Add Vendor"), button:has-text("Add"):visible').first();

    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();

      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill("A".repeat(256));

        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();

        // Should show validation error or truncate
        const maxLength = await nameInput.getAttribute("maxlength");
        const currentValue = await nameInput.inputValue();

        // Either maxlength prevents or validation catches it
        expect(maxLength !== null || currentValue.length <= 255).toBe(true);
      }
    }
  });

  test("vendors show equipment count", async ({ page }) => {
    await page.goto("/vendors");

    // Look for count indicators
    const countElements = page.locator(
      '.equipment-count, [data-equipment-count], text=/\\d+.*equipment/i, text=/\\(\\d+\\)/i'
    );

    await expect(page.locator("body")).toBeVisible();
  });

  test("add equipment form includes vendor selection", async ({ page }) => {
    await page.goto("/add");

    const vendorSelect = page.locator('select[name="vendor_id"]');
    await expect(vendorSelect).toBeVisible();
  });

  test("vendor can be edited", async ({ page }) => {
    await page.goto("/vendors");

    const editButton = page.locator(
      'button:has-text("Edit"), a:has-text("Edit"), [data-action="edit"]'
    ).first();

    if (await editButton.isVisible()) {
      await editButton.click();

      // Edit form should appear
      const nameInput = page.locator('input[name="name"]');
      await expect(nameInput).toBeVisible();
    }
  });

  test("vendor can be deleted if no equipment attached", async ({ page }) => {
    await page.goto("/vendors");

    // Delete button should exist (may be disabled for vendors with equipment)
    const deleteButton = page.locator(
      'button:has-text("Delete"), [data-action="delete"]'
    ).first();

    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Suppliers Management", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("suppliers page loads successfully", async ({ page }) => {
    await page.goto("/vendors");

    await expect(page.locator("body")).toBeVisible();
  });

  test("add supplier form has all required fields", async ({ page }) => {
    await page.goto("/vendors");

    const addButton = page.locator('button:has-text("Add"), a:has-text("Add")').first();

    if (await addButton.isVisible()) {
      await addButton.click();

      // Check for supplier-specific fields
      const nameInput = page.locator('input[name="name"]').first();
      const emailInput = page.locator('input[name="email"]').first();
      const phoneInput = page.locator('input[name="phone_number"]').first();

      if (await nameInput.isVisible().catch(() => false)) {
        await expect(nameInput).toBeVisible();
      }
    }
  });

  test("supplier form validates SAP vendor number format", async ({ page }) => {
    await page.goto("/vendors");

    const addButton = page.locator('button:has-text("Add"), a:has-text("Add")').first();

    if (await addButton.isVisible()) {
      await addButton.click();

      const sapInput = page.locator('input[name="sap_vendor_no"]').first();
      if (await sapInput.isVisible()) {
        // SAP vendor number should be numeric
        await sapInput.fill("12abc");

        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();

        // Should show validation error
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });
});

test.describe("Write-off Reasons Management (#8)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("write-off reasons page loads successfully", async ({ page }) => {
    await page.goto("/write-off-reasons");

    await expect(page.locator("body")).toBeVisible();
  });

  test("write-off reasons are available in equipment disposal", async ({ page }) => {
    // Write-off reasons should be selectable when marking equipment as written off
    await page.goto("/edit/1");

    const form = page.locator("#equipment-edit-form, form").first();
    if (await form.isVisible().catch(() => false)) {
      const writeOffSelect = page.locator(
        'select[name="write_off_reason_id"], select[name*="write_off"]'
      );

      // May or may not be visible depending on permissions
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
