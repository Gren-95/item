import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Reads the application version.
 * Priority:
 *  1. APP_VERSION env var (set by CI/CD)
 *  2. package.json version field
 *  3. VERSION file in project root (generated during deploy)
 *  4. Git commit hash (short, works in dev with .git mounted)
 *  5. Fallback "unknown"
 */
function resolveVersion(): string {
  if (process.env.APP_VERSION) {
    return process.env.APP_VERSION;
  }

  try {
    const pkgPath = join(process.cwd(), "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    if (pkg.version && pkg.version !== "0.0.0") return pkg.version;
  } catch {
    // package.json not found or invalid, continue
  }

  try {
    const versionFile = join(process.cwd(), "VERSION");
    const content = readFileSync(versionFile, "utf-8").trim();
    if (content) return content;
  } catch {
    // VERSION file not found, continue
  }

  try {
    // Mark the directory as safe to avoid "dubious ownership" errors in Docker
    execSync("git config --global --add safe.directory /app 2>/dev/null || true", {
      encoding: "utf-8",
    });
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

/** The resolved version string, computed once at startup */
export const APP_VERSION = resolveVersion();
