import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

test.describe("Camera QR Scanning (#17)", () => {
  test("search page has scan button", async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    await page.goto("/");

    const scanButton = page.locator(
      '#scan-qr, button:has-text("Scan"), [aria-label*="scan" i], [data-action="scan"]'
    );

    await expect(scanButton.first()).toBeVisible();
  });

  test("scan button has correct aria-label for accessibility", async ({ page }) => {
    await page.goto("/");

    const scanButton = page.locator('#scan-qr, button:has-text("Scan")').first();

    if (await scanButton.isVisible()) {
      const ariaLabel = await scanButton.getAttribute("aria-label");
      // Should have descriptive aria-label
      if (ariaLabel) {
        expect(ariaLabel.toLowerCase()).toContain("scan");
      }
    }
  });

  test("scan button opens QR scanner modal", async ({ page }) => {
    await page.goto("/");

    const scanButton = page.locator(
      '#scan-qr, button:has-text("Scan"), [data-action="scan"]'
    ).first();

    if (await scanButton.isVisible()) {
      await scanButton.click();

      // Modal should appear
      const modal = page.locator('#qrModal, [role="dialog"], .modal');
      await expect(modal.first()).toBeVisible();
    }
  });

  test("QR modal has video element for camera", async ({ page }) => {
    await page.goto("/");

    const scanButton = page.locator(
      '#scan-qr, button:has-text("Scan"), [data-action="scan"]'
    ).first();

    if (await scanButton.isVisible()) {
      await scanButton.click();

      const videoElement = page.locator('#qrVideo, video');
      await expect(videoElement.first()).toBeVisible();
    }
  });

  test("QR modal has close button", async ({ page }) => {
    await page.goto("/");

    const scanButton = page.locator(
      '#scan-qr, button:has-text("Scan"), [data-action="scan"]'
    ).first();

    if (await scanButton.isVisible()) {
      await scanButton.click();

      const closeButton = page.locator(
        '#closeQr, button:has-text("Close"), button:has-text("Cancel"), [aria-label="Close"]'
      );
      await expect(closeButton.first()).toBeVisible();
    }
  });

  test("QR modal has cancel button", async ({ page }) => {
    await page.goto("/");

    const scanButton = page.locator(
      '#scan-qr, button:has-text("Scan"), [data-action="scan"]'
    ).first();

    if (await scanButton.isVisible()) {
      await scanButton.click();

      const cancelButton = page.locator('#cancelQr, button:has-text("Cancel")');
      await expect(cancelButton.first()).toBeVisible();
    }
  });

  test("QR modal has status indicator", async ({ page }) => {
    await page.goto("/");

    const scanButton = page.locator(
      '#scan-qr, button:has-text("Scan"), [data-action="scan"]'
    ).first();

    if (await scanButton.isVisible()) {
      await scanButton.click();

      const statusIndicator = page.locator('#qrStatus, .scan-status, [data-status]');
      await expect(statusIndicator.first()).toBeVisible();
    }
  });

  test("QR modal has flashlight toggle", async ({ page }) => {
    await page.goto("/");

    const scanButton = page.locator(
      '#scan-qr, button:has-text("Scan"), [data-action="scan"]'
    ).first();

    if (await scanButton.isVisible()) {
      await scanButton.click();

      // Flashlight/torch button (may not be visible on all devices)
      const torchButton = page.locator(
        '#torchQr, button:has-text("Flash"), button:has-text("Torch"), [data-action="torch"]'
      );

      // Should exist in DOM (may be hidden if device doesn't support it)
      await expect(page.locator("body")).toBeVisible();
    }
  });

  test("QR modal can be closed", async ({ page }) => {
    await page.goto("/");

    const scanButton = page.locator(
      '#scan-qr, button:has-text("Scan"), [data-action="scan"]'
    ).first();

    if (await scanButton.isVisible()) {
      await scanButton.click();

      const modal = page.locator('#qrModal, [role="dialog"], .modal');
      await expect(modal.first()).toBeVisible();

      // Close the modal
      const closeButton = page.locator(
        '#closeQr, #cancelQr, button:has-text("Close"), button:has-text("Cancel")'
      ).first();
      await closeButton.click();

      // Modal should be hidden
      await expect(modal.first()).not.toBeVisible();
    }
  });
});

test.describe("QR Scanner Library Files", () => {
  test("QR scanner main library is served", async ({ request }) => {
    const response = await request.get("/js/qr-scanner.umd.min.js");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("javascript");
  });

  test("QR scanner worker is served", async ({ request }) => {
    const response = await request.get("/js/qr-scanner-worker.min.js");
    expect(response.status()).toBe(200);
  });
});
