import { describe, test, expect } from "bun:test";
import { loginPage } from "../templates/login";

describe("Login Form Autocomplete (#40)", () => {
  test("form element should have autocomplete='off'", () => {
    const html = loginPage();
    expect(html).toContain('<form method="POST" action="/login" class="space-y-6" autocomplete="off">');
  });

  test("username field should have autocomplete='off'", () => {
    const html = loginPage();
    expect(html).toContain('name="username"');
    expect(html).toContain('autocomplete="off"');
    
    // Verify autocomplete appears in the username input context
    const usernameInputIndex = html.indexOf('name="username"');
    const autocompleteIndex = html.indexOf('autocomplete="off"', usernameInputIndex);
    expect(autocompleteIndex).toBeGreaterThan(usernameInputIndex);
    expect(autocompleteIndex).toBeLessThan(usernameInputIndex + 200); // Within reasonable distance
  });

  test("password field should have autocomplete='off'", () => {
    const html = loginPage();
    expect(html).toContain('name="password"');
    expect(html).toContain('autocomplete="off"');
    
    // Verify autocomplete appears in the password input context
    const passwordInputIndex = html.indexOf('name="password"');
    const autocompleteAfterPassword = html.indexOf('autocomplete="off"', passwordInputIndex);
    expect(autocompleteAfterPassword).toBeGreaterThan(passwordInputIndex);
    expect(autocompleteAfterPassword).toBeLessThan(passwordInputIndex + 200); // Within reasonable distance
  });

  test("login form should render without errors", () => {
    const html = loginPage();
    expect(html).toContain("IT Equipment Management");
    expect(html).toContain("Please sign in to continue");
    expect(html).toContain('type="text"');
    expect(html).toContain('type="password"');
  });

  test("login form should render error message when provided", () => {
    const html = loginPage("Invalid credentials");
    expect(html).toContain("Invalid credentials");
    expect(html).toContain("bg-red-50");
  });

  test("login form should include redirect input when provided", () => {
    const html = loginPage(null, "/dashboard");
    expect(html).toContain('name="redirect"');
    expect(html).toContain('value="/dashboard"');
  });
});

