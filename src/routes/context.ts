import { randomUUID } from "crypto";
import type { Pool } from "mysql2/promise";
import { logger } from "../utils/logger";
import { getSessionFromRequest } from "../utils/session";
import {
  hasAdminPermission,
  hasPcPwViewPermission,
  hasPermission,
  getUserPlantId,
} from "../utils/auth";
import type { RequestContext } from "./types";

const PUBLIC_PATHS = new Set([
  "/login",
  "/logout",
  "/repairs",
  "/health",
  "/api/version",
  "/favicon.ico",
  "/manifest.webmanifest",
]);

const PUBLIC_PREFIXES = ["/css/", "/js/", "/icons/"];

export function isPublicPath(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) return true;
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function createInitialContext(req: Request, pool: Pool): RequestContext {
  const url = new URL(req.url);
  return {
    req,
    url,
    path: url.pathname,
    method: req.method,
    traceId: randomUUID(),
    pool,
    currentUsername: null,
    isAdmin: false,
    hasPcPwView: false,
    hasAuditApprover: false,
  };
}

/**
 * Authentication and CSRF preamble for protected routes.
 *
 * Returns a Response (302/403) when the request must be rejected.
 * Returns null on success and mutates ctx with the resolved auth fields.
 */
export async function applyAuthPreamble(ctx: RequestContext): Promise<Response | null> {
  const session = getSessionFromRequest(ctx.req);
  if (!session) {
    const loginUrl = `/login?redirect=${encodeURIComponent(ctx.path)}`;
    return Response.redirect(loginUrl, 302);
  }

  ctx.currentUsername = session.username;

  logger.info("Checking admin permission", { traceId: ctx.traceId, username: session.username });
  ctx.isAdmin = await hasAdminPermission(session.username, ctx.pool);
  logger.info("Admin permission result", {
    traceId: ctx.traceId,
    username: session.username,
    isAdmin: ctx.isAdmin,
  });

  ctx.hasPcPwView = await hasPcPwViewPermission(session.username, ctx.pool);
  logger.info("PC Passwords view permission", {
    traceId: ctx.traceId,
    username: session.username,
    hasPcPwView: ctx.hasPcPwView,
  });

  const userPlantId = await getUserPlantId(session.username, ctx.pool);
  ctx.hasAuditApprover =
    ctx.isAdmin ||
    (await hasPermission(session.username, ctx.pool, "audit-approver", userPlantId, true));
  logger.info("Audit approver permission", {
    traceId: ctx.traceId,
    username: session.username,
    hasAuditApprover: ctx.hasAuditApprover,
  });

  if (ctx.method === "POST" || ctx.method === "PUT" || ctx.method === "DELETE") {
    const denial = checkCsrf(ctx);
    if (denial) return denial;
  }

  return null;
}

function checkCsrf(ctx: RequestContext): Response | null {
  const origin = ctx.req.headers.get("origin");
  const referer = ctx.req.headers.get("referer");
  const host = ctx.req.headers.get("host");
  const contentType = ctx.req.headers.get("content-type") || "";

  if (origin) {
    const originHost = new URL(origin).host;
    if (host && originHost !== host) {
      logger.info("CSRF: Origin mismatch", { traceId: ctx.traceId, origin, host });
      return new Response("Forbidden: cross-origin request", { status: 403 });
    }
    return null;
  }

  if (referer) {
    const refererHost = new URL(referer).host;
    if (host && refererHost !== host) {
      logger.info("CSRF: Referer mismatch", { traceId: ctx.traceId, referer, host });
      return new Response("Forbidden: cross-origin request", { status: 403 });
    }
    return null;
  }

  // JSON APIs are exempt from the Origin/Referer requirement: HTML forms cannot
  // produce application/json without a CORS preflight, so they cannot be
  // cross-site forged.
  if (!contentType.includes("application/json")) {
    logger.info("CSRF: Missing Origin and Referer", { traceId: ctx.traceId, path: ctx.path });
    return new Response("Forbidden: missing origin header", { status: 403 });
  }

  return null;
}
