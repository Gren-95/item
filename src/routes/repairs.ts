import type { RowDataPacket } from "mysql2";
import { logger } from "../utils/logger";
import { repairsPage } from "../templates/repairs";
import { errorPage } from "../templates/error";
import {
  getUserPlantId,
  hasAdminPermission,
  hasPcPwViewPermission,
  hasPermission,
  hasRepairsPermission,
  hasRepairsSendPermission,
} from "../utils/auth";
import { getSessionFromRequest } from "../utils/session";
import { getEmployeeNo, createApprovalRequest, getClientIp } from "../utils/approvals";
import { getRepairsData } from "../repositories/repairs";
import type { RequestContext } from "./types";
import type { Router } from "./router";

export function registerRepairsRoutes(router: Router): void {
  router.get("/repairs", repairsGet, { public: true });
  router.post("/repairs", repairsPost, { public: true });
}

/**
 * /repairs is in the public-route allowlist (any vendor visiting via the
 * BarTender/email link can see the read-only summary). When a session is
 * present, we re-derive the navigation flags ourselves because the global
 * applyAuthPreamble is skipped for public paths.
 */
async function repairsGet(ctx: RequestContext): Promise<Response> {
  const { req, url, pool } = ctx;
  const session = getSessionFromRequest(req);

  let isAdmin = false;
  let hasPcPwView = false;
  let hasAuditApprover = false;

  if (session) {
    isAdmin = await hasAdminPermission(session.username, pool);
    hasPcPwView = await hasPcPwViewPermission(session.username, pool);
    const userPlantId = await getUserPlantId(session.username, pool);
    hasAuditApprover =
      isAdmin || (await hasPermission(session.username, pool, "audit-approver", userPlantId, true));

    const hasRepairs = await hasRepairsPermission(session.username, pool, userPlantId);
    if (!hasRepairs) {
      return new Response(
        errorPage(
          "Access Denied",
          "You do not have permission to view repairs.",
          "You need the 'repairs' permission to access this page. Please contact your administrator if you need access.",
          403,
          isAdmin,
          hasPcPwView,
          session.username,
          hasAuditApprover
        ),
        { status: 403, headers: { "Content-Type": "text/html" } }
      );
    }
  }

  const success = url.searchParams.get("success") || "";
  const error = url.searchParams.get("error") || "";
  const data = await getRepairsData(pool);
  return new Response(
    repairsPage(data, success, error, isAdmin, hasPcPwView, session?.username || null, hasAuditApprover),
    { headers: { "Content-Type": "text/html" } }
  );
}

async function repairsPost(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool } = ctx;
  // /repairs is in the public-path list (so the GET works for vendors who
  // arrive via the BarTender link), which means applyAuthPreamble is skipped
  // for both methods. Re-fetch the session here, mirroring the original
  // behaviour.
  const session = getSessionFromRequest(req);
  if (!session) {
    return Response.redirect("/login?redirect=/repairs", 302);
  }
  const username = session.username;

  const form = await req.formData();
  const rawData = {
    action: (form.get("action") || "").toString(),
    equipment_id: form.get("equipment_id") ? form.get("equipment_id")!.toString() : undefined,
  };

  try {
    const action = rawData.action;
    const equipmentId = rawData.equipment_id ? Number(rawData.equipment_id) : null;

    if (!equipmentId) {
      throw new Error("Equipment ID is required");
    }

    let permissionRequired = "repairs";
    let actionType = "";
    let hasPermissionResult = false;
    const userPlantId = await getUserPlantId(username, pool);

    if (action === "mark_sent") {
      hasPermissionResult = await hasRepairsSendPermission(username, pool, userPlantId);
      permissionRequired = "repairs_send";
      actionType = "send_to_repair";
    } else {
      hasPermissionResult = await hasRepairsPermission(username, pool, userPlantId);
      actionType = action === "mark_returned" ? "return_from_repair" : "mark_backup";
    }

    if (!hasPermissionResult) {
      const employeeNo = await getEmployeeNo(username, pool);
      const clientIp = getClientIp(req);

      if (!employeeNo) {
        return Response.redirect(
          "/repairs?error=" +
            encodeURIComponent(
              "Unable to create approval request. Please contact your administrator."
            ),
          303
        );
      }

      const requestId = await createApprovalRequest(
        employeeNo,
        permissionRequired,
        actionType,
        { equipment_id: equipmentId },
        clientIp,
        pool
      );

      if (requestId) {
        return Response.redirect(
          "/repairs?success=" +
            encodeURIComponent("Approval request created (ID: " + requestId + ")"),
          303
        );
      }
      return Response.redirect(
        "/repairs?error=" +
          encodeURIComponent(
            "Failed to create approval request. Please contact your administrator."
          ),
        303
      );
    }

    if (action === "mark_sent") {
      await pool.query(
        `UPDATE it_equipment
         SET repair_status = 'at_supplier', repair_sent_date = CURRENT_DATE
         WHERE id = ?`,
        [equipmentId]
      );
    } else if (action === "mark_returned") {
      await pool.query(
        `UPDATE it_equipment
         SET repair_status = 'returned', repair_returned_date = CURRENT_DATE
         WHERE id = ?`,
        [equipmentId]
      );
    } else if (action === "mark_backup") {
      const [equipment] = await pool.query<RowDataPacket[]>(
        `SELECT service_tag FROM it_equipment WHERE id = ?`,
        [equipmentId]
      );

      if (equipment.length === 0) {
        throw new Error("Equipment not found");
      }

      const service_tag = equipment[0].service_tag;

      await pool.query(
        `UPDATE it_equipment
         SET repair_status = 'in_backup',
             repair_marked_backup_date = CURRENT_DATE,
             repair_note = NULL
         WHERE id = ?`,
        [equipmentId]
      );

      await pool.query(
        `INSERT INTO it_equipment_log (
          equipment_id, service_tag, assigned_to, equipment_sub_area_id, comment
        ) VALUES (?, ?, NULL, NULL, ?)`,
        [equipmentId, service_tag, ""]
      );
    } else {
      throw new Error("Unknown action");
    }

    return Response.redirect(`/repairs?success=${encodeURIComponent("Status updated")}`, 303);
  } catch (err) {
    const errorMessage = "An unexpected error occurred. Please try again.";
    logger.error("Failed to update repair status", err, { traceId, rawData });
    return Response.redirect(`/repairs?error=${encodeURIComponent(errorMessage)}`, 303);
  }
}
