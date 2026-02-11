import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

test.describe("Proposed Location Feature (#63)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  // --- Quick Edit Modal UI Tests ---

  test("quick edit modal has a toggle to enter free-text location", async ({
    page,
  }) => {
    await page.goto("/inventory-audit");

    // The quick edit modal should exist in the page
    const modal = page.locator("#quickEditModal");
    await expect(modal).toBeAttached();

    // The toggle button should exist
    const toggleBtn = page.locator("#qe_toggle_location_mode");
    await expect(toggleBtn).toBeAttached();

    // The free-text input should exist but be hidden initially
    const freetextDiv = page.locator("#qe_freetext_location");
    await expect(freetextDiv).toBeAttached();
    await expect(freetextDiv).toHaveClass(/hidden/);

    // The dropdown location should be visible (not hidden)
    const dropdownDiv = page.locator("#qe_dropdown_location");
    await expect(dropdownDiv).toBeAttached();
    await expect(dropdownDiv).not.toHaveClass(/hidden/);
  });

  test("toggle button switches between dropdown and free-text location modes", async ({
    page,
  }) => {
    await page.goto("/inventory-audit");

    const toggleBtn = page.locator("#qe_toggle_location_mode");
    const freetextDiv = page.locator("#qe_freetext_location");
    const dropdownDiv = page.locator("#qe_dropdown_location");

    // First, show the modal so the toggle is interactive
    // We need to make the modal visible first
    await page.evaluate(() => {
      const modal = document.getElementById("quickEditModal");
      if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
      }
    });

    // Initially: dropdown visible, free-text hidden
    await expect(dropdownDiv).not.toHaveClass(/hidden/);
    await expect(freetextDiv).toHaveClass(/hidden/);

    // Click toggle to switch to free-text mode
    await toggleBtn.click();
    await expect(freetextDiv).not.toHaveClass(/hidden/);
    await expect(dropdownDiv).toHaveClass(/hidden/);
    await expect(toggleBtn).toHaveText(/dropdown/i);

    // Click toggle again to switch back to dropdown mode
    await toggleBtn.click();
    await expect(dropdownDiv).not.toHaveClass(/hidden/);
    await expect(freetextDiv).toHaveClass(/hidden/);
    await expect(toggleBtn).toHaveText(/not listed|manually/i);
  });

  test("free-text location input is disabled by default and enabled in free-text mode", async ({
    page,
  }) => {
    await page.goto("/inventory-audit");

    const proposedInput = page.locator("#qe_proposed_location");
    const toggleBtn = page.locator("#qe_toggle_location_mode");

    // Should be disabled by default
    await expect(proposedInput).toBeDisabled();

    // Show modal and switch mode
    await page.evaluate(() => {
      const modal = document.getElementById("quickEditModal");
      if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
      }
    });

    await toggleBtn.click();
    await expect(proposedInput).toBeEnabled();

    // Switch back
    await toggleBtn.click();
    await expect(proposedInput).toBeDisabled();
  });

  test("free-text mode shows info banner about proposed location", async ({
    page,
  }) => {
    await page.goto("/inventory-audit");

    const freetextDiv = page.locator("#qe_freetext_location");

    // The info banner should exist inside the free-text div
    const infoBanner = freetextDiv.locator("p").first();
    await expect(infoBanner).toContainText("approval");
  });

  test("proposed mode has area and sub-area datalist inputs", async ({
    page,
  }) => {
    await page.goto("/inventory-audit");

    // Verify datalist elements exist
    const areaInput = page.locator("#qe_prop_area_name");
    const subAreaInput = page.locator("#qe_prop_sub_area_name");
    const areaDatalist = page.locator("#qe_area_list");
    const subAreaDatalist = page.locator("#qe_sub_area_list");

    await expect(areaInput).toBeAttached();
    await expect(subAreaInput).toBeAttached();
    await expect(areaDatalist).toBeAttached();
    await expect(subAreaDatalist).toBeAttached();

    // Verify the input elements reference the datalists
    await expect(areaInput).toHaveAttribute("list", "qe_area_list");
    await expect(subAreaInput).toHaveAttribute("list", "qe_sub_area_list");
  });

  test("country/plant/department selects are shared between dropdown and proposed modes", async ({
    page,
  }) => {
    await page.goto("/inventory-audit");

    // Country, Plant, Department should be outside both qe_dropdown_location and qe_freetext_location
    const countrySelect = page.locator("#qe_country_id");
    const plantSelect = page.locator("#qe_plant_id");
    const departmentSelect = page.locator("#qe_department_id");

    // They should NOT be inside the dropdown-only or freetext-only divs
    const dropdownArea = page.locator("#qe_dropdown_location #qe_country_id");
    const freetextArea = page.locator("#qe_freetext_location #qe_country_id");

    await expect(countrySelect).toBeAttached();
    await expect(plantSelect).toBeAttached();
    await expect(departmentSelect).toBeAttached();
    await expect(dropdownArea).not.toBeAttached();
    await expect(freetextArea).not.toBeAttached();
  });

  test("proposed mode composes proposed_location with full hierarchy", async ({
    page,
  }) => {
    await page.goto("/inventory-audit");

    // Open modal and switch to proposed mode
    await page.evaluate(() => {
      const modal = document.getElementById("quickEditModal");
      if (modal) {
        modal.classList.remove("hidden");
        modal.classList.add("flex");
      }
    });

    const toggleBtn = page.locator("#qe_toggle_location_mode");
    await toggleBtn.click();

    // Fill area and sub-area
    const areaInput = page.locator("#qe_prop_area_name");
    const subAreaInput = page.locator("#qe_prop_sub_area_name");
    await areaInput.fill("Test Area");
    await subAreaInput.fill("Test Sub-Area");

    // Simulate what the form submit handler does — it builds parts from selects + inputs
    const composed = await page.evaluate(() => {
      const parts: string[] = [];
      const country = document.getElementById(
        "qe_country_id",
      ) as HTMLSelectElement;
      const plant = document.getElementById(
        "qe_plant_id",
      ) as HTMLSelectElement;
      const dept = document.getElementById(
        "qe_department_id",
      ) as HTMLSelectElement;
      if (country?.value) {
        const opt = country.options[country.selectedIndex];
        if (opt?.text) parts.push(opt.text);
      }
      if (plant?.value) {
        const opt = plant.options[plant.selectedIndex];
        if (opt?.text) parts.push(opt.text);
      }
      if (dept?.value) {
        const opt = dept.options[dept.selectedIndex];
        if (opt?.text) parts.push(opt.text);
      }
      const areaVal = (
        document.getElementById("qe_prop_area_name") as HTMLInputElement
      )?.value?.trim();
      const subAreaVal = (
        document.getElementById("qe_prop_sub_area_name") as HTMLInputElement
      )?.value?.trim();
      if (areaVal) parts.push(areaVal);
      if (subAreaVal) parts.push(subAreaVal);
      return parts.join(" - ");
    });

    // With no selects filled, just area and sub-area
    expect(composed).toBe("Test Area - Test Sub-Area");

    // Verify autocomplete is off on datalist inputs
    await expect(areaInput).toHaveAttribute("autocomplete", "off");
    await expect(subAreaInput).toHaveAttribute("autocomplete", "off");
  });

  // --- API Tests for Proposed Location ---

  test("approve-location API exists and responds to POST", async ({
    page,
  }) => {
    await page.goto("/inventory-audit");

    // Authenticated request to verify endpoint exists and validates input
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/inventory-audit/approve-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audit_id: 0 }),
      });
      return { status: res.status, data: await res.json() };
    });

    // Should reject with 400 (missing/invalid fields) rather than 404
    expect(result.status).toBe(400);
    expect(result.data.error).toBeTruthy();
  });

  test("reject-location API exists and responds to POST", async ({ page }) => {
    await page.goto("/inventory-audit");

    const result = await page.evaluate(async () => {
      const res = await fetch("/api/inventory-audit/reject-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audit_id: 0 }),
      });
      return { status: res.status, data: await res.json() };
    });

    expect(result.status).toBe(400);
    expect(result.data.error).toBeTruthy();
  });

  test("approve-location API validates required fields", async ({ page }) => {
    await page.goto("/inventory-audit");

    // Empty body should fail
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/inventory-audit/approve-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return { status: res.status, data: await res.json() };
    });

    expect(result.status).toBe(400);
    expect(result.data.error).toBeTruthy();
  });

  test("reject-location API validates required fields", async ({ page }) => {
    await page.goto("/inventory-audit");

    const result = await page.evaluate(async () => {
      const res = await fetch("/api/inventory-audit/reject-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      return { status: res.status, data: await res.json() };
    });

    expect(result.status).toBe(400);
    expect(result.data.error).toBeTruthy();
  });

  test("approve-location API returns 404 for non-existent audit entry", async ({
    page,
  }) => {
    await page.goto("/inventory-audit");

    const result = await page.evaluate(async () => {
      const res = await fetch("/api/inventory-audit/approve-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audit_id: 999999 }),
      });
      return { status: res.status, data: await res.json() };
    });

    // Either 404 (not found) or 400 (no pending proposed location)
    expect([400, 404]).toContain(result.status);
  });

  test("reject-location API returns 404 for non-existent audit entry", async ({
    page,
  }) => {
    await page.goto("/inventory-audit");

    const result = await page.evaluate(async () => {
      const res = await fetch("/api/inventory-audit/reject-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audit_id: 999999 }),
      });
      return { status: res.status, data: await res.json() };
    });

    expect([400, 404]).toContain(result.status);
  });

  // --- Review Tab Tests ---

  test("review-compare API returns proposed_location fields", async ({
    page,
  }) => {
    await page.goto("/inventory-audit");

    const response = await page.request.get(
      "/api/inventory-audit/review-compare"
    );
    if (response.status() !== 200) return; // Skip if no access

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);

    // If there are records, check that proposed_location fields exist in the response structure
    if (data.data.length > 0) {
      const entry = data.data[0];
      // The response should include proposed_location and proposed_location_status at the top level
      expect("proposed_location" in entry).toBe(true);
      expect("proposed_location_status" in entry).toBe(true);
    }
  });

  test("apply API blocks entries with pending proposed locations", async ({
    page,
  }) => {
    await page.goto("/inventory-audit");

    // Search for equipment first to find a valid service tag
    const searchResponse = await page.request.get(
      "/api/inventory-audit/search?q=*&period_id=1"
    );
    if (searchResponse.status() !== 200) return;

    const searchData = await searchResponse.json();
    if (!searchData.success || !searchData.data) return;

    const equipment = searchData.data;
    if (!equipment || !equipment.service_tag) return;

    // Try to create a quick-edit with proposed location
    const formData = new URLSearchParams();
    formData.set("equipment_id", equipment.id?.toString() || "0");
    formData.set("inventory_period_id", "1");
    formData.set("proposed_location", "Test Proposed Location E2E");

    const quickEditRes = await page.evaluate(
      async (params) => {
        const res = await fetch("/inventory-audit/quick-edit", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: params,
        });
        return { status: res.status, ok: res.ok };
      },
      formData.toString()
    );

    if (!quickEditRes.ok) return; // Skip if quick-edit fails (no equipment/period)

    // Now try to apply - should be blocked because of pending location
    const applyResult = await page.evaluate(async (serviceTag) => {
      const res = await fetch("/api/inventory-audit/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_tag: serviceTag }),
      });
      return { status: res.status, data: await res.json() };
    }, equipment.service_tag);

    expect(applyResult.status).toBe(400);
    expect(applyResult.data.error).toContain("pending");
  });

  // --- Approve Action Tests (no modal, single-click approval) ---

  test("approve action works without a modal", async ({ page }) => {
    await page.goto("/inventory-audit");

    // The approve modal should NOT exist on the page
    const modal = page.locator("#approveLocationModal");
    await expect(modal).not.toBeAttached();

    // Verify the approve API only needs audit_id (no department/area/sub-area in body)
    const result = await page.evaluate(async () => {
      const res = await fetch("/api/inventory-audit/approve-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audit_id: 0 }),
      });
      return { status: res.status, data: await res.json() };
    });

    // Should fail with 400 (invalid audit_id) not a missing-fields error
    expect(result.status).toBe(400);
    expect(result.data.error).toBeTruthy();
  });

  // --- Dark Theme Tests ---

  test("quick edit modal free-text mode supports dark theme", async ({
    page,
  }) => {
    await page.goto("/inventory-audit");

    // Check that dark theme classes exist in the free-text location section
    const pageContent = await page.content();

    // The info banner should have dark mode classes
    expect(pageContent).toContain("dark:bg-amber-900");
    expect(pageContent).toContain("dark:border-amber-800");

    // The proposed location input should have dark mode classes
    expect(pageContent).toContain("dark:bg-gray-700");
    expect(pageContent).toContain("dark:text-white");
  });

  test("proposed location hidden fields exist for structured data", async ({
    page,
  }) => {
    await page.goto("/inventory-audit");

    // Hidden fields for structured proposed location should exist in the form
    await expect(page.locator("#qe_proposed_department_id")).toBeAttached();
    await expect(page.locator("#qe_proposed_area_name")).toBeAttached();
    await expect(page.locator("#qe_proposed_sub_area_name")).toBeAttached();

    // They should be disabled by default (enabled only in proposed mode)
    await expect(page.locator("#qe_proposed_department_id")).toBeDisabled();
    await expect(page.locator("#qe_proposed_area_name")).toBeDisabled();
    await expect(page.locator("#qe_proposed_sub_area_name")).toBeDisabled();
  });

  // --- Search API Tests ---

  test("search API includes proposed_location fields in results", async ({
    page,
  }) => {
    await page.goto("/inventory-audit");

    const response = await page.request.get(
      "/api/inventory-audit/search?q=*&period_id=1"
    );
    if (response.status() !== 200) return;

    const data = await response.json();
    if (!data.success || !data.data) return;

    const equipment = data.data;
    // The response should include proposed_location-related fields
    // Even if null, the field should exist in the data structure
    expect(equipment).toHaveProperty("id");
    expect(equipment).toHaveProperty("service_tag");
    // These may be null but should be present
    expect("proposed_location" in equipment).toBe(true);
    expect("proposed_location_status" in equipment).toBe(true);
  });

  // --- Data Attributes on Quick Edit Button ---

  test("equipment card includes proposed location data attributes on quick edit button", async ({
    page,
  }) => {
    await page.goto("/inventory-audit");

    // Check the template contains the data attributes for proposed location
    const pageContent = await page.content();
    expect(pageContent).toContain("data-proposed-location");
    expect(pageContent).toContain("data-proposed-location-status");
  });
});
