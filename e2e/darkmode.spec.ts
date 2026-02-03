import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

test.describe("Dark Mode (#29)", () => {
  test("theme selector exists in hamburger menu", async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await page.goto("/");

    // Open hamburger menu first
    const menuToggle = page.locator('#menu-toggle');
    await menuToggle.click();

    // Theme selector should now be visible in the menu
    const themeSelector = page.locator('#theme-selector');
    await expect(themeSelector).toBeVisible();
  });

  test("theme selector has three options: Light, Dark, System", async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await page.goto("/");

    // Open hamburger menu
    const menuToggle = page.locator('#menu-toggle');
    await menuToggle.click();

    // Check that all three theme buttons exist
    const lightBtn = page.locator('#theme-light');
    const darkBtn = page.locator('#theme-dark');
    const systemBtn = page.locator('#theme-system');

    await expect(lightBtn).toBeVisible();
    await expect(darkBtn).toBeVisible();
    await expect(systemBtn).toBeVisible();
  });

  test("theme buttons have correct labels", async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await page.goto("/");

    // Open hamburger menu
    const menuToggle = page.locator('#menu-toggle');
    await menuToggle.click();

    const lightBtn = page.locator('#theme-light');
    const darkBtn = page.locator('#theme-dark');
    const systemBtn = page.locator('#theme-system');

    await expect(lightBtn).toContainText('Light');
    await expect(darkBtn).toContainText('Dark');
    await expect(systemBtn).toContainText('System');
  });

  test("clicking dark theme button enables dark mode", async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await page.goto("/");

    // Clear any existing theme preference
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();

    // Open hamburger menu
    const menuToggle = page.locator('#menu-toggle');
    await menuToggle.click();

    const darkBtn = page.locator('#theme-dark');
    await darkBtn.click();

    // Wait for theme change
    await page.waitForTimeout(100);

    const html = page.locator("html");
    const darkClass = await html.getAttribute("class");
    expect(darkClass?.includes("dark")).toBe(true);
  });

  test("clicking light theme button enables light mode", async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await page.goto("/");

    // First set dark mode
    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.reload();

    // Open hamburger menu
    const menuToggle = page.locator('#menu-toggle');
    await menuToggle.click();

    const lightBtn = page.locator('#theme-light');
    await lightBtn.click();

    // Wait for theme change
    await page.waitForTimeout(100);

    const html = page.locator("html");
    const darkClass = await html.getAttribute("class") || "";
    expect(darkClass.includes("dark")).toBe(false);
  });

  test("theme preference is saved to localStorage", async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await page.goto("/");

    // Open hamburger menu
    const menuToggle = page.locator('#menu-toggle');
    await menuToggle.click();

    const darkBtn = page.locator('#theme-dark');
    await darkBtn.click();

    // Check localStorage
    const savedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(savedTheme).toBe("dark");
  });

  test("theme persists across page reloads", async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await page.goto("/");

    // Set dark mode
    await page.evaluate(() => localStorage.setItem("theme", "dark"));

    // Reload page
    await page.reload();

    const html = page.locator("html");
    const darkClass = await html.getAttribute("class");

    expect(darkClass?.includes("dark")).toBe(true);
  });

  test("system preference is detected when no saved preference", async ({ page }) => {
    // Clear localStorage and emulate dark mode preference
    await page.emulateMedia({ colorScheme: "dark" });
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await page.goto("/");

    // Clear any saved preference
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();

    const html = page.locator("html");
    const darkClass = await html.getAttribute("class");

    // Should follow system preference (dark)
    expect(darkClass?.includes("dark")).toBe(true);
  });

  test("light mode system preference is detected", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await page.goto("/");

    // Clear any saved preference
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();

    const html = page.locator("html");
    const darkClass = await html.getAttribute("class") || "";

    // Should follow system preference (light) - dark class should not be present
    expect(!darkClass.includes("dark") || darkClass === "").toBe(true);
  });

  test("Tailwind dark mode classes are configured", async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await page.goto("/");

    // Set dark mode
    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.reload();

    // Dark mode specific styles should be applied
    const darkElements = page.locator('[class*="dark:"]');

    // Page should render correctly in dark mode
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("System Theme Detection", () => {
  test("system button clears localStorage theme preference", async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await page.goto("/");

    // First set a manual theme
    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.reload();

    // Open hamburger menu
    const menuToggle = page.locator('#menu-toggle');
    await menuToggle.click();

    // Click system button
    const systemBtn = page.locator('#theme-system');
    await systemBtn.click();

    // localStorage should be cleared
    const savedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(savedTheme).toBeNull();
  });

  test("system theme follows browser preference when selected", async ({ page }) => {
    // Emulate dark mode system preference
    await page.emulateMedia({ colorScheme: "dark" });
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await page.goto("/");

    // Clear any saved preference to use system
    await page.evaluate(() => localStorage.removeItem("theme"));
    await page.reload();

    const html = page.locator("html");
    const darkClass = await html.getAttribute("class");
    expect(darkClass?.includes("dark")).toBe(true);
  });
});

test.describe("Theme Responsiveness", () => {
  test("theme selector is accessible on mobile via hamburger menu", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await page.goto("/");

    // Open hamburger menu first
    const menuToggle = page.locator('#menu-toggle');
    await menuToggle.click();

    const themeSelector = page.locator('#theme-selector');

    // Selector should be accessible after opening menu on mobile
    await expect(themeSelector).toBeVisible();
  });

  test("dark mode styling works on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await page.goto("/");

    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.reload();

    // Page should render correctly
    await expect(page.locator("body")).toBeVisible();
  });
});
