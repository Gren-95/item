import type { Pool } from "mysql2/promise";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { isAdminUser } from "./auth";

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
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT employee_no FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
      [username]
    );

    if (users.length === 0 || !users[0].employee_no) {
      return null;
    }

    return users[0].employee_no;
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

    return result.insertId;
  } catch (error) {
    console.error("Error creating approval request:", error);
    return null;
  }
}

/**
 * Get client IP from request
 */
export function getClientIp(req: Request): string | null {
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


