import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

test.describe("Wildcard Search & Pagination (#71)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  // --- Wildcard Search ---

  test("searching with * returns all equipment", async ({ page }) => {
    await page.goto("/?q=*");
    await page.waitForLoadState("networkidle");

    // Should show results with count info
    const showingText = page.locator("text=/Showing \\d+–\\d+ of \\d+/");
    await expect(showingText).toBeVisible();

    // Should have at least one result row
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test("wildcard search shows correct count in header", async ({ page }) => {
    await page.goto("/?q=*");
    await page.waitForLoadState("networkidle");

    const showingText = await page.locator("text=/Showing \\d+–\\d+ of \\d+/").textContent();
    expect(showingText).toBeTruthy();

    // Parse the "Showing X-Y of Z" text
    const match = showingText!.match(/Showing (\d+)–(\d+) of (\d+)/);
    expect(match).toBeTruthy();

    const start = parseInt(match![1]);
    const end = parseInt(match![2]);
    const total = parseInt(match![3]);

    expect(start).toBe(1);
    expect(end).toBeLessThanOrEqual(total);
    expect(total).toBeGreaterThan(0);
  });

  test("wildcard search can be done via search form", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchInput = page.locator("#q");
    await searchInput.fill("*");
    await searchInput.press("Enter");
    await page.waitForLoadState("networkidle");

    // URL should contain q=*
    expect(page.url()).toContain("q=*");

    // Should show results
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  // --- Pagination URL State ---

  test("page parameter is preserved in URL", async ({ page }) => {
    await page.goto("/?q=*&page=1");
    await page.waitForLoadState("networkidle");

    // Should show results
    const showingText = page.locator("text=/Showing \\d+–\\d+ of \\d+/");
    await expect(showingText).toBeVisible();
  });

  test("invalid page parameter defaults to page 1", async ({ page }) => {
    await page.goto("/?q=*&page=abc");
    await page.waitForLoadState("networkidle");

    // Should show results starting from 1
    const showingText = await page.locator("text=/Showing \\d+–\\d+ of \\d+/").textContent();
    expect(showingText).toContain("Showing 1");
  });

  test("page parameter 0 or negative defaults to page 1", async ({ page }) => {
    await page.goto("/?q=*&page=0");
    await page.waitForLoadState("networkidle");

    const showingText = await page.locator("text=/Showing \\d+–\\d+ of \\d+/").textContent();
    expect(showingText).toContain("Showing 1");
  });

  test("page parameter beyond total pages shows last page", async ({
    page,
  }) => {
    await page.goto("/?q=*&page=99999");
    await page.waitForLoadState("networkidle");

    // Should show results (clamped to last page)
    const showingText = page.locator("text=/Showing \\d+–\\d+ of \\d+/");
    await expect(showingText).toBeVisible();
  });

  // --- Regular Search Still Works ---

  test("regular text search still works", async ({ page }) => {
    await page.goto("/?q=Dell");
    await page.waitForLoadState("networkidle");

    const showingText = page.locator("text=/Showing \\d+–\\d+ of \\d+/");
    // May or may not have results depending on data
    const hasResults = await page
      .locator("table tbody tr")
      .count()
      .catch(() => 0);
    if (hasResults > 0) {
      await expect(showingText).toBeVisible();
    }
  });

  test("empty search shows landing page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should show "Start an Equipment Search" message
    await expect(
      page.locator("text=Start an Equipment Search"),
    ).toBeVisible();

    // Should NOT show any results table
    await expect(page.locator("table")).not.toBeVisible();
  });

  test("search with no results shows not found message", async ({ page }) => {
    await page.goto("/?q=NONEXISTENT_ZZZZZ_12345");
    await page.waitForLoadState("networkidle");

    await expect(
      page.locator('text=/No equipment found matching/'),
    ).toBeVisible();
  });

  // --- Pagination Controls ---

  test("pagination controls appear when results exceed page size", async ({
    page,
  }) => {
    // This test checks structure; may not have enough data for multiple pages
    await page.goto("/?q=*");
    await page.waitForLoadState("networkidle");

    const showingText = await page.locator("text=/Showing \\d+–\\d+ of \\d+/").textContent();
    const match = showingText!.match(/of (\d+)/);
    const totalCount = parseInt(match![1]);

    if (totalCount > 25) {
      // Should show pagination
      const paginationNav = page.locator('nav[aria-label="Pagination"]');
      await expect(paginationNav).toBeVisible();

      // Should have Previous and Next buttons
      await expect(
        paginationNav.locator("text=Previous").or(paginationNav.locator("text=← Previous")),
      ).toBeVisible();
      await expect(
        paginationNav.locator("text=Next").or(paginationNav.locator("text=Next →")),
      ).toBeVisible();

      // Should show page info
      await expect(page.locator("text=/Page \\d+ of \\d+/")).toBeVisible();
    } else {
      // With fewer items, no pagination nav
      const paginationNav = page.locator('nav[aria-label="Pagination"]');
      await expect(paginationNav).not.toBeVisible();
    }
  });

  // --- Show All ---

  test("Show All button is visible when multiple pages exist", async ({
    page,
  }) => {
    await page.goto("/?q=*");
    await page.waitForLoadState("networkidle");

    const showingText = await page
      .locator("text=/Showing \\d+–\\d+ of \\d+/")
      .textContent();
    const match = showingText!.match(/of (\d+)/);
    const totalCount = parseInt(match![1]);

    if (totalCount > 25) {
      const showAllLink = page.locator('a:has-text("Show All")');
      await expect(showAllLink).toBeVisible();
      const href = await showAllLink.getAttribute("href");
      expect(href).toContain("all=1");
    }
  });

  test("Show All loads all results on one page", async ({ page }) => {
    await page.goto("/?q=*&all=1");
    await page.waitForLoadState("networkidle");

    // Should show "Showing all X results" in the header
    const showingText = page.locator("#showing-info");
    await expect(showingText).toBeVisible();
    const infoText = await showingText.textContent();
    expect(infoText).toMatch(/Showing all \d+ results/);

    // All rows should be in the table
    const rows = page.locator("table tbody tr");
    const rowCount = await rows.count();
    const match = infoText!.match(/all (\d+)/);
    const totalCount = parseInt(match![1]);
    expect(rowCount).toBe(totalCount);

    // No page numbers should be shown
    await expect(page.locator("text=/Page \\d+ of \\d+/")).not.toBeVisible();
  });

  test("Show All page has back to paginated link", async ({ page }) => {
    await page.goto("/?q=*&all=1");
    await page.waitForLoadState("networkidle");

    const backLink = page.locator('a:has-text("Back to paginated view")');
    await expect(backLink).toBeVisible();

    // Clicking it should go back to paginated view
    await backLink.click();
    await page.waitForLoadState("networkidle");

    // Should be on page 1
    expect(page.url()).toContain("page=1");
    await expect(
      page.locator("text=/Showing \\d+–\\d+ of \\d+/"),
    ).toBeVisible();
  });

  test("server-side column filter narrows results via URL", async ({ page }) => {
    // Filter by serial via URL param
    await page.goto("/?q=*&f_serial=TEST-00");
    await page.waitForLoadState("networkidle");

    // Should only return items whose serial matches TEST-00*
    const showingText = await page.locator("#showing-info").textContent();
    expect(showingText).toBeTruthy();
    const match = showingText!.match(/of (\d+)/);
    expect(match).toBeTruthy();
    const total = parseInt(match![1]);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(100); // Narrowed down

    // The filter input should be pre-filled
    const serialFilter = page.locator('input[name="f_serial"]');
    await expect(serialFilter).toHaveValue("TEST-00");
  });

  test("multiple column filters combine with AND", async ({ page }) => {
    // Get count with just serial filter
    await page.goto("/?q=*&f_serial=TEST");
    await page.waitForLoadState("networkidle");
    const text1 = await page.locator("#showing-info").textContent();
    const match1 = text1!.match(/of (\d+)/);
    const countSerial = parseInt(match1![1]);

    // Get count with serial AND type filter (should be ≤)
    await page.goto("/?q=*&f_serial=TEST&f_type=Laptop");
    await page.waitForLoadState("networkidle");
    const text2 = await page.locator("#showing-info").textContent();
    const match2 = text2!.match(/(\d+)/);
    const countBoth = parseInt(match2![1]);

    expect(countBoth).toBeLessThanOrEqual(countSerial);
  });

  test("column filter values preserved in pagination links", async ({ page }) => {
    await page.goto("/?q=*&f_serial=TEST");
    await page.waitForLoadState("networkidle");

    const showingText = await page.locator("#showing-info").textContent();
    const match = showingText!.match(/of (\d+)/);
    const total = parseInt(match![1]);

    if (total > 25) {
      const nextLink = page.locator('a:has-text("Next")');
      const href = await nextLink.getAttribute("href");
      expect(href).toContain("f_serial=TEST");
    }
  });

  test("clear filters link removes all column filters", async ({ page }) => {
    await page.goto("/?q=*&f_serial=TEST-00");
    await page.waitForLoadState("networkidle");

    // Should show a "Clear" link
    const clearLink = page.locator('a:has-text("Clear")');
    await expect(clearLink).toBeVisible();

    await clearLink.click();
    await page.waitForLoadState("networkidle");

    // URL should not have any f_ params
    expect(page.url()).not.toContain("f_serial");

    // Filter input should be empty
    const serialFilter = page.locator('input[name="f_serial"]');
    await expect(serialFilter).toHaveValue("");
  });

  test("filter inputs trigger server-side navigation on Enter", async ({ page }) => {
    await page.goto("/?q=*");
    await page.waitForLoadState("networkidle");

    const serialFilter = page.locator('input[name="f_serial"]');
    await serialFilter.fill("TEST-00");
    await serialFilter.press("Enter");
    await page.waitForLoadState("networkidle");

    // URL should now contain the filter
    expect(page.url()).toContain("f_serial=TEST-00");

    // Results should be filtered
    const showingText = await page.locator("#showing-info").textContent();
    const match = showingText!.match(/of (\d+)/);
    const total = parseInt(match![1]);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(100);
  });

  // --- Dark Theme Support ---

  test("search results and pagination support dark theme", async ({
    page,
  }) => {
    await page.goto("/?q=*");
    await page.waitForLoadState("networkidle");

    const pageContent = await page.content();

    // Dark theme classes should be present on results
    expect(pageContent).toContain("dark:text-white");
    expect(pageContent).toContain("dark:bg-gray-800");
    expect(pageContent).toContain("dark:text-gray-400");
  });

  // --- Pagination Links ---

  test("pagination links include query parameter", async ({ page }) => {
    await page.goto("/?q=*");
    await page.waitForLoadState("networkidle");

    const showingText = await page.locator("text=/Showing \\d+–\\d+ of \\d+/").textContent();
    const match = showingText!.match(/of (\d+)/);
    const totalCount = parseInt(match![1]);

    if (totalCount > 25) {
      // Next link should contain q=* and page=2
      const nextLink = page.locator('a:has-text("Next")');
      const href = await nextLink.getAttribute("href");
      expect(href).toContain("q=*");
      expect(href).toContain("page=2");
    }
  });
});
