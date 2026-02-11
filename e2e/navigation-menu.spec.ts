import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

test.describe("Simplified Navigation Menu (#67)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await page.goto("/");
    // Clear management expanded state
    await page.evaluate(() => localStorage.removeItem("managementExpanded"));
    await page.reload();
    // Open the hamburger menu
    await page.locator("#menu-toggle").click();
    await expect(page.locator("#nav-links")).toBeVisible();
  });

  test("everyday links are visible by default", async ({ page }) => {
    await expect(page.locator('#nav-links a[href="/"]')).toBeVisible();
    await expect(page.locator('#nav-links a[href="/repairs"]')).toBeVisible();
    await expect(
      page.locator('#nav-links a[href="/inventory-audit"]'),
    ).toBeVisible();
    await expect(page.locator('#nav-links a[href="/labels"]')).toBeVisible();
    await expect(
      page.locator('#nav-links a[href="/change-password"]'),
    ).toBeVisible();
  });

  test("management links are hidden by default", async ({ page }) => {
    await expect(page.locator("#management-links")).toBeHidden();
    await expect(
      page.locator('#management-links a[href="/locations"]'),
    ).toBeHidden();
    await expect(
      page.locator('#management-links a[href="/types"]'),
    ).toBeHidden();
    await expect(
      page.locator('#management-links a[href="/vendors"]'),
    ).toBeHidden();
    await expect(
      page.locator('#management-links a[href="/write-off-reasons"]'),
    ).toBeHidden();
  });

  test("management toggle button is visible between everyday and account sections", async ({
    page,
  }) => {
    const toggle = page.locator("#management-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toContainText("Management");
  });

  test("clicking management toggle expands management links", async ({
    page,
  }) => {
    const toggle = page.locator("#management-toggle");
    await toggle.click();
    await expect(page.locator("#management-links")).toBeVisible();
    await expect(
      page.locator('#management-links a[href="/locations"]'),
    ).toBeVisible();
    await expect(
      page.locator('#management-links a[href="/types"]'),
    ).toBeVisible();
    await expect(
      page.locator('#management-links a[href="/vendors"]'),
    ).toBeVisible();
    await expect(
      page.locator('#management-links a[href="/write-off-reasons"]'),
    ).toBeVisible();
  });

  test("clicking management toggle again collapses the section", async ({
    page,
  }) => {
    const toggle = page.locator("#management-toggle");
    await toggle.click();
    await expect(page.locator("#management-links")).toBeVisible();
    await toggle.click();
    await expect(page.locator("#management-links")).toBeHidden();
  });

  test("chevron icon rotates when management section is expanded", async ({
    page,
  }) => {
    const chevron = page.locator("#management-chevron");
    // Initially no rotation
    const initialTransform = await chevron.evaluate(
      (el) => (el as HTMLElement).style.transform,
    );
    expect(initialTransform).toBe("");

    // Click to expand
    await page.locator("#management-toggle").click();
    const expandedTransform = await chevron.evaluate(
      (el) => (el as HTMLElement).style.transform,
    );
    expect(expandedTransform).toBe("rotate(180deg)");

    // Click to collapse
    await page.locator("#management-toggle").click();
    const collapsedTransform = await chevron.evaluate(
      (el) => (el as HTMLElement).style.transform,
    );
    expect(collapsedTransform).toBe("");
  });

  test("expanded state is persisted in localStorage", async ({ page }) => {
    // Expand management section
    await page.locator("#management-toggle").click();
    await expect(page.locator("#management-links")).toBeVisible();

    // Verify localStorage was set
    const stored = await page.evaluate(() =>
      localStorage.getItem("managementExpanded"),
    );
    expect(stored).toBe("true");

    // Reload and reopen menu — section should still be expanded
    await page.reload();
    await page.locator("#menu-toggle").click();
    await expect(page.locator("#nav-links")).toBeVisible();
    await expect(page.locator("#management-links")).toBeVisible();
  });

  test("collapsing and reloading keeps section collapsed", async ({
    page,
  }) => {
    // Expand then collapse
    await page.locator("#management-toggle").click();
    await page.locator("#management-toggle").click();
    await expect(page.locator("#management-links")).toBeHidden();

    const stored = await page.evaluate(() =>
      localStorage.getItem("managementExpanded"),
    );
    expect(stored).toBe("false");

    // Reload and reopen menu — section should be collapsed
    await page.reload();
    await page.locator("#menu-toggle").click();
    await expect(page.locator("#nav-links")).toBeVisible();
    await expect(page.locator("#management-links")).toBeHidden();
  });

  test("management section has visual distinction (border-left)", async ({
    page,
  }) => {
    await page.locator("#management-toggle").click();
    const nav = page.locator("#management-links nav");
    await expect(nav).toBeVisible();
    // Should have the left border class
    const classes = await nav.getAttribute("class");
    expect(classes).toContain("border-l-2");
  });

  test("management toggle has aria-expanded attribute", async ({ page }) => {
    const toggle = page.locator("#management-toggle");
    // Initially collapsed
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    // Expand
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    // Collapse
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  test("management section supports dark theme", async ({ page }) => {
    // Switch to dark theme
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    });

    await page.locator("#management-toggle").click();
    await expect(page.locator("#management-links")).toBeVisible();

    // Check that management links are visible and have text content
    const locationsLink = page.locator(
      '#management-links a[href="/locations"]',
    );
    await expect(locationsLink).toBeVisible();
    await expect(locationsLink).toContainText("Locations");
  });

  test("User Permissions link is inside the management section", async ({
    page,
  }) => {
    // Management collapsed — User Permissions should be hidden
    const mgmtPermissions = page.locator(
      '#management-links a[href="/permissions"]',
    );
    await expect(mgmtPermissions).toBeHidden();

    // Expand management — User Permissions should be visible
    await page.locator("#management-toggle").click();
    await expect(mgmtPermissions).toBeVisible();
  });

  test("management links navigate to correct pages", async ({ page }) => {
    await page.locator("#management-toggle").click();

    // Click Locations link and verify navigation
    await page.locator('#management-links a[href="/locations"]').click();
    await expect(page).toHaveURL(/\/locations/);
  });

  test("menu works on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.locator("#menu-toggle").click();
    await expect(page.locator("#nav-links")).toBeVisible();
    await expect(page.locator("#management-toggle")).toBeVisible();

    // Expand management on mobile
    await page.locator("#management-toggle").click();
    await expect(page.locator("#management-links")).toBeVisible();
  });
});
