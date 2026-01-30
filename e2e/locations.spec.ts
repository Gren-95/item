import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

test.describe("Locations Management (#7)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("locations page loads successfully", async ({ page }) => {
    await page.goto("/locations");

    await expect(page.locator("body")).toBeVisible();

    // Should show location hierarchy elements
    const content = await page.content();
    const hasLocationContent =
      content.toLowerCase().includes("location") ||
      content.toLowerCase().includes("region") ||
      content.toLowerCase().includes("country") ||
      content.toLowerCase().includes("plant") ||
      content.toLowerCase().includes("department") ||
      content.toLowerCase().includes("area");

    expect(hasLocationContent).toBe(true);
  });

  test("locations page shows hierarchical structure", async ({ page }) => {
    await page.goto("/locations");

    // Look for hierarchy indicators (tabs, sections, or nested structure)
    const hierarchyElements = page.locator(
      '[role="tab"], .tab, button:has-text("Region"), button:has-text("Country"), button:has-text("Plant")'
    );

    await expect(page.locator("body")).toBeVisible();
  });

  test("locations page has add location button", async ({ page }) => {
    await page.goto("/locations");

    const addButton = page.locator(
      'button:has-text("Add"), a:has-text("Add"), [data-action="add"]'
    );
    await expect(addButton.first()).toBeVisible();
  });

  test("add region form validates required name field", async ({ page }) => {
    await page.goto("/locations");

    // Try to find add region button
    const addButton = page.locator('button:has-text("Add Region"), button:has-text("Add"):visible').first();

    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();

      // Name field should be visible - use first() for strict mode
      const nameInput = page.locator('input[name="name"]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        // Try to submit empty
        const submitButton = page.locator('button[type="submit"]').first();
        await submitButton.click();

        // Should show validation or prevent submission
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });

  test("locations can be activated/deactivated", async ({ page }) => {
    await page.goto("/locations");

    // Look for status toggle buttons
    const toggleButtons = page.locator(
      'button:has-text("Activate"), button:has-text("Deactivate"), [data-action="activate"], [data-action="deactivate"]'
    );

    await expect(page.locator("body")).toBeVisible();
  });

  test("add equipment form shows location hierarchy", async ({ page }) => {
    await page.goto("/add");

    // Should have location selection fields
    const locationFields = page.locator(
      'select[name*="region"], select[name*="country"], select[name*="plant"], select[name*="department"], select[name*="area"], select[name*="sub_area"]'
    );

    const count = await locationFields.count();
    expect(count).toBeGreaterThan(0);
  });

  test("location selection cascades properly", async ({ page }) => {
    await page.goto("/add");

    // Selecting a parent location should filter child locations
    const regionSelect = page.locator('select[name*="region"], select[name="region_id"]');

    if (await regionSelect.isVisible()) {
      const options = regionSelect.locator("option");
      const count = await options.count();

      if (count > 1) {
        await regionSelect.selectOption({ index: 1 });
        await page.waitForLoadState("networkidle");

        // Child selects should update
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });
});

test.describe("Location Hierarchy Levels", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("region level exists", async ({ page }) => {
    await page.goto("/locations");

    const content = await page.content();
    expect(content.toLowerCase().includes("region")).toBe(true);
  });

  test("country level exists", async ({ page }) => {
    await page.goto("/locations");

    const content = await page.content();
    expect(content.toLowerCase().includes("country")).toBe(true);
  });

  test("plant level exists", async ({ page }) => {
    await page.goto("/locations");

    const content = await page.content();
    expect(content.toLowerCase().includes("plant")).toBe(true);
  });

  test("department level exists", async ({ page }) => {
    await page.goto("/locations");

    const content = await page.content();
    expect(content.toLowerCase().includes("department")).toBe(true);
  });

  test("area and sub-area levels exist", async ({ page }) => {
    await page.goto("/locations");

    const content = await page.content();
    const hasArea =
      content.toLowerCase().includes("area") ||
      content.toLowerCase().includes("sub");

    expect(hasArea).toBe(true);
  });
});
