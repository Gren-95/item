import { serve } from "bun";
import nodePath from "path";
import pool from "./db";
import { searchPage } from "./templates/search";
import { logger } from "./utils/logger";
import { withSecurityHeaders } from "./utils/security";
import { applyAuthPreamble, createInitialContext, isPublicPath } from "./routes/context";
import { Router } from "./routes/router";
import { registerAuthRoutes } from "./routes/auth";
import { registerSystemRoutes, tryServeStatic } from "./routes/system";
import { registerLabelsRoutes } from "./routes/labels";
import { registerApiRoutes } from "./routes/api";
import { registerRepairsRoutes } from "./routes/repairs";
import { registerPrintersRoutes } from "./routes/printers";
import { registerApiCrudRoutes } from "./routes/api-crud";
import { registerPermissionsRoutes } from "./routes/permissions";
import { registerApprovalsRoutes } from "./routes/approvals";
import { registerVendorsRoutes } from "./routes/vendors";
import { registerTypesRoutes } from "./routes/equipment-types";
import { registerLocationsRoutes } from "./routes/locations";
import { registerAuditRoutes } from "./routes/audit";
import { registerEquipmentRoutes } from "./routes/equipment";
import { registerInventoryAuditRoutes } from "./routes/inventory-audit";
import { validateEmailConfig } from "./utils/email";
import { startScheduler } from "./utils/scheduler";
import { runMigrations } from "./migrations/migrate";
import { isCryptoConfigured } from "./utils/crypto";
import { encryptLegacyPcPasswords } from "./repositories/pc-passwords";

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const DEFAULT_CERT_PATH = nodePath.join(process.cwd(), "certs", "ssl.pem");
const DEFAULT_KEY_PATH = nodePath.join(process.cwd(), "certs", "ssl-key.pem");
const HTTPS_CERT_FILE = process.env.HTTPS_CERT_FILE || DEFAULT_CERT_PATH;
const HTTPS_KEY_FILE = process.env.HTTPS_KEY_FILE || DEFAULT_KEY_PATH;

async function getTlsOptions() {
  try {
    const certFile = Bun.file(HTTPS_CERT_FILE);
    const keyFile = Bun.file(HTTPS_KEY_FILE);

    if (!(await certFile.exists()) || !(await keyFile.exists())) {
      console.warn(
        `[HTTPS] TLS cert/key not found. Expected cert: ${HTTPS_CERT_FILE}, key: ${HTTPS_KEY_FILE}`
      );
      return null;
    }

    const [cert, key] = await Promise.all([certFile.text(), keyFile.text()]);
    if (!cert.trim() || !key.trim()) {
      console.warn("[HTTPS] TLS cert or key is empty");
      return null;
    }

    return { cert, key };
  } catch {
    console.warn("[HTTPS] Failed to load TLS cert/key");
    return null;
  }
}

const router = new Router();
registerSystemRoutes(router);
registerAuthRoutes(router);
registerLabelsRoutes(router);
registerApiRoutes(router);
registerRepairsRoutes(router);
registerPrintersRoutes(router);
registerApiCrudRoutes(router);
registerPermissionsRoutes(router);
registerApprovalsRoutes(router);
registerVendorsRoutes(router);
registerTypesRoutes(router);
registerLocationsRoutes(router);
registerAuditRoutes(router);
registerEquipmentRoutes(router);
registerInventoryAuditRoutes(router);

async function handleRequest(req: Request): Promise<Response> {
  const ctx = createInitialContext(req, pool);
  const { traceId, url, path } = ctx;

  logger.info("Request received", { traceId, method: req.method, path });

  const staticResponse = await tryServeStatic(ctx);
  if (staticResponse) return staticResponse;

  if (!isPublicPath(path)) {
    const denial = await applyAuthPreamble(ctx);
    if (denial) return denial;
  }

  try {
    const routerResponse = await router.dispatch(ctx);
    if (routerResponse) return routerResponse;
    return new Response("Not found", { status: 404 });
  } catch (err) {
    logger.error("Request handler error", err, { traceId, path });
    return new Response(
      searchPage("", null, "An unexpected error occurred. Please try again later.", false, false),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
}

// Run migrations on startup (before starting server)
try {
  await runMigrations();
  console.log("✅ Database migrations completed");
} catch (err) {
  logger.error("Failed to run migrations on startup", err);
  console.error("⚠️  Migration failed, but continuing server startup:", err);
}

// Encrypt any legacy plaintext PC passwords (one-shot, idempotent)
if (isCryptoConfigured()) {
  try {
    await encryptLegacyPcPasswords(pool);
  } catch (err) {
    logger.error("Failed to encrypt legacy PC passwords", err);
    console.error("⚠️  Legacy PC-password encryption failed:", err);
  }
} else {
  console.warn(
    "⚠️  PC_PW_ENCRYPTION_KEY not configured — PC passwords are stored in plaintext. Set the env var to enable at-rest encryption."
  );
}

// Validate email configuration
await validateEmailConfig();

// Start background scheduler for email notifications
startScheduler();

const tlsOptions = await getTlsOptions();

/** Wrapper that adds security headers to every response. */
async function securedHandler(req: Request): Promise<Response> {
  const response = await handleRequest(req);
  return withSecurityHeaders(response);
}

if (tlsOptions) {
  // HTTPS server
  serve({
    port: Number(HTTPS_PORT),
    fetch: securedHandler,
    tls: tlsOptions,
  });

  // HTTP server to redirect to HTTPS
  serve({
    port: Number(PORT),
    fetch: (req: Request) => {
      const url = new URL(req.url);
      url.protocol = "https:";
      url.port = HTTPS_PORT.toString();
      return Response.redirect(url.toString(), 301);
    },
  });

  console.log(`🔒 HTTPS enabled on port ${HTTPS_PORT}`);
} else {
  console.log(
    `🚀 HTTPS not enabled (missing or invalid cert/key). Server running at http://localhost:${PORT}`
  );
  serve({
    port: Number(PORT),
    fetch: securedHandler,
  });
}
