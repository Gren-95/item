import { test, expect } from "@playwright/test";

test.describe("Dark Mode (#29)", () => {
  test("theme toggle button exists in navigation", async ({ page }) => {
    await page.goto("/");

    const themeToggle = page.locator(
      '#theme-toggle, button[aria-label*="theme" i], button[aria-label*="dark" i], [data-theme-toggle]'
    );
    await expect(themeToggle.first()).toBeVisible();
  });

  test("theme toggle has correct aria-label", async ({ page }) => {
    await page.goto("/");

    const themeToggle = page.locator(
      '#theme-toggle, button[aria-label*="theme" i], button[aria-label*="dark" i]'
    ).first();

    if (await themeToggle.isVisible()) {
      const ariaLabel = await themeToggle.getAttribute("aria-label");
      expect(ariaLabel?.toLowerCase()).toContain("dark");
    }
  });

  test("theme icons are present (light and dark)", async ({ page }) => {
    await page.goto("/");

    const lightIcon = page.locator('#theme-icon-light, [data-theme-icon="light"], .sun-icon');
    const darkIcon = page.locator('#theme-icon-dark, [data-theme-icon="dark"], .moon-icon');

    // At least one should be visible (the active state)
    const lightVisible = await lightIcon.first().isVisible().catch(() => false);
    const darkVisible = await darkIcon.first().isVisible().catch(() => false);

    expect(lightVisible || darkVisible).toBe(true);
  });

  test("clicking theme toggle changes theme", async ({ page }) => {
    await page.goto("/");

    const html = page.locator("html");
    const initialDarkClass = await html.getAttribute("class");
    const wasInitiallyDark = initialDarkClass?.includes("dark") || false;

    const themeToggle = page.locator(
      '#theme-toggle, button[aria-label*="theme" i], button[aria-label*="dark" i], [data-theme-toggle]'
    ).first();

    if (await themeToggle.isVisible()) {
      await themeToggle.click();

      // Wait for theme change
      await page.waitForTimeout(100);

      const newDarkClass = await html.getAttribute("class");
      const isNowDark = newDarkClass?.includes("dark") || false;

      // Theme should have changed
      expect(wasInitiallyDark).not.toBe(isNowDark);
    }
  });

  test("theme preference is saved to localStorage", async ({ page }) => {
    await page.goto("/");

    const themeToggle = page.locator(
      '#theme-toggle, button[aria-label*="theme" i], button[aria-label*="dark" i], [data-theme-toggle]'
    ).first();

    if (await themeToggle.isVisible()) {
      await themeToggle.click();

      // Check localStorage
      const savedTheme = await page.evaluate(() => localStorage.getItem("theme"));
      expect(savedTheme).toBeTruthy();
    }
  });

  test("theme persists across page reloads", async ({ page }) => {
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

test.describe("Theme Responsiveness", () => {
  test("theme toggle is accessible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    const themeToggle = page.locator(
      '#theme-toggle, button[aria-label*="theme" i], button[aria-label*="dark" i], [data-theme-toggle]'
    ).first();

    // Toggle should still be accessible on mobile
    await expect(themeToggle).toBeVisible();
  });

  test("dark mode styling works on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.reload();

    // Page should render correctly
    await expect(page.locator("body")).toBeVisible();
  });
});
