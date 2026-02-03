import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { Pool } from "mysql2/promise";
import type { RowDataPacket } from "mysql2";
import crypto from "crypto";

// SMTP configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "25", 10);
const SMTP_SECURE = process.env.SMTP_SECURE === "true";
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "";
const SMTP_FROM = process.env.SMTP_FROM || "item-noreply@example.com";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const APPROVAL_PENDING_THRESHOLD_HOURS = parseInt(process.env.APPROVAL_PENDING_THRESHOLD_HOURS || "0", 10);

let transporter: Transporter | null = null;

/**
 * Generate a secure token for email approval links
 */
function generateApprovalToken(requestId: number): string {
  const secret = process.env.APPROVAL_SECRET || "default-secret-change-in-production";
  const timestamp = Date.now();
  const data = `${requestId}-${timestamp}`;
  const hash = crypto.createHmac("sha256", secret).update(data).digest("hex");
  return Buffer.from(`${requestId}:${timestamp}:${hash}`).toString("base64url");
}

/**
 * Verify and decode an approval token
 */
export function verifyApprovalToken(token: string): { requestId: number; timestamp: number } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const [requestIdStr, timestampStr, hash] = decoded.split(":");

    const requestId = parseInt(requestIdStr, 10);
    const timestamp = parseInt(timestampStr, 10);

    // Verify token hasn't expired (7 days)
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - timestamp > SEVEN_DAYS_MS) {
      return null;
    }

    // Verify hash
    const secret = process.env.APPROVAL_SECRET || "default-secret-change-in-production";
    const expectedHash = crypto.createHmac("sha256", secret)
      .update(`${requestId}-${timestamp}`)
      .digest("hex");

    if (hash !== expectedHash) {
      return null;
    }

    return { requestId, timestamp };
  } catch {
    return null;
  }
}

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
 * Validate SMTP configuration and test connection
 * Should be called on server startup
 */
export async function validateEmailConfig(): Promise<void> {
  if (!SMTP_HOST) {
    console.log("⚠️  Email notifications disabled: SMTP_HOST not configured");
    return;
  }

  const transport = getTransporter();
  if (!transport) {
    console.error("❌ Email configuration invalid: Failed to create SMTP transporter");
    return;
  }

  try {
    await transport.verify();
    console.log("✅ Email notifications enabled and SMTP connection verified");
    console.log(`   SMTP Host: ${SMTP_HOST}:${SMTP_PORT}`);
    console.log(`   Secure: ${SMTP_SECURE ? "Yes (TLS/SSL)" : "No"}`);
    console.log(`   From: ${SMTP_FROM}`);
  } catch (error) {
    console.error("❌ SMTP connection failed:", error instanceof Error ? error.message : error);
    console.error("   Email notifications will be disabled");
    // Set transporter to null so it won't be used
    transporter = null;
  }
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
 * Also includes global admins (users with 'global_admin' permission)
 */
export async function getAdminEmails(
  permissionRequired: string,
  pool: Pool
): Promise<string[]> {
  try {
    const { plantId, permission } = parsePermission(permissionRequired);

    // Query admins with matching permission or global_admin permission
    // Include both plant-specific admins and global admins (plant_id = 0)
    const query = plantId !== null
      ? `SELECT DISTINCT e.email
         FROM it_user_permissions p
         JOIN it_employees_list e ON p.user_id = e.user_id
         WHERE (
           (p.permission = ? AND p.role = 'admin' AND (p.plant_id = ? OR p.plant_id = 0))
           OR (p.permission = 'global_admin' AND p.role = 'admin')
         )
           AND (p.expiry_date IS NULL OR p.expiry_date >= CURDATE())
           AND e.email IS NOT NULL
           AND e.email != ''
           AND e.status = 1`
      : `SELECT DISTINCT e.email
         FROM it_user_permissions p
         JOIN it_employees_list e ON p.user_id = e.user_id
         WHERE (
           (p.permission = ? AND p.role = 'admin')
           OR (p.permission = 'global_admin' AND p.role = 'admin')
         )
           AND (p.expiry_date IS NULL OR p.expiry_date >= CURDATE())
           AND e.email IS NOT NULL
           AND e.email != ''
           AND e.status = 1`;

    const params = plantId !== null ? [permission, plantId] : [permission];
    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    const emails = rows
      .map((row) => row.email as string)
      .filter((email) => email && email.includes("@"));

    console.log(`Found ${emails.length} admin email(s) for permission: ${permissionRequired}`);
    return emails;
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
 * Get location name by ID and type
 */
async function getLocationName(
  id: number | string,
  type: 'region' | 'country' | 'plant' | 'department' | 'area' | 'sub_area',
  pool: Pool
): Promise<string | null> {
  try {
    const tableMap = {
      region: 'it_equipment_region',
      country: 'it_equipment_country',
      plant: 'it_equipment_plant',
      department: 'it_equipment_department',
      area: 'it_equipment_area',
      sub_area: 'it_equipment_sub_area'
    };

    const table = tableMap[type];
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT name FROM ${table} WHERE id = ? LIMIT 1`,
      [id]
    );

    return rows.length > 0 ? rows[0].name : null;
  } catch {
    return null;
  }
}

/**
 * Get model name and hierarchy
 */
async function getModelName(modelId: number | string, pool: Pool): Promise<string | null> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT m.name as model_name, pl.name as product_line_name, t.type_name
       FROM it_equipment_model m
       LEFT JOIN it_equipment_product_line pl ON m.product_line_id = pl.id
       LEFT JOIN it_equipment_type t ON pl.type_id = t.id
       WHERE m.id = ? LIMIT 1`,
      [modelId]
    );

    if (rows.length > 0) {
      const parts = [
        rows[0].type_name,
        rows[0].product_line_name,
        rows[0].model_name
      ].filter(Boolean);
      return parts.join(' > ');
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get vendor/supplier name
 */
async function getVendorName(id: number | string, pool: Pool): Promise<string | null> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT name FROM it_equipment_vendor WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows.length > 0 ? rows[0].name : null;
  } catch {
    return null;
  }
}

async function getSupplierName(id: number | string, pool: Pool): Promise<string | null> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT name FROM it_equipment_supplier WHERE id = ? LIMIT 1`,
      [id]
    );
    return rows.length > 0 ? rows[0].name : null;
  } catch {
    return null;
  }
}

/**
 * Format action data for email display with human-readable names
 */
async function formatActionData(actionData: Record<string, unknown>, pool: Pool): Promise<string> {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(actionData)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    let displayValue = String(value);

    // Resolve IDs to names
    try {
      if (key === 'model_id' && value) {
        const modelName = await getModelName(value as number, pool);
        displayValue = modelName || displayValue;
      } else if (key === 'vendor_id' && value) {
        const vendorName = await getVendorName(value as number, pool);
        displayValue = vendorName || displayValue;
      } else if (key === 'supplier_id' && value) {
        const supplierName = await getSupplierName(value as number, pool);
        displayValue = supplierName || displayValue;
      } else if (key === 'equipment_sub_area_id' && value) {
        const subAreaName = await getLocationName(value as number, 'sub_area', pool);
        displayValue = subAreaName || displayValue;
      } else if (key === 'assigned_to' && value) {
        const assignedName = await getEmployeeName(String(value), pool);
        displayValue = assignedName;
      }
    } catch (error) {
      // If lookup fails, use the original value
      console.error(`Error resolving ${key}:`, error);
    }

    // Format boolean values
    if (typeof value === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    }

    // Skip internal/technical fields
    if (!['id', 'created_at', 'updated_at'].includes(key)) {
      lines.push(`  ${formattedKey}: ${displayValue}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format action data as HTML table rows
 */
async function formatActionDataHTML(actionData: Record<string, unknown>, pool: Pool): Promise<string> {
  const rows: string[] = [];

  for (const [key, value] of Object.entries(actionData)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    const formattedKey = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    let displayValue = String(value);

    // Resolve IDs to names
    try {
      if (key === 'model_id' && value) {
        const modelName = await getModelName(value as number, pool);
        displayValue = modelName || displayValue;
      } else if (key === 'vendor_id' && value) {
        const vendorName = await getVendorName(value as number, pool);
        displayValue = vendorName || displayValue;
      } else if (key === 'supplier_id' && value) {
        const supplierName = await getSupplierName(value as number, pool);
        displayValue = supplierName || displayValue;
      } else if (key === 'equipment_sub_area_id' && value) {
        const subAreaName = await getLocationName(value as number, 'sub_area', pool);
        displayValue = subAreaName || displayValue;
      } else if (key === 'assigned_to' && value) {
        const assignedName = await getEmployeeName(String(value), pool);
        displayValue = assignedName;
      }
    } catch (error) {
      console.error(`Error resolving ${key}:`, error);
    }

    // Format boolean values
    if (typeof value === 'boolean') {
      displayValue = value ? 'Yes' : 'No';
    }

    // Skip internal/technical fields
    if (!['id', 'created_at', 'updated_at'].includes(key)) {
      rows.push(`
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-weight: 500;">${formattedKey}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #111827;">${displayValue}</td>
        </tr>
      `);
    }
  }

  return rows.join("");
}

/**
 * Create HTML email template with light/dark mode support
 */
function createEmailHTML(options: {
  title: string;
  emoji: string;
  headerColor: string;
  content: string;
  buttons?: Array<{ label: string; url: string; color: string }>;
}): string {
  const { title, emoji, headerColor, content, buttons = [] } = options;

  const buttonHTML = buttons.map(btn => `
    <a href="${btn.url}" style="
      display: inline-block;
      margin: 10px 10px 10px 0;
      padding: 12px 24px;
      background-color: ${btn.color};
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 14px;
    ">${btn.label}</a>
  `).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${title}</title>
  <style>
    /* Light mode (default) */
    :root {
      color-scheme: light dark;
    }

    /* Ensure compatibility with email clients */
    @media (prefers-color-scheme: dark) {
      .email-container {
        background-color: #1f2937 !important;
      }
      .email-card {
        background-color: #111827 !important;
        border-color: #374151 !important;
      }
      .email-text {
        color: #f3f4f6 !important;
      }
      .email-text-muted {
        color: #9ca3af !important;
      }
      .email-table-border {
        border-color: #374151 !important;
      }
      .email-footer {
        color: #9ca3af !important;
        border-color: #374151 !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6;" class="email-container">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb;" class="email-card">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${headerColor} 0%, ${headerColor}dd 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <div style="font-size: 48px; margin-bottom: 10px;">${emoji}</div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">${title}</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;" class="email-text">
              ${content}
            </td>
          </tr>

          <!-- Buttons -->
          ${buttons.length > 0 ? `
          <tr>
            <td style="padding: 0 30px 30px 30px;" class="email-text">
              ${buttonHTML}
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #e5e7eb; text-align: center;" class="email-footer">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                <strong>Item Inventory System</strong><br>
                This is an automated notification. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
    const formattedDetails = await formatActionData(actionData, pool);
    const formattedDetailsHTML = await formatActionDataHTML(actionData, pool);
    const approvalToken = generateApprovalToken(requestId);

    const subject = `[Item Inventory] New Approval Request - ${formattedAction}`;
    const text = `A new approval request requires your attention.

Action: ${formattedAction}
Requested By: ${createdByName}
Submitted: ${timestamp}

Details:
${formattedDetails}

👍 APPROVE THIS REQUEST:
   ${BASE_URL}/api/approvals/quick-approve?token=${approvalToken}

📋 Review all details and options:
   ${BASE_URL}/approvals

Note: The quick-approve link will expire in 7 days.

---
Item Inventory System
`;

    const html = createEmailHTML({
      title: 'New Approval Request',
      emoji: '📋',
      headerColor: '#3b82f6',
      content: `
        <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;" class="email-text">
          A new approval request requires your attention.
        </p>

        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
          <tr style="background-color: #f9fafb;">
            <td style="padding: 12px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Action</td>
            <td style="padding: 12px; color: #111827; border-bottom: 2px solid #e5e7eb;">${formattedAction}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Requested By</td>
            <td style="padding: 12px; color: #111827; border-bottom: 1px solid #e5e7eb;">${createdByName}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 12px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Submitted</td>
            <td style="padding: 12px; color: #111827; border-bottom: 1px solid #e5e7eb;">${timestamp}</td>
          </tr>
        </table>

        <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 18px;" class="email-text">Request Details</h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;" class="email-table-border">
          ${formattedDetailsHTML}
        </table>

        <p style="margin: 20px 0 10px 0; color: #6b7280; font-size: 14px;" class="email-text-muted">
          <em>Note: The quick-approve link will expire in 7 days.</em>
        </p>
      `,
      buttons: [
        { label: '✅ Approve Request', url: `${BASE_URL}/api/approvals/quick-approve?token=${approvalToken}`, color: '#10b981' },
        { label: '📋 Review Details', url: `${BASE_URL}/approvals`, color: '#6366f1' }
      ]
    });

    // Log email HTML for testing
    console.log(`\n========== EMAIL PREVIEW ==========`);
    console.log(`To: ${adminEmails.join(", ")}`);
    console.log(`Subject: ${subject}`);
    console.log(`\n--- HTML Content ---\n${html}\n`);
    console.log(`===================================\n`);

    await transport.sendMail({
      from: SMTP_FROM,
      to: adminEmails.join(", "),
      subject,
      text,
      html,
    });

    console.log(`Approval notification sent for request #${requestId} to ${adminEmails.length} admin(s)`);
  } catch (error) {
    console.error(`Failed to send approval notification for request #${requestId}:`, error);
  }
}

/**
 * Send reminder emails for pending approvals that exceed the threshold
 * This is a fire-and-forget operation - errors are logged but don't throw
 */
export async function sendPendingApprovalReminders(pool: Pool): Promise<void> {
  const transport = getTransporter();
  if (!transport || APPROVAL_PENDING_THRESHOLD_HOURS <= 0) {
    return; // SMTP not configured or threshold disabled
  }

  try {
    // Find pending requests older than the threshold
    const [pendingRequests] = await pool.query<RowDataPacket[]>(
      `SELECT id, permission_required, action_type, action_data, created_by, created
       FROM it_request
       WHERE status = 'pending'
         AND created <= DATE_SUB(NOW(), INTERVAL ? HOUR)
       ORDER BY created ASC`,
      [APPROVAL_PENDING_THRESHOLD_HOURS]
    );

    if (pendingRequests.length === 0) {
      return; // No overdue requests
    }

    console.log(`Found ${pendingRequests.length} pending approval(s) exceeding ${APPROVAL_PENDING_THRESHOLD_HOURS}h threshold`);

    // Send reminder for each pending request
    for (const request of pendingRequests) {
      const requestId = request.id as number;
      const permissionRequired = request.permission_required as string;
      const actionType = request.action_type as string;
      const actionData = typeof request.action_data === 'string'
        ? JSON.parse(request.action_data)
        : request.action_data;
      const createdBy = request.created_by as string;
      const createdAt = new Date(request.created as string);

      const adminEmails = await getAdminEmails(permissionRequired, pool);
      if (adminEmails.length === 0) {
        console.warn(`No admin emails found for pending request #${requestId}`);
        continue;
      }

      const createdByName = await getEmployeeName(createdBy, pool);
      const formattedAction = actionType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      const hoursPending = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60));
      const formattedDetails = await formatActionData(actionData, pool);
      const formattedDetailsHTML = await formatActionDataHTML(actionData, pool);
      const approvalToken = generateApprovalToken(requestId);

      const subject = `[Item Inventory] ⏰ REMINDER: ${formattedAction} - Pending ${hoursPending}h`;
      const text = `⚠️ This approval request has been pending for ${hoursPending} hours and requires your attention.

Action: ${formattedAction}
Requested By: ${createdByName}
Submitted: ${createdAt.toLocaleString()}
Time Pending: ${hoursPending} hours

Details:
${formattedDetails}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👍 APPROVE THIS REQUEST:
   ${BASE_URL}/api/approvals/quick-approve?token=${approvalToken}

📋 Review all details and options:
   ${BASE_URL}/approvals

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

---
Item Inventory System
`;

      const html = createEmailHTML({
        title: 'Pending Approval Reminder',
        emoji: '⏰',
        headerColor: '#f59e0b',
        content: `
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
            <p style="margin: 0; color: #92400e; font-weight: 600; font-size: 15px;">
              ⚠️ This approval request has been pending for <strong>${hoursPending} hours</strong> and requires your attention.
            </p>
          </div>

          <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
            <tr style="background-color: #f9fafb;">
              <td style="padding: 12px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Action</td>
              <td style="padding: 12px; color: #111827; border-bottom: 2px solid #e5e7eb;">${formattedAction}</td>
            </tr>
            <tr>
              <td style="padding: 12px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Requested By</td>
              <td style="padding: 12px; color: #111827; border-bottom: 1px solid #e5e7eb;">${createdByName}</td>
            </tr>
            <tr style="background-color: #f9fafb;">
              <td style="padding: 12px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Submitted</td>
              <td style="padding: 12px; color: #111827; border-bottom: 1px solid #e5e7eb;">${createdAt.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 12px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Time Pending</td>
              <td style="padding: 12px; color: #dc2626; font-weight: 600; border-bottom: 1px solid #e5e7eb;">${hoursPending} hours</td>
            </tr>
          </table>

          <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 18px;" class="email-text">Request Details</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;" class="email-table-border">
            ${formattedDetailsHTML}
          </table>
        `,
        buttons: [
          { label: '✅ Approve Now', url: `${BASE_URL}/api/approvals/quick-approve?token=${approvalToken}`, color: '#10b981' },
          { label: '📋 Review Details', url: `${BASE_URL}/approvals`, color: '#6366f1' }
        ]
      });

      await transport.sendMail({
        from: SMTP_FROM,
        to: adminEmails.join(", "),
        subject,
        text,
        html,
      });

      console.log(`Pending approval reminder sent for request #${requestId} to ${adminEmails.length} admin(s)`);
    }
  } catch (error) {
    console.error("Failed to send pending approval reminders:", error);
  }
}

/**
 * Send summary notification when an approval is approved or rejected
 * This is a fire-and-forget operation - errors are logged but don't throw
 */
export async function sendApprovalDecisionNotification(
  requestId: number,
  permissionRequired: string,
  actionType: string,
  actionData: Record<string, unknown>,
  createdBy: string,
  decision: 'approved' | 'rejected',
  decidedBy: string,
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
    const decidedByName = await getEmployeeName(decidedBy, pool);
    const formattedAction = actionType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const timestamp = new Date().toLocaleString();
    const decisionEmoji = decision === 'approved' ? '✅' : '❌';
    const formattedDetails = await formatActionData(actionData, pool);
    const formattedDetailsHTML = await formatActionDataHTML(actionData, pool);

    const subject = `[Item Inventory] ${decisionEmoji} ${formattedAction} ${decision === 'approved' ? 'Approved' : 'Rejected'}`;
    const text = `${decisionEmoji} An approval request has been ${decision}.

Action: ${formattedAction}
Requested By: ${createdByName}
${decision === 'approved' ? 'Approved' : 'Rejected'} By: ${decidedByName}
Decision Time: ${timestamp}

Details:
${formattedDetails}

View details at: ${BASE_URL}/approvals

---
Item Inventory System
`;

    const statusColor = decision === 'approved' ? '#10b981' : '#ef4444';
    const statusBgColor = decision === 'approved' ? '#d1fae5' : '#fee2e2';
    const statusTextColor = decision === 'approved' ? '#065f46' : '#991b1b';
    const decisionTitle = decision === 'approved' ? 'Request Approved' : 'Request Rejected';

    const html = createEmailHTML({
      title: decisionTitle,
      emoji: decisionEmoji,
      headerColor: statusColor,
      content: `
        <div style="background-color: ${statusBgColor}; border-left: 4px solid ${statusColor}; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
          <p style="margin: 0; color: ${statusTextColor}; font-weight: 600; font-size: 15px;">
            ${decisionEmoji} This approval request has been <strong>${decision}</strong>.
          </p>
        </div>

        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
          <tr style="background-color: #f9fafb;">
            <td style="padding: 12px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Action</td>
            <td style="padding: 12px; color: #111827; border-bottom: 2px solid #e5e7eb;">${formattedAction}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Requested By</td>
            <td style="padding: 12px; color: #111827; border-bottom: 1px solid #e5e7eb;">${createdByName}</td>
          </tr>
          <tr style="background-color: #f9fafb;">
            <td style="padding: 12px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">${decision === 'approved' ? 'Approved' : 'Rejected'} By</td>
            <td style="padding: 12px; color: #111827; border-bottom: 1px solid #e5e7eb;">${decidedByName}</td>
          </tr>
          <tr>
            <td style="padding: 12px; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb;">Decision Time</td>
            <td style="padding: 12px; color: #111827; border-bottom: 1px solid #e5e7eb;">${timestamp}</td>
          </tr>
        </table>

        <h3 style="margin: 30px 0 15px 0; color: #111827; font-size: 18px;" class="email-text">Request Details</h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden;" class="email-table-border">
          ${formattedDetailsHTML}
        </table>
      `,
      buttons: [
        { label: '📋 View All Approvals', url: `${BASE_URL}/approvals`, color: '#6366f1' }
      ]
    });

    await transport.sendMail({
      from: SMTP_FROM,
      to: adminEmails.join(", "),
      subject,
      text,
      html,
    });

    console.log(`Approval decision notification sent for request #${requestId} to ${adminEmails.length} admin(s)`);
  } catch (error) {
    console.error(`Failed to send approval decision notification for request #${requestId}:`, error);
  }
}
