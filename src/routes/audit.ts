import type { RowDataPacket } from "mysql2";
import { logger } from "../utils/logger";
import { errorPage } from "../templates/error";
import { parseEstonianDate } from "../utils/date";
import type { RequestContext } from "./types";
import type { Router } from "./router";

export function registerAuditRoutes(router: Router): void {
  router.get("/inventory-periods", inventoryPeriodsGet);
  router.post("/inventory-periods", inventoryPeriodsPost);
  router.get("/inventory-audit", inventoryAuditRedirect);
}

async function inventoryPeriodsRedirectIfNotAdmin(
  ctx: RequestContext
): Promise<Response | null> {
  const { isAdmin, hasPcPwView, hasAuditApprover, currentUsername } = ctx;
  if (isAdmin) return null;
  return new Response(
    errorPage(
      "Access Denied",
      "You do not have permission to access the Inventory Periods page.",
      "You need administrative permissions to manage inventory periods. Please contact your administrator if you need access.",
      403,
      isAdmin,
      hasPcPwView,
      currentUsername!,
      hasAuditApprover
    ),
    { status: 403, headers: { "Content-Type": "text/html" } }
  );
}

async function inventoryPeriodsGet(ctx: RequestContext): Promise<Response> {
  const denial = await inventoryPeriodsRedirectIfNotAdmin(ctx);
  if (denial) return denial;
  return Response.redirect("/inventory-audit/review#periods", 302);
}

async function inventoryPeriodsPost(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool, isAdmin } = ctx;
  if (!isAdmin) {
    return Response.redirect(
      "/inventory-audit/review?error=" + encodeURIComponent("Access denied") + "#periods",
      303
    );
  }

  const form = await req.formData();
  const action = (form.get("action") || "").toString();

  try {
    if (action === "add") {
      const startDateRaw = form.get("start_date")?.toString();
      const endDateRaw = form.get("end_date")?.toString();
      const comment = form.get("comment")?.toString() || null;

      if (!startDateRaw || !endDateRaw) {
        throw new Error("Start and end date are required");
      }

      const startDate = parseEstonianDate(startDateRaw) || startDateRaw;
      const endDate = parseEstonianDate(endDateRaw) || endDateRaw;

      const start = new Date(startDate);
      const year = start.getUTCFullYear();
      const quarter = Math.floor(start.getUTCMonth() / 3) + 1;
      const prefix = `INV-${year}-Q${quarter}`;

      const [existing] = await pool.query<RowDataPacket[]>(
        `SELECT inventory_nr FROM it_inventory_period WHERE inventory_nr LIKE ? ORDER BY inventory_nr DESC LIMIT 1`,
        [`${prefix}-%`]
      );

      let nextSeq = 1;
      if (existing.length > 0) {
        const parts = existing[0].inventory_nr.split("-");
        const last = parts[parts.length - 1];
        const n = parseInt(last, 10);
        if (!Number.isNaN(n)) nextSeq = n + 1;
      }

      const inventoryNr = `${prefix}-${nextSeq}`;

      await pool.query(
        `INSERT INTO it_inventory_period (inventory_nr, start_date, end_date, comment)
         VALUES (?, ?, ?, ?)`,
        [inventoryNr, startDate, endDate, comment]
      );

      return Response.redirect(
        "/inventory-audit/review?success=" +
          encodeURIComponent("Inventory period created") +
          "#periods",
        303
      );
    }

    if (action === "delete") {
      const id = form.get("id")?.toString();
      if (!id) throw new Error("Missing period id");
      await pool.query(
        `DELETE FROM it_inventory_period WHERE id = ? AND confirmed_by IS NULL`,
        [id]
      );
      return Response.redirect(
        "/inventory-audit/review?success=" +
          encodeURIComponent("Inventory period deleted") +
          "#periods",
        303
      );
    }

    throw new Error("Unknown action");
  } catch (err) {
    logger.error("Inventory periods action failed", err, { traceId });
    return Response.redirect(
      "/inventory-audit/review?error=" +
        encodeURIComponent("An unexpected error occurred. Please try again.") +
        "#periods",
      303
    );
  }
}

async function inventoryAuditRedirect(): Promise<Response> {
  return Response.redirect("/inventory-audit/review", 302);
}
