import { test, expect } from "@playwright/test";

test.describe("Health Check Endpoint", () => {
  test("GET /health returns 200 OK with JSON response", async ({ request }) => {
    const response = await request.get("/health");

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("healthy");
    expect(data.timestamp).toBeDefined();
    expect(data.traceId).toBeDefined();
  });

  test("GET /health verifies database connectivity", async ({ request }) => {
    const response = await request.get("/health");
    const data = await response.json();

    expect(data.status).toBe("healthy");
    // If database is down, status would be "unhealthy"
  });

  test("health endpoint responds quickly (< 1s)", async ({ request }) => {
    const start = Date.now();
    const response = await request.get("/health");
    const duration = Date.now() - start;

    expect(response.status()).toBe(200);
    expect(duration).toBeLessThan(1000);
  });
});

test.describe("PWA Manifest (#21)", () => {
  test("manifest.webmanifest is served and valid", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/manifest+json");

    const manifest = await response.json();
    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBeDefined();
    expect(manifest.display).toBeDefined();
  });

  test("manifest has required PWA fields", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    const manifest = await response.json();

    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(manifest.theme_color).toBe("#2563eb");
    expect(manifest.background_color).toBe("#f9fafb");
  });

  test("manifest has icons with proper sizes", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    const manifest = await response.json();

    expect(manifest.icons).toBeDefined();
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);

    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  test("manifest icons include maskable purpose", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    const manifest = await response.json();

    const purposes = manifest.icons.map((icon: { purpose?: string }) => icon.purpose || "any");
    expect(purposes.some((p: string) => p.includes("maskable"))).toBe(true);
  });

  test("HTML links to manifest correctly", async ({ page }) => {
    await page.goto("/");

    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute("href", "/manifest.webmanifest");
  });
});

test.describe("Static Assets", () => {
  test("CSS file is served", async ({ request }) => {
    const response = await request.get("/css/style.css");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/css");
  });

  test("QR scanner library files are served (#17)", async ({ request }) => {
    const response1 = await request.get("/js/qr-scanner.umd.min.js");
    expect(response1.status()).toBe(200);

    const response2 = await request.get("/js/qr-scanner-worker.min.js");
    expect(response2.status()).toBe(200);
  });

  test("favicon is served", async ({ request }) => {
    const response = await request.get("/icons/favicon.ico");
    expect(response.status()).toBe(200);
  });
});
