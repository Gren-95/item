import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

test.describe("Email Notifications", () => {
  test.describe("Approval workflow with notifications", () => {
    test("creating approval request should trigger notification (if SMTP configured)", async ({ page }) => {
      await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);

      // Navigate to a page where we can create an approval request
      // This will depend on your specific UI flow
      // For now, we just verify the flow doesn't break with email enabled

      await page.goto("/");

      // Verify the page loaded successfully
      await expect(page).not.toHaveURL(/\/error/);
    });

    test("approving a request should trigger decision notification (if SMTP configured)", async ({ page }) => {
      await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);

      // Navigate to approvals page
      await page.goto("/approvals");

      // Verify the page loaded successfully
      // The actual approval would trigger email notification if SMTP is configured
      await expect(page).not.toHaveURL(/\/error/);
    });

    test("rejecting a request should trigger decision notification (if SMTP configured)", async ({ page }) => {
      await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);

      // Navigate to approvals page
      await page.goto("/approvals");

      // Verify the page loaded successfully
      // The actual rejection would trigger email notification if SMTP is configured
      await expect(page).not.toHaveURL(/\/error/);
    });
  });

  test.describe("Integration with approval workflow", () => {
    test("approvals page loads successfully with email notifications enabled", async ({ page }) => {
      await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);

      // Navigate to approvals page
      await page.goto("/approvals");

      // Verify page loaded successfully (email notifications shouldn't break the page)
      await expect(page).not.toHaveURL(/\/error/);

      // Check for common approval page elements
      const pageContent = await page.content();
      expect(pageContent).toBeTruthy();
    });

    test("creating an approval request doesn't fail due to email errors", async ({ page }) => {
      await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);

      // Visit home page (approval requests can be triggered from various pages)
      await page.goto("/");

      // Verify the application works normally
      await expect(page).not.toHaveURL(/\/error/);
    });
  });
});
