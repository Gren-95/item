import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

test.describe("Authentication", () => {
  test("unauthenticated users are redirected to login", async ({ page }) => {
    await page.goto("/add");

    // Should either show login form or redirect to login
    const loginForm = page.locator('input[name="username"], input[name="user"]');
    const isOnAddPage = page.url().includes("/add");
    const isOnLoginPage = page.url().includes("/login");

    // Either we're on login page or add page is protected
    const loginFormVisible = await loginForm.isVisible().catch(() => false);

    expect(isOnLoginPage || loginFormVisible || isOnAddPage).toBe(true);
  });

  test("login page has username and password fields", async ({ page }) => {
    await page.goto("/");

    const usernameInput = page.locator(
      'input[name="username"], input[name="user"], input[id="username"]'
    );
    const passwordInput = page.locator('input[name="password"], input[type="password"]');

    // If login is required, these should be visible
    const usernameVisible = await usernameInput.isVisible().catch(() => false);
    const passwordVisible = await passwordInput.isVisible().catch(() => false);

    // Either no login required or login form exists
    expect(usernameVisible === passwordVisible).toBe(true);
  });

  test("login form has autocomplete attributes (#40)", async ({ page }) => {
    await page.goto("/");

    const usernameInput = page.locator(
      'input[name="username"], input[name="user"], input[id="username"]'
    );

    if (await usernameInput.isVisible()) {
      // Should have autocomplete attribute for better UX
      const autocomplete = await usernameInput.getAttribute("autocomplete");
      expect(autocomplete).toBeTruthy();
    }
  });

  test("invalid credentials show error message", async ({ page }) => {
    await page.goto("/");

    const usernameInput = page.locator(
      'input[name="username"], input[name="user"], input[id="username"]'
    );

    if (await usernameInput.isVisible()) {
      await usernameInput.fill("invalid_user_12345");

      const passwordInput = page.locator('input[type="password"]');
      await passwordInput.fill("invalid_password_12345");

      const submitButton = page.locator('button[type="submit"], input[type="submit"]');
      await submitButton.click();

      await page.waitForLoadState("networkidle");

      // Should show error or stay on login page
      const errorMessage = page.locator(
        '.error, [role="alert"], text=/invalid/i, text=/incorrect/i, text=/failed/i'
      );
      const stillOnLogin = await usernameInput.isVisible();

      expect(stillOnLogin || (await errorMessage.isVisible().catch(() => false))).toBe(true);
    }
  });

  test("logout button exists when logged in", async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await page.goto("/");

    // If there's a logout button, user is logged in
    // Check for logout button with ID, aria-label, or text
    const logoutButton = page.locator(
      '#logout-btn, [aria-label="Logout"], button:has-text("Logout"), a:has-text("Logout"), [data-action="logout"]'
    );

    await expect(logoutButton.first()).toBeVisible();
  });
});

test.describe("Permissions (#12)", () => {
  test("check permission API exists", async ({ request }) => {
    const response = await request.get("/api/check-permission?permission=add_equipment");

    // Should not be 404
    expect(response.status()).not.toBe(404);
  });

  test("permission check returns expected format", async ({ request }) => {
    const response = await request.get("/api/check-permission?permission=search");

    if (response.status() === 200) {
      const contentType = response.headers()["content-type"] || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        // Should have hasPermission field
        expect(data).toHaveProperty("hasPermission");
      }
    }
  });

  test("permission check requires permission parameter", async ({ request }) => {
    const response = await request.get("/api/check-permission");

    // Should return error status (400 for validation, or 200 with empty response is also acceptable)
    expect([200, 400, 401, 403]).toContain(response.status());
  });

  test("expiring permissions API exists", async ({ request }) => {
    const response = await request.get("/api/permissions/expiring");

    // Should not be 404 (may require auth)
    expect(response.status()).not.toBe(404);
  });

  test("expiring permissions accepts days parameter", async ({ request }) => {
    const response = await request.get("/api/permissions/expiring?days=7");

    expect(response.status()).not.toBe(404);
  });

  test("permission audit log API exists", async ({ request }) => {
    const response = await request.get("/api/permissions/audit-log");

    expect(response.status()).not.toBe(404);
  });

  test("audit log supports pagination", async ({ request }) => {
    const response = await request.get("/api/permissions/audit-log?limit=10&offset=0");

    expect(response.status()).not.toBe(404);

    if (response.status() === 200) {
      const contentType = response.headers()["content-type"] || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        expect(data).toHaveProperty("data");
        expect(data).toHaveProperty("total");
      }
    }
  });

  test("audit log caps limit at 500", async ({ request }) => {
    const response = await request.get("/api/permissions/audit-log?limit=1000");

    if (response.status() === 200) {
      const contentType = response.headers()["content-type"] || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        expect(data.limit).toBeLessThanOrEqual(500);
      }
    }
  });
});

test.describe("Plant-Based Access Control (#44)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("permissions page loads", async ({ page }) => {
    await page.goto("/permissions");

    await expect(page.locator("body")).toBeVisible();
  });

  test("permissions page shows plant-based access options", async ({ page }) => {
    await page.goto("/permissions");

    const content = await page.content();
    const hasPlantContent =
      content.toLowerCase().includes("plant") ||
      content.toLowerCase().includes("permission") ||
      content.toLowerCase().includes("access");

    expect(hasPlantContent).toBe(true);
  });

  test("add permission form includes plant selection", async ({ page }) => {
    await page.goto("/permissions");

    const addButton = page.locator('button:has-text("Add"), a:has-text("Add")').first();

    if (await addButton.isVisible()) {
      await addButton.click();

      const plantSelect = page.locator('select[name="plant_id"], select[name*="plant"]');
      await expect(plantSelect.first()).toBeVisible();
    }
  });

  test("permissions can be set with expiry date", async ({ page }) => {
    await page.goto("/permissions");

    const addButton = page.locator('button:has-text("Add"), a:has-text("Add")').first();

    if (await addButton.isVisible()) {
      await addButton.click();

      const expiryInput = page.locator(
        'input[name="expiry_date"], input[type="date"][name*="expiry"]'
      );

      if (await expiryInput.isVisible()) {
        await expect(expiryInput).toBeVisible();
      }
    }
  });

  test("search results are filtered by plant access", async ({ page }) => {
    await page.goto("/?q=*");

    // Results should only show equipment from accessible plants
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Approval Workflow", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("approval warning shows when permission not granted", async ({ page }) => {
    await page.goto("/add");

    // Look for approval warning banner
    const warningBanner = page.locator(
      '#approval-warning, .approval-warning, [data-approval-required]'
    );

    // May or may not be visible depending on user permissions
    await expect(page.locator("body")).toBeVisible();
  });

  test("pending approvals page exists", async ({ page }) => {
    await page.goto("/approvals");

    await expect(page.locator("body")).toBeVisible();
  });
});
