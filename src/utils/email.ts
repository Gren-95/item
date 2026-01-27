import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { Pool } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";

// SMTP configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "25", 10);
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "";
const SMTP_FROM = process.env.SMTP_FROM || "item-noreply@example.com";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

let transporter: Transporter | null = null;

/**
 * Create SMTP transporter
 * Returns null if SMTP is not configured
 */
function createTransporter(): Transporter | null {
  if (!SMTP_HOST) {
    console.warn("SMTP_HOST not configured - email notifications disabled");
    return null;
  }

  try {
    const config: nodemailer.TransportOptions = {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
    } as nodemailer.TransportOptions;

    // Add authentication if configured
    if (SMTP_USER && SMTP_PASSWORD) {
      (config as any).auth = {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      };
    }

    return nodemailer.createTransport(config);
  } catch (error) {
    console.error("Failed to create SMTP transporter:", error);
    return null;
  }
}

/**
 * Get the SMTP transporter (lazy initialization)
 */
function getTransporter(): Transporter | null {
  if (transporter === null) {
    transporter = createTransporter();
  }
  return transporter;
}

/**
 * Parse permission string to extract plant_id and permission name
 * Format: "${plantId}_${permission}" or just "${permission}"
 */
function parsePermission(permissionRequired: string): { plantId: number | null; permission: string } {
  const match = permissionRequired.match(/^(\d+)_(.+)$/);
  if (match) {
    return {
      plantId: parseInt(match[1], 10),
      permission: match[2],
    };
  }
  return {
    plantId: null,
    permission: permissionRequired,
  };
}

/**
 * Get admin emails for a specific permission and plant
 * Returns emails of users with 'admin' role for the given permission
 */
export async function getAdminEmails(
  permissionRequired: string,
  pool: Pool
): Promise<string[]> {
  try {
    const { plantId, permission } = parsePermission(permissionRequired);

    // Query admins with matching permission
    // Include both plant-specific admins and global admins (plant_id = 0)
    const query = plantId !== null
      ? `SELECT DISTINCT e.email
         FROM it_user_permissions p
         JOIN it_employees_list e ON p.user_id = e.user_id
         WHERE p.permission = ?
           AND p.role = 'admin'
           AND (p.plant_id = ? OR p.plant_id = 0)
           AND (p.expiry_date IS NULL OR p.expiry_date >= CURDATE())
           AND e.email IS NOT NULL
           AND e.email != ''
           AND e.status = 1`
      : `SELECT DISTINCT e.email
         FROM it_user_permissions p
         JOIN it_employees_list e ON p.user_id = e.user_id
         WHERE p.permission = ?
           AND p.role = 'admin'
           AND (p.expiry_date IS NULL OR p.expiry_date >= CURDATE())
           AND e.email IS NOT NULL
           AND e.email != ''
           AND e.status = 1`;

    const params = plantId !== null ? [permission, plantId] : [permission];
    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    return rows
      .map((row) => row.email as string)
      .filter((email) => email && email.includes("@"));
  } catch (error) {
    console.error("Error getting admin emails:", error);
    return [];
  }
}

/**
 * Get employee name by employee number
 */
async function getEmployeeName(
  employeeNo: string,
  pool: Pool
): Promise<string> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT name, first_name, last_name FROM it_employees_list WHERE employee_no = ? LIMIT 1`,
      [employeeNo]
    );
    if (rows.length > 0) {
      return rows[0].name || `${rows[0].first_name} ${rows[0].last_name}` || employeeNo;
    }
    return employeeNo;
  } catch {
    return employeeNo;
  }
}

/**
 * Format action data for email display
 */
function formatActionData(actionData: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(actionData)) {
    if (value !== null && value !== undefined && value !== "") {
      const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      lines.push(`  ${formattedKey}: ${value}`);
    }
  }
  return lines.join("\n");
}

/**
 * Send approval notification email to admins
 * This is a fire-and-forget operation - errors are logged but don't throw
 */
export async function sendApprovalNotification(
  requestId: number,
  permissionRequired: string,
  actionType: string,
  actionData: Record<string, unknown>,
  createdBy: string,
  pool: Pool
): Promise<void> {
  const transport = getTransporter();
  if (!transport) {
    return; // SMTP not configured
  }

  try {
    const adminEmails = await getAdminEmails(permissionRequired, pool);
    if (adminEmails.length === 0) {
      console.warn(`No admin emails found for permission: ${permissionRequired}`);
      return;
    }

    const createdByName = await getEmployeeName(createdBy, pool);
    const formattedAction = actionType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const timestamp = new Date().toLocaleString();

    const subject = `[Item Inventory] Approval Request #${requestId} - ${formattedAction}`;
    const text = `A new approval request requires your attention.

Request ID: ${requestId}
Action: ${formattedAction}
Requested By: ${createdByName} (${createdBy})
Permission Required: ${permissionRequired}
Submitted: ${timestamp}

Details:
${formatActionData(actionData)}

Review at: ${BASE_URL}/approvals

---
Item Inventory System
`;

    await transport.sendMail({
      from: SMTP_FROM,
      to: adminEmails.join(", "),
      subject,
      text,
    });

    console.log(`Approval notification sent for request #${requestId} to ${adminEmails.length} admin(s)`);
  } catch (error) {
    console.error(`Failed to send approval notification for request #${requestId}:`, error);
  }
}
