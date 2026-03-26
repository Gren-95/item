import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

test.describe("Friendly Duplicate Handling (#70)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  test("API returns 409 with duplicate info for existing type", async ({
    page,
  }) => {
    await page.goto("/add");

    // Create a type via API
    const uniqueName = `TT-${Date.now().toString(36)}`;
    const createRes = await page.evaluate(async (name) => {
      const res = await fetch("/api/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      return { status: res.status, data: await res.json() };
    }, uniqueName);

    expect(createRes.status).toBe(201);
    expect(createRes.data.id).toBeTruthy();

    // Try to create the same type again
    const dupRes = await page.evaluate(async (name) => {
      const res = await fetch("/api/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      return { status: res.status, data: await res.json() };
    }, uniqueName);

    expect(dupRes.status).toBe(409);
    expect(dupRes.data.duplicate).toBe(true);
    expect(dupRes.data.id).toBe(createRes.data.id);
    expect(dupRes.data.name).toBeTruthy();
    expect(dupRes.data.message).toContain("already exists");
  });

  test("API returns 409 with duplicate info for existing vendor", async ({
    page,
  }) => {
    await page.goto("/add");

    const uniqueName = `TestVendor-${Date.now()}`;
    const createRes = await page.evaluate(async (name) => {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      return { status: res.status, data: await res.json() };
    }, uniqueName);

    expect(createRes.status).toBe(201);

    const dupRes = await page.evaluate(async (name) => {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      return { status: res.status, data: await res.json() };
    }, uniqueName);

    expect(dupRes.status).toBe(409);
    expect(dupRes.data.duplicate).toBe(true);
    expect(dupRes.data.id).toBe(createRes.data.id);
  });

  test("no raw SQL error messages in API response", async ({ page }) => {
    await page.goto("/add");

    const uniqueName = `TN-${Date.now().toString(36)}`;
    // Create first
    await page.evaluate(async (name) => {
      await fetch("/api/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    }, uniqueName);

    // Try duplicate
    const dupRes = await page.evaluate(async (name) => {
      const res = await fetch("/api/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      return { status: res.status, body: await res.text() };
    }, uniqueName);

    // Should not contain SQL error keywords
    expect(dupRes.body).not.toContain("ER_DUP_ENTRY");
    expect(dupRes.body).not.toContain("Duplicate entry");
    expect(dupRes.body).not.toContain("for key");
  });

  test("modal auto-selects existing type on duplicate and closes", async ({
    page,
  }) => {
    await page.goto("/add");

    // Create a type via API first
    const uniqueName = `MT-${Date.now().toString(36)}`;
    const createRes = await page.evaluate(async (name) => {
      const res = await fetch("/api/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      return await res.json();
    }, uniqueName);

    // Reload to get the new type in the dropdown
    await page.reload();

    // Open the "Add new type" modal via the select
    const typeSelect = page.locator("#type_id");
    await typeSelect.selectOption("__add_new__");

    // Modal should be visible
    const modal = page.locator("#addModal");
    await expect(modal).toBeVisible();

    // Type the duplicate name
    await page.locator("#modalInput").fill(uniqueName);
    await page.locator("#addModal button.btn-primary").click();

    // Modal should close (duplicate was auto-selected)
    await expect(modal).toBeHidden();

    // The type select should have the existing item selected
    const selectedValue = await typeSelect.inputValue();
    expect(selectedValue).toBe(String(createRes.id));
  });

  test("modal auto-selects existing vendor on duplicate and closes", async ({
    page,
  }) => {
    await page.goto("/add");

    // Create a vendor via API
    const uniqueName = `ModalVendor-${Date.now()}`;
    const createRes = await page.evaluate(async (name) => {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      return await res.json();
    }, uniqueName);

    await page.reload();

    // Open the "Add new vendor" modal
    const vendorSelect = page.locator("#vendor_id");
    await vendorSelect.selectOption("__add_new__");

    const modal = page.locator("#addModal");
    await expect(modal).toBeVisible();

    await page.locator("#modalInput").fill(uniqueName);
    await page.locator("#addModal button.btn-primary").click();

    await expect(modal).toBeHidden();

    const selectedValue = await vendorSelect.inputValue();
    expect(selectedValue).toBe(String(createRes.id));
  });

  test("creating a genuinely new item still works normally", async ({
    page,
  }) => {
    await page.goto("/add");

    const uniqueName = `NT-${Date.now().toString(36)}`;

    // Open the "Add new type" modal
    const typeSelect = page.locator("#type_id");
    await typeSelect.selectOption("__add_new__");

    const modal = page.locator("#addModal");
    await expect(modal).toBeVisible();

    // Enter a new unique name
    await page.locator("#modalInput").fill(uniqueName);
    await page.locator("#addModal button.btn-primary").click();

    // Modal should close after successful creation
    await expect(modal).toBeHidden();

    // The type select should have the new item selected
    const selectedText = await typeSelect.locator("option:checked").textContent();
    expect(selectedText?.trim()).toBe(uniqueName);
  });

  test("no error message shown in modal on duplicate", async ({ page }) => {
    await page.goto("/add");

    const uniqueName = `NE-${Date.now().toString(36)}`;

    // Create type first
    await page.evaluate(async (name) => {
      await fetch("/api/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    }, uniqueName);

    await page.reload();

    // Open modal and try duplicate
    await page.locator("#type_id").selectOption("__add_new__");
    await expect(page.locator("#addModal")).toBeVisible();

    await page.locator("#modalInput").fill(uniqueName);
    await page.locator("#addModal button.btn-primary").click();

    // Modal should close — no error visible
    await expect(page.locator("#addModal")).toBeHidden();
    // Error element should be hidden (modal is gone anyway)
    const errorEl = page.locator("#modalError");
    if (await errorEl.isVisible().catch(() => false)) {
      const errorText = await errorEl.textContent();
      expect(errorText).not.toContain("ER_DUP_ENTRY");
      expect(errorText).not.toContain("Duplicate entry");
    }
  });
});
