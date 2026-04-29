import { file } from "bun";
import nodePath from "path";
import { logger } from "../utils/logger";
import { APP_VERSION } from "../utils/version";
import type { RequestContext } from "./types";
import type { Router } from "./router";

export function registerSystemRoutes(router: Router): void {
  router.get("/health", healthGet, { public: true });
  router.get("/api/version", versionGet, { public: true });
}

/**
 * Static file dispatch — runs before the main router because matches depend
 * on path prefixes/exact-paths that are simpler to handle imperatively than
 * to register one-by-one.
 *
 * Returns null when the path is not a static asset.
 */
export async function tryServeStatic(ctx: RequestContext): Promise<Response | null> {
  const { path } = ctx;

  if (path === "/favicon.ico") {
    const ico = file("./public/icons/favicon.ico");
    if (await ico.exists()) {
      return new Response(ico, { headers: { "Content-Type": "image/x-icon" } });
    }
    return null;
  }

  if (path === "/js/qr-scanner.umd.min.js") {
    const libFile = file("./node_modules/qr-scanner/qr-scanner.umd.min.js");
    if (await libFile.exists()) {
      return new Response(libFile, { headers: { "Content-Type": "application/javascript" } });
    }
    return new Response("Not found", { status: 404 });
  }

  if (path === "/js/qr-scanner-worker.min.js") {
    const workerFile = file("./node_modules/qr-scanner/qr-scanner-worker.min.js");
    if (await workerFile.exists()) {
      return new Response(workerFile, { headers: { "Content-Type": "application/javascript" } });
    }
    return new Response("Not found", { status: 404 });
  }

  if (
    path.startsWith("/css/") ||
    path.startsWith("/js/") ||
    path.startsWith("/icons/") ||
    path === "/manifest.webmanifest"
  ) {
    const resolved = nodePath.resolve("./public", `.${path}`);
    const publicDir = nodePath.resolve("./public");
    if (!resolved.startsWith(publicDir)) {
      return new Response("Forbidden", { status: 403 });
    }
    const staticFile = file(resolved);
    if (await staticFile.exists()) {
      return new Response(staticFile);
    }
    return new Response("Not found", { status: 404 });
  }

  return null;
}

async function healthGet(ctx: RequestContext): Promise<Response> {
  const { traceId, pool } = ctx;
  try {
    await pool.query("SELECT 1");
    return new Response(
      JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
        traceId,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    logger.error("Health check failed", err, { traceId });
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        traceId,
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function versionGet(_ctx: RequestContext): Promise<Response> {
  return new Response(
    JSON.stringify({
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
