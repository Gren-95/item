import { logger } from "../utils/logger";
import { apiAddItemSchema } from "../utils/validation";
import {
  hasLocationsAddPermission,
  hasTypesAddPermission,
  hasVendorsAddPermission,
} from "../utils/auth";
import { getEmployeeNo, createApprovalRequest, getClientIp } from "../utils/approvals";
import { findExistingItem, insertItem, isKnownItemType } from "../repositories/items";
import type { RequestContext } from "./types";
import type { Router } from "./router";

/**
 * The legacy server.ts had a single `if (path.startsWith("/api/") && method === "POST")`
 * catchall. We register one handler per supported resource so that the
 * router pattern matching is explicit and 404s for unknown /api/* POSTs
 * fall through to other handlers (or the final 404 fallback).
 */
const ITEM_API_PATHS = [
  "/api/regions",
  "/api/countries",
  "/api/plants",
  "/api/departments",
  "/api/areas",
  "/api/sub-areas",
  "/api/types",
  "/api/product-lines",
  "/api/models",
  "/api/vendors",
  "/api/suppliers",
];

export function registerApiCrudRoutes(router: Router): void {
  for (const path of ITEM_API_PATHS) {
    router.post(path, createItem);
  }
}

interface ResourceMeta {
  permissionName: string;
  actionType: string;
  hasPermission: (username: string, pool: import("mysql2/promise").Pool) => Promise<boolean>;
}

function metaFor(apiType: string): ResourceMeta | null {
  switch (apiType) {
    case "regions":
    case "countries":
    case "plants":
    case "departments":
    case "areas":
    case "sub-areas":
      return {
        permissionName: "locations_add",
        // Plural to singular; sub-areas → sub_area (slice off 's' and convert dash to underscore)
        actionType: `add_${apiType.slice(0, -1).replace("-", "_")}`,
        hasPermission: hasLocationsAddPermission,
      };
    case "types":
    case "product-lines":
    case "models":
      return {
        permissionName: "types_add",
        actionType: `add_${apiType.replace("-", "_")}`,
        hasPermission: hasTypesAddPermission,
      };
    case "vendors":
    case "suppliers":
      return {
        permissionName: "vendors_add",
        actionType: `add_${apiType.slice(0, -1)}`,
        hasPermission: hasVendorsAddPermission,
      };
    default:
      return null;
  }
}

async function createItem(ctx: RequestContext): Promise<Response> {
  const { req, path, traceId, pool, currentUsername } = ctx;
  const username = currentUsername!;
  const apiType = path.replace("/api/", "");

  if (!isKnownItemType(apiType)) {
    return new Response(JSON.stringify({ error: "Unknown API endpoint" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const meta = metaFor(apiType);
  if (!meta) {
    return new Response(JSON.stringify({ error: "Unknown API endpoint" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let name = "";
  let parent_id: number | null = null;

  try {
    const body = await req.json();
    const validated = apiAddItemSchema.parse(body);
    name = validated.name;
    parent_id = validated.parent_id;

    const hasPermissionResult = await meta.hasPermission(username, pool);

    if (!hasPermissionResult) {
      const employeeNo = await getEmployeeNo(username, pool);
      const clientIp = getClientIp(req);

      if (!employeeNo) {
        return new Response(
          JSON.stringify({
            error: "Unable to create approval request. Please contact your administrator.",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      const actionData: Record<string, unknown> = { name };
      if (parent_id !== undefined) actionData.parent_id = parent_id;

      const requestId = await createApprovalRequest(
        employeeNo,
        meta.permissionName,
        meta.actionType,
        actionData,
        clientIp,
        pool
      );

      if (requestId) {
        return new Response(
          JSON.stringify({
            message: "Approval request created",
            requestId,
            status: "pending_approval",
          }),
          { status: 202, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          error: "Failed to create approval request. Please contact your administrator.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const existing = await findExistingItem(pool, apiType, name, parent_id);
    if (existing) {
      return new Response(
        JSON.stringify({
          duplicate: true,
          id: existing.id,
          name: existing.name,
          message: `"${name}" already exists`,
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    const insertId = await insertItem(pool, apiType, name, parent_id);
    return new Response(JSON.stringify({ id: insertId, name }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const mysqlErr = err as { code?: string };
    if (mysqlErr.code === "ER_DUP_ENTRY") {
      const existing = await findExistingItem(pool, apiType, name, parent_id);
      if (existing) {
        return new Response(
          JSON.stringify({
            duplicate: true,
            id: existing.id,
            name: existing.name,
            message: `"${name}" already exists`,
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }
    }
    logger.error("API create item error", err, { traceId, apiType, name });
    return new Response(JSON.stringify({ error: "Failed to create item. Please try again." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
