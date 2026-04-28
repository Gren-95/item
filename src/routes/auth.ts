import type { RowDataPacket } from "mysql2";
import { loginPage } from "../templates/login";
import { changePasswordPage } from "../templates/change-password";
import { logger } from "../utils/logger";
import {
  getSessionFromRequest,
  createSession,
  deleteSession,
  createSessionCookie,
  deleteSessionCookie,
} from "../utils/session";
import { isRateLimited } from "../utils/security";
import {
  verifyCredentials,
  changePassword,
  hasItemLoginPermission,
  seedFullPermissionsForUser,
  isAdminUser,
} from "../utils/auth";
import { changePasswordSchema } from "../utils/validation";
import type { RequestContext } from "./types";
import type { Router } from "./router";

export function registerAuthRoutes(router: Router): void {
  router.get("/login", loginGet, { public: true });
  router.post("/login", loginPost, { public: true });
  router.get("/logout", logoutGet, { public: true });
  router.get("/change-password", changePasswordGet);
  router.post("/change-password", changePasswordPost);
}

async function loginGet(ctx: RequestContext): Promise<Response> {
  const { req, url } = ctx;
  const session = getSessionFromRequest(req);
  if (session) {
    const rawRedirect = url.searchParams.get("redirect") || "/";
    const safeRedirect =
      rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/";
    return Response.redirect(safeRedirect, 302);
  }

  const error = url.searchParams.get("error") || null;
  const redirect = url.searchParams.get("redirect") || null;
  return new Response(loginPage(error, redirect), {
    headers: { "Content-Type": "text/html" },
  });
}

async function loginPost(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool } = ctx;
  const serverAddr = (req as unknown as { socket?: { remoteAddress?: string } }).socket
    ?.remoteAddress;
  const clientIp =
    serverAddr || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(clientIp, false)) {
    logger.info("Rate limited login attempt", { traceId, ip: clientIp });
    return new Response(loginPage("Too many login attempts. Please try again later.", null), {
      status: 429,
      headers: { "Content-Type": "text/html" },
    });
  }

  const formData = await req.formData();
  const username = (formData.get("username") || "").toString().trim();
  const password = (formData.get("password") || "").toString();
  const redirect = (formData.get("redirect") || "").toString() || "/";

  if (!username || !password) {
    return new Response(loginPage("Username and password are required", redirect || null), {
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    const isValid = await verifyCredentials(username, password);

    if (!isValid) {
      isRateLimited(clientIp);
      logger.info("Failed login attempt", { traceId, username, ip: clientIp });
      return new Response(loginPage("Invalid username or password", redirect || null), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const isAdmin = isAdminUser(username);
    if (isAdmin) {
      logger.info("Admin user logged in", { traceId, username });
    }

    const hasPermission = await hasItemLoginPermission(username, pool);

    if (!isAdmin) {
      const [legacyCount] = await pool.query<RowDataPacket[]>(
        "SELECT COUNT(*) as count FROM it_user_permissions"
      );
      if (legacyCount[0].count === 0) {
        await seedFullPermissionsForUser(username, pool);
      }
    }

    if (!hasPermission) {
      logger.info("Login denied - missing item_login permission", { traceId, username });
      return new Response(
        loginPage(
          "You do not have permission to access this system. Please contact your administrator.",
          redirect || null
        ),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const sessionId = createSession(username);
    logger.info("User logged in", { traceId, username, isAdmin });

    const safeRedirect = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
    return new Response(null, {
      status: 302,
      headers: {
        Location: safeRedirect,
        "Set-Cookie": createSessionCookie(sessionId),
      },
    });
  } catch (err) {
    logger.error("Login error", err, { traceId, username });
    return new Response(loginPage("An error occurred during login. Please try again.", redirect || null), {
      headers: { "Content-Type": "text/html" },
    });
  }
}

async function logoutGet(ctx: RequestContext): Promise<Response> {
  const { req, traceId } = ctx;
  const session = getSessionFromRequest(req);
  if (session) {
    deleteSession(session.sessionId);
    logger.info("User logged out", { traceId, username: session.username });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/login",
      "Set-Cookie": deleteSessionCookie(),
    },
  });
}

async function changePasswordGet(ctx: RequestContext): Promise<Response> {
  const { url, currentUsername, isAdmin, hasPcPwView, hasAuditApprover } = ctx;
  const success = url.searchParams.get("success") || null;
  const error = url.searchParams.get("error") || null;
  return new Response(
    changePasswordPage(success, error, isAdmin, hasPcPwView, currentUsername, hasAuditApprover),
    { headers: { "Content-Type": "text/html" } }
  );
}

async function changePasswordPost(ctx: RequestContext): Promise<Response> {
  const { req, traceId } = ctx;
  // currentUsername is set by applyAuthPreamble for non-public routes
  const username = ctx.currentUsername!;

  const formData = await req.formData();
  const rawData = {
    old_password: formData.get("old_password")?.toString() || "",
    new_password: formData.get("new_password")?.toString() || "",
    confirm_password: formData.get("confirm_password")?.toString() || "",
  };

  try {
    const validated = changePasswordSchema.parse(rawData);

    const result = await changePassword(username, validated.old_password, validated.new_password);

    if (result.success) {
      logger.info("Password changed successfully", { traceId, username });
      return Response.redirect(
        "/change-password?success=" +
          encodeURIComponent(result.message || "Password changed successfully"),
        303
      );
    }
    logger.info("Password change failed", { traceId, username, error: result.error });
    return Response.redirect(
      "/change-password?error=" + encodeURIComponent(result.error || "Password change failed"),
      303
    );
  } catch (err) {
    const errorMessage = "Invalid input. Please check your entries.";
    logger.error("Password change validation error", err, { traceId, username });
    return Response.redirect("/change-password?error=" + encodeURIComponent(errorMessage), 303);
  }
}
