import type { Pool } from "mysql2/promise";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { isAdminUser } from "./auth";
import { sendApprovalNotification } from "./email";

/**
 * Get employee_no from username
 * For admin user, returns "admin" without database lookup
 */
export async function getEmployeeNo(
  username: string,
  pool: Pool
): Promise<string | null> {
  // Admin user returns "admin" as employee_no (bypasses database)
  if (isAdminUser(username)) {
    return "admin";
  }

  try {
    // Prefer active records, but allow any status as a fallback to avoid NULL updated_by
    const [byUserId] = await pool.query<RowDataPacket[]>(
      `SELECT employee_no
       FROM it_employees_list
       WHERE user_id = ?
       ORDER BY status DESC
       LIMIT 1`,
      [username]
    );

    if (byUserId.length > 0 && byUserId[0].employee_no) {
      return byUserId[0].employee_no as string;
    }

    // Fallback: some installs use employee_no as the username
    const [byEmployeeNo] = await pool.query<RowDataPacket[]>(
      `SELECT employee_no
       FROM it_employees_list
       WHERE employee_no = ?
       LIMIT 1`,
      [username]
    );

    if (byEmployeeNo.length > 0 && byEmployeeNo[0].employee_no) {
      return byEmployeeNo[0].employee_no as string;
    }

    return null;
  } catch (error) {
    console.error("Error getting employee_no:", error);
    return null;
  }
}

/**
 * Create an approval request in it_request table
 */
export async function createApprovalRequest(
  employeeNo: string,
  permissionRequired: string,
  actionType: string,
  actionData: Record<string, unknown>,
  ip: string | null,
  pool: Pool
): Promise<number | null> {
  try {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO it_request
       (created_by, permission_required, action_type, action_data, ip, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [employeeNo, permissionRequired, actionType, JSON.stringify(actionData), ip]
    );

    const requestId = result.insertId;

    // Send email notification to admins (fire-and-forget)
    sendApprovalNotification(requestId, permissionRequired, actionType, actionData, employeeNo, pool)
      .catch((err) => console.error("Background email notification failed:", err));

    return requestId;
  } catch (error) {
    console.error("Error creating approval request:", error);
    return null;
  }
}

/**
 * Get client IP from request.
 * Prefers the socket remote address to prevent IP spoofing via X-Forwarded-For.
 */
export function getClientIp(req: Request): string | null {
  // Prefer server socket address (cannot be spoofed)
  const serverAddr = (req as unknown as { socket?: { remoteAddress?: string } }).socket?.remoteAddress;
  if (serverAddr) {
    return serverAddr;
  }

  // Fallback to headers only if socket address unavailable (e.g. behind reverse proxy)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return null;
}


