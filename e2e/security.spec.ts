import { test, expect } from "@playwright/test";
import { login, logout, TEST_ADMIN_USER } from "./fixtures";

test.describe("Security Headers", () => {
  test("responses include X-Frame-Options header", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response).not.toBeNull();
    expect(response!.headers()["x-frame-options"]).toBe("DENY");
  });

  test("responses include X-Content-Type-Options header", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response).not.toBeNull();
    expect(response!.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("responses include Content-Security-Policy header", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response).not.toBeNull();
    const csp = response!.headers()["content-security-policy"];
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
  });

  test("responses include Referrer-Policy header", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response).not.toBeNull();
    expect(response!.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("responses include Strict-Transport-Security header", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response).not.toBeNull();
    const hsts = response!.headers()["strict-transport-security"];
    expect(hsts).toBeTruthy();
    expect(hsts).toContain("max-age=");
  });

  test("responses include Permissions-Policy header", async ({ page }) => {
    const response = await page.goto("/login");
    expect(response).not.toBeNull();
    expect(response!.headers()["permissions-policy"]).toBeTruthy();
  });

  test("security headers present on authenticated pages", async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);
    const response = await page.goto("/");
    expect(response).not.toBeNull();
    expect(response!.headers()["x-frame-options"]).toBe("DENY");
    expect(response!.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("security headers present on API endpoints", async ({ request }) => {
    const response = await request.get("/api/version");
    expect(response.headers()["x-frame-options"]).toBe("DENY");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  });
});

test.describe("Session Security", () => {
  test("session cookie has HttpOnly flag", async ({ page }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);

    // HttpOnly cookies are NOT accessible via JavaScript — that's the test
    const sessionCookie = await page.evaluate(() => document.cookie);
    expect(sessionCookie).not.toContain("session_id");
  });

  test("session cookie has Secure flag", async ({ page, context }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === "session_id");
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie!.secure).toBe(true);
  });

  test("session cookie has SameSite=Lax", async ({ page, context }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === "session_id");
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie!.sameSite).toBe("Lax");
  });

  test("logout endpoint redirects to login", async ({ page, context }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);

    // Hit the logout endpoint directly
    await page.goto("/logout");
    await page.waitForLoadState("networkidle");

    // Should be on login page after logout
    expect(page.url()).toContain("/login");
  });
});

test.describe("CSRF Protection", () => {
  test("session cookie SameSite=Lax blocks cross-site POST requests", async ({ page, context }) => {
    await login(page, TEST_ADMIN_USER.username, TEST_ADMIN_USER.password);

    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === "session_id");
    expect(sessionCookie).toBeTruthy();
    expect(sessionCookie!.sameSite).toBe("Lax");
  });
});

test.describe("Error Response Sanitization", () => {
  test("404 response does not expose internal details", async ({ page }) => {
    const response = await page.goto("/nonexistent-page-12345");
    expect(response).not.toBeNull();

    const body = await page.content();
    // Should not contain stack traces or internal paths
    expect(body).not.toContain("at Object.");
    expect(body).not.toContain("/app/src/");
    expect(body).not.toContain("Error:");
  });

  test("health endpoint does not expose sensitive config", async ({ request }) => {
    const response = await request.get("/health");
    const body = await response.text();

    expect(body).not.toContain("ADMIN_PASSWORD");
    expect(body).not.toContain("MYSQL_ROOT_PASSWORD");
    expect(body).not.toContain("APPROVAL_SECRET");
  });
});

test.describe("Authentication Guards", () => {
  test("protected routes redirect to login when unauthenticated", async ({ page }) => {
    const protectedRoutes = ["/add", "/locations", "/types", "/vendors", "/permissions"];

    for (const route of protectedRoutes) {
      await page.goto(route);
      const url = page.url();
      expect(url).toContain("/login");
    }
  });

  test("login redirect preserves original URL", async ({ page }) => {
    await page.goto("/add");
    const url = page.url();
    expect(url).toContain("redirect=");
    expect(url).toContain("%2Fadd");
  });

  test("public routes are accessible without authentication", async ({ request }) => {
    const publicRoutes = ["/health", "/api/version"];

    for (const route of publicRoutes) {
      const response = await request.get(route);
      expect(response.status()).not.toBe(302);
      expect(response.status()).toBeLessThan(400);
    }
  });
});

// Rate limiting tests run last and serial to avoid polluting other tests
test.describe.serial("Rate Limiting", () => {
  test("login allows normal attempts", async ({ page }) => {
    await page.goto("/login");

    const usernameInput = page.locator('input[name="username"], input[name="user"], input[id="username"]');
    if (await usernameInput.isVisible()) {
      // A few failed attempts should be fine
      for (let i = 0; i < 3; i++) {
        await usernameInput.fill("invalid_user");
        await page.locator('input[type="password"]').fill("invalid_pass");
        await page.locator('button[type="submit"], input[type="submit"]').click();
        await page.waitForLoadState("networkidle");
      }

      // Should still be on login page (not rate limited yet)
      const stillOnLogin = await usernameInput.isVisible();
      expect(stillOnLogin).toBe(true);
    }
  });

  test("login returns 429 after too many attempts", async ({ request }) => {
    // Use a unique IP that won't conflict with other tests
    const uniqueIp = `192.168.99.${Math.floor(Math.random() * 254) + 1}`;

    let got429 = false;
    for (let i = 0; i < 35; i++) {
      const response = await request.post("/login", {
        form: { username: "brute_force_user", password: "wrong_pass" },
        headers: { "x-forwarded-for": uniqueIp },
      });
      if (response.status() === 429) {
        got429 = true;
        break;
      }
    }

    expect(got429).toBe(true);
  });
});
