import { describe, test, expect } from "bun:test";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { layout } from "../templates/layout";

describe("Branding and Icons (#31)", () => {
  describe("Color Palette", () => {
    test("BRANDING.md should document color palette", () => {
      const brandingPath = join(process.cwd(), "BRANDING.md");
      if (!existsSync(brandingPath)) {
        // Skip if file doesn't exist (e.g., in Docker container without file mounted)
        return;
      }
      const branding = readFileSync(brandingPath, "utf-8");
      
      expect(branding).toContain("#2563eb"); // Primary blue
      expect(branding).toContain("#3b82f6"); // Dark mode blue
      expect(branding).toContain("#f9fafb"); // Light background
      expect(branding).toContain("#111827"); // Dark background
    });

    test("BRANDING.md should document semantic colors", () => {
      const brandingPath = join(process.cwd(), "BRANDING.md");
      if (!existsSync(brandingPath)) {
        // Skip if file doesn't exist (e.g., in Docker container without file mounted)
        return;
      }
      const branding = readFileSync(brandingPath, "utf-8");
      
      expect(branding).toContain("Success");
      expect(branding).toContain("Error/Warning");
      expect(branding).toContain("green");
      expect(branding).toContain("red");
    });
  });

  describe("Favicon Configuration", () => {
    test("layout should include favicon.ico link", () => {
      const html = layout("Test", "<p>Test</p>");
      expect(html).toContain('rel="icon"');
      expect(html).toContain('href="/icons/favicon.ico"');
      expect(html).toContain('type="image/x-icon"');
    });

    test("layout should include PNG favicon links with sizes", () => {
      const html = layout("Test", "<p>Test</p>");
      expect(html).toContain('href="/icons/favicon.svg"');
      expect(html).toContain('type="image/svg+xml"');
      expect(html).toContain('href="/icons/favicon-96x96.png"');
      expect(html).toContain('sizes="96x96"');
    });

    test("layout should include apple-touch-icon", () => {
      const html = layout("Test", "<p>Test</p>");
      expect(html).toContain('rel="apple-touch-icon"');
      expect(html).toContain('href="/icons/apple-touch-icon.png"');
    });
  });

  describe("Theme Colors", () => {
    test("layout should include theme-color meta tags", () => {
      const html = layout("Test", "<p>Test</p>");
      expect(html).toContain('name="theme-color"');
      expect(html).toContain('content="#2563eb"');
      expect(html).toContain('media="(prefers-color-scheme: light)"');
      expect(html).toContain('content="#1e293b"');
      expect(html).toContain('media="(prefers-color-scheme: dark)"');
    });

    test("theme colors should match branding palette", () => {
      const html = layout("Test", "<p>Test</p>");
      // Light theme: primary blue
      expect(html).toContain('content="#2563eb"');
      // Dark theme: dark gray
      expect(html).toContain('content="#1e293b"');
    });
  });

  describe("Manifest Configuration", () => {
    test("manifest should reference proper icon sizes", () => {
      const manifestPath = join(import.meta.dir, "../../public/manifest.webmanifest");
      const manifest = readFileSync(manifestPath, "utf-8");
      const parsed = JSON.parse(manifest);

      const iconSizes = parsed.icons.map((icon: { sizes: string }) => icon.sizes);
      expect(iconSizes).toContain("192x192");
      expect(iconSizes).toContain("512x512");
    });

    test("manifest icons should have both 'any' and 'maskable' purposes", () => {
      const manifestPath = join(import.meta.dir, "../../public/manifest.webmanifest");
      const manifest = readFileSync(manifestPath, "utf-8");
      const parsed = JSON.parse(manifest);

      const purposes = parsed.icons.map((icon: { purpose?: string }) => icon.purpose || "any");
      const hasAny = purposes.some((p: string) => p.includes("any"));
      const hasMaskable = purposes.some((p: string) => p.includes("maskable"));

      expect(hasAny).toBe(true);
      expect(hasMaskable).toBe(true);
    });

    test("manifest theme_color should use primary brand color", () => {
      const manifestPath = join(import.meta.dir, "../../public/manifest.webmanifest");
      const manifest = readFileSync(manifestPath, "utf-8");
      const parsed = JSON.parse(manifest);

      expect(parsed.theme_color).toBe("#2563eb");
    });

    test("manifest background_color should use light background color", () => {
      const manifestPath = join(import.meta.dir, "../../public/manifest.webmanifest");
      const manifest = readFileSync(manifestPath, "utf-8");
      const parsed = JSON.parse(manifest);

      expect(parsed.background_color).toBe("#f9fafb");
    });
  });

  describe("Icon File Structure", () => {
    test("icon paths should follow consistent naming convention", () => {
      const manifestPath = join(import.meta.dir, "../../public/manifest.webmanifest");
      const manifest = readFileSync(manifestPath, "utf-8");
      const parsed = JSON.parse(manifest);

      parsed.icons.forEach((icon: { src: string; sizes: string }) => {
        // Icon paths should match the size in the filename
        const sizeMatch = icon.sizes.match(/(\d+)x(\d+)/);
        if (sizeMatch) {
          const size = sizeMatch[1];
          expect(icon.src).toContain(`web-app-manifest-${size}x${size}.png`);
        }
      });
    });

    test("favicon links should use consistent paths", () => {
      const html = layout("Test", "<p>Test</p>");
      
      // All icon paths should be under /icons/
      expect(html).toContain('/icons/favicon.ico');
      expect(html).toContain('/icons/favicon.svg');
      expect(html).toContain('/icons/favicon-96x96.png');
      expect(html).toContain('/icons/apple-touch-icon.png');
    });
  });
});

