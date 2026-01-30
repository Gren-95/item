import { test as base, expect, type Page } from "@playwright/test";

// Test user credentials (admin user with full access)
// Uses ADMIN_USERNAME/ADMIN_PASSWORD from environment or defaults to common dev values
export const TEST_ADMIN_USER = {
  username: process.env.ADMIN_USERNAME || "admin",
  password: process.env.ADMIN_PASSWORD || "service",
};

// Test user credentials (regular user with limited access)
export const TEST_USER = {
  username: "testuser",
  password: "testuser",
};

// Custom test fixtures
export const test = base.extend<{
  authenticatedPage: Page;
  adminPage: Page;
}>({
  // Authenticated page with admin privileges
  adminPage: async ({ page }, use) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await use(page);
  },

  // Authenticated page with regular user
  authenticatedPage: async ({ page }, use) => {
    await login(page, TEST_USER.username, TEST_USER.password);
    await use(page);
  },
});

// Login helper function
export async function login(
  page: Page,
  username: string,
  password: string
): Promise<void> {
  await page.goto("/");

  // Check if already logged in
  const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")');
  if (await logoutButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    return; // Already logged in
  }

  // Look for login form
  const usernameInput = page.locator('input[name="username"], input[name="user"], input[id="username"]');
  const passwordInput = page.locator('input[name="password"], input[type="password"]');

  if (await usernameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await usernameInput.fill(username);
    await passwordInput.fill(password);
    await page.locator('button[type="submit"], input[type="submit"]').click();
    await page.waitForURL((url) => !url.pathname.includes("login"), { timeout: 10000 });
  }
}

// Logout helper function
export async function logout(page: Page): Promise<void> {
  const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")');
  if (await logoutButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await logoutButton.click();
    await page.waitForLoadState("networkidle");
  }
}

// Search equipment helper
export async function searchEquipment(page: Page, query: string): Promise<void> {
  await page.goto("/");
  const searchInput = page.locator('input[name="q"], input[name="serial"], input[placeholder*="search" i], input[placeholder*="serial" i]');
  await searchInput.fill(query);
  await searchInput.press("Enter");
  await page.waitForLoadState("networkidle");
}

// Navigate to add equipment page
export async function goToAddEquipment(page: Page): Promise<void> {
  await page.goto("/add");
  await page.waitForLoadState("networkidle");
}

// Navigate to edit equipment page
export async function goToEditEquipment(page: Page, id: number | string): Promise<void> {
  await page.goto(`/edit/${id}`);
  await page.waitForLoadState("networkidle");
}

// Navigate to admin pages
export async function goToLocations(page: Page): Promise<void> {
  await page.goto("/locations");
  await page.waitForLoadState("networkidle");
}

export async function goToTypes(page: Page): Promise<void> {
  await page.goto("/types");
  await page.waitForLoadState("networkidle");
}

export async function goToVendors(page: Page): Promise<void> {
  await page.goto("/vendors");
  await page.waitForLoadState("networkidle");
}

export async function goToPermissions(page: Page): Promise<void> {
  await page.goto("/permissions");
  await page.waitForLoadState("networkidle");
}

// Form helper - fill equipment form
export async function fillEquipmentForm(
  page: Page,
  data: {
    service_tag?: string;
    purchase_date?: string;
    warranty_expiry_date?: string;
    model_id?: string;
    vendor_id?: string;
    assigned_to?: string;
    comment?: string;
    ip?: string;
    teamviewer?: string;
  }
): Promise<void> {
  if (data.service_tag) {
    await page.locator('input[name="service_tag"]').fill(data.service_tag);
  }
  if (data.purchase_date) {
    await page.locator('input[name="purchase_date"]').fill(data.purchase_date);
  }
  if (data.warranty_expiry_date) {
    await page.locator('input[name="warranty_expiry_date"]').fill(data.warranty_expiry_date);
  }
  if (data.model_id) {
    await page.locator('select[name="model_id"]').selectOption(data.model_id);
  }
  if (data.vendor_id) {
    await page.locator('select[name="vendor_id"]').selectOption(data.vendor_id);
  }
  if (data.assigned_to) {
    await page.locator('input[name="assigned_to"], select[name="assigned_to"]').fill(data.assigned_to);
  }
  if (data.comment) {
    await page.locator('textarea[name="comment"], input[name="comment"]').fill(data.comment);
  }
  if (data.ip) {
    await page.locator('input[name="ip"]').fill(data.ip);
  }
  if (data.teamviewer) {
    await page.locator('input[name="teamviewer"]').fill(data.teamviewer);
  }
}

// Wait for toast/notification message
export async function waitForToast(page: Page, text?: string): Promise<void> {
  const toastSelector = '[role="alert"], .toast, .notification, .alert';
  if (text) {
    await expect(page.locator(toastSelector).filter({ hasText: text })).toBeVisible({ timeout: 5000 });
  } else {
    await expect(page.locator(toastSelector).first()).toBeVisible({ timeout: 5000 });
  }
}

// Generate unique test data
export function generateUniqueId(): string {
  return `TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

export { expect };
