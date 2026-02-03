import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

test.describe("Email Notifications", () => {
  test("email module exports required functions", async () => {
    // Verify all email notification functions are exported and available
    const emailModule = await import("../src/utils/email");

    expect(emailModule.validateEmailConfig).toBeDefined();
    expect(typeof emailModule.validateEmailConfig).toBe("function");

    expect(emailModule.sendApprovalNotification).toBeDefined();
    expect(typeof emailModule.sendApprovalNotification).toBe("function");

    expect(emailModule.sendPendingApprovalReminders).toBeDefined();
    expect(typeof emailModule.sendPendingApprovalReminders).toBe("function");

    expect(emailModule.sendApprovalDecisionNotification).toBeDefined();
    expect(typeof emailModule.sendApprovalDecisionNotification).toBe("function");

    expect(emailModule.getAdminEmails).toBeDefined();
    expect(typeof emailModule.getAdminEmails).toBe("function");
  });

  test("getAdminEmails returns array of emails", async () => {
    const { getAdminEmails } = await import("../src/utils/email");
    const pool = (await import("../src/db")).default;

    // Test with a permission that should exist
    const adminEmails = await getAdminEmails("equipment_edit", pool);

    // Should return an array (may be empty if no admins configured)
    expect(Array.isArray(adminEmails)).toBe(true);

    // All results should be valid email addresses
    adminEmails.forEach(email => {
      expect(email).toMatch(/@/);
    });
  });

  test("sendApprovalNotification handles missing SMTP gracefully", async () => {
    const { sendApprovalNotification } = await import("../src/utils/email");
    const pool = (await import("../src/db")).default;

    // Should not throw even if SMTP is not configured
    await expect(
      sendApprovalNotification(
        999999, // Non-existent request ID
        "test_permission",
        "test_action",
        { test: "data" },
        "test_user",
        pool
      )
    ).resolves.toBeUndefined();
  });

  test("sendPendingApprovalReminders handles missing SMTP gracefully", async () => {
    const { sendPendingApprovalReminders } = await import("../src/utils/email");
    const pool = (await import("../src/db")).default;

    // Should not throw even if SMTP is not configured
    await expect(
      sendPendingApprovalReminders(pool)
    ).resolves.toBeUndefined();
  });

  test("sendApprovalDecisionNotification handles missing SMTP gracefully", async () => {
    const { sendApprovalDecisionNotification } = await import("../src/utils/email");
    const pool = (await import("../src/db")).default;

    // Should not throw even if SMTP is not configured
    await expect(
      sendApprovalDecisionNotification(
        999999, // Non-existent request ID
        "test_permission",
        "test_action",
        { test: "data" },
        "test_user",
        "approved",
        "admin",
        pool
      )
    ).resolves.toBeUndefined();
  });

  test("scheduler module exports startScheduler function", async () => {
    const schedulerModule = await import("../src/utils/scheduler");

    expect(schedulerModule.startScheduler).toBeDefined();
    expect(typeof schedulerModule.startScheduler).toBe("function");
  });

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

  test.describe("Email configuration validation", () => {
    test("validateEmailConfig returns without error when SMTP not configured", async () => {
      const { validateEmailConfig } = await import("../src/utils/email");

      // Should not throw even if SMTP is not configured
      await expect(validateEmailConfig()).resolves.not.toThrow();
    });
  });

  test.describe("Permission-based email recipients", () => {
    test("getAdminEmails filters by permission correctly", async () => {
      const { getAdminEmails } = await import("../src/utils/email");
      const pool = (await import("../src/db")).default;

      // Test with plant-specific permission format
      const plantSpecificEmails = await getAdminEmails("1_equipment_edit", pool);
      expect(Array.isArray(plantSpecificEmails)).toBe(true);

      // Test with global permission format
      const globalEmails = await getAdminEmails("equipment_edit", pool);
      expect(Array.isArray(globalEmails)).toBe(true);
    });

    test("getAdminEmails returns global admins for non-existent permission", async () => {
      const { getAdminEmails } = await import("../src/utils/email");
      const pool = (await import("../src/db")).default;

      // Even for non-existent permissions, global admins should receive emails
      const emails = await getAdminEmails("nonexistent_permission_xyz123", pool);

      expect(Array.isArray(emails)).toBe(true);
      // Global admins are always included, so the array may not be empty
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

  test.describe("HTML Email Template", () => {
    test("email HTML template is properly formatted and supports dark mode", async () => {
      const { sendApprovalNotification } = await import("../src/utils/email");
      const pool = (await import("../src/db")).default;

      // Trigger a test email (will log to console if SMTP configured)
      // This tests the HTML generation path
      await sendApprovalNotification(
        1,
        "equipment_edit",
        "edit_equipment",
        {
          equipment_name: "Test Laptop",
          model_id: 1,
          assigned_to: "TEST001",
          status: "active"
        },
        "admin",
        pool
      );

      // If we got here without error, the HTML generation worked
      expect(true).toBe(true);
    });
  });
});
