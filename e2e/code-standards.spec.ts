import { test, expect } from "@playwright/test";
import { readdirSync } from "fs";
import { join } from "path";

/**
 * Code standards tests - enforce naming conventions and code quality rules
 */

test.describe("Code Standards", () => {
  test.describe("Template file naming", () => {
    const templatesDir = join(__dirname, "../src/templates");
    const templateFiles = readdirSync(templatesDir).filter((f) =>
      f.endsWith(".ts")
    );

    test("all template files use kebab-case naming", () => {
      const kebabCaseRegex = /^[a-z]+(-[a-z]+)*\.ts$/;
      const violations: string[] = [];

      for (const file of templateFiles) {
        if (!kebabCaseRegex.test(file)) {
          violations.push(file);
        }
      }

      expect(
        violations,
        `Template files must use kebab-case naming. Violations: ${violations.join(", ")}`
      ).toHaveLength(0);
    });

    test("no camelCase in template file names", () => {
      const camelCaseRegex = /[a-z][A-Z]/;
      const violations: string[] = [];

      for (const file of templateFiles) {
        if (camelCaseRegex.test(file)) {
          violations.push(file);
        }
      }

      expect(
        violations,
        `Template files must not use camelCase. Violations: ${violations.join(", ")}`
      ).toHaveLength(0);
    });
  });

  test.describe("E2E test file naming", () => {
    const e2eDir = join(__dirname, "../e2e");
    const testFiles = readdirSync(e2eDir).filter((f) =>
      f.endsWith(".spec.ts")
    );

    test("all E2E test files use kebab-case naming", () => {
      const kebabCaseRegex = /^[a-z]+(-[a-z]+)*\.spec\.ts$/;
      const violations: string[] = [];

      for (const file of testFiles) {
        if (!kebabCaseRegex.test(file)) {
          violations.push(file);
        }
      }

      expect(
        violations,
        `E2E test files must use kebab-case naming. Violations: ${violations.join(", ")}`
      ).toHaveLength(0);
    });
  });
});
