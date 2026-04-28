import type { RowDataPacket } from "mysql2";
import { logger } from "../utils/logger";
import { approvalsPage } from "../templates/approvals";
import { minimalLayout } from "../templates/layout";
import { escapeHtml } from "../templates/components";
import { hasAdminPermission } from "../utils/auth";
import { getEmployeeNo } from "../utils/approvals";
import {
  sendApprovalDecisionNotification,
  verifyApprovalToken,
} from "../utils/email";
import { executeApprovedAction } from "../repositories/approvals";
import type { RequestContext } from "./types";
import type { Router } from "./router";

export function registerApprovalsRoutes(router: Router): void {
  router.get("/api/approvals/quick-approve", quickApproveGet);
  router.post("/api/approvals/quick-approve", quickApprovePost);
  router.get("/approvals", approvalsGet);
  router.post("/approvals", approvalsPost);
}

async function quickApproveGet(ctx: RequestContext): Promise<Response> {
  const { url } = ctx;
  const token = url.searchParams.get("token");
  if (!token) {
    return Response.redirect(
      "/approvals?error=" + encodeURIComponent("Invalid approval link"),
      303
    );
  }

  const confirmHtml = minimalLayout(
    "Confirm Approval",
    `
      <div style="max-width:400px;margin:80px auto;text-align:center;font-family:sans-serif;">
        <h2>Confirm Approval</h2>
        <p>Click the button below to approve this request.</p>
        <form method="POST" action="/api/approvals/quick-approve">
          <input type="hidden" name="token" value="${escapeHtml(token)}">
          <button type="submit" style="padding:10px 24px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:16px;">Approve</button>
        </form>
      </div>
    `
  );
  return new Response(confirmHtml, { headers: { "Content-Type": "text/html" } });
}

async function quickApprovePost(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool, currentUsername } = ctx;
  const username = currentUsername!;
  logger.info("Quick approve request", { traceId, method: req.method, path: ctx.path });

  try {
    const formData = await req.formData();
    const token = (formData.get("token") || "").toString();
    if (!token) {
      return Response.redirect(
        "/approvals?error=" + encodeURIComponent("Invalid approval link"),
        303
      );
    }

    const verified = verifyApprovalToken(token);
    if (!verified) {
      return Response.redirect(
        "/approvals?error=" + encodeURIComponent("Invalid or expired approval link"),
        303
      );
    }

    const { requestId } = verified;

    const employeeNo = await getEmployeeNo(username, pool);
    if (!employeeNo) {
      return Response.redirect(
        "/approvals?error=" + encodeURIComponent("Unable to verify your identity"),
        303
      );
    }

    const userIsAdmin = await hasAdminPermission(username, pool);
    if (!userIsAdmin) {
      return Response.redirect(
        "/approvals?error=" +
          encodeURIComponent("You do not have permission to approve requests"),
        303
      );
    }

    const [requests] = await pool.query<RowDataPacket[]>(
      `SELECT id, status, action_type, action_data, permission_required, created_by
       FROM it_request
       WHERE id = ? LIMIT 1`,
      [requestId]
    );

    if (requests.length === 0) {
      return Response.redirect(
        "/approvals?error=" + encodeURIComponent("Approval request not found"),
        303
      );
    }

    const request = requests[0];

    if (request.status !== "pending") {
      return Response.redirect(
        "/approvals?info=" +
          encodeURIComponent("This request has already been " + request.status),
        303
      );
    }

    const actionData =
      typeof request.action_data === "string"
        ? JSON.parse(request.action_data)
        : request.action_data;

    await executeApprovedAction(request.action_type, actionData, pool);

    const reviewedBy = employeeNo === process.env.ADMIN_USERNAME ? null : employeeNo;
    await pool.query(
      `UPDATE it_request
       SET status = 'approved', reviewed_by = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [reviewedBy, requestId]
    );

    logger.info("Quick approval processed", {
      traceId,
      requestId,
      approvedBy: employeeNo,
    });

    sendApprovalDecisionNotification(
      requestId,
      request.permission_required,
      request.action_type,
      actionData,
      request.created_by,
      "approved",
      employeeNo,
      pool
    ).catch((err) =>
      console.error("Failed to send approval decision notification:", err)
    );

    return Response.redirect(
      "/approvals?success=" + encodeURIComponent("Request approved successfully"),
      303
    );
  } catch (error) {
    logger.error("Quick approve failed", error, { traceId });
    return Response.redirect(
      "/approvals?error=" + encodeURIComponent("Failed to process approval"),
      303
    );
  }
}

async function approvalsGet(ctx: RequestContext): Promise<Response> {
  const { url, traceId, pool, isAdmin, hasPcPwView, hasAuditApprover, currentUsername } = ctx;
  const username = currentUsername!;

  if (!isAdmin) {
    return new Response(
      approvalsPage(
        {
          pendingRequests: [],
          processedRequests: [],
          totalProcessed: 0,
          currentPage: 1,
          totalPages: 1,
        },
        false,
        "",
        "",
        hasPcPwView,
        username,
        hasAuditApprover
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  const success = url.searchParams.get("success") || "";
  const error = url.searchParams.get("error") || "";
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const pageSize = 20;

  try {
    const [pendingRequests] = await pool.query<RowDataPacket[]>(
      `SELECT r.*,
              CONCAT(emp1.first_name, ' ', emp1.last_name) as created_by_name,
              CONCAT(emp2.first_name, ' ', emp2.last_name) as reviewed_by_name
       FROM it_request r
       LEFT JOIN it_employees_list emp1 ON r.created_by = emp1.employee_no
       LEFT JOIN it_employees_list emp2 ON r.reviewed_by = emp2.employee_no
       WHERE r.status = 'pending'
       ORDER BY r.created DESC`
    );

    const [processedCount] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM it_request WHERE status IN ('approved', 'rejected')`
    );
    const totalProcessed = processedCount[0]?.total || 0;
    const totalPages = Math.ceil(totalProcessed / pageSize);
    const offset = (page - 1) * pageSize;

    const [processedRequests] = await pool.query<RowDataPacket[]>(
      `SELECT r.*,
              CONCAT(emp1.first_name, ' ', emp1.last_name) as created_by_name,
              CONCAT(emp2.first_name, ' ', emp2.last_name) as reviewed_by_name,
              DATE_FORMAT(r.reviewed_at, '%Y-%m-%d %H:%i:%s') as reviewed_at
       FROM it_request r
       LEFT JOIN it_employees_list emp1 ON r.created_by = emp1.employee_no
       LEFT JOIN it_employees_list emp2 ON r.reviewed_by = emp2.employee_no
       WHERE r.status IN ('approved', 'rejected')
       ORDER BY r.reviewed_at DESC, r.created DESC
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );

    return new Response(
      approvalsPage(
        {
          pendingRequests: pendingRequests as Parameters<typeof approvalsPage>[0]["pendingRequests"],
          processedRequests: processedRequests as Parameters<typeof approvalsPage>[0]["processedRequests"],
          totalProcessed: Number(totalProcessed),
          currentPage: page,
          totalPages,
        },
        isAdmin,
        success,
        error,
        hasPcPwView,
        username,
        hasAuditApprover
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    logger.error("Error loading approvals page", err, { traceId });
    return new Response(
      approvalsPage(
        {
          pendingRequests: [],
          processedRequests: [],
          totalProcessed: 0,
          currentPage: 1,
          totalPages: 1,
        },
        false,
        "",
        "Error loading approval requests",
        hasPcPwView,
        username,
        hasAuditApprover
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  }
}

async function approvalsPost(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool, isAdmin, currentUsername } = ctx;
  const username = currentUsername!;

  if (!isAdmin) {
    return Response.redirect(
      "/approvals?error=" + encodeURIComponent("You do not have admin permission"),
      303
    );
  }

  const formData = await req.formData();
  const action = formData.get("action")?.toString();
  const requestId = parseInt(formData.get("request_id")?.toString() || "0");
  const rejectionReason = formData.get("rejection_reason")?.toString() || "";

  if (!requestId) {
    return Response.redirect(
      "/approvals?error=" + encodeURIComponent("Invalid request ID"),
      303
    );
  }

  const employeeNo = await getEmployeeNo(username, pool);
  if (!employeeNo) {
    return Response.redirect(
      "/approvals?error=" + encodeURIComponent("Unable to identify reviewer"),
      303
    );
  }

  try {
    if (action === "approve") {
      const [requests] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM it_request WHERE id = ? AND status = 'pending'",
        [requestId]
      );
      if (requests.length === 0) {
        return Response.redirect(
          "/approvals?error=" +
            encodeURIComponent("Request not found or already processed"),
          303
        );
      }

      const request = requests[0];
      const actionData = JSON.parse(request.action_data);

      await executeApprovedAction(request.action_type, actionData, pool);

      const reviewedBy = employeeNo === process.env.ADMIN_USERNAME ? null : employeeNo;
      await pool.query(
        `UPDATE it_request
         SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [reviewedBy, requestId]
      );

      sendApprovalDecisionNotification(
        requestId,
        request.permission_required,
        request.action_type,
        actionData,
        request.created_by,
        "approved",
        employeeNo,
        pool
      ).catch((err) =>
        console.error("Failed to send approval decision notification:", err)
      );

      logger.info("Request approved", { traceId, requestId, reviewer: employeeNo });
      return Response.redirect(
        "/approvals?success=" +
          encodeURIComponent("Request approved and action executed"),
        303
      );
    }

    if (action === "reject") {
      if (!rejectionReason) {
        return Response.redirect(
          "/approvals?error=" + encodeURIComponent("Rejection reason is required"),
          303
        );
      }

      const [requests] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM it_request WHERE id = ? AND status = 'pending'",
        [requestId]
      );
      if (requests.length === 0) {
        return Response.redirect(
          "/approvals?error=" +
            encodeURIComponent("Request not found or already processed"),
          303
        );
      }

      const request = requests[0];
      const actionData = JSON.parse(request.action_data);

      const reviewedBy = employeeNo === process.env.ADMIN_USERNAME ? null : employeeNo;
      await pool.query(
        `UPDATE it_request
         SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ?
         WHERE id = ?`,
        [reviewedBy, rejectionReason, requestId]
      );

      sendApprovalDecisionNotification(
        requestId,
        request.permission_required,
        request.action_type,
        actionData,
        request.created_by,
        "rejected",
        employeeNo,
        pool
      ).catch((err) =>
        console.error("Failed to send approval decision notification:", err)
      );

      logger.info("Request rejected", { traceId, requestId, reviewer: employeeNo });
      return Response.redirect(
        "/approvals?success=" + encodeURIComponent("Request rejected"),
        303
      );
    }

    return Response.redirect("/approvals?error=" + encodeURIComponent("Invalid action"), 303);
  } catch (err) {
    logger.error("Error processing approval action", err, { traceId, action, requestId });
    return Response.redirect(
      "/approvals?error=" +
        encodeURIComponent("An unexpected error occurred. Please try again."),
      303
    );
  }
}
