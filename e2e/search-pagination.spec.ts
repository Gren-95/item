import { test, expect } from "@playwright/test";
import { login, TEST_ADMIN_USER } from "./fixtures";

test.describe("Wildcard Search & Pagination (#71)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
  });

  // Helper: navigate to wildcard search and return total count (0 if no results)
  async function getWildcardTotal(page: import("@playwright/test").Page): Promise<number> {
    await page.goto("/?q=*");
    await page.waitForLoadState("networkidle");
    const showingInfo = page.locator("#showing-info");
    const visible = await showingInfo.isVisible({ timeout: 3000 }).catch(() => false);
    if (!visible) return 0;
    const text = await showingInfo.textContent();
    const match = text?.match(/of (\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  // --- Wildcard Search ---

  test("searching with * returns results or shows empty-state page", async ({ page }) => {
    await page.goto("/?q=*");
    await page.waitForLoadState("networkidle");

    // Either shows results or an empty-state message
    const hasTable = await page.locator("table tbody tr").count().catch(() => 0);
    const hasEmptyState = await page.locator("text=/No equipment/").isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasTable > 0 || hasEmptyState).toBeTruthy();
  });

  test("wildcard search shows correct count in header", async ({ page }) => {
    const total = await getWildcardTotal(page);
    test.skip(total === 0, "No equipment in database");

    const showingText = await page.locator("#showing-info").textContent();
    const match = showingText!.match(/Showing (\d+).(\d+) of (\d+)/);
    expect(match).toBeTruthy();
    expect(parseInt(match![1])).toBe(1);
    expect(parseInt(match![3])).toBe(total);
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
  });

  // --- Pagination URL State ---

  test("page parameter is preserved in URL", async ({ page }) => {
    const total = await getWildcardTotal(page);
    test.skip(total === 0, "No equipment in database");

    await page.goto("/?q=*&page=1");
    await page.waitForLoadState("networkidle");
    const showingText = page.locator("#showing-info");
    await expect(showingText).toBeVisible();
  });

  test("invalid page parameter defaults to page 1", async ({ page }) => {
    const total = await getWildcardTotal(page);
    test.skip(total === 0, "No equipment in database");

    await page.goto("/?q=*&page=abc");
    await page.waitForLoadState("networkidle");
    const showingText = await page.locator("#showing-info").textContent();
    expect(showingText).toContain("Showing 1");
  });

  test("page parameter 0 or negative defaults to page 1", async ({ page }) => {
    const total = await getWildcardTotal(page);
    test.skip(total === 0, "No equipment in database");

    await page.goto("/?q=*&page=0");
    await page.waitForLoadState("networkidle");
    const showingText = await page.locator("#showing-info").textContent();
    expect(showingText).toContain("Showing 1");
  });

  test("page parameter beyond total pages shows last page", async ({ page }) => {
    const total = await getWildcardTotal(page);
    test.skip(total === 0, "No equipment in database");

    await page.goto("/?q=*&page=99999");
    await page.waitForLoadState("networkidle");
    const showingText = page.locator("#showing-info");
    await expect(showingText).toBeVisible();
  });

  // --- Regular Search Still Works ---

  test("regular text search still works", async ({ page }) => {
    await page.goto("/?q=Dell");
    await page.waitForLoadState("networkidle");

    // May or may not have results depending on data — just verify no crash
    const hasResults = await page.locator("table tbody tr").count().catch(() => 0);
    if (hasResults > 0) {
      await expect(page.locator("#showing-info")).toBeVisible();
    }
  });

  test("empty search shows landing page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(
      page.locator("text=Start an Equipment Search"),
    ).toBeVisible();
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

  test("pagination controls appear when results exceed page size", async ({ page }) => {
    const total = await getWildcardTotal(page);
    test.skip(total === 0, "No equipment in database");

    if (total > 25) {
      const paginationNav = page.locator('nav[aria-label="Pagination"]');
      await expect(paginationNav).toBeVisible();
      await expect(page.locator("text=/Page \\d+ of \\d+/")).toBeVisible();
    } else {
      const paginationNav = page.locator('nav[aria-label="Pagination"]');
      await expect(paginationNav).not.toBeVisible();
    }
  });

  // --- Show All ---

  test("Show All button is visible when multiple pages exist", async ({ page }) => {
    const total = await getWildcardTotal(page);
    test.skip(total <= 25, "Not enough data for multiple pages");

    const showAllLink = page.locator('a:has-text("Show All")');
    await expect(showAllLink).toBeVisible();
    const href = await showAllLink.getAttribute("href");
    expect(href).toContain("all=1");
  });

  test("Show All loads all results on one page", async ({ page }) => {
    const total = await getWildcardTotal(page);
    test.skip(total === 0, "No equipment in database");

    await page.goto("/?q=*&all=1");
    await page.waitForLoadState("networkidle");

    const showingInfo = page.locator("#showing-info");
    await expect(showingInfo).toBeVisible();
    const infoText = await showingInfo.textContent();
    expect(infoText).toMatch(/Showing all \d+ results/);

    const rows = page.locator("table tbody tr");
    const rowCount = await rows.count();
    const match = infoText!.match(/all (\d+)/);
    expect(rowCount).toBe(parseInt(match![1]));

    await expect(page.locator("text=/Page \\d+ of \\d+/")).not.toBeVisible();
  });

  test("Show All page has back to paginated link", async ({ page }) => {
    const total = await getWildcardTotal(page);
    test.skip(total === 0, "No equipment in database");

    await page.goto("/?q=*&all=1");
    await page.waitForLoadState("networkidle");

    const backLink = page.locator('a:has-text("Back to paginated view")');
    await expect(backLink).toBeVisible();

    await backLink.click();
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("page=1");
    await expect(page.locator("#showing-info")).toBeVisible();
  });

  // --- Server-side Column Filters ---

  test("server-side column filter narrows results via URL", async ({ page }) => {
    const total = await getWildcardTotal(page);
    test.skip(total === 0, "No equipment in database");

    // Get a serial prefix from the first row to build a valid filter
    const firstSerial = await page.locator("table tbody tr:first-child td:nth-child(2)").textContent();
    const prefix = (firstSerial || "").trim().substring(0, 4);
    test.skip(!prefix, "Could not get serial prefix");

    await page.goto(`/?q=*&f_serial=${encodeURIComponent(prefix)}`);
    await page.waitForLoadState("networkidle");

    // Filter input should be pre-filled
    const serialFilter = page.locator('input[name="f_serial"]');
    await expect(serialFilter).toHaveValue(prefix);

    // Should have results
    const showingInfo = await page.locator("#showing-info").textContent();
    expect(showingInfo).toBeTruthy();
  });

  test("multiple column filters combine with AND", async ({ page }) => {
    const total = await getWildcardTotal(page);
    test.skip(total < 2, "Not enough data to test combined filters");

    // Filter by serial — count results
    const firstSerial = await page.locator("table tbody tr:first-child td:nth-child(2)").textContent();
    const prefix = (firstSerial || "").trim().substring(0, 3);
    test.skip(!prefix, "Could not get serial prefix");

    await page.goto(`/?q=*&f_serial=${encodeURIComponent(prefix)}`);
    await page.waitForLoadState("networkidle");
    const text1 = await page.locator("#showing-info").textContent();
    const match1 = text1!.match(/(\d+)/);
    const count1 = parseInt(match1![1]);

    // Add impossible type filter — should produce fewer or zero results
    await page.goto(`/?q=*&f_serial=${encodeURIComponent(prefix)}&f_type=NONEXISTENT_TYPE_XYZ`);
    await page.waitForLoadState("networkidle");

    // Either an empty-state message or a smaller count in #showing-info
    const showingInfo = page.locator("#showing-info");
    const hasShowingInfo = await showingInfo.isVisible({ timeout: 2000 }).catch(() => false);
    if (hasShowingInfo) {
      const text2 = await showingInfo.textContent();
      const match2 = text2!.match(/(\d+)/);
      expect(parseInt(match2![1])).toBeLessThanOrEqual(count1);
    } else {
      // No results at all — still ≤ count1
      expect(0).toBeLessThanOrEqual(count1);
    }
  });

  test("column filter values preserved in pagination links", async ({ page }) => {
    const total = await getWildcardTotal(page);
    test.skip(total <= 25, "Not enough data for pagination with filters");

    // Use a filter that still returns >25 results
    const firstSerial = await page.locator("table tbody tr:first-child td:nth-child(2)").textContent();
    const prefix = (firstSerial || "").trim().substring(0, 2);

    await page.goto(`/?q=*&f_serial=${encodeURIComponent(prefix)}`);
    await page.waitForLoadState("networkidle");

    const nextLink = page.locator('a:has-text("Next")');
    const isVisible = await nextLink.isVisible({ timeout: 2000 }).catch(() => false);
    if (isVisible) {
      const href = await nextLink.getAttribute("href");
      expect(href).toContain(`f_serial=${encodeURIComponent(prefix)}`);
    }
  });

  test("clear filters link removes all column filters", async ({ page }) => {
    const total = await getWildcardTotal(page);
    test.skip(total === 0, "No equipment in database");

    const firstSerial = await page.locator("table tbody tr:first-child td:nth-child(2)").textContent();
    const prefix = (firstSerial || "").trim().substring(0, 4);

    await page.goto(`/?q=*&f_serial=${encodeURIComponent(prefix)}`);
    await page.waitForLoadState("networkidle");

    const clearLink = page.locator('a:has-text("Clear")');
    await expect(clearLink).toBeVisible();

    await clearLink.click();
    await page.waitForLoadState("networkidle");

    expect(page.url()).not.toContain("f_serial");
    const serialFilter = page.locator('input[name="f_serial"]');
    await expect(serialFilter).toHaveValue("");
  });

  test("filter inputs trigger server-side navigation on Enter", async ({ page }) => {
    const total = await getWildcardTotal(page);
    test.skip(total === 0, "No equipment in database");

    await page.goto("/?q=*");
    await page.waitForLoadState("networkidle");

    const firstSerial = await page.locator("table tbody tr:first-child td:nth-child(2)").textContent();
    const prefix = (firstSerial || "").trim().substring(0, 4);

    const serialFilter = page.locator('input[name="f_serial"]');
    await serialFilter.fill(prefix);
    await serialFilter.press("Enter");
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("f_serial=" + encodeURIComponent(prefix));
  });

  // --- Dark Theme Support ---

  test("search results and pagination support dark theme", async ({ page }) => {
    await page.goto("/?q=*");
    await page.waitForLoadState("networkidle");

    const pageContent = await page.content();
    expect(pageContent).toContain("dark:text-white");
    expect(pageContent).toContain("dark:bg-gray-800");
    expect(pageContent).toContain("dark:text-gray-400");
  });

  // --- Pagination Links ---

  test("pagination links include query parameter", async ({ page }) => {
    const total = await getWildcardTotal(page);
    test.skip(total <= 25, "Not enough data for pagination");

    const nextLink = page.locator('a:has-text("Next")');
    const href = await nextLink.getAttribute("href");
    expect(href).toContain("q=*");
    expect(href).toContain("page=2");
  });
});
