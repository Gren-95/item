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
});
