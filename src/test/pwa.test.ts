import { describe, test, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

describe("PWA Manifest (#21)", () => {
  test("manifest.webmanifest should exist", () => {
    const manifestPath = join(import.meta.dir, "../../public/manifest.webmanifest");
    const manifest = readFileSync(manifestPath, "utf-8");
    expect(manifest).toBeTruthy();
  });

  test("manifest.webmanifest should be valid JSON", () => {
    const manifestPath = join(import.meta.dir, "../../public/manifest.webmanifest");
    const manifest = readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(manifest);
    expect(parsed).toBeDefined();
  });

  test("manifest should have required PWA fields", () => {
    const manifestPath = join(import.meta.dir, "../../public/manifest.webmanifest");
    const manifest = readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(manifest);

    expect(parsed.name).toBeDefined();
    expect(parsed.short_name).toBeDefined();
    expect(parsed.start_url).toBeDefined();
    expect(parsed.display).toBeDefined();
    expect(parsed.icons).toBeDefined();
    expect(Array.isArray(parsed.icons)).toBe(true);
  });

  test("manifest should have theme colors", () => {
    const manifestPath = join(import.meta.dir, "../../public/manifest.webmanifest");
    const manifest = readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(manifest);

    expect(parsed.theme_color).toBeDefined();
    expect(parsed.background_color).toBeDefined();
  });

  test("manifest icons should reference existing files", () => {
    const manifestPath = join(import.meta.dir, "../../public/manifest.webmanifest");
    const manifest = readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(manifest);

    if (parsed.icons && parsed.icons.length > 0) {
      const iconPath = parsed.icons[0].src;
      expect(iconPath).toBeDefined();
      // Icon path should start with /icons/
      expect(iconPath.startsWith("/icons/")).toBe(true);
    }
  });

  test("manifest should have icons with proper sizes and purposes", () => {
    const manifestPath = join(import.meta.dir, "../../public/manifest.webmanifest");
    const manifest = readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(manifest);

    expect(parsed.icons).toBeDefined();
    expect(parsed.icons.length).toBeGreaterThan(0);

    // Check for required icon sizes
    const iconSizes = parsed.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(iconSizes).toContain("192x192");
    expect(iconSizes).toContain("512x512");

    // Check for proper purposes
    const purposes = parsed.icons.map((icon: { purpose?: string }) => icon.purpose || "any");
    expect(purposes.some((p: string) => p.includes("any"))).toBe(true);
    expect(purposes.some((p: string) => p.includes("maskable"))).toBe(true);
  });

  test("manifest theme_color should match branding palette", () => {
    const manifestPath = join(import.meta.dir, "../../public/manifest.webmanifest");
    const manifest = readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(manifest);

    // Primary blue color from branding palette
    expect(parsed.theme_color).toBe("#2563eb");
  });

  test("manifest background_color should match branding palette", () => {
    const manifestPath = join(import.meta.dir, "../../public/manifest.webmanifest");
    const manifest = readFileSync(manifestPath, "utf-8");
    const parsed = JSON.parse(manifest);

    // Light gray background from branding palette
    expect(parsed.background_color).toBe("#f9fafb");
  });
});
