import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

test.describe("Text Zoom Control (#66)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await page.goto("/");
    // Clear any saved zoom preference
    await page.evaluate(() => localStorage.removeItem("textZoom"));
    await page.reload();
  });

  test("text zoom control group is visible in hamburger menu", async ({ page }) => {
    const menuToggle = page.locator("#menu-toggle");
    await menuToggle.click();

    const zoomControl = page.locator("#text-zoom-control");
    await expect(zoomControl).toBeVisible();
  });

  test("text zoom control has three buttons: zoom out, reset, zoom in", async ({ page }) => {
    const menuToggle = page.locator("#menu-toggle");
    await menuToggle.click();

    const zoomOutBtn = page.locator("#zoom-out-btn");
    const zoomResetBtn = page.locator("#zoom-reset-btn");
    const zoomInBtn = page.locator("#zoom-in-btn");

    await expect(zoomOutBtn).toBeVisible();
    await expect(zoomResetBtn).toBeVisible();
    await expect(zoomInBtn).toBeVisible();
  });

  test("text zoom control is displayed below the theme selector", async ({ page }) => {
    const menuToggle = page.locator("#menu-toggle");
    await menuToggle.click();

    const themeSelector = page.locator("#theme-selector");
    const zoomControl = page.locator("#text-zoom-control");

    await expect(themeSelector).toBeVisible();
    await expect(zoomControl).toBeVisible();

    // Theme selector should appear before zoom control in DOM order
    const themeBox = await themeSelector.boundingBox();
    const zoomBox = await zoomControl.boundingBox();

    expect(themeBox).not.toBeNull();
    expect(zoomBox).not.toBeNull();
    expect(themeBox!.y).toBeLessThan(zoomBox!.y);
  });

  test("clicking zoom in increases font size by 2px", async ({ page }) => {
    const menuToggle = page.locator("#menu-toggle");
    await menuToggle.click();

    const zoomInBtn = page.locator("#zoom-in-btn");
    await zoomInBtn.click();

    await page.waitForTimeout(100);

    const fontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    expect(fontSize).toBe("18px");
  });

  test("clicking zoom out decreases font size by 2px", async ({ page }) => {
    const menuToggle = page.locator("#menu-toggle");
    await menuToggle.click();

    const zoomOutBtn = page.locator("#zoom-out-btn");
    await zoomOutBtn.click();

    await page.waitForTimeout(100);

    const fontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    expect(fontSize).toBe("14px");
  });

  test("clicking reset returns font size to default", async ({ page }) => {
    // First zoom in
    await page.evaluate(() => {
      localStorage.setItem("textZoom", "20");
      document.documentElement.style.fontSize = "20px";
    });

    const menuToggle = page.locator("#menu-toggle");
    await menuToggle.click();

    const zoomResetBtn = page.locator("#zoom-reset-btn");
    await zoomResetBtn.click();

    await page.waitForTimeout(100);

    const fontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    expect(fontSize).toBe("");

    const storedZoom = await page.evaluate(() => localStorage.getItem("textZoom"));
    expect(storedZoom).toBeNull();
  });

  test("zoom in saves preference to localStorage", async ({ page }) => {
    const menuToggle = page.locator("#menu-toggle");
    await menuToggle.click();

    const zoomInBtn = page.locator("#zoom-in-btn");
    await zoomInBtn.click();

    const storedZoom = await page.evaluate(() => localStorage.getItem("textZoom"));
    expect(storedZoom).toBe("18");
  });

  test("zoom out saves preference to localStorage", async ({ page }) => {
    const menuToggle = page.locator("#menu-toggle");
    await menuToggle.click();

    const zoomOutBtn = page.locator("#zoom-out-btn");
    await zoomOutBtn.click();

    const storedZoom = await page.evaluate(() => localStorage.getItem("textZoom"));
    expect(storedZoom).toBe("14");
  });

  test("zoom preference persists across page reloads", async ({ page }) => {
    // Set zoom to 20px
    await page.evaluate(() => localStorage.setItem("textZoom", "20"));
    await page.reload();

    const fontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    expect(fontSize).toBe("20px");
  });

  test("zoom does not exceed maximum of 24px", async ({ page }) => {
    // Set zoom close to max
    await page.evaluate(() => {
      localStorage.setItem("textZoom", "24");
      document.documentElement.style.fontSize = "24px";
    });

    const menuToggle = page.locator("#menu-toggle");
    await menuToggle.click();

    const zoomInBtn = page.locator("#zoom-in-btn");
    await zoomInBtn.click();

    await page.waitForTimeout(100);

    const storedZoom = await page.evaluate(() => localStorage.getItem("textZoom"));
    expect(storedZoom).toBe("24");
  });

  test("zoom does not go below minimum of 12px", async ({ page }) => {
    // Set zoom close to min
    await page.evaluate(() => {
      localStorage.setItem("textZoom", "12");
      document.documentElement.style.fontSize = "12px";
    });

    const menuToggle = page.locator("#menu-toggle");
    await menuToggle.click();

    const zoomOutBtn = page.locator("#zoom-out-btn");
    await zoomOutBtn.click();

    await page.waitForTimeout(100);

    const storedZoom = await page.evaluate(() => localStorage.getItem("textZoom"));
    expect(storedZoom).toBe("12");
  });

  test("multiple zoom in clicks increase font size incrementally", async ({ page }) => {
    const menuToggle = page.locator("#menu-toggle");
    await menuToggle.click();

    const zoomInBtn = page.locator("#zoom-in-btn");

    // Click 3 times: 16 → 18 → 20 → 22
    await zoomInBtn.click();
    await zoomInBtn.click();
    await zoomInBtn.click();

    await page.waitForTimeout(100);

    const fontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    expect(fontSize).toBe("22px");
  });

  test("zoom affects text across different pages", async ({ page }) => {
    // Set zoom
    await page.evaluate(() => localStorage.setItem("textZoom", "20"));

    // Navigate to a different page
    await page.goto("/locations");

    const fontSize = await page.evaluate(() => document.documentElement.style.fontSize);
    expect(fontSize).toBe("20px");
  });

  test("zoom control is accessible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();

    const menuToggle = page.locator("#menu-toggle");
    await menuToggle.click();

    const zoomControl = page.locator("#text-zoom-control");
    await expect(zoomControl).toBeVisible();
  });

  test("zoom control supports dark theme styling", async ({ page }) => {
    // Enable dark mode
    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.reload();

    const menuToggle = page.locator("#menu-toggle");
    await menuToggle.click();

    const zoomControl = page.locator("#text-zoom-control");
    await expect(zoomControl).toBeVisible();

    // Verify the control renders in dark mode without errors
    const html = page.locator("html");
    const htmlClass = await html.getAttribute("class");
    expect(htmlClass?.includes("dark")).toBe(true);
  });
});
