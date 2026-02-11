import { serve, file } from "bun";
import path from "path";
import pool from "./db";
import { searchPage } from "./templates/search";
import { editPage } from "./templates/edit";
import { addPage } from "./templates/add";
import { locationsPage } from "./templates/locations";
import { typesPage } from "./templates/types";
import { vendorsPage } from "./templates/vendors";
import { writeOffPage } from "./templates/write-off";
import { repairsPage } from "./templates/repairs";
import { loginPage } from "./templates/login";
import { changePasswordPage } from "./templates/change-password";
import { permissionsPage } from "./templates/permissions";
import { approvalsPage } from "./templates/approvals";
import { pcPwPage } from "./templates/pc-pw";
import { printerLabelsPage } from "./templates/printer-labels";
import { labelPrintingPage } from "./templates/label-printing";
import { logger } from "./utils/logger";
import { getSessionFromRequest, createSession, deleteSession, createSessionCookie, deleteSessionCookie } from "./utils/session";
import { getEmployeeNo, createApprovalRequest, getClientIp } from "./utils/approvals";
import { validateEmailConfig, sendApprovalNotification, sendApprovalDecisionNotification, verifyApprovalToken } from "./utils/email";
import { startScheduler } from "./utils/scheduler";
import { APP_VERSION } from "./utils/version";
import { parseEstonianDate } from "./utils/date";
import {
  verifyCredentials,
  changePassword,
  hasItemLoginPermission,
  hasAdminPermission,
  hasPermission,
  hasAddEquipmentPermission,
  hasEditEquipmentPermission,
  getUserPlantId,
  hasLocationsViewPermission,
  hasLocationsAddPermission,
  hasLocationsEditPermission,
  hasLocationsDeletePermission,
  hasManageLocationsPermission,
  hasTypesViewPermission,
  hasTypesAddPermission,
  hasTypesEditPermission,
  hasTypesDeletePermission,
  hasManageTypesPermission,
  hasVendorsViewPermission,
  hasVendorsAddPermission,
  hasVendorsEditPermission,
  hasVendorsDeletePermission,
  hasManageVendorsPermission,
  hasWriteOffReasonsViewPermission,
  hasWriteOffReasonsAddPermission,
  hasWriteOffReasonsEditPermission,
  hasWriteOffReasonsDeletePermission,
  hasManageWriteOffReasonsPermission,
  hasRepairsPermission,
  hasRepairsSendPermission,
  hasPcPwViewPermission,
  hasPcPwEditPermission,
  seedFullPermissionsForUser,
  isAdminUser
} from "./utils/auth";
import {
  equipmentAddSchema,
  equipmentEditSchema,
  apiAddItemSchema,
  locationsActionSchema,
  typesActionSchema,
  vendorsActionSchema,
  suppliersActionSchema,
  writeOffReasonsActionSchema,
  printLabelSchema,
  printPrinterTagSchema,
  changePasswordSchema,
} from "./utils/validation";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { randomUUID } from "crypto";
import { runMigrations } from "./migrations/migrate";

type AddDataType = Parameters<typeof addPage>[0];
type EditDataType = Parameters<typeof editPage>[0];
type LocationsDataType = Parameters<typeof locationsPage>[0];
interface SearchResult {
  id: number;
  service_tag: string;
  type_name: string | null;
  product_line_name: string | null;
  model_name: string | null;
  vendor_name: string | null;
  assigned_to_name: string | null;
  location: string | null;
  latest_audit_date: string | null;
  plant_id: number | null;
  isReadonly?: boolean;
}

interface PcPassword {
  id: number;
  user: string;
  evocon: string | null;
  pw: string;
  status: number;
}

// Database row interfaces for type safety
interface PlantRow extends RowDataPacket {
  id: number;
  name: string;
}

interface UserRow extends RowDataPacket {
  user_id: string;
  user: string;
  name: string;
  mail: string;
  active: number;
  employee_no: string;
}

interface PermissionRow extends RowDataPacket {
  id: number;
  user_id: string;
  plant_id: number | null;
  permission: string;
  role: string | null;
  comment: string | null;
  start_date: string | null;
  end_date: string | null;
  expiry_date: string | null;
  added_by_user_id: string | null;
}

interface ApprovalRequestRow extends RowDataPacket {
  id: number;
  requester_user_id: string;
  requester_name: string;
  requested_permission: string;
  plant_id: number | null;
  plant_name: string | null;
  status: string;
  request_date: string;
  comment: string | null;
  processed_by: string | null;
  processed_date: string | null;
  processor_comment: string | null;
}

interface WriteOffReasonRow extends RowDataPacket {
  id: number;
  reason: string;
  equipment_count: number;
}

type RepairStatus = "needs_repair" | "at_supplier" | "returned" | "in_backup" | null;

interface RepairItemRow extends RowDataPacket {
  id: number;
  service_tag: string;
  model_name: string | null;
  vendor_name: string | null;
  supplier_name: string | null;
  supplier_email: string | null;
  repair_status: RepairStatus;
  repair_note: string | null;
  repair_physical_location: string | null;
  repair_sent_date: Date | null;
  repair_returned_date: Date | null;
  repair_marked_backup_date: Date | null;
  days_in_repair: number | null;
}

interface AuditPeriodRow extends RowDataPacket {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface EmployeeRow extends RowDataPacket {
  employee_no: string;
  name: string;
}

interface LocationRow extends RowDataPacket {
  id: number;
  name: string;
  parent_id?: number | null;
}

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const DEFAULT_CERT_PATH = path.join(process.cwd(), "certs", "ssl.pem");
const DEFAULT_KEY_PATH = path.join(process.cwd(), "certs", "ssl-key.pem");
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

/**
 * Execute an approved action from an approval request
 */
async function executeApprovedAction(
  actionType: string,
  actionData: Record<string, unknown>,
  pool: import("mysql2/promise").Pool
): Promise<void> {
  try {
    if (actionType === "add_location") {
      const type = actionData.type as string;
      const name = actionData.name as string;
      const parent_id = actionData.parent_id as number | null;

      const map: Record<string, { table: string; parent?: string }> = {
        region: { table: "it_equipment_region" },
        country: { table: "it_equipment_country", parent: "region_id" },
        plant: { table: "it_equipment_plant", parent: "country_id" },
        department: { table: "it_equipment_department", parent: "plant_id" },
        area: { table: "it_equipment_area", parent: "department_id" },
        sub_area: { table: "it_equipment_sub_area", parent: "area_id" },
      };

      const { table, parent } = map[type] || {};
      if (!table) throw new Error("Unknown location type");

      const cols = ["name", "status"];
      const vals: (string | number)[] = [name, 1];
      if (parent && parent_id !== null) {
        cols.push(parent);
        vals.push(parent_id);
      }
      const placeholders = cols.map(() => "?").join(", ");
      await pool.query(
        `INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders})`,
        vals
      );
    } else if (actionType === "edit_location") {
      const type = actionData.type as string;
      const id = actionData.id as number;
      const name = actionData.name as string;

      const map: Record<string, string> = {
        region: "it_equipment_region",
        country: "it_equipment_country",
        plant: "it_equipment_plant",
        department: "it_equipment_department",
        area: "it_equipment_area",
        sub_area: "it_equipment_sub_area",
      };

      const table = map[type];
      if (!table) throw new Error("Unknown location type");

      await pool.query(`UPDATE ${table} SET name = ? WHERE id = ?`, [name, id]);
    } else if (actionType === "activate_location" || actionType === "deactivate_location") {
      const type = actionData.type as string;
      const id = actionData.id as number;
      const status = actionType === "activate_location" ? 1 : 0;

      const map: Record<string, string> = {
        region: "it_equipment_region",
        country: "it_equipment_country",
        plant: "it_equipment_plant",
        department: "it_equipment_department",
        area: "it_equipment_area",
        sub_area: "it_equipment_sub_area",
      };

      const table = map[type];
      if (!table) throw new Error("Unknown location type");

      await pool.query(`UPDATE ${table} SET status = ? WHERE id = ?`, [status, id]);
    } else if (actionType === "add_equipment") {
      // Handle equipment add - extract from actionData
      const service_tag = actionData.service_tag as string;
      const vendor_id = actionData.vendor_id as number | null;
      const supplier_id = actionData.supplier_id as number | null;
      const model_id = actionData.model_id as number | null;
      const purchase_date = parseEstonianDate(actionData.purchase_date as string) || (actionData.purchase_date as string);
      const warranty_expiry_date = parseEstonianDate(actionData.warranty_expiry_date as string) || (actionData.warranty_expiry_date as string);
      const equipment_sub_area_id = actionData.equipment_sub_area_id as number | null;
      const assigned_to = actionData.assigned_to as string | null;
      const teamviewer = actionData.teamviewer as number | null;
      const cerf = actionData.cerf as number || 0;
      const ip = actionData.ip as string | null;
      const mac_addresses = actionData.mac_addresses as string | null;
      const comment = actionData.comment as string | null;
      const inventory_period_id = actionData.inventory_period_id as number | null;

      const [result] = await pool.query<import("mysql2").ResultSetHeader>(
        `INSERT INTO it_equipment (
          service_tag, vendor_id, supplier_id, model_id,
          purchase_date, warranty_expiry_date, teamviewer, cerf, ip, mac_addresses
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [service_tag, vendor_id, supplier_id, model_id, purchase_date, warranty_expiry_date, teamviewer, cerf, ip, mac_addresses]
      );

      const equipmentId = result.insertId;
      await pool.query(
        `INSERT INTO it_equipment_log (
          equipment_id, service_tag, assigned_to, equipment_sub_area_id, inventory_period_id, comment
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [equipmentId, service_tag, assigned_to, equipment_sub_area_id, inventory_period_id, comment]
      );
    } else if (actionType === "edit_equipment") {
      // Handle equipment edit - extract from actionData
      const id = actionData.id as number;

      // Get current equipment data to preserve unchanged values
      const [currentEquipment] = await pool.query<RowDataPacket[]>(
        `SELECT e.*, el.assigned_to, el.equipment_sub_area_id, el.comment, el.inventory_period_id
         FROM it_equipment e
         LEFT JOIN it_equipment_log el ON e.id = el.equipment_id
         WHERE e.id = ?
         ORDER BY el.id DESC LIMIT 1`,
        [id]
      );

      if (currentEquipment.length === 0) {
        throw new Error("Equipment not found");
      }

      const current = currentEquipment[0];
      const service_tag = current.service_tag;

      // Use new values if provided, otherwise keep existing values
      const model_id = actionData.model_id !== null && actionData.model_id !== undefined && actionData.model_id !== ''
        ? actionData.model_id as number : current.model_id;
      const vendor_id = actionData.vendor_id !== null && actionData.vendor_id !== undefined && actionData.vendor_id !== ''
        ? actionData.vendor_id as number : current.vendor_id;
      const supplier_id = actionData.supplier_id !== null && actionData.supplier_id !== undefined && actionData.supplier_id !== ''
        ? actionData.supplier_id as number : current.supplier_id;
      const purchase_date = actionData.purchase_date !== null && actionData.purchase_date !== undefined && actionData.purchase_date !== ''
        ? (parseEstonianDate(actionData.purchase_date as string) || actionData.purchase_date as string) : current.purchase_date;
      const warranty_expiry_date = actionData.warranty_expiry_date !== null && actionData.warranty_expiry_date !== undefined && actionData.warranty_expiry_date !== ''
        ? (parseEstonianDate(actionData.warranty_expiry_date as string) || actionData.warranty_expiry_date as string) : current.warranty_expiry_date;
      const cerf = actionData.cerf !== null && actionData.cerf !== undefined && actionData.cerf !== ''
        ? actionData.cerf as number : current.cerf;
      const ip = actionData.ip !== null && actionData.ip !== undefined && actionData.ip !== ''
        ? actionData.ip as string : current.ip;
      const mac_addresses = actionData.mac_addresses !== null && actionData.mac_addresses !== undefined && actionData.mac_addresses !== ''
        ? actionData.mac_addresses as string : current.mac_addresses;
      const teamviewer = actionData.teamviewer !== null && actionData.teamviewer !== undefined && actionData.teamviewer !== ''
        ? actionData.teamviewer as number : current.teamviewer;

      // Log fields - use new values if provided, otherwise keep existing
      const equipment_sub_area_id = actionData.equipment_sub_area_id !== null && actionData.equipment_sub_area_id !== undefined && actionData.equipment_sub_area_id !== ''
        ? actionData.equipment_sub_area_id as number : current.equipment_sub_area_id;
      const assigned_to = actionData.assigned_to !== null && actionData.assigned_to !== undefined && actionData.assigned_to !== ''
        ? actionData.assigned_to as string : current.assigned_to;
      const comment = actionData.comment !== null && actionData.comment !== undefined && actionData.comment !== ''
        ? actionData.comment as string : current.comment;
      const inventory_period_id = actionData.inventory_period_id !== null && actionData.inventory_period_id !== undefined && actionData.inventory_period_id !== ''
        ? actionData.inventory_period_id as number : current.inventory_period_id;

      await pool.query(
        `UPDATE it_equipment SET
          model_id = ?, vendor_id = ?, supplier_id = ?, purchase_date = ?,
          warranty_expiry_date = ?, cerf = ?, ip = ?, mac_addresses = ?,
          teamviewer = ?, updated = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [model_id, vendor_id, supplier_id, purchase_date, warranty_expiry_date, cerf, ip, mac_addresses, teamviewer, id]
      );

      await pool.query(
        `INSERT INTO it_equipment_log (
          equipment_id, service_tag, assigned_to, equipment_sub_area_id, inventory_period_id, comment
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, service_tag, assigned_to, equipment_sub_area_id, inventory_period_id, comment]
      );
    } else if (actionType === "add_write_off_reason") {
      const reason = actionData.reason as string;
      await pool.query(
        "INSERT INTO it_equipment_write_off_reason (reason) VALUES (?)",
        [reason]
      );
    } else if (actionType === "add_supplier") {
      const name = actionData.name as string;
      const email = actionData.email as string | null;
      const phone_number = actionData.phone_number as string | null;
      const address = actionData.address as string | null;
      const representative_name = actionData.representative_name as string | null;
      const sap_vendor_no = actionData.sap_vendor_no as string | null;
      const website = actionData.website as string | null;
      await pool.query(
        `INSERT INTO it_equipment_supplier (name, email, phone_number, address, representative_name, sap_vendor_no, website)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, email, phone_number, address, representative_name, sap_vendor_no, website]
      );
    } else if (actionType === "add_vendor") {
      const name = actionData.name as string;
      await pool.query(
        "INSERT INTO it_equipment_vendor (name) VALUES (?)",
        [name]
      );
    } else if (actionType === "add_type") {
      const name = actionData.name as string;
      await pool.query(
        "INSERT INTO it_equipment_type (type_name, status) VALUES (?, 1)",
        [name]
      );
    } else if (actionType === "add_product_line") {
      const name = actionData.name as string;
      const parent_id = actionData.parent_id as number;
      await pool.query(
        "INSERT INTO it_equipment_product_line (name, type_id, status) VALUES (?, ?, 1)",
        [name, parent_id]
      );
    } else if (actionType === "add_model") {
      const name = actionData.name as string;
      const parent_id = actionData.parent_id as number;
      await pool.query(
        "INSERT INTO it_equipment_model (name, product_line_id, status) VALUES (?, ?, 1)",
        [name, parent_id]
      );
    }
    // Add more action types as needed
  } catch (error) {
    console.error("Error executing approved action:", error);
    throw error;
  }
}

async function handleRequest(req: Request): Promise<Response> {
  const traceId = randomUUID();
  const url = new URL(req.url);
  const path = url.pathname;

  logger.info("Request received", { traceId, method: req.method, path });

  // Static files
  if (path === "/favicon.ico") {
    const ico = file("./public/icons/favicon.ico");
    if (await ico.exists()) {
      return new Response(ico, { headers: { "Content-Type": "image/x-icon" } });
    }
  }

  // Serve qr-scanner library files
  if (path === "/js/qr-scanner.umd.min.js") {
    const libFile = file("./node_modules/qr-scanner/qr-scanner.umd.min.js");
    if (await libFile.exists()) {
      return new Response(libFile, { headers: { "Content-Type": "application/javascript" } });
    }
    return new Response("Not found", { status: 404 });
  }
  if (path === "/js/qr-scanner-worker.min.js") {
    const workerFile = file("./node_modules/qr-scanner/qr-scanner-worker.min.js");
    if (await workerFile.exists()) {
      return new Response(workerFile, { headers: { "Content-Type": "application/javascript" } });
    }
    return new Response("Not found", { status: 404 });
  }

  if (path.startsWith("/css/") || path.startsWith("/js/") || path.startsWith("/icons/") || path === "/manifest.webmanifest") {
    const filePath = `./public${path}`;
    const staticFile = file(filePath);
    if (await staticFile.exists()) {
      return new Response(staticFile);
    }
    return new Response("Not found", { status: 404 });
  }

  // Health check endpoint
  if (path === "/health" && req.method === "GET") {
    try {
      // Check database connection
      await pool.query("SELECT 1");
      return new Response(
        JSON.stringify({
          status: "healthy",
          timestamp: new Date().toISOString(),
          traceId,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (err) {
      logger.error("Health check failed", err, { traceId });
      return new Response(
        JSON.stringify({
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          traceId,
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // Version endpoint (public, curlable)
  if (path === "/api/version" && req.method === "GET") {
    return new Response(
      JSON.stringify({
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/logout", "/repairs", "/health", "/api/version"];
  const isPublicRoute = publicRoutes.includes(path) || path.startsWith("/css/") || path.startsWith("/js/") || path.startsWith("/icons/") || path === "/manifest.webmanifest" || path === "/favicon.ico";

  // Check authentication for protected routes and get admin status
  let isAdmin = false;
  let hasPcPwView = false;
  let hasAuditApprover = false;
  let currentUsername: string | null = null;
  if (!isPublicRoute) {
    const session = getSessionFromRequest(req);
    if (!session) {
      // Redirect to login page, preserving the original URL
      const loginUrl = `/login?redirect=${encodeURIComponent(path)}`;
      return Response.redirect(loginUrl, 302);
    }
    currentUsername = session.username;
    // Check admin permission for authenticated users
    logger.info("Checking admin permission", { traceId, username: session.username });
    isAdmin = await hasAdminPermission(session.username, pool);
    logger.info("Admin permission result", { traceId, username: session.username, isAdmin });

    // Check PC passwords view permission for navigation menu
    hasPcPwView = await hasPcPwViewPermission(session.username, pool);
    logger.info("PC Passwords view permission", { traceId, username: session.username, hasPcPwView });

    // Check audit-approver permission for navigation menu
    const userPlantId = await getUserPlantId(session.username, pool);
    hasAuditApprover = isAdmin || await hasPermission(session.username, pool, "audit-approver", userPlantId, true);
    logger.info("Audit approver permission", { traceId, username: session.username, hasAuditApprover });
  }

  // Routes
  try {
    // Inventory Periods - GET (redirect to review page)
    if (path === "/inventory-periods" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/inventory-audit/review", 302);
      }

      if (!isAdmin) {
        const { errorPage } = await import("./templates/error");
        return new Response(
          errorPage(
            "Access Denied",
            "You do not have permission to access the Inventory Periods page.",
            "You need administrative permissions to manage inventory periods. Please contact your administrator if you need access.",
            403,
            isAdmin,
            hasPcPwView,
            session.username,
            hasAuditApprover
          ),
          {
            status: 403,
            headers: { "Content-Type": "text/html" }
          }
        );
      }

      // Redirect to review page with periods tab
      return Response.redirect("/inventory-audit/review#periods", 302);
    }

    // Inventory Periods - POST (create/delete)
    if (path === "/inventory-periods" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/inventory-audit/review", 302);
      }

      if (!isAdmin) {
        return Response.redirect("/inventory-audit/review?error=" + encodeURIComponent("Access denied") + "#periods", 303);
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

          // Auto-generate inventory_nr: INV-YYYY-QX-N
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
            if (!Number.isNaN(n)) {
              nextSeq = n + 1;
            }
          }

          const inventoryNr = `${prefix}-${nextSeq}`;

          await pool.query(
            `INSERT INTO it_inventory_period (inventory_nr, start_date, end_date, comment)
             VALUES (?, ?, ?, ?)`,
            [inventoryNr, startDate, endDate, comment]
          );

          return Response.redirect("/inventory-audit/review?success=" + encodeURIComponent("Inventory period created") + "#periods", 303);
        }

        if (action === "delete") {
          const id = form.get("id")?.toString();
          if (!id) {
            throw new Error("Missing period id");
          }

          // Only allow delete when not confirmed
          await pool.query(
            `DELETE FROM it_inventory_period WHERE id = ? AND confirmed_by IS NULL`,
            [id]
          );

          return Response.redirect("/inventory-audit/review?success=" + encodeURIComponent("Inventory period deleted") + "#periods", 303);
        }

        throw new Error("Unknown action");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Inventory periods action failed", err, { traceId });
        return Response.redirect("/inventory-audit/review?error=" + encodeURIComponent(errorMessage) + "#periods", 303);
      }
    }

    // Login page - GET
    if (path === "/login" && req.method === "GET") {
      // If already logged in, redirect to home
      const session = getSessionFromRequest(req);
      if (session) {
        const redirect = url.searchParams.get("redirect") || "/";
        return Response.redirect(redirect, 302);
      }

      const error = url.searchParams.get("error") || null;
      const redirect = url.searchParams.get("redirect") || null;
      return new Response(loginPage(error, redirect), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Login page - POST
    if (path === "/login" && req.method === "POST") {
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
          logger.info("Failed login attempt", { traceId, username });
          return new Response(loginPage("Invalid username or password", redirect || null), {
            headers: { "Content-Type": "text/html" },
          });
        }

        // Check if user is admin user (bypasses permission checks)
        const isAdmin = isAdminUser(username);
        if (isAdmin) {
          logger.info("Admin user logged in", { traceId, username });
        }

        // Check if user has item_login permission
        const hasPermission = await hasItemLoginPermission(username, pool);

        // On first login with no existing permissions, seed full permissions for this user
        // Skip for admin user as they don't need database permissions
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
          return new Response(loginPage("You do not have permission to access this system. Please contact your administrator.", redirect || null), {
            headers: { "Content-Type": "text/html" },
          });
        }

        // Create session
        const sessionId = createSession(username);

        logger.info("User logged in", { traceId, username, isAdmin });

        return new Response(null, {
          status: 302,
          headers: {
            "Location": redirect,
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

    // Logout route
    if (path === "/logout" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (session) {
        deleteSession(session.sessionId);
        logger.info("User logged out", { traceId, username: session.username });
      }

      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/login",
          "Set-Cookie": deleteSessionCookie(),
        },
      });
    }

    // Change password - GET
    if (path === "/change-password" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/change-password", 302);
      }

      const success = url.searchParams.get("success") || null;
      const error = url.searchParams.get("error") || null;
      return new Response(changePasswordPage(success, error, isAdmin, hasPcPwView, currentUsername, hasAuditApprover), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Change password - POST
    if (path === "/change-password" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/change-password", 302);
      }

      const formData = await req.formData();
      const rawData = {
        old_password: formData.get("old_password")?.toString() || "",
        new_password: formData.get("new_password")?.toString() || "",
        confirm_password: formData.get("confirm_password")?.toString() || "",
      };

      try {
        // Validate form data
        const validated = changePasswordSchema.parse(rawData);

        // Call password change function
        const result = await changePassword(
          session.username,
          validated.old_password,
          validated.new_password
        );

        if (result.success) {
          logger.info("Password changed successfully", { traceId, username: session.username });
          return Response.redirect("/change-password?success=" + encodeURIComponent(result.message || "Password changed successfully"), 303);
        } else {
          logger.info("Password change failed", { traceId, username: session.username, error: result.error });
          return Response.redirect("/change-password?error=" + encodeURIComponent(result.error || "Password change failed"), 303);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Invalid input. Please check your entries.";
        logger.error("Password change validation error", err, { traceId, username: session.username });
        return Response.redirect("/change-password?error=" + encodeURIComponent(errorMessage), 303);
      }
    }

    // Permissions page - GET
    if (path === "/permissions" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/permissions", 302);
      }

      const success = url.searchParams.get("success") || "";
      const error = url.searchParams.get("error") || "";

      // If not admin, show insufficient permissions message without loading data
      if (!isAdmin) {
        return new Response(
          permissionsPage(
            { users: [], permissions: [] },
            false,
            hasPcPwView,
            "",
            "",
            session.username,
            hasAuditApprover
          ),
          {
            headers: { "Content-Type": "text/html" },
          }
        );
      }

      try {
        // Get all users from IT employees list (active only)
        const [users] = await pool.query<RowDataPacket[]>(
          "SELECT user_id, user_id AS user, name, email as mail, status as active, employee_no FROM `it_employees_list` WHERE status = 1 ORDER BY name"
        );

        // Get all permissions (plant-based) from it_user_permissions
        const [permissions] = await pool.query<RowDataPacket[]>(
          `SELECT id, user_id, plant_id, permission, role, comment, 
                  DATE_FORMAT(created, '%Y-%m-%d') as start_date,
                  DATE_FORMAT(updated, '%Y-%m-%d') as end_date,
                  DATE_FORMAT(expiry_date, '%Y-%m-%d') as expiry_date,
                  added_by_user_id
           FROM it_user_permissions
           ORDER BY user_id, permission, role`
        );

        // Get all plants for mapping plant_id to plant name
        const [plants] = await pool.query<PlantRow[]>(
          "SELECT id, name FROM it_equipment_plant WHERE status = 1 ORDER BY name"
        );

        // Create plant mapping as plain object for serialization
        const plantMap: Record<number, string> = {};
        const plantsList: Array<{ id: number; name: string }> = [];
        plants.forEach((plant) => {
          plantMap[plant.id] = plant.name;
          plantsList.push({ id: plant.id, name: plant.name });
        });

        return new Response(
          permissionsPage(
            {
              users: users as Parameters<typeof permissionsPage>[0]["users"],
              permissions: permissions as Parameters<typeof permissionsPage>[0]["permissions"],
              plantMap: plantMap,
              plants: plantsList,
            },
            isAdmin,
            hasPcPwView,
            success,
            error,
            session.username,
            hasAuditApprover
          ),
          {
            headers: { "Content-Type": "text/html" },
          }
        );
      } catch (err) {
        logger.error("Error loading permissions page", err, { traceId });
        return new Response(
          permissionsPage({ users: [], permissions: [] }, false, hasPcPwView, "", "Error loading permissions", session.username, hasAuditApprover),
          {
            headers: { "Content-Type": "text/html" },
          }
        );
      }
    }

    // Permissions page - POST
    if (path === "/permissions" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/permissions", 302);
      }

      if (!isAdmin) {
        return Response.redirect("/permissions?error=" + encodeURIComponent("You do not have admin permission"), 303);
      }

      const formData = await req.formData();
      const action = formData.get("action")?.toString();

      try {
        if (action === "add") {
          const user_id = formData.get("user_id")?.toString() || "";
          const plant_id_raw = formData.get("plant_id")?.toString() ?? "";
          const access_key = formData.get("access_key")?.toString() || "";
          const value = formData.get("value")?.toString() || "";
          const comment = formData.get("comment")?.toString() || "";
          const expiry_date_raw = formData.get("expiry_date")?.toString() || "";

          const plant_id = plant_id_raw === "" ? NaN : Number(plant_id_raw);
          const permission = access_key.trim().toLowerCase();
          const expiry_date = expiry_date_raw ? parseEstonianDate(expiry_date_raw) : null;
          const added_by_user_id = session.username;

          // Detailed logging for debugging
          logger.info("Permission form submission", {
            traceId,
            user_id,
            plant_id_raw,
            plant_id,
            access_key,
            value,
            comment,
            expiry_date,
            hasUserId: !!user_id,
            hasAccessKey: !!access_key,
            hasValue: !!value,
            hasComment: !!comment,
            plantIdIsNaN: Number.isNaN(plant_id)
          });

          if (!user_id || !access_key || !value || !comment || Number.isNaN(plant_id)) {
            const missingFields = [];
            if (!user_id) missingFields.push("User");
            if (Number.isNaN(plant_id)) missingFields.push("Plant");
            if (!access_key) missingFields.push("Permission");
            if (!value) missingFields.push("Role");
            if (!comment) missingFields.push("Comment");

            const errorMsg = `Missing required fields: ${missingFields.join(", ")}`;
            logger.warn("Permission validation failed", { traceId, errorMsg, missingFields });
            return Response.redirect("/permissions?error=" + encodeURIComponent(errorMsg), 303);
          }

          // Validate: login permission must be global (plant_id = 0)
          if (permission === "login" && plant_id !== 0) {
            return Response.redirect("/permissions?error=" + encodeURIComponent("Login permission must be global (plant_id=0)"), 303);
          }

          // Validate: global_admin permission must be global (plant_id = 0)
          if (permission === "global_admin" && plant_id !== 0) {
            return Response.redirect("/permissions?error=" + encodeURIComponent("global_admin permission must be global (plant_id=0)"), 303);
          }

          await pool.query(
            `INSERT INTO it_user_permissions
             (user_id, plant_id, permission, role, comment, expiry_date, added_by_user_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [user_id, plant_id, access_key, value, comment, expiry_date, added_by_user_id]
          );

          // Log to permission audit trail
          const clientIp = getClientIp(req);
          await pool.query(
            `INSERT INTO it_permission_audit_log
             (action, user_id, plant_id, permission, role, expiry_date, comment, changed_by, ip_address)
             VALUES ('add', ?, ?, ?, ?, ?, ?, ?, ?)`,
            [user_id, plant_id, access_key, value, expiry_date, comment, session.username, clientIp]
          ).catch(err => logger.error("Failed to log permission audit", err, { traceId }));

          logger.info("Permission added", { traceId, user_id, access_key, value, expiry_date, added_by_user_id });
          return Response.redirect("/permissions?success=" + encodeURIComponent("Permission added successfully"), 303);
        } else if (action === "delete") {
          const permission_id = parseInt(formData.get("permission_id")?.toString() || "0");

          if (!permission_id) {
            return Response.redirect("/permissions?error=" + encodeURIComponent("Invalid permission ID"), 303);
          }

          // Get permission details before deletion for audit log
          const [permToDelete] = await pool.query<RowDataPacket[]>(
            "SELECT user_id, plant_id, permission, role, expiry_date, comment FROM it_user_permissions WHERE id = ?",
            [permission_id]
          );

          await pool.query("DELETE FROM it_user_permissions WHERE id = ?", [permission_id]);

          // Log to permission audit trail
          if (permToDelete.length > 0) {
            const perm = permToDelete[0];
            const clientIp = getClientIp(req);
            await pool.query(
              `INSERT INTO it_permission_audit_log
               (action, user_id, plant_id, permission, old_role, old_expiry_date, comment, changed_by, ip_address)
               VALUES ('delete', ?, ?, ?, ?, ?, ?, ?, ?)`,
              [perm.user_id, perm.plant_id, perm.permission, perm.role, perm.expiry_date, perm.comment, session.username, clientIp]
            ).catch(err => logger.error("Failed to log permission audit", err, { traceId }));
          }

          logger.info("Permission deleted", { traceId, permission_id });
          return Response.redirect("/permissions?success=" + encodeURIComponent("Permission deleted successfully"), 303);
        } else {
          return Response.redirect("/permissions?error=" + encodeURIComponent("Invalid action"), 303);
        }
      } catch (err) {
        logger.error("Error processing permission action", err, { traceId, action });
        const errorMessage = err instanceof Error ? err.message : "An error occurred";
        return Response.redirect("/permissions?error=" + encodeURIComponent(errorMessage), 303);
      }
    }

    // Quick approve API endpoint (from email link)
    if (path === "/api/approvals/quick-approve" && req.method === "GET") {
      const traceId = crypto.randomUUID();
      logger.info("Quick approve request", { traceId, method: req.method, path });

      try {
        const token = url.searchParams.get("token");
        if (!token) {
          return Response.redirect("/approvals?error=" + encodeURIComponent("Invalid approval link"), 303);
        }

        // Verify token
        const verified = verifyApprovalToken(token);
        if (!verified) {
          return Response.redirect("/approvals?error=" + encodeURIComponent("Invalid or expired approval link"), 303);
        }

        const { requestId } = verified;

        // Check if user is logged in
        const session = getSessionFromRequest(req);
        if (!session) {
          return Response.redirect(`/login?redirect=/api/approvals/quick-approve?token=${encodeURIComponent(token)}`, 302);
        }

        // Get user info
        const employeeNo = await getEmployeeNo(session.username, pool);
        if (!employeeNo) {
          return Response.redirect("/approvals?error=" + encodeURIComponent("Unable to verify your identity"), 303);
        }

        // Check if user has admin permission
        const userIsAdmin = await hasAdminPermission(session.username, pool);
        if (!userIsAdmin) {
          return Response.redirect("/approvals?error=" + encodeURIComponent("You do not have permission to approve requests"), 303);
        }

        // Get the approval request
        const [requests] = await pool.query<RowDataPacket[]>(
          `SELECT id, status, action_type, action_data, permission_required, created_by
           FROM it_request
           WHERE id = ? LIMIT 1`,
          [requestId]
        );

        if (requests.length === 0) {
          return Response.redirect("/approvals?error=" + encodeURIComponent("Approval request not found"), 303);
        }

        const request = requests[0];

        // Check if already processed
        if (request.status !== "pending") {
          return Response.redirect("/approvals?info=" + encodeURIComponent("This request has already been " + request.status), 303);
        }

        // Parse action data
        const actionData = typeof request.action_data === 'string'
          ? JSON.parse(request.action_data)
          : request.action_data;

        // Execute the approved action (same as regular approve)
        await executeApprovedAction(request.action_type, actionData, pool);

        // Approve the request
        // Admin user doesn't have an entry in it_employees_list, so set reviewed_by to NULL for admin
        const reviewedBy = employeeNo === process.env.ADMIN_USERNAME ? null : employeeNo;
        await pool.query(
          `UPDATE it_request
           SET status = 'approved', reviewed_by = ?, reviewed_at = NOW()
           WHERE id = ?`,
          [reviewedBy, requestId]
        );

        logger.info("Quick approval processed", { traceId, requestId, approvedBy: employeeNo });

        sendApprovalDecisionNotification(
          requestId,
          request.permission_required,
          request.action_type,
          actionData,
          request.created_by,
          'approved',
          employeeNo,
          pool
        ).catch((err) => console.error("Failed to send approval decision notification:", err));

        return Response.redirect("/approvals?success=" + encodeURIComponent("Request approved successfully"), 303);
      } catch (error) {
        logger.error("Quick approve failed", error, { traceId });
        return Response.redirect("/approvals?error=" + encodeURIComponent("Failed to process approval"), 303);
      }
    }

    // Search suggestions API for global search bar
    if (path === "/api/search-suggestions" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return new Response(JSON.stringify([]), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const query = url.searchParams.get("q") || "";
      if (query.trim().length < 2) {
        return new Response(JSON.stringify([]), {
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        const searchTerm = `%${query.trim()}%`;
        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT DISTINCT
            e.id,
            e.service_tag,
            t.type_name,
            m.name as model_name,
            CONCAT(emp.first_name, ' ', emp.last_name) as assigned_to_name
          FROM it_equipment e
          LEFT JOIN it_equipment_model m ON e.model_id = m.id
          LEFT JOIN it_equipment_product_line pl ON m.product_line_id = pl.id
          LEFT JOIN it_equipment_type t ON pl.type_id = t.id
          LEFT JOIN (
            SELECT l1.* FROM it_equipment_log l1
            INNER JOIN (
              SELECT equipment_id, MAX(created) as max_created
              FROM it_equipment_log
              GROUP BY equipment_id
            ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
          ) log ON e.id = log.equipment_id
          LEFT JOIN it_employees_list emp ON log.assigned_to = emp.employee_no
          WHERE
            e.service_tag LIKE ?
            OR t.type_name LIKE ?
            OR m.name LIKE ?
            OR CONCAT(emp.first_name, ' ', emp.last_name) LIKE ?
          ORDER BY e.service_tag
          LIMIT 5`,
          [searchTerm, searchTerm, searchTerm, searchTerm]
        );

        return new Response(JSON.stringify(rows), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        logger.error("Search suggestions failed", error, { traceId });
        return new Response(JSON.stringify([]), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Approvals page - GET
    if (path === "/approvals" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/approvals", 302);
      }

      if (!isAdmin) {
        return new Response(
          approvalsPage(
            { pendingRequests: [], processedRequests: [], totalProcessed: 0, currentPage: 1, totalPages: 1 },
            false,
            "",
            "",
            hasPcPwView,
            session.username,
            hasAuditApprover
          ),
          {
            headers: { "Content-Type": "text/html" },
          }
        );
      }

      const success = url.searchParams.get("success") || "";
      const error = url.searchParams.get("error") || "";
      const page = parseInt(url.searchParams.get("page") || "1", 10);
      const pageSize = 20;

      try {
        // Get pending requests (always at top, no pagination)
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

        // Get processed requests (approved/rejected) with pagination
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
              totalPages: totalPages,
            },
            isAdmin,
            success,
            error,
            hasPcPwView,
            session.username,
            hasAuditApprover
          ),
          {
            headers: { "Content-Type": "text/html" },
          }
        );
      } catch (err) {
        logger.error("Error loading approvals page", err, { traceId });
        return new Response(
          approvalsPage(
            { pendingRequests: [], processedRequests: [], totalProcessed: 0, currentPage: 1, totalPages: 1 },
            false,
            "",
            "Error loading approval requests",
            hasPcPwView,
            session.username,
            hasAuditApprover
          ),
          {
            headers: { "Content-Type": "text/html" },
          }
        );
      }
    }

    // ===== Unified Label Printing page =====
    // GET /labels
    if (path === "/labels" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/labels", 302);
      }

      const activeTab = url.searchParams.get("tab") || "service-tag";
      const success = url.searchParams.get("success") || "";
      const error = url.searchParams.get("error") || "";

      logger.info("Label Printing page access", { traceId, username: session.username, tab: activeTab });
      const isAdmin = await hasAdminPermission(session.username, pool);
      const hasPcPwView = await hasPcPwViewPermission(session.username, pool);
      const hasPcPwEdit = await hasPcPwEditPermission(session.username, pool);
      const userPlantId = await getUserPlantId(session.username, pool);
      const hasAuditApprover = isAdmin || await hasPermission(session.username, pool, "audit-approver", userPlantId, true);

      let passwords: PcPassword[] = [];
      if (hasPcPwView) {
        try {
          const [rows] = await pool.query<RowDataPacket[]>(
            "SELECT id, user, evocon, pw, status FROM it_pc_pw ORDER BY user"
          );
          passwords = rows as PcPassword[];
        } catch (err) {
          logger.error("Error loading PC passwords for label printing", err, { traceId });
        }
      }

      return new Response(
        labelPrintingPage(
          { passwords, hasPcPwView, hasPcPwEdit: hasPcPwEdit },
          isAdmin,
          hasPcPwView,
          session.username,
          hasAuditApprover,
          activeTab,
          success,
          error
        ),
        { headers: { "Content-Type": "text/html" } }
      );
    }

    // POST /labels (PC Password add/delete within unified page)
    if (path === "/labels" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/labels", 302);
      }

      const hasEdit = await hasPcPwEditPermission(session.username, pool);
      if (!hasEdit) {
        return Response.redirect("/labels?tab=passwords&error=" + encodeURIComponent("You do not have permission to edit PC passwords"), 303);
      }

      const formData = await req.formData();
      const action = formData.get("action")?.toString();

      try {
        if (action === "add") {
          const user = formData.get("user")?.toString() || "";
          const evocon = formData.get("evocon")?.toString() || null;
          const pw = formData.get("pw")?.toString() || "";
          const status = parseInt(formData.get("status")?.toString() || "1");

          if (!user || !pw) {
            return Response.redirect("/labels?tab=passwords&error=" + encodeURIComponent("User and password are required"), 303);
          }

          await pool.query(
            "INSERT INTO it_pc_pw (user, evocon, pw, status) VALUES (?, ?, ?, ?)",
            [user, evocon, pw, status]
          );

          logger.info("PC password added (via labels)", { traceId, user });
          return Response.redirect("/labels?tab=passwords&success=" + encodeURIComponent("Password added successfully"), 303);
        } else if (action === "delete") {
          const id = parseInt(formData.get("id")?.toString() || "0");

          if (!id) {
            return Response.redirect("/labels?tab=passwords&error=" + encodeURIComponent("Invalid password ID"), 303);
          }

          await pool.query("DELETE FROM it_pc_pw WHERE id = ?", [id]);

          logger.info("PC password deleted (via labels)", { traceId, id });
          return Response.redirect("/labels?tab=passwords&success=" + encodeURIComponent("Password deleted successfully"), 303);
        } else {
          return Response.redirect("/labels?tab=passwords&error=" + encodeURIComponent("Invalid action"), 303);
        }
      } catch (err) {
        logger.error("Error processing PC password action (via labels)", err, { traceId, action });
        const errorMessage = err instanceof Error ? err.message : "An error occurred";
        return Response.redirect("/labels?tab=passwords&error=" + encodeURIComponent(errorMessage), 303);
      }
    }

    // API: Search equipment by service tag
    if (path === "/api/equipment/search-by-tag" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const tag = url.searchParams.get("tag")?.trim();
      if (!tag) {
        return new Response(JSON.stringify({ success: false, message: "Missing tag parameter" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT
            e.id,
            e.service_tag,
            m.name AS model_name,
            t.type_name AS type_name,
            emp.name AS assigned_to_name,
            e.is_written_off,
            CONCAT_WS(' > ', p.name, c.name, d.name, ar.name, sa.name) AS location
           FROM it_equipment e
           LEFT JOIN it_equipment_model m ON e.model_id = m.id
           LEFT JOIN it_equipment_product_line pl ON m.product_line_id = pl.id
           LEFT JOIN it_equipment_type t ON pl.type_id = t.id
           LEFT JOIN (
             SELECT l1.equipment_id, l1.assigned_to, l1.equipment_sub_area_id
             FROM it_equipment_log l1
             INNER JOIN (
               SELECT equipment_id, MAX(created) as max_created
               FROM it_equipment_log
               GROUP BY equipment_id
             ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
           ) log ON e.id = log.equipment_id
           LEFT JOIN it_employees_list emp ON log.assigned_to = emp.employee_no
           LEFT JOIN it_equipment_sub_area sa ON log.equipment_sub_area_id = sa.id
           LEFT JOIN it_equipment_area ar ON sa.area_id = ar.id
           LEFT JOIN it_equipment_department d ON ar.department_id = d.id
           LEFT JOIN it_equipment_plant p ON d.plant_id = p.id
           LEFT JOIN it_equipment_country c ON p.country_id = c.id
           WHERE e.service_tag LIKE ?
           ORDER BY e.service_tag ASC
           LIMIT 1`,
          [`%${tag}%`]
        );

        if (rows.length === 0) {
          return new Response(JSON.stringify({ success: false, message: "Not found" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const item = rows[0];
        item.status = item.is_written_off ? "Written Off" : "Active";

        return new Response(JSON.stringify({ success: true, data: item }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        logger.error("Error searching equipment by tag", err, { traceId });
        return new Response(JSON.stringify({ success: false, message: "Database error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Redirect old /pc-pw GET to /labels?tab=passwords
    if (path === "/pc-pw" && req.method === "GET") {
      const success = url.searchParams.get("success") || "";
      const error = url.searchParams.get("error") || "";
      let redirectUrl = "/labels?tab=passwords";
      if (success) redirectUrl += "&success=" + encodeURIComponent(success);
      if (error) redirectUrl += "&error=" + encodeURIComponent(error);
      return Response.redirect(redirectUrl, 302);
    }

    // PC Passwords page - POST (legacy, redirect to /labels)
    if (path === "/pc-pw" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/labels?tab=passwords", 302);
      }

      const hasEdit = await hasPcPwEditPermission(session.username, pool);
      if (!hasEdit) {
        return Response.redirect("/labels?tab=passwords&error=" + encodeURIComponent("You do not have permission to edit PC passwords"), 303);
      }

      const formData = await req.formData();
      const action = formData.get("action")?.toString();

      try {
        if (action === "add") {
          const user = formData.get("user")?.toString() || "";
          const evocon = formData.get("evocon")?.toString() || null;
          const pw = formData.get("pw")?.toString() || "";
          const status = parseInt(formData.get("status")?.toString() || "1");

          if (!user || !pw) {
            return Response.redirect("/labels?tab=passwords&error=" + encodeURIComponent("User and password are required"), 303);
          }

          await pool.query(
            "INSERT INTO it_pc_pw (user, evocon, pw, status) VALUES (?, ?, ?, ?)",
            [user, evocon, pw, status]
          );

          logger.info("PC password added", { traceId, user });
          return Response.redirect("/labels?tab=passwords&success=" + encodeURIComponent("Password added successfully"), 303);
        } else if (action === "delete") {
          const id = parseInt(formData.get("id")?.toString() || "0");

          if (!id) {
            return Response.redirect("/labels?tab=passwords&error=" + encodeURIComponent("Invalid password ID"), 303);
          }

          await pool.query("DELETE FROM it_pc_pw WHERE id = ?", [id]);

          logger.info("PC password deleted", { traceId, id });
          return Response.redirect("/labels?tab=passwords&success=" + encodeURIComponent("Password deleted successfully"), 303);
        } else {
          return Response.redirect("/labels?tab=passwords&error=" + encodeURIComponent("Invalid action"), 303);
        }
      } catch (err) {
        logger.error("Error processing PC password action", err, { traceId, action });
        const errorMessage = err instanceof Error ? err.message : "An error occurred";
        return Response.redirect("/labels?tab=passwords&error=" + encodeURIComponent(errorMessage), 303);
      }
    }

    // PC Passwords barcode printing endpoint - POST
    if (path === "/api/pc-pw/print" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const hasView = await hasPcPwViewPermission(session.username, pool);
      if (!hasView) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        const body = await req.json();
        const { user, evocon, password, printer } = body;

        if (!user || !password || !printer) {
          return new Response(JSON.stringify({ error: "Missing required fields: user, password, printer" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Forward request to external printing service
        const printResponse = await fetch("http://eeprt01/Integration/PcPwSticker/Execute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user,
            evocon: evocon || "",
            password,
            printer,
          }),
        });

        const printResult = await printResponse.text();

        if (printResponse.ok) {
          logger.info("PC password print job sent", { traceId, user, printer });
          return new Response(JSON.stringify({ success: true, message: "Print job sent successfully", result: printResult }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } else {
          logger.error("PC password print job failed", { traceId, user, printer, status: printResponse.status });
          return new Response(JSON.stringify({ error: "Print job failed", result: printResult }), {
            status: printResponse.status,
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch (err) {
        logger.error("Error sending PC password print job", err, { traceId });
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Redirect old /printer-labels to /labels?tab=printer
    if (path === "/printer-labels" && req.method === "GET") {
      const success = url.searchParams.get("success") || "";
      const error = url.searchParams.get("error") || "";
      let redirectUrl = "/labels?tab=printer";
      if (success) redirectUrl += "&success=" + encodeURIComponent(success);
      if (error) redirectUrl += "&error=" + encodeURIComponent(error);
      return Response.redirect(redirectUrl, 302);
    }

    // API endpoint to check if user needs approval for an action
    if (path === "/api/check-permission" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        const permission = url.searchParams.get("permission");
        if (!permission) {
          return new Response(JSON.stringify({ error: "Permission parameter required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const userPlantId = await getUserPlantId(session.username, pool);
        const hasPermissionResult = await hasPermission(session.username, pool, permission, userPlantId);

        return new Response(JSON.stringify({
          hasPermission: hasPermissionResult,
          requiresApproval: !hasPermissionResult,
          message: hasPermissionResult
            ? "You have permission to perform this action"
            : "This action requires approval from an administrator"
        }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        logger.error("Error checking permission", err, { traceId });
        return new Response(JSON.stringify({ error: "Failed to check permission" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // API endpoint to get permission expiry information
    if (path === "/api/permissions/expiring" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin permission required" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        const days = parseInt(url.searchParams.get("days") || "30");

        // Get permissions expiring within the specified days
        const [expiringPermissions] = await pool.query<RowDataPacket[]>(`
          SELECT
            p.id,
            p.user_id,
            p.plant_id,
            p.permission,
            p.role,
            p.comment,
            p.expiry_date,
            p.added_by_user_id,
            pl.name as plant_name,
            e.name as user_name,
            DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry
          FROM it_user_permissions p
          LEFT JOIN it_equipment_plant pl ON p.plant_id = pl.id
          LEFT JOIN it_employees_list e ON p.user_id = e.user_id
          WHERE p.expiry_date IS NOT NULL
            AND p.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
          ORDER BY p.expiry_date ASC
        `, [days]);

        // Get recently expired permissions
        const [expiredPermissions] = await pool.query<RowDataPacket[]>(`
          SELECT
            p.id,
            p.user_id,
            p.plant_id,
            p.permission,
            p.role,
            p.comment,
            p.expiry_date,
            p.added_by_user_id,
            pl.name as plant_name,
            e.name as user_name,
            DATEDIFF(CURDATE(), p.expiry_date) as days_since_expiry
          FROM it_user_permissions p
          LEFT JOIN it_equipment_plant pl ON p.plant_id = pl.id
          LEFT JOIN it_employees_list e ON p.user_id = e.user_id
          WHERE p.expiry_date IS NOT NULL
            AND p.expiry_date < CURDATE()
          ORDER BY p.expiry_date DESC
          LIMIT 50
        `);

        return new Response(JSON.stringify({
          expiring: expiringPermissions,
          expired: expiredPermissions
        }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        logger.error("Error fetching expiring permissions", err, { traceId });
        return new Response(JSON.stringify({ error: "Failed to fetch expiring permissions" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // API endpoint to get permission audit log
    if (path === "/api/permissions/audit-log" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Admin permission required" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "100"), 500);
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const userId = url.searchParams.get("user_id");

        let query = `
          SELECT
            l.*,
            pl.name as plant_name,
            e1.name as user_name,
            e2.name as changed_by_name
          FROM it_permission_audit_log l
          LEFT JOIN it_equipment_plant pl ON l.plant_id = pl.id
          LEFT JOIN it_employees_list e1 ON l.user_id = e1.user_id
          LEFT JOIN it_employees_list e2 ON l.changed_by = e2.user_id
        `;
        const params: (string | number)[] = [];

        if (userId) {
          query += " WHERE l.user_id = ?";
          params.push(userId);
        }

        query += " ORDER BY l.created DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        const [auditLog] = await pool.query<RowDataPacket[]>(query, params);

        // Get total count
        let countQuery = "SELECT COUNT(*) as total FROM it_permission_audit_log";
        const countParams: string[] = [];
        if (userId) {
          countQuery += " WHERE user_id = ?";
          countParams.push(userId);
        }
        const [countResult] = await pool.query<RowDataPacket[]>(countQuery, countParams);
        const total = countResult[0]?.total || 0;

        return new Response(JSON.stringify({
          data: auditLog,
          total,
          limit,
          offset
        }), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        logger.error("Error fetching permission audit log", err, { traceId });
        return new Response(JSON.stringify({ error: "Failed to fetch audit log" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Approvals page - POST (approve/reject)
    if (path === "/approvals" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/approvals", 302);
      }

      if (!isAdmin) {
        return Response.redirect("/approvals?error=" + encodeURIComponent("You do not have admin permission"), 303);
      }

      const formData = await req.formData();
      const action = formData.get("action")?.toString();
      const requestId = parseInt(formData.get("request_id")?.toString() || "0");
      const rejectionReason = formData.get("rejection_reason")?.toString() || "";

      if (!requestId) {
        return Response.redirect("/approvals?error=" + encodeURIComponent("Invalid request ID"), 303);
      }

      const employeeNo = await getEmployeeNo(session.username, pool);
      if (!employeeNo) {
        return Response.redirect("/approvals?error=" + encodeURIComponent("Unable to identify reviewer"), 303);
      }

      try {
        if (action === "approve") {
          // Get the request to execute the action
          const [requests] = await pool.query<RowDataPacket[]>(
            "SELECT * FROM it_request WHERE id = ? AND status = 'pending'",
            [requestId]
          );

          if (requests.length === 0) {
            return Response.redirect("/approvals?error=" + encodeURIComponent("Request not found or already processed"), 303);
          }

          const request = requests[0];
          const actionData = JSON.parse(request.action_data);

          // Execute the approved action based on action_type
          await executeApprovedAction(request.action_type, actionData, pool);

          // Update request status
          // Admin user doesn't have an entry in it_employees_list, so set reviewed_by to NULL for admin
          const reviewedBy = employeeNo === process.env.ADMIN_USERNAME ? null : employeeNo;
          await pool.query(
            `UPDATE it_request
             SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [reviewedBy, requestId]
          );

          // Send decision notification (fire-and-forget)
          sendApprovalDecisionNotification(
            requestId,
            request.permission_required,
            request.action_type,
            actionData,
            request.created_by,
            'approved',
            employeeNo,
            pool
          ).catch((err) => console.error("Failed to send approval decision notification:", err));

          logger.info("Request approved", { traceId, requestId, reviewer: employeeNo });
          return Response.redirect("/approvals?success=" + encodeURIComponent("Request approved and action executed"), 303);
        } else if (action === "reject") {
          if (!rejectionReason) {
            return Response.redirect("/approvals?error=" + encodeURIComponent("Rejection reason is required"), 303);
          }

          // Get the request data before updating
          const [requests] = await pool.query<RowDataPacket[]>(
            "SELECT * FROM it_request WHERE id = ? AND status = 'pending'",
            [requestId]
          );

          if (requests.length === 0) {
            return Response.redirect("/approvals?error=" + encodeURIComponent("Request not found or already processed"), 303);
          }

          const request = requests[0];
          const actionData = JSON.parse(request.action_data);

          // Admin user doesn't have an entry in it_employees_list, so set reviewed_by to NULL for admin
          const reviewedBy = employeeNo === process.env.ADMIN_USERNAME ? null : employeeNo;
          await pool.query(
            `UPDATE it_request
             SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = ?
             WHERE id = ?`,
            [reviewedBy, rejectionReason, requestId]
          );

          // Send decision notification (fire-and-forget)
          sendApprovalDecisionNotification(
            requestId,
            request.permission_required,
            request.action_type,
            actionData,
            request.created_by,
            'rejected',
            employeeNo,
            pool
          ).catch((err) => console.error("Failed to send approval decision notification:", err));

          logger.info("Request rejected", { traceId, requestId, reviewer: employeeNo });
          return Response.redirect("/approvals?success=" + encodeURIComponent("Request rejected"), 303);
        } else {
          return Response.redirect("/approvals?error=" + encodeURIComponent("Invalid action"), 303);
        }
      } catch (err) {
        logger.error("Error processing approval action", err, { traceId, action, requestId });
        const errorMessage = err instanceof Error ? err.message : "An error occurred";
        return Response.redirect("/approvals?error=" + encodeURIComponent(errorMessage), 303);
      }
    }

    // Home / Search page
    if (path === "/" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/", 302);
      }

      // Get user plant ID for filtering results
      const userPlantId = await getUserPlantId(session.username, pool);

      // Search permission removed - all logged-in users can search

      const query = url.searchParams.get("q") || url.searchParams.get("serial") || "";

      if (query && query.trim()) {
        const trimmed = query.trim();
        logger.info("Search request", { traceId, query: trimmed });

        // Comprehensive search query covering all fields
        const searchTerm = `%${trimmed}%`;
        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT DISTINCT
            e.id,
            e.service_tag,
            t.type_name,
            pl.name as product_line_name,
            m.name as model_name,
            v.name as vendor_name,
            CONCAT(emp.first_name, ' ', emp.last_name) as assigned_to_name,
            CONCAT_WS(' > ',
              r.name,
              c.name,
              p.name,
              d.name,
              a.name,
              sa.name
            ) as location,
            log.created as latest_audit_date,
            p.id as plant_id
          FROM it_equipment e
          LEFT JOIN it_equipment_model m ON e.model_id = m.id
          LEFT JOIN it_equipment_product_line pl ON m.product_line_id = pl.id
          LEFT JOIN it_equipment_type t ON pl.type_id = t.id
          LEFT JOIN it_equipment_vendor v ON e.vendor_id = v.id
          LEFT JOIN (
            SELECT l1.* FROM it_equipment_log l1
            INNER JOIN (
              SELECT equipment_id, MAX(created) as max_created
              FROM it_equipment_log
              GROUP BY equipment_id
            ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
          ) log ON e.id = log.equipment_id
          LEFT JOIN it_employees_list emp ON log.assigned_to = emp.employee_no
          LEFT JOIN it_equipment_sub_area sa ON log.equipment_sub_area_id = sa.id
          LEFT JOIN it_equipment_area a ON sa.area_id = a.id
          LEFT JOIN it_equipment_department d ON a.department_id = d.id
          LEFT JOIN it_equipment_plant p ON d.plant_id = p.id
          LEFT JOIN it_equipment_country c ON p.country_id = c.id
          LEFT JOIN it_equipment_region r ON c.region_id = r.id
          WHERE 
            e.service_tag LIKE ?
            OR t.type_name LIKE ?
            OR pl.name LIKE ?
            OR m.name LIKE ?
            OR v.name LIKE ?
            OR CONCAT(emp.first_name, ' ', emp.last_name) LIKE ?
            OR emp.first_name LIKE ?
            OR emp.last_name LIKE ?
            OR r.name LIKE ?
            OR c.name LIKE ?
            OR p.name LIKE ?
            OR d.name LIKE ?
            OR a.name LIKE ?
            OR sa.name LIKE ?
          ORDER BY e.service_tag
          LIMIT 100`,
          [
            searchTerm, // service_tag
            searchTerm, // type_name
            searchTerm, // product_line name
            searchTerm, // model name
            searchTerm, // vendor name
            searchTerm, // full name
            searchTerm, // first_name
            searchTerm, // last_name
            searchTerm, // region
            searchTerm, // country
            searchTerm, // plant
            searchTerm, // department
            searchTerm, // area
            searchTerm  // sub_area
          ]
        );

        logger.info("Search results", { traceId, query: trimmed, count: rows.length });

        // Mark items as readonly if they're from a different plant (unless user is admin)
        const resultsWithReadonly = rows.map((row: RowDataPacket) => {
          const result = row as SearchResult;
          // Item is readonly if:
          // 1. User is not admin
          // 2. Item has a plant_id
          // 3. Item's plant_id doesn't match user's plant_id
          result.isReadonly = !isAdmin &&
            result.plant_id !== null &&
            userPlantId !== null &&
            result.plant_id !== userPlantId;
          return result;
        });

        return new Response(searchPage(trimmed, resultsWithReadonly.length > 0 ? resultsWithReadonly : [], null, isAdmin, hasPcPwView, userPlantId, currentUsername, hasAuditApprover), {
          headers: { "Content-Type": "text/html" },
        });
      }

      return new Response(searchPage("", null, null, isAdmin, hasPcPwView, userPlantId, currentUsername, hasAuditApprover), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Add equipment page - GET
    if (path === "/add" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/add", 302);
      }

      // Allow viewing the add page even without permission - submission will require approval
      const serial = url.searchParams.get("serial") || "";
      const userPlantId = await getUserPlantId(session.username, pool);
      const addData = await getAddData(serial, userPlantId, isAdmin);

      return new Response(addPage(addData as unknown as AddDataType, false, null, isAdmin, hasPcPwView, currentUsername), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Add equipment page - POST
    if (path === "/add" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/add", 302);
      }

      const formData = await req.formData();

      // Extract form data first
      const rawData = {
        service_tag: formData.get("service_tag") as string,
        vendor_id: formData.get("vendor_id") || null,
        supplier_id: formData.get("supplier_id") || null,
        model_id: formData.get("model_id") || null,
        purchase_date: formData.get("purchase_date") as string,
        warranty_expiry_date: formData.get("warranty_expiry_date") as string,
        equipment_sub_area_id: formData.get("equipment_sub_area_id") || null,
        assigned_to: formData.get("assigned_to") || null,
        teamviewer: formData.get("teamviewer") || null,
        cerf: formData.get("cerf") || "0",
        ip: formData.get("ip") || null,
        mac_addresses: formData.get("mac_addresses") || null,
        comment: formData.get("comment") || null,
        inventory_period_id: formData.get("inventory_period_id") || null,
      };

      // Check add equipment permission
      const userPlantId = await getUserPlantId(session.username, pool);
      const hasAdd = await hasAddEquipmentPermission(session.username, pool, userPlantId);
      if (!hasAdd) {
        const employeeNo = await getEmployeeNo(session.username, pool);
        const clientIp = getClientIp(req);

        if (!employeeNo) {
          const addData = await getAddData(rawData.service_tag || "", userPlantId, isAdmin);
          return new Response(
            addPage(addData as unknown as AddDataType, false, "Unable to create approval request. Please contact your administrator.", isAdmin, hasPcPwView, currentUsername),
            {
              headers: { "Content-Type": "text/html" },
            }
          );
        }

        // Create approval request
        const requestId = await createApprovalRequest(
          employeeNo,
          userPlantId ? `${userPlantId}_add` : "add",
          "add_equipment",
          rawData,
          clientIp,
          pool
        );

        if (requestId) {
          // Send email notification (fire-and-forget)
          sendApprovalNotification(
            requestId,
            userPlantId ? `${userPlantId}_add` : "add",
            "add_equipment",
            rawData,
            employeeNo,
            pool
          ).catch((err) => console.error("Failed to send approval notification:", err));

          const addData = await getAddData(rawData.service_tag || "", userPlantId, isAdmin);
          return new Response(
            addPage(addData as unknown as AddDataType, false, `Approval request created (ID: ${requestId})`, isAdmin, hasPcPwView, currentUsername),
            {
              headers: { "Content-Type": "text/html" },
            }
          );
        } else {
          const addData = await getAddData(rawData.service_tag || "", userPlantId, isAdmin);
          return new Response(
            addPage(addData as unknown as AddDataType, false, "Failed to create approval request. Please contact your administrator.", isAdmin, hasPcPwView, currentUsername),
            {
              headers: { "Content-Type": "text/html" },
            }
          );
        }
      }

      try {
        const validated = equipmentAddSchema.parse(rawData);

        const service_tag = validated.service_tag;
        const vendor_id = validated.vendor_id;
        const supplier_id = validated.supplier_id;
        const model_id = validated.model_id;
        const purchase_date = validated.purchase_date;
        const warranty_expiry_date = validated.warranty_expiry_date;
        const equipment_sub_area_id = validated.equipment_sub_area_id;
        const assigned_to = validated.assigned_to;
        const teamviewer = validated.teamviewer;
        const cerf = validated.cerf || 0;
        const ip = validated.ip;
        const mac_addresses = validated.mac_addresses;
        const comment = validated.comment;
        const inventory_period_id = validated.inventory_period_id;
        // Insert into equipment table (static data only)
        const [result] = await pool.query<ResultSetHeader>(`
          INSERT INTO it_equipment (
            service_tag, vendor_id, supplier_id, model_id,
            purchase_date, warranty_expiry_date, teamviewer, cerf, ip, mac_addresses
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          service_tag,
          vendor_id || null,
          supplier_id || null,
          model_id || null,
          purchase_date,
          warranty_expiry_date,
          teamviewer || null,
          cerf || 0,
          ip || null,
          mac_addresses || null
        ]);

        const equipmentId = result.insertId;

        // Insert initial log entry (dynamic/audit data)
        await pool.query(`
          INSERT INTO it_equipment_log (
            equipment_id, service_tag, assigned_to, equipment_sub_area_id, inventory_period_id, comment
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          equipmentId,
          service_tag,
          assigned_to || null,
          equipment_sub_area_id || null,
          inventory_period_id || null,
          comment || null
        ]);

        // Redirect to the edit page for the newly created equipment
        return Response.redirect(`${url.origin}/edit/${equipmentId}?success=1`, 303);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to add equipment", err, { traceId, serviceTag: rawData.service_tag });
        const addData = await getAddData(rawData.service_tag || "");
        return new Response(addPage(addData as unknown as AddDataType, false, errorMessage, isAdmin, hasPcPwView, currentUsername), {
          headers: { "Content-Type": "text/html" },
        });
      }
    }

    // Edit page - GET
    if (path.match(/^\/edit\/\d+$/) && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        const id = parseInt(path.split("/")[2]);
        return Response.redirect(`/login?redirect=/edit/${id}`, 302);
      }

      // Check edit equipment permission
      const userPlantId = await getUserPlantId(session.username, pool);
      const hasEditPermission = await hasEditEquipmentPermission(session.username, pool, userPlantId);
      if (!hasEditPermission) {
        const id = parseInt(path.split("/")[2]);
        const auditData = await getAuditData(id, userPlantId, isAdmin);
        if (!auditData) {
          return new Response("Equipment not found", { status: 404 });
        }
        const hasManageLocations = isAdmin || await hasManageLocationsPermission(session.username, pool, userPlantId);
        return new Response(
          editPage(auditData as unknown as EditDataType, false, "You do not have permission to edit equipment. Please contact your administrator.", isAdmin, hasPcPwView, false, userPlantId, null, null, currentUsername, hasAuditApprover, hasManageLocations),
          {
            headers: { "Content-Type": "text/html" },
          }
        );
      }

      const id = parseInt(path.split("/")[2]);
      const success = url.searchParams.get("success") === "1";

      const auditData = await getAuditData(id, userPlantId, isAdmin);
      if (!auditData) {
        return new Response("Equipment not found", { status: 404 });
      }

      // Check location management permission
      const hasManageLocations = isAdmin || await hasManageLocationsPermission(session.username, pool, userPlantId);

      // Check if equipment is from a different plant (readonly mode)
      const equipmentPlantId = auditData.equipment.plant_id as number | null;
      const isReadonly = !isAdmin &&
        equipmentPlantId !== null &&
        userPlantId !== null &&
        equipmentPlantId !== userPlantId;

      if (isReadonly) {
        // Get user's plant hierarchy for location filtering
        let allowedRegionIdReadonly: number | null = null;
        let allowedCountryIdReadonly: number | null = null;
        if (!isAdmin && userPlantId !== null) {
          const [plantInfoReadonly] = await pool.query<RowDataPacket[]>(
            `SELECT p.id, p.country_id, c.region_id
             FROM it_equipment_plant p
             LEFT JOIN it_equipment_country c ON p.country_id = c.id
             WHERE p.id = ? AND p.status = 1`,
            [userPlantId]
          );
          if (plantInfoReadonly.length > 0) {
            allowedCountryIdReadonly = plantInfoReadonly[0].country_id;
            allowedRegionIdReadonly = plantInfoReadonly[0].region_id;
          }
        }
        return new Response(
          editPage(auditData as unknown as EditDataType, success, "Read-only: This equipment belongs to another plant. You can view but not edit.", isAdmin, hasPcPwView, true, userPlantId, allowedRegionIdReadonly, allowedCountryIdReadonly, currentUsername, hasAuditApprover, hasManageLocations),
          {
            headers: { "Content-Type": "text/html" },
          }
        );
      }

      // Get user's plant hierarchy for location filtering
      let allowedRegionId: number | null = null;
      let allowedCountryId: number | null = null;
      if (!isAdmin && userPlantId !== null) {
        const [plantInfo] = await pool.query<RowDataPacket[]>(
          `SELECT p.id, p.country_id, c.region_id
           FROM it_equipment_plant p
           LEFT JOIN it_equipment_country c ON p.country_id = c.id
           WHERE p.id = ? AND p.status = 1`,
          [userPlantId]
        );
        if (plantInfo.length > 0) {
          allowedCountryId = plantInfo[0].country_id;
          allowedRegionId = plantInfo[0].region_id;
        }
      }

      return new Response(editPage(auditData as unknown as EditDataType, success, null, isAdmin, hasPcPwView, false, userPlantId, allowedRegionId, allowedCountryId, currentUsername, hasAuditApprover, hasManageLocations), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Edit page - POST (save)
    if (path.match(/^\/edit\/\d+$/) && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        const id = parseInt(path.split("/")[2]);
        return Response.redirect(`/login?redirect=/edit/${id}`, 302);
      }

      const id = parseInt(path.split("/")[2]);
      const formData = await req.formData();

      // Check admin permission for this request
      const isAdminPost = await hasAdminPermission(session.username, pool);
      const hasPcPwViewPost = await hasPcPwViewPermission(session.username, pool);

      // Check edit equipment permission
      const userPlantId = await getUserPlantId(session.username, pool);

      // Check if equipment is from a different plant (prevent editing)
      const auditData = await getAuditData(id, userPlantId, isAdminPost);
      if (!auditData) {
        return new Response("Equipment not found", { status: 404 });
      }

      const equipmentPlantId = auditData.equipment.plant_id as number | null;
      const isReadonly = !isAdminPost &&
        equipmentPlantId !== null &&
        userPlantId !== null &&
        equipmentPlantId !== userPlantId;

      if (isReadonly) {
        // Get user's plant hierarchy for location filtering
        let allowedRegionIdPost: number | null = null;
        let allowedCountryIdPost: number | null = null;
        if (!isAdminPost && userPlantId !== null) {
          const [plantInfoPost] = await pool.query<RowDataPacket[]>(
            `SELECT p.id, p.country_id, c.region_id
             FROM it_equipment_plant p
             LEFT JOIN it_equipment_country c ON p.country_id = c.id
             WHERE p.id = ? AND p.status = 1`,
            [userPlantId]
          );
          if (plantInfoPost.length > 0) {
            allowedCountryIdPost = plantInfoPost[0].country_id;
            allowedRegionIdPost = plantInfoPost[0].region_id;
          }
        }
        const hasManageLocationsPost = isAdminPost || await hasManageLocationsPermission(session.username, pool, userPlantId);
        return new Response(
          editPage(auditData as unknown as EditDataType, false, "Cannot edit: This equipment belongs to another plant. You can only view it.", isAdminPost, hasPcPwViewPost, true, userPlantId, allowedRegionIdPost, allowedCountryIdPost, session.username, hasAuditApprover, hasManageLocationsPost),
          {
            headers: { "Content-Type": "text/html" },
          }
        );
      }

      const hasEditPermissionPost = await hasEditEquipmentPermission(session.username, pool, userPlantId);
      const hasManageLocationsPost = isAdminPost || await hasManageLocationsPermission(session.username, pool, userPlantId);
      if (!hasEditPermissionPost) {
        const employeeNo = await getEmployeeNo(session.username, pool);
        const clientIp = getClientIp(req);

        if (!employeeNo) {
          const auditData = await getAuditData(id, userPlantId, isAdminPost);
          if (!auditData) {
            return new Response("Equipment not found", { status: 404 });
          }
          return new Response(
            editPage(auditData as unknown as EditDataType, false, "Unable to create approval request. Please contact your administrator.", isAdminPost, hasPcPwViewPost, false, userPlantId, null, null, session.username, hasAuditApprover, hasManageLocationsPost),
            {
              headers: { "Content-Type": "text/html" },
            }
          );
        }

        // Extract form data for approval request
        const rawData = {
          id,
          model_id: formData.get("model_id") || null,
          equipment_sub_area_id: formData.get("equipment_sub_area_id") || null,
          assigned_to: formData.get("assigned_to") || null,
          teamviewer: formData.get("teamviewer") || null,
          comment: formData.get("comment") || null,
          inventory_period_id: formData.get("inventory_period_id") || null,
          vendor_id: formData.get("vendor_id") || null,
          supplier_id: formData.get("supplier_id") || null,
          purchase_date: formData.get("purchase_date") || null,
          warranty_expiry_date: formData.get("warranty_expiry_date") || null,
          cerf: formData.get("cerf") || "0",
          ip: formData.get("ip") || null,
          mac_addresses: formData.get("mac_addresses") || null,
        };

        // Create approval request
        const requestId = await createApprovalRequest(
          employeeNo,
          "edit",
          "edit_equipment",
          rawData,
          clientIp,
          pool
        );

        if (requestId) {
          // Send email notification (fire-and-forget)
          sendApprovalNotification(
            requestId,
            "edit",
            "edit_equipment",
            rawData,
            employeeNo,
            pool
          ).catch((err) => console.error("Failed to send approval notification:", err));

          const auditData = await getAuditData(id, userPlantId, isAdminPost);
          if (!auditData) {
            return new Response("Equipment not found", { status: 404 });
          }
          return new Response(
            editPage(auditData as unknown as EditDataType, `Approval request created (ID: ${requestId})`, null, isAdminPost, hasPcPwViewPost, false, userPlantId, null, null, session.username, hasAuditApprover, hasManageLocationsPost),
            {
              headers: { "Content-Type": "text/html" },
            }
          );
        } else {
          const auditData = await getAuditData(id, userPlantId, isAdminPost);
          if (!auditData) {
            return new Response("Equipment not found", { status: 404 });
          }
          return new Response(
            editPage(auditData as unknown as EditDataType, false, "Failed to create approval request. Please contact your administrator.", isAdminPost, hasPcPwViewPost, false, userPlantId, null, null, session.username, hasAuditApprover, hasManageLocationsPost),
            {
              headers: { "Content-Type": "text/html" },
            }
          );
        }
      }

      // Extract and validate form values
      const action = formData.get("action")?.toString();
      const rawData = {
        model_id: formData.get("model_id") || null,
        equipment_sub_area_id: formData.get("equipment_sub_area_id") || null,
        assigned_to: formData.get("assigned_to") || null,
        teamviewer: formData.get("teamviewer") || null,
        comment: formData.get("comment") || null,
        inventory_period_id: formData.get("inventory_period_id") || null,
        vendor_id: formData.get("vendor_id") || null,
        supplier_id: formData.get("supplier_id") || null,
        purchase_date: formData.get("purchase_date") || null,
        warranty_expiry_date: formData.get("warranty_expiry_date") || null,
        cerf: formData.get("cerf") || "0",
        ip: formData.get("ip") || null,
        mac_addresses: formData.get("mac_addresses") || null,
        is_written_off: formData.get("is_written_off") || null,
        write_off_comment: formData.get("write_off_comment") || null,
        repair_status: formData.get("repair_status") || null,
        repair_note: formData.get("repair_note") || null,
        repair_physical_location: formData.get("repair_physical_location") || null,
      };

      try {
        const validated = equipmentEditSchema.parse(rawData);

        const model_id = validated.model_id;
        const equipment_sub_area_id = validated.equipment_sub_area_id;
        const assigned_to = validated.assigned_to;
        const teamviewer = validated.teamviewer;
        const comment = validated.comment;
        const inventory_period_id = validated.inventory_period_id;
        const vendor_id = validated.vendor_id;
        const supplier_id = validated.supplier_id;
        const purchase_date = validated.purchase_date;
        const warranty_expiry_date = validated.warranty_expiry_date;
        const cerf = validated.cerf || 0;
        const ip = validated.ip;
        const mac_addresses = validated.mac_addresses;
        const is_written_off = validated.is_written_off ? Number(validated.is_written_off) : null;
        const write_off_comment = rawData.write_off_comment ? rawData.write_off_comment.toString().trim() : null;
        const repair_status = rawData.repair_status ? rawData.repair_status.toString() : null;
        const repair_note = rawData.repair_note ? rawData.repair_note.toString().trim() : null;
        const repair_physical_location = rawData.repair_physical_location ? rawData.repair_physical_location.toString().trim() : null;

        // Validate: if writing off, comment is required
        if (is_written_off && !write_off_comment) {
          const auditData = await getAuditData(id);
          if (!auditData) {
            return new Response("Equipment not found", { status: 404 });
          }
          const auditDataForValidation = await getAuditData(id, userPlantId, isAdminPost);
          if (!auditDataForValidation) {
            return new Response("Equipment not found", { status: 404 });
          }
          return new Response(editPage(auditDataForValidation as unknown as EditDataType, false, "Write-off comment is required when writing off equipment.", isAdminPost, hasPcPwViewPost, false, userPlantId, null, null, session.username, hasAuditApprover, hasManageLocationsPost), {
            headers: { "Content-Type": "text/html" },
          });
        }

        // Validate: if registering for repair, note is required
        if (repair_status === "needs_repair" && !repair_note) {
          const auditData = await getAuditData(id);
          if (!auditData) {
            return new Response("Equipment not found", { status: 404 });
          }
          const auditDataForRepairValidation = await getAuditData(id, userPlantId, isAdminPost);
          if (!auditDataForRepairValidation) {
            return new Response("Equipment not found", { status: 404 });
          }
          return new Response(editPage(auditDataForRepairValidation as unknown as EditDataType, false, "Repair note is required when registering equipment for repair.", isAdminPost, hasPcPwViewPost, false, userPlantId, null, null, session.username, hasAuditApprover, hasManageLocationsPost), {
            headers: { "Content-Type": "text/html" },
          });
        }

        // Get the equipment record for service_tag
        const [equipment] = await pool.query<RowDataPacket[]>(`
          SELECT service_tag FROM it_equipment WHERE id = ?
        `, [id]);

        if (equipment.length === 0) {
          return new Response("Equipment not found", { status: 404 });
        }

        const service_tag = equipment[0].service_tag;

        // Update the equipment table (static data only)
        // Handle repair status: if setting to needs_repair, set sent_date to null; if clearing, clear all repair fields
        let repairSentDate = null;
        let repairReturnedDate = null;
        let repairMarkedBackupDate = null;

        if (repair_status === "needs_repair") {
          // Keep existing sent_date if already set, otherwise null
          const [existing] = await pool.query<RowDataPacket[]>(
            "SELECT repair_sent_date FROM it_equipment WHERE id = ?",
            [id]
          );
          repairSentDate = existing[0]?.repair_sent_date || null;
        } else if (!repair_status) {
          // Clearing repair status - clear all repair fields
          repairSentDate = null;
          repairReturnedDate = null;
          repairMarkedBackupDate = null;
        } else {
          // Keep existing dates
          const [existing] = await pool.query<RowDataPacket[]>(
            "SELECT repair_sent_date, repair_returned_date, repair_marked_backup_date FROM it_equipment WHERE id = ?",
            [id]
          );
          repairSentDate = existing[0]?.repair_sent_date || null;
          repairReturnedDate = existing[0]?.repair_returned_date || null;
          repairMarkedBackupDate = existing[0]?.repair_marked_backup_date || null;
        }

        await pool.query(`
          UPDATE it_equipment SET
            model_id = ?,
            vendor_id = ?,
            supplier_id = ?,
            purchase_date = ?,
            warranty_expiry_date = ?,
            cerf = ?,
            ip = ?,
            mac_addresses = ?,
            teamviewer = ?,
            is_written_off = ?,
            repair_status = ?,
            repair_note = ?,
            repair_physical_location = ?,
            repair_sent_date = ?,
            repair_returned_date = ?,
            repair_marked_backup_date = ?,
            updated = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          model_id || null,
          vendor_id || null,
          supplier_id || null,
          purchase_date || null,
          warranty_expiry_date || null,
          cerf || 0,
          ip || null,
          mac_addresses || null,
          teamviewer || null,
          is_written_off,
          repair_status || null,
          repair_note || null,
          repair_physical_location || null,
          repairSentDate,
          repairReturnedDate,
          repairMarkedBackupDate,
          id
        ]);

        // Combine comment and write-off comment if writing off
        let logComment = comment || null;
        if (is_written_off && write_off_comment) {
          if (logComment) {
            logComment = `[Write-Off: ${write_off_comment}] ${logComment}`;
          } else {
            logComment = `[Write-Off: ${write_off_comment}]`;
          }
        } else if (!is_written_off && write_off_comment) {
          // If un-writing off, add a note about restoration
          if (logComment) {
            logComment = `[Restored from write-off] ${logComment}`;
          } else {
            logComment = `[Restored from write-off]`;
          }
        }

        // Insert new log entry (dynamic/audit data)
        await pool.query(`
          INSERT INTO it_equipment_log (
            equipment_id, service_tag, assigned_to, equipment_sub_area_id, inventory_period_id, comment, is_written_off
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          id,
          service_tag,
          assigned_to || null,
          equipment_sub_area_id || null,
          inventory_period_id || null,
          logComment,
          is_written_off || null
        ]);

        // If "send_to_repair" action, check permission and redirect to repairs page
        if (action === "send_to_repair") {
          // Check if user has permission to send equipment to repair
          const hasSendRepair = await hasRepairsSendPermission(session.username, pool, userPlantId);
          if (!hasSendRepair) {
            const employeeNo = await getEmployeeNo(session.username, pool);
            const clientIp = getClientIp(req);

            if (!employeeNo) {
              const auditData = await getAuditData(id, userPlantId, isAdminPost);
              if (!auditData) {
                return new Response("Equipment not found", { status: 404 });
              }
              return new Response(
                editPage(auditData, false, "Unable to create approval request. Please contact your administrator.", isAdminPost, hasPcPwViewPost, false, userPlantId, null, null, session.username, hasAuditApprover, hasManageLocationsPost),
                {
                  headers: { "Content-Type": "text/html" },
                }
              );
            }

            // Create approval request
            const requestId = await createApprovalRequest(
              employeeNo,
              userPlantId ? `${userPlantId}_repairs_send` : "repairs_send",
              "send_to_repair",
              { id, ...rawData },
              clientIp,
              pool
            );

            if (requestId) {
              const auditData = await getAuditData(id, userPlantId, isAdminPost);
              if (!auditData) {
                return new Response("Equipment not found", { status: 404 });
              }
              return new Response(
                editPage(auditData, false, `Approval request created (ID: ${requestId})`, isAdminPost, hasPcPwViewPost, false, userPlantId, null, null, session.username, hasAuditApprover, hasManageLocationsPost),
                {
                  headers: { "Content-Type": "text/html" },
                }
              );
            } else {
              const auditData = await getAuditData(id, userPlantId, isAdminPost);
              if (!auditData) {
                return new Response("Equipment not found", { status: 404 });
              }
              return new Response(
                editPage(auditData, false, "Failed to create approval request. Please contact your administrator.", isAdminPost, hasPcPwViewPost, false, userPlantId, null, null, session.username, hasAuditApprover, hasManageLocationsPost),
                {
                  headers: { "Content-Type": "text/html" },
                }
              );
            }
          }
          return Response.redirect(`${url.origin}/repairs?success=${encodeURIComponent("Equipment sent to repair")}`, 303);
        }

        return Response.redirect(`${url.origin}/edit/${id}?success=1`, 303);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to edit equipment", err, { traceId, equipmentId: id });
        const userPlantIdError = await getUserPlantId(session.username, pool);
        const isAdminError = await hasAdminPermission(session.username, pool);
        const hasPcPwViewError = await hasPcPwViewPermission(session.username, pool);
        const hasManageLocationsError = isAdminError || await hasManageLocationsPermission(session.username, pool, userPlantIdError);
        const auditData = await getAuditData(id, userPlantIdError, isAdminError);
        if (!auditData) {
          return new Response("Equipment not found", { status: 404 });
        }
        return new Response(editPage(auditData, false, errorMessage, isAdminError, hasPcPwViewError, false, userPlantIdError, null, null, session.username, hasAuditApprover, hasManageLocationsError), {
          headers: { "Content-Type": "text/html" },
        });
      }
    }

    // Locations management - GET
    if (path === "/locations" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/locations", 302);
      }

      const success = url.searchParams.get("success") || "";
      const error = url.searchParams.get("error") || "";

      // Check view locations permission
      const userPlantId = await getUserPlantId(session.username, pool);
      const hasView = await hasLocationsViewPermission(session.username, pool, userPlantId);
      if (!hasView) {
        // Show success feedback even for users without view permission; keep gentle reminder
        const fallbackError = success ? "" : "Actions require approval.";
        return new Response(
          locationsPage(await getLocationsData(), success, error || fallbackError, isAdmin, hasPcPwView, session.username, hasAuditApprover),
          {
            headers: { "Content-Type": "text/html" },
          }
        );
      }

      const data = await getLocationsData();
      return new Response(locationsPage(data, success, error, isAdmin, hasPcPwView, session.username, hasAuditApprover), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Locations management - POST (add/edit/activate/deactivate)
    if (path === "/locations" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/locations", 302);
      }

      // Extract form data first
      const form = await req.formData();
      const rawData = {
        type: (form.get("type") || "").toString(),
        action: (form.get("action") || "").toString(),
        name: form.get("name") ? form.get("name")!.toString().trim() : undefined,
        id: form.get("id") ? form.get("id")!.toString() : undefined,
        parent_id: form.get("parent_id") ? form.get("parent_id")!.toString() : undefined,
      };

      try {
        const validated = locationsActionSchema.parse(rawData);
        const action = validated.action;
        const type = validated.type;
        const id = validated.id ? Number(validated.id) : null;
        const name = validated.name || "";
        const parent_id = validated.parent_id ? Number(validated.parent_id) : null;

        const map: Record<
          string,
          { table: string; parent?: string }
        > = {
          region: { table: "it_equipment_region" },
          country: { table: "it_equipment_country", parent: "region_id" },
          plant: { table: "it_equipment_plant", parent: "country_id" },
          department: { table: "it_equipment_department", parent: "plant_id" },
          area: { table: "it_equipment_area", parent: "department_id" },
          sub_area: { table: "it_equipment_sub_area", parent: "area_id" },
        };

        if (!map[type]) {
          return Response.redirect(`/locations?error=${encodeURIComponent("Unknown type")}`, 303);
        }

        const { table, parent } = map[type];

        // Check granular permissions based on action and create approval request if needed
        const employeeNo = await getEmployeeNo(session.username, pool);
        const clientIp = getClientIp(req);
        const userPlantId = await getUserPlantId(session.username, pool);

        if (action === "add") {
          const hasAdd = await hasLocationsAddPermission(session.username, pool, userPlantId);
          if (!hasAdd) {
            if (!employeeNo) {
              return Response.redirect("/locations?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
            }
            // Create approval request - only include parent_id if it's not null
            const actionData: Record<string, unknown> = { type, name };
            if (parent_id !== null) {
              actionData.parent_id = parent_id;
            }
            const requestId = await createApprovalRequest(
              employeeNo,
              userPlantId ? `${userPlantId}_locations_add` : "locations_add",
              "add_location",
              actionData,
              clientIp,
              pool
            );
            if (requestId) {
              return Response.redirect("/locations?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
            } else {
              return Response.redirect("/locations?error=" + encodeURIComponent("Failed to create approval request"), 303);
            }
          }
          if (!name) throw new Error("Name is required");
          if (parent && !parent_id) throw new Error("Parent is required");
          const cols = ["name", "status"];
          const vals: (string | number)[] = [name!, 1];
          if (parent && parent_id !== null) {
            cols.push(parent);
            vals.push(parent_id);
          }
          const placeholders = cols.map(() => "?").join(", ");
          await pool.query(
            `INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders})`,
            vals
          );
        } else if (action === "edit") {
          const hasEdit = await hasLocationsEditPermission(session.username, pool, userPlantId);
          if (!hasEdit) {
            if (!employeeNo) {
              return Response.redirect("/locations?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
            }
            // Create approval request
            const requestId = await createApprovalRequest(
              employeeNo,
              userPlantId ? `${userPlantId}_locations_edit` : "locations_edit",
              "edit_location",
              { type, id, name },
              clientIp,
              pool
            );
            if (requestId) {
              return Response.redirect("/locations?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
            } else {
              return Response.redirect("/locations?error=" + encodeURIComponent("Failed to create approval request"), 303);
            }
          }
          if (!id) throw new Error("ID is required");
          if (!name) throw new Error("Name is required");
          await pool.query(`UPDATE ${table} SET name = ? WHERE id = ?`, [name, id]);
        } else if (action === "deactivate" || action === "activate") {
          const hasDelete = await hasLocationsDeletePermission(session.username, pool, userPlantId);
          if (!hasDelete) {
            if (!employeeNo) {
              return Response.redirect("/locations?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
            }
            // Create approval request
            const requestId = await createApprovalRequest(
              employeeNo,
              userPlantId ? `${userPlantId}_locations_delete` : "locations_delete",
              action === "activate" ? "activate_location" : "deactivate_location",
              { type, id, action },
              clientIp,
              pool
            );
            if (requestId) {
              return Response.redirect("/locations?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
            } else {
              return Response.redirect("/locations?error=" + encodeURIComponent("Failed to create approval request"), 303);
            }
          }
          if (!id) throw new Error("ID is required");
          const status = action === "activate" ? 1 : 0;
          await pool.query(`UPDATE ${table} SET status = ? WHERE id = ?`, [status, id]);
        } else {
          throw new Error("Unknown action");
        }

        return Response.redirect(`/locations?success=${encodeURIComponent("Saved")}`, 303);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        return Response.redirect(`/locations?error=${encodeURIComponent(errorMessage)}`, 303);
      }
    }

    // Vendors & Suppliers management - GET
    if (path === "/vendors" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/vendors", 302);
      }

      // Check view vendors permission
      const userPlantId = await getUserPlantId(session.username, pool);
      const hasView = await hasVendorsViewPermission(session.username, pool, userPlantId);
      if (!hasView) {
        return new Response(
          vendorsPage(await getVendorsAndSuppliersData(), "", "Actions require approval.", isAdmin, hasPcPwView, session.username),
          {
            headers: { "Content-Type": "text/html" },
          }
        );
      }

      const success = url.searchParams.get("success") || "";
      const error = url.searchParams.get("error") || "";
      const data = await getVendorsAndSuppliersData();
      return new Response(vendorsPage(data, success, error, isAdmin, hasPcPwView, session.username, hasAuditApprover), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Vendors & Suppliers management - POST (add/edit/delete)
    if (path === "/vendors" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/vendors", 302);
      }

      // Check manage vendors permission
      const hasManageVendors = await hasManageVendorsPermission(session.username, pool);
      if (!hasManageVendors) {
        return Response.redirect("/vendors?error=" + encodeURIComponent("You do not have permission to manage vendors/suppliers"), 303);
      }

      const form = await req.formData();
      const entity = (form.get("entity") || "vendor").toString();
      const rawCommon = {
        action: (form.get("action") || "").toString(),
        name: form.get("name") ? form.get("name")!.toString().trim() : undefined,
        id: form.get("id") ? form.get("id")!.toString() : undefined,
      };

      try {
        if (entity === "supplier") {
          const rawSupplier = {
            ...rawCommon,
            email: form.get("email") ? form.get("email")!.toString().trim() : "",
            phone_number: form.get("phone_number") ? form.get("phone_number")!.toString().trim() : "",
            address: form.get("address") ? form.get("address")!.toString().trim() : "",
            representative_name: form.get("representative_name") ? form.get("representative_name")!.toString().trim() : "",
            sap_vendor_no: form.get("sap_vendor_no") ? form.get("sap_vendor_no")!.toString().trim() : "",
            website: form.get("website") ? form.get("website")!.toString().trim() : "",
          };

          const validated = suppliersActionSchema.parse(rawSupplier);
          const action = validated.action;
          const id = validated.id ? Number(validated.id) : null;
          const name = validated.name;
          const email = validated.email || null;
          const phone_number = validated.phone_number || null;
          const address = validated.address || null;
          const representative_name = validated.representative_name || null;
          const sap_vendor_no = validated.sap_vendor_no ? Number(validated.sap_vendor_no) : null;
          const website = validated.website || null;

          const employeeNo = await getEmployeeNo(session.username, pool);
          const clientIp = getClientIp(req);
          const userPlantId = await getUserPlantId(session.username, pool);

          if (action === "add") {
            const hasAdd = await hasVendorsAddPermission(session.username, pool, userPlantId);
            if (!hasAdd) {
              if (!employeeNo) {
                return Response.redirect("/vendors?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
              }
              const requestId = await createApprovalRequest(
                employeeNo,
                userPlantId ? `${userPlantId}_vendors_add` : "vendors_add",
                "add_supplier",
                { entity: "supplier", name, email, phone_number, address, representative_name, sap_vendor_no, website },
                clientIp,
                pool
              );
              if (requestId) {
                return Response.redirect("/vendors?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
              } else {
                return Response.redirect("/vendors?error=" + encodeURIComponent("Failed to create approval request. Please contact your administrator."), 303);
              }
            }
            await pool.query(
              `INSERT INTO it_equipment_supplier (name, email, phone_number, address, representative_name, sap_vendor_no, website)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [name!, email, phone_number, address, representative_name, sap_vendor_no, website]
            );
          } else if (action === "edit") {
            const hasEdit = await hasVendorsEditPermission(session.username, pool, userPlantId);
            if (!hasEdit) {
              if (!employeeNo) {
                return Response.redirect("/vendors?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
              }
              const requestId = await createApprovalRequest(
                employeeNo,
                userPlantId ? `${userPlantId}_vendors_edit` : "vendors_edit",
                "edit_supplier",
                { entity: "supplier", id, name, email, phone_number, address, representative_name, sap_vendor_no, website },
                clientIp,
                pool
              );
              if (requestId) {
                return Response.redirect("/vendors?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
              } else {
                return Response.redirect("/vendors?error=" + encodeURIComponent("Failed to create approval request. Please contact your administrator."), 303);
              }
            }
            await pool.query(
              `UPDATE it_equipment_supplier 
                 SET name = ?, email = ?, phone_number = ?, address = ?, representative_name = ?, sap_vendor_no = ?, website = ?
               WHERE id = ?`,
              [name!, email, phone_number, address, representative_name, sap_vendor_no, website, id!]
            );
          } else if (action === "delete") {
            const hasDelete = await hasVendorsDeletePermission(session.username, pool, userPlantId);
            if (!hasDelete) {
              if (!employeeNo) {
                return Response.redirect("/vendors?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
              }
              const requestId = await createApprovalRequest(
                employeeNo,
                userPlantId ? `${userPlantId}_vendors_delete` : "vendors_delete",
                "delete_supplier",
                { entity: "supplier", id },
                clientIp,
                pool
              );
              if (requestId) {
                return Response.redirect("/vendors?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
              } else {
                return Response.redirect("/vendors?error=" + encodeURIComponent("Failed to create approval request. Please contact your administrator."), 303);
              }
            }
            // Check if supplier is in use
            const [equipment] = await pool.query<RowDataPacket[]>(
              "SELECT COUNT(*) as count FROM it_equipment WHERE supplier_id = ?",
              [id!]
            );
            if (equipment[0].count > 0) {
              throw new Error("Cannot delete supplier that is in use");
            }
            await pool.query("DELETE FROM it_equipment_supplier WHERE id = ?", [id!]);
          } else {
            throw new Error("Unknown action");
          }
        } else if (entity === "vendor") {
          const validated = vendorsActionSchema.parse(rawCommon);
          const action = validated.action;
          const id = validated.id ? Number(validated.id) : null;
          const name = validated.name;

          const employeeNo = await getEmployeeNo(session.username, pool);
          const clientIp = getClientIp(req);
          const userPlantId = await getUserPlantId(session.username, pool);

          if (action === "add") {
            const hasAdd = await hasVendorsAddPermission(session.username, pool, userPlantId);
            if (!hasAdd) {
              if (!employeeNo) {
                return Response.redirect("/vendors?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
              }
              const requestId = await createApprovalRequest(
                employeeNo,
                userPlantId ? `${userPlantId}_vendors_add` : "vendors_add",
                "add_vendor",
                { entity: "vendor", name },
                clientIp,
                pool
              );
              if (requestId) {
                return Response.redirect("/vendors?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
              } else {
                return Response.redirect("/vendors?error=" + encodeURIComponent("Failed to create approval request. Please contact your administrator."), 303);
              }
            }
            await pool.query(
              "INSERT INTO it_equipment_vendor (name) VALUES (?)",
              [name!]
            );
          } else if (action === "edit") {
            const hasEdit = await hasVendorsEditPermission(session.username, pool, userPlantId);
            if (!hasEdit) {
              if (!employeeNo) {
                return Response.redirect("/vendors?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
              }
              const requestId = await createApprovalRequest(
                employeeNo,
                userPlantId ? `${userPlantId}_vendors_edit` : "vendors_edit",
                "edit_vendor",
                { entity: "vendor", id, name },
                clientIp,
                pool
              );
              if (requestId) {
                return Response.redirect("/vendors?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
              } else {
                return Response.redirect("/vendors?error=" + encodeURIComponent("Failed to create approval request. Please contact your administrator."), 303);
              }
            }
            await pool.query("UPDATE it_equipment_vendor SET name = ? WHERE id = ?", [name!, id!]);
          } else if (action === "delete") {
            const hasDelete = await hasVendorsDeletePermission(session.username, pool, userPlantId);
            if (!hasDelete) {
              if (!employeeNo) {
                return Response.redirect("/vendors?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
              }
              const requestId = await createApprovalRequest(
                employeeNo,
                userPlantId ? `${userPlantId}_vendors_delete` : "vendors_delete",
                "delete_vendor",
                { entity: "vendor", id },
                clientIp,
                pool
              );
              if (requestId) {
                return Response.redirect("/vendors?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
              } else {
                return Response.redirect("/vendors?error=" + encodeURIComponent("Failed to create approval request. Please contact your administrator."), 303);
              }
            }
            // Check if vendor is in use
            const [equipment] = await pool.query<RowDataPacket[]>(
              "SELECT COUNT(*) as count FROM it_equipment WHERE vendor_id = ?",
              [id!]
            );
            if (equipment[0].count > 0) {
              throw new Error("Cannot delete vendor that is in use");
            }
            await pool.query("DELETE FROM it_equipment_vendor WHERE id = ?", [id!]);
          } else {
            throw new Error("Unknown action");
          }
        } else {
          throw new Error("Unknown entity");
        }

        return Response.redirect(`/vendors?success=${encodeURIComponent("Saved")}`, 303);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to manage vendor/supplier", err, { traceId, action: rawCommon.action, entity });
        return Response.redirect(`/vendors?error=${encodeURIComponent(errorMessage)}`, 303);
      }
    }

    // Types management - GET
    if (path === "/types" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/types", 302);
      }

      // Check view types permission
      const userPlantId = await getUserPlantId(session.username, pool);
      const hasView = await hasTypesViewPermission(session.username, pool, userPlantId);
      if (!hasView) {
        const { errorPage } = await import("./templates/error");
        return new Response(
          errorPage(
            "Access Denied",
            "You do not have permission to view types/configurations.",
            "You need the 'types_view' or 'types_edit' permission to access this page. Please contact your administrator if you need access.",
            403,
            isAdmin,
            hasPcPwView,
            session.username,
            hasAuditApprover
          ),
          {
            status: 403,
            headers: { "Content-Type": "text/html" },
          }
        );
      }

      const success = url.searchParams.get("success") || "";
      const error = url.searchParams.get("error") || "";
      const data = await getTypesData();
      return new Response(typesPage(data, success, error, isAdmin, hasPcPwView, session.username, hasAuditApprover), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Types management - POST (add/edit/activate/deactivate)
    if (path === "/types" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/types", 302);
      }

      // Check manage types permission
      const hasManageTypes = await hasManageTypesPermission(session.username, pool);
      if (!hasManageTypes) {
        return Response.redirect("/types?error=" + encodeURIComponent("You do not have permission to manage types/configurations"), 303);
      }

      const form = await req.formData();
      const rawData = {
        type: (form.get("type") || "").toString(),
        action: (form.get("action") || "").toString(),
        name: form.get("name") ? form.get("name")!.toString().trim() : undefined,
        id: form.get("id") ? form.get("id")!.toString() : undefined,
        parent_id: form.get("parent_id") ? form.get("parent_id")!.toString() : undefined,
      };

      try {
        const validated = typesActionSchema.parse(rawData);
        const action = validated.action;
        const id = validated.id ? Number(validated.id) : null;
        const name = validated.name;
        const parent_id = validated.parent_id ? Number(validated.parent_id) : null;

        const employeeNo = await getEmployeeNo(session.username, pool);
        const clientIp = getClientIp(req);
        const userPlantId = await getUserPlantId(session.username, pool);

        if (validated.type === "type") {
          if (action === "add") {
            const hasAdd = await hasTypesAddPermission(session.username, pool, userPlantId);
            if (!hasAdd) {
              if (!employeeNo) {
                return Response.redirect("/types?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
              }
              const requestId = await createApprovalRequest(
                employeeNo,
                userPlantId ? `${userPlantId}_types_add` : "types_add",
                "add_type",
                { type: "type", name },
                clientIp,
                pool
              );
              if (requestId) {
                return Response.redirect("/types?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
              } else {
                return Response.redirect("/types?error=" + encodeURIComponent("Failed to create approval request. Please contact your administrator."), 303);
              }
            }
            await pool.query(
              "INSERT INTO it_equipment_type (type_name, status) VALUES (?, 1)",
              [name!]
            );
          } else if (action === "edit") {
            const hasEdit = await hasTypesEditPermission(session.username, pool, userPlantId);
            if (!hasEdit) {
              if (!employeeNo) {
                return Response.redirect("/types?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
              }
              const requestId = await createApprovalRequest(
                employeeNo,
                userPlantId ? `${userPlantId}_types_edit` : "types_edit",
                "edit_type",
                { type: "type", id, name },
                clientIp,
                pool
              );
              if (requestId) {
                return Response.redirect("/types?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
              } else {
                return Response.redirect("/types?error=" + encodeURIComponent("Failed to create approval request. Please contact your administrator."), 303);
              }
            }
            await pool.query("UPDATE it_equipment_type SET type_name = ? WHERE id = ?", [name!, id!]);
          } else if (action === "deactivate" || action === "activate") {
            const hasDelete = await hasTypesDeletePermission(session.username, pool, userPlantId);
            if (!hasDelete) {
              if (!employeeNo) {
                return Response.redirect("/types?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
              }
              const requestId = await createApprovalRequest(
                employeeNo,
                userPlantId ? `${userPlantId}_types_delete` : "types_delete",
                action === "activate" ? "activate_type" : "deactivate_type",
                { type: "type", id, action },
                clientIp,
                pool
              );
              if (requestId) {
                return Response.redirect("/types?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
              } else {
                return Response.redirect("/types?error=" + encodeURIComponent("Failed to create approval request. Please contact your administrator."), 303);
              }
            }
            const status = action === "activate" ? 1 : 0;
            await pool.query("UPDATE it_equipment_type SET status = ? WHERE id = ?", [status, id!]);
          } else {
            throw new Error("Unknown action");
          }
        } else if (validated.type === "product-line") {
          if (action === "add") {
            const hasAdd = await hasTypesAddPermission(session.username, pool, userPlantId);
            if (!hasAdd) {
              if (!employeeNo) {
                return Response.redirect("/types?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
              }
              const requestId = await createApprovalRequest(
                employeeNo,
                userPlantId ? `${userPlantId}_types_add` : "types_add",
                "add_product_line",
                { type: "product-line", name, parent_id },
                clientIp,
                pool
              );
              if (requestId) {
                return Response.redirect("/types?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
              } else {
                return Response.redirect("/types?error=" + encodeURIComponent("Failed to create approval request. Please contact your administrator."), 303);
              }
            }
            await pool.query(
              "INSERT INTO it_equipment_product_line (name, type_id, status) VALUES (?, ?, 1)",
              [name!, parent_id!]
            );
          } else if (action === "edit") {
            const hasEdit = await hasTypesEditPermission(session.username, pool, userPlantId);
            if (!hasEdit) {
              if (!employeeNo) {
                return Response.redirect("/types?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
              }
              const requestId = await createApprovalRequest(
                employeeNo,
                userPlantId ? `${userPlantId}_types_edit` : "types_edit",
                "edit_product_line",
                { type: "product-line", id, name },
                clientIp,
                pool
              );
              if (requestId) {
                return Response.redirect("/types?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
              } else {
                return Response.redirect("/types?error=" + encodeURIComponent("Failed to create approval request. Please contact your administrator."), 303);
              }
            }
            await pool.query("UPDATE it_equipment_product_line SET name = ? WHERE id = ?", [name!, id!]);
          } else if (action === "deactivate" || action === "activate") {
            const hasDelete = await hasTypesDeletePermission(session.username, pool, userPlantId);
            if (!hasDelete) {
              if (!employeeNo) {
                return Response.redirect("/types?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
              }
              const requestId = await createApprovalRequest(
                employeeNo,
                userPlantId ? `${userPlantId}_types_delete` : "types_delete",
                action === "activate" ? "activate_product_line" : "deactivate_product_line",
                { type: "product-line", id, action },
                clientIp,
                pool
              );
              if (requestId) {
                return Response.redirect("/types?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
              } else {
                return Response.redirect("/types?error=" + encodeURIComponent("Failed to create approval request. Please contact your administrator."), 303);
              }
            }
            const status = action === "activate" ? 1 : 0;
            await pool.query("UPDATE it_equipment_product_line SET status = ? WHERE id = ?", [status, id!]);
          } else {
            throw new Error("Unknown action");
          }
        } else if (validated.type === "model") {
          if (action === "add") {
            const hasAdd = await hasTypesAddPermission(session.username, pool, userPlantId);
            if (!hasAdd) {
              if (!employeeNo) {
                return Response.redirect("/types?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
              }
              const requestId = await createApprovalRequest(
                employeeNo,
                "types_add",
                "add_model",
                { type: "model", name, parent_id },
                clientIp,
                pool
              );
              if (requestId) {
                return Response.redirect("/types?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
              } else {
                return Response.redirect("/types?error=" + encodeURIComponent("Failed to create approval request. Please contact your administrator."), 303);
              }
            }
            await pool.query(
              "INSERT INTO it_equipment_model (name, product_line_id, status) VALUES (?, ?, 1)",
              [name!, parent_id!]
            );
          } else if (action === "edit") {
            const hasEdit = await hasTypesEditPermission(session.username, pool, userPlantId);
            if (!hasEdit) {
              if (!employeeNo) {
                return Response.redirect("/types?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
              }
              const requestId = await createApprovalRequest(
                employeeNo,
                userPlantId ? `${userPlantId}_types_edit` : "types_edit",
                "edit_model",
                { type: "model", id, name },
                clientIp,
                pool
              );
              if (requestId) {
                return Response.redirect("/types?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
              } else {
                return Response.redirect("/types?error=" + encodeURIComponent("Failed to create approval request. Please contact your administrator."), 303);
              }
            }
            await pool.query("UPDATE it_equipment_model SET name = ? WHERE id = ?", [name!, id!]);
          } else if (action === "deactivate" || action === "activate") {
            const hasDelete = await hasTypesDeletePermission(session.username, pool, userPlantId);
            if (!hasDelete) {
              if (!employeeNo) {
                return Response.redirect("/types?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
              }
              const requestId = await createApprovalRequest(
                employeeNo,
                userPlantId ? `${userPlantId}_types_delete` : "types_delete",
                action === "activate" ? "activate_model" : "deactivate_model",
                { type: "model", id, action },
                clientIp,
                pool
              );
              if (requestId) {
                return Response.redirect("/types?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
              } else {
                return Response.redirect("/types?error=" + encodeURIComponent("Failed to create approval request. Please contact your administrator."), 303);
              }
            }
            const status = action === "activate" ? 1 : 0;
            await pool.query("UPDATE it_equipment_model SET status = ? WHERE id = ?", [status, id!]);
          } else {
            throw new Error("Unknown action");
          }
        } else {
          throw new Error("Unknown type");
        }

        return Response.redirect(`/types?success=${encodeURIComponent("Saved")}`, 303);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to manage type/model", err, { traceId, rawData });
        return Response.redirect(`/types?error=${encodeURIComponent(errorMessage)}`, 303);
      }
    }

    // Write-Off Reasons management - GET
    if (path === "/write-off-reasons" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/write-off-reasons", 302);
      }

      // Check view write-off reasons permission
      const userPlantId = await getUserPlantId(session.username, pool);
      const hasView = await hasWriteOffReasonsViewPermission(session.username, pool, userPlantId);
      if (!hasView) {
        return new Response(
          writeOffPage(await getWriteOffReasonsData(), "", "Actions require approval.", isAdmin, hasPcPwView, session.username, hasAuditApprover),
          {
            headers: { "Content-Type": "text/html" },
          }
        );
      }

      const success = url.searchParams.get("success") || "";
      const error = url.searchParams.get("error") || "";
      const data = await getWriteOffReasonsData();
      return new Response(writeOffPage(data, success, error, isAdmin, hasPcPwView, session.username, hasAuditApprover), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Write-Off Reasons management - POST (add/edit/delete)
    if (path === "/write-off-reasons" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/write-off-reasons", 302);
      }

      const form = await req.formData();
      const rawData = {
        action: (form.get("action") || "").toString(),
        reason: form.get("reason") ? form.get("reason")!.toString().trim() : undefined,
        id: form.get("id") ? form.get("id")!.toString() : undefined,
      };

      try {
        const validated = writeOffReasonsActionSchema.parse(rawData);
        const action = validated.action;
        const id = validated.id ? Number(validated.id) : null;
        const reason = validated.reason;
        const userPlantId = await getUserPlantId(session.username, pool);

        if (action === "add") {
          const hasAdd = await hasWriteOffReasonsAddPermission(session.username, pool, userPlantId);
          if (!hasAdd) {
            const employeeNo = await getEmployeeNo(session.username, pool);
            const clientIp = getClientIp(req);

            if (!employeeNo) {
              return Response.redirect("/write-off-reasons?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
            }

            const requestId = await createApprovalRequest(
              employeeNo,
              userPlantId ? `${userPlantId}_write_off_reasons_add` : "write_off_reasons_add",
              "add_write_off_reason",
              { reason },
              clientIp,
              pool
            );

            if (requestId) {
              return Response.redirect("/write-off-reasons?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
            } else {
              return Response.redirect("/write-off-reasons?error=" + encodeURIComponent("Failed to create approval request"), 303);
            }
          }
          if (!reason) throw new Error("Reason is required");
          await pool.query(
            "INSERT INTO it_equipment_write_off_reason (reason) VALUES (?)",
            [reason]
          );
        } else if (action === "edit") {
          const employeeNo = await getEmployeeNo(session.username, pool);
          const clientIp = getClientIp(req);
          const hasEdit = await hasWriteOffReasonsEditPermission(session.username, pool, userPlantId);
          if (!hasEdit) {
            if (!employeeNo) {
              return Response.redirect("/write-off-reasons?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
            }

            const requestId = await createApprovalRequest(
              employeeNo,
              userPlantId ? `${userPlantId}_write_off_reasons_edit` : "write_off_reasons_edit",
              "edit_write_off_reason",
              { id, reason },
              clientIp,
              pool
            );

            if (requestId) {
              return Response.redirect("/write-off-reasons?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
            } else {
              return Response.redirect("/write-off-reasons?error=" + encodeURIComponent("Failed to create approval request. Please contact your administrator."), 303);
            }
          }
          if (!id) throw new Error("ID is required");
          if (!reason) throw new Error("Reason is required");
          await pool.query("UPDATE it_equipment_write_off_reason SET reason = ? WHERE id = ?", [reason, id]);
        } else if (action === "delete") {
          const employeeNo = await getEmployeeNo(session.username, pool);
          const clientIp = getClientIp(req);
          const hasDelete = await hasWriteOffReasonsDeletePermission(session.username, pool, userPlantId);
          if (!hasDelete) {
            if (!employeeNo) {
              return Response.redirect("/write-off-reasons?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
            }

            // Check if reason is in use first
            const [inUse] = await pool.query<RowDataPacket[]>(
              "SELECT COUNT(*) as count FROM it_equipment WHERE is_written_off = ?",
              [id]
            );
            if (inUse[0].count > 0) {
              return Response.redirect("/write-off-reasons?error=" + encodeURIComponent("Cannot delete write-off reason that is in use"), 303);
            }

            const requestId = await createApprovalRequest(
              employeeNo,
              userPlantId ? `${userPlantId}_write_off_reasons_delete` : "write_off_reasons_delete",
              "delete_write_off_reason",
              { id },
              clientIp,
              pool
            );

            if (requestId) {
              return Response.redirect("/write-off-reasons?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
            } else {
              return Response.redirect("/write-off-reasons?error=" + encodeURIComponent("Failed to create approval request. Please contact your administrator."), 303);
            }
          }
          if (!id) throw new Error("ID is required");
          // Check if reason is in use
          const [inUse] = await pool.query<RowDataPacket[]>(
            "SELECT COUNT(*) as count FROM it_equipment WHERE is_written_off = ?",
            [id]
          );
          if (inUse[0].count > 0) {
            throw new Error("Cannot delete write-off reason that is in use");
          }
          await pool.query("DELETE FROM it_equipment_write_off_reason WHERE id = ?", [id]);
        } else {
          throw new Error("Unknown action");
        }

        return Response.redirect(`/write-off-reasons?success=${encodeURIComponent("Saved")}`, 303);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to manage write-off reason", err, { traceId, rawData });
        return Response.redirect(`/write-off-reasons?error=${encodeURIComponent(errorMessage)}`, 303);
      }
    }

    // Repair Tracking - GET
    if (path === "/repairs" && req.method === "GET") {
      // Repairs page is public (no login required), but check permission if logged in
      const session = getSessionFromRequest(req);
      let repairsIsAdmin = false;
      let repairsHasPcPwView = false;
      let repairsHasAuditApprover = false;

      if (session) {
        // Calculate permissions for logged-in users (since this is a public route, global vars aren't set)
        repairsIsAdmin = await hasAdminPermission(session.username, pool);
        repairsHasPcPwView = await hasPcPwViewPermission(session.username, pool);
        const userPlantId = await getUserPlantId(session.username, pool);
        repairsHasAuditApprover = repairsIsAdmin || await hasPermission(session.username, pool, "audit-approver", userPlantId, true);

        // Check repairs permission for logged-in users
        const hasRepairs = await hasRepairsPermission(session.username, pool, userPlantId);
        if (!hasRepairs) {
          const { errorPage } = await import("./templates/error");
          return new Response(
            errorPage(
              "Access Denied",
              "You do not have permission to view repairs.",
              "You need the 'repairs' permission to access this page. Please contact your administrator if you need access.",
              403,
              repairsIsAdmin,
              repairsHasPcPwView,
              session.username,
              repairsHasAuditApprover
            ),
            {
              status: 403,
              headers: { "Content-Type": "text/html" },
            }
          );
        }
      }

      const success = url.searchParams.get("success") || "";
      const error = url.searchParams.get("error") || "";
      const data = await getRepairsData();
      return new Response(repairsPage(data, success, error, repairsIsAdmin, repairsHasPcPwView, session?.username || null, repairsHasAuditApprover), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Repair Tracking - POST (status changes)
    if (path === "/repairs" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/repairs", 302);
      }

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

        // Determine required permission based on action
        let permissionRequired = "repairs";
        let actionType = "";
        let hasPermission = false;
        const userPlantId = await getUserPlantId(session.username, pool);

        if (action === "mark_sent") {
          hasPermission = await hasRepairsSendPermission(session.username, pool, userPlantId);
          permissionRequired = "repairs_send";
          actionType = "send_to_repair";
        } else {
          // mark_returned and mark_backup use general repairs permission
          hasPermission = await hasRepairsPermission(session.username, pool, userPlantId);
          actionType = action === "mark_returned" ? "return_from_repair" : "mark_backup";
        }

        // If no permission, create approval request
        if (!hasPermission) {
          const employeeNo = await getEmployeeNo(session.username, pool);
          const clientIp = getClientIp(req);

          if (!employeeNo) {
            return Response.redirect("/repairs?error=" + encodeURIComponent("Unable to create approval request. Please contact your administrator."), 303);
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
            return Response.redirect("/repairs?success=" + encodeURIComponent("Approval request created (ID: " + requestId + ")"), 303);
          } else {
            return Response.redirect("/repairs?error=" + encodeURIComponent("Failed to create approval request. Please contact your administrator."), 303);
          }
        }

        // User has permission, proceed with direct update
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
          // Get service_tag for log entry
          const [equipment] = await pool.query<RowDataPacket[]>(
            `SELECT service_tag FROM it_equipment WHERE id = ?`,
            [equipmentId]
          );

          if (equipment.length === 0) {
            throw new Error("Equipment not found");
          }

          const service_tag = equipment[0].service_tag;

          // Update equipment status and clear repair comment
          await pool.query(
            `UPDATE it_equipment
             SET repair_status = 'in_backup',
                 repair_marked_backup_date = CURRENT_DATE,
                 repair_note = NULL
             WHERE id = ?`,
            [equipmentId]
          );

          // Insert log entry with empty location and user
          await pool.query(
            `INSERT INTO it_equipment_log (
              equipment_id, service_tag, assigned_to, equipment_sub_area_id, comment
            ) VALUES (?, ?, NULL, NULL, ?)`,
            [equipmentId, service_tag, '']
          );
        } else {
          throw new Error("Unknown action");
        }

        return Response.redirect(`/repairs?success=${encodeURIComponent("Status updated")}`, 303);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to update repair status", err, { traceId, rawData });
        return Response.redirect(`/repairs?error=${encodeURIComponent(errorMessage)}`, 303);
      }
    }

    // Audit - GET (redirect to review page)
    if (path === "/inventory-audit" && req.method === "GET") {
      return Response.redirect("/inventory-audit/review", 302);
    }

    // Audit - POST (save audit record)
    if (path === "/inventory-audit/save" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/inventory-audit", 302);
      }

      try {
        const form = await req.formData();
        const equipmentId = parseInt(form.get("equipment_id")?.toString() || "0");
        const inventoryPeriodId = parseInt(form.get("inventory_period_id")?.toString() || "0");

        if (!equipmentId || !inventoryPeriodId) {
          throw new Error("Missing required fields");
        }

        // Get equipment details with latest record from either (log+equipment) or audit table using CTE
        const [equipment] = await pool.query<RowDataPacket[]>(
          `WITH latest_records AS (
            SELECT l.equipment_id, l.assigned_to, l.equipment_sub_area_id, eq.teamviewer, l.comment, l.created as record_date
            FROM it_equipment_log l
            INNER JOIN it_equipment eq ON l.equipment_id = eq.id
            UNION ALL
            SELECT equipment_id, assigned_to, equipment_sub_area_id, teamviewer, comment, COALESCE(updated, created) as record_date
            FROM it_equipment_audit
          ),
          latest_per_equipment AS (
            SELECT lr.*
            FROM latest_records lr
            INNER JOIN (
              SELECT equipment_id, MAX(record_date) as max_date
              FROM latest_records
              GROUP BY equipment_id
            ) mx ON lr.equipment_id = mx.equipment_id AND lr.record_date = mx.max_date
          )
          SELECT
            e.*,
            lpe.assigned_to,
            lpe.equipment_sub_area_id,
            lpe.comment,
            COALESCE(lpe.teamviewer, e.teamviewer) as latest_teamviewer
          FROM it_equipment e
          LEFT JOIN latest_per_equipment lpe ON e.id = lpe.equipment_id
          WHERE e.id = ?`,
          [equipmentId]
        );

        if (equipment.length === 0) {
          throw new Error("Equipment not found");
        }

        const eq = equipment[0];

        // Resolve employee_no for updated_by; use null for admin users (admin doesn't have employee_no)
        const employeeNo = await getEmployeeNo(session.username, pool);
        const updatedBy = isAdminUser(session.username) ? null : (employeeNo || null);

        // Insert/update audit record ONLY - do NOT update main equipment table
        await pool.query(
          `INSERT INTO it_equipment_audit (
            equipment_id, inventory_period_id, service_tag, model_id, vendor_id, supplier_id,
            cerf, device_no, is_personal, purchase_date, warranty_expiry_date, is_written_off,
            teamviewer, imei1, imei2, ip, mac_addresses, assigned_to, equipment_sub_area_id,
            comment, updated_by, created, updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE
            service_tag = VALUES(service_tag),
            model_id = VALUES(model_id),
            vendor_id = VALUES(vendor_id),
            supplier_id = VALUES(supplier_id),
            cerf = VALUES(cerf),
            device_no = VALUES(device_no),
            is_personal = VALUES(is_personal),
            purchase_date = VALUES(purchase_date),
            warranty_expiry_date = VALUES(warranty_expiry_date),
            is_written_off = VALUES(is_written_off),
            teamviewer = VALUES(teamviewer),
            imei1 = VALUES(imei1),
            imei2 = VALUES(imei2),
            ip = VALUES(ip),
            mac_addresses = VALUES(mac_addresses),
            assigned_to = VALUES(assigned_to),
            equipment_sub_area_id = VALUES(equipment_sub_area_id),
            comment = VALUES(comment),
            updated_by = VALUES(updated_by),
            updated = CURRENT_TIMESTAMP`,
          [
            equipmentId, inventoryPeriodId, eq.service_tag, eq.model_id, eq.vendor_id, eq.supplier_id,
            eq.cerf, eq.device_no, eq.is_personal, eq.purchase_date, eq.warranty_expiry_date, eq.is_written_off,
            eq.latest_teamviewer, eq.imei1, eq.imei2, eq.ip, eq.mac_addresses, eq.assigned_to, eq.equipment_sub_area_id,
            eq.comment, updatedBy
          ]
        );

        logger.info("Audit record saved", { traceId, equipmentId, inventoryPeriodId, username: session.username });

        return Response.redirect(`/inventory-audit?search=${encodeURIComponent(eq.service_tag)}&success=${encodeURIComponent("Audit recorded successfully")}`, 303);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to save audit record", err, { traceId });
        return Response.redirect(`/inventory-audit?error=${encodeURIComponent(errorMessage)}`, 303);
      }
    }

    // Audit - Quick Edit POST (only updates audit table, NOT main equipment table)
    if (path === "/inventory-audit/quick-edit" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/inventory-audit", 302);
      }

      try {
        const form = await req.formData();
        const equipmentId = parseInt(form.get("equipment_id")?.toString() || "0");
        const inventoryPeriodId = parseInt(form.get("inventory_period_id")?.toString() || "0");
        const assignedTo = form.get("assigned_to")?.toString() || null;
        const teamviewer = form.get("teamviewer")?.toString() || null;
        const comment = form.get("comment")?.toString() || null;
        const equipmentSubAreaId = form.get("equipment_sub_area_id")?.toString() || null;

        if (!equipmentId || !inventoryPeriodId) {
          throw new Error("Missing required fields");
        }

        // Get equipment service_tag and current data with latest from either (log+equipment) or audit table using CTE
        const [equipmentRows] = await pool.query<RowDataPacket[]>(
          `WITH latest_records AS (
            SELECT l.equipment_id, l.assigned_to, l.equipment_sub_area_id, eq.teamviewer, l.comment, l.created as record_date
            FROM it_equipment_log l
            INNER JOIN it_equipment eq ON l.equipment_id = eq.id
            UNION ALL
            SELECT equipment_id, assigned_to, equipment_sub_area_id, teamviewer, comment, COALESCE(updated, created) as record_date
            FROM it_equipment_audit
          ),
          latest_per_equipment AS (
            SELECT lr.*
            FROM latest_records lr
            INNER JOIN (
              SELECT equipment_id, MAX(record_date) as max_date
              FROM latest_records
              GROUP BY equipment_id
            ) mx ON lr.equipment_id = mx.equipment_id AND lr.record_date = mx.max_date
          )
          SELECT
            e.*,
            lpe.assigned_to,
            lpe.equipment_sub_area_id,
            lpe.comment,
            COALESCE(lpe.teamviewer, e.teamviewer) as latest_teamviewer
           FROM it_equipment e
           LEFT JOIN latest_per_equipment lpe ON e.id = lpe.equipment_id
           WHERE e.id = ?`,
          [equipmentId]
        );

        if (equipmentRows.length === 0) {
          throw new Error("Equipment not found");
        }

        const eq = equipmentRows[0];
        const serviceTag = eq.service_tag;

        // Resolve employee_no for updated_by; use null for admin users (admin doesn't have employee_no)
        const employeeNo = await getEmployeeNo(session.username, pool);
        const updatedBy = isAdminUser(session.username) ? null : (employeeNo || null);

        // Use form values if provided, otherwise use current values from latest record (log or audit)
        const auditAssignedTo = assignedTo !== null ? assignedTo : eq.assigned_to;
        const auditSubAreaId = equipmentSubAreaId !== null ? (equipmentSubAreaId ? parseInt(equipmentSubAreaId) : null) : eq.equipment_sub_area_id;
        const auditComment = comment !== null ? comment : eq.comment;
        const auditTeamviewer = teamviewer !== null ? (teamviewer ? parseInt(teamviewer) : null) : eq.latest_teamviewer;

        // Update ONLY the audit table - do NOT update main equipment table or log table
        await pool.query(
          `INSERT INTO it_equipment_audit (
            equipment_id, inventory_period_id, service_tag, model_id, vendor_id, supplier_id,
            cerf, device_no, is_personal, purchase_date, warranty_expiry_date, is_written_off,
            teamviewer, imei1, imei2, ip, mac_addresses, assigned_to, equipment_sub_area_id,
            comment, updated_by, created, updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE
            teamviewer = VALUES(teamviewer),
            assigned_to = VALUES(assigned_to),
            equipment_sub_area_id = VALUES(equipment_sub_area_id),
            comment = VALUES(comment),
            updated_by = VALUES(updated_by),
            updated = CURRENT_TIMESTAMP`,
          [
            equipmentId, inventoryPeriodId, serviceTag, eq.model_id, eq.vendor_id, eq.supplier_id,
            eq.cerf, eq.device_no, eq.is_personal, eq.purchase_date, eq.warranty_expiry_date, eq.is_written_off,
            auditTeamviewer, eq.imei1, eq.imei2, eq.ip, eq.mac_addresses, auditAssignedTo, auditSubAreaId,
            auditComment, updatedBy
          ]
        );

        logger.info("Audit quick edit saved", { traceId, equipmentId, username: session.username });

        return Response.redirect(`/inventory-audit?search=${encodeURIComponent(serviceTag)}&success=${encodeURIComponent("Audit updated successfully")}`, 303);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to quick edit audit", err, { traceId });
        return Response.redirect(`/inventory-audit?error=${encodeURIComponent(errorMessage)}`, 303);
      }
    }

    // Audit Review - GET (page with Audit, Review, and Periods tabs)
    if (path === "/inventory-audit/review" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/inventory-audit/review", 302);
      }

      try {
        const userPlantId = await getUserPlantId(session.username, pool);

        // Get user's plant hierarchy for filtering (if not admin)
        let allowedPlantId: number | null = null;
        let allowedCountryId: number | null = null;
        let allowedRegionId: number | null = null;

        if (!isAdmin && userPlantId !== null) {
          allowedPlantId = userPlantId;
          const [plantInfo] = await pool.query<RowDataPacket[]>(
            `SELECT p.id, p.country_id, c.region_id
             FROM it_equipment_plant p
             LEFT JOIN it_equipment_country c ON p.country_id = c.id
             WHERE p.id = ? AND p.status = 1`,
            [userPlantId]
          );
          if (plantInfo.length > 0) {
            allowedCountryId = plantInfo[0].country_id;
            allowedRegionId = plantInfo[0].region_id;
          }
        }

        const { auditPage } = await import("./templates/audit");

        // Get inventory periods filtered by plant (only show periods that have audits for equipment in user's plant)
        let periodsQuery = `
          SELECT DISTINCT ip.id, ip.inventory_nr, ip.start_date, ip.end_date, ip.comment
          FROM it_inventory_period ip
          INNER JOIN it_equipment_audit a ON ip.id = a.inventory_period_id
          INNER JOIN it_equipment_sub_area sa ON a.equipment_sub_area_id = sa.id
          INNER JOIN it_equipment_area area ON sa.area_id = area.id
          INNER JOIN it_equipment_department d ON area.department_id = d.id
        `;

        const periodsParams: unknown[] = [];
        if (!isAdmin && allowedPlantId !== null) {
          periodsQuery += " WHERE d.plant_id = ?";
          periodsParams.push(allowedPlantId);
        }

        periodsQuery += " ORDER BY ip.start_date DESC";

        const [allPeriods] = await pool.query<RowDataPacket[]>(periodsQuery, periodsParams);

        // Get latest active inventory period (default) - also filtered by plant
        let latestPeriodsQuery = `
          SELECT DISTINCT ip.id, ip.inventory_nr, ip.start_date, ip.end_date, ip.comment
          FROM it_inventory_period ip
          INNER JOIN it_equipment_audit a ON ip.id = a.inventory_period_id
          INNER JOIN it_equipment_sub_area sa ON a.equipment_sub_area_id = sa.id
          INNER JOIN it_equipment_area area ON sa.area_id = area.id
          INNER JOIN it_equipment_department d ON area.department_id = d.id
          WHERE ip.end_date >= CURDATE()
        `;

        const latestPeriodsParams: unknown[] = [];
        if (!isAdmin && allowedPlantId !== null) {
          latestPeriodsQuery += " AND d.plant_id = ?";
          latestPeriodsParams.push(allowedPlantId);
        }

        latestPeriodsQuery += " ORDER BY ip.start_date DESC LIMIT 1";

        const [latestPeriods] = await pool.query<RowDataPacket[]>(latestPeriodsQuery, latestPeriodsParams);

        const defaultPeriod = latestPeriods.length > 0 ? latestPeriods[0] : (allPeriods.length > 0 ? allPeriods[0] : null);

        // Get all periods for the periods tab (admin only)
        const [allPeriodsForTab] = await pool.query<RowDataPacket[]>(
          `SELECT id, inventory_nr, start_date, end_date, comment, confirmed_by, created
           FROM it_inventory_period
           ORDER BY start_date DESC`
        );

        // Get success/error messages from URL params
        const success = url.searchParams.get("success");
        const error = url.searchParams.get("error");
        const message = success || error;
        const messageType: "success" | "error" | "info" = success ? "success" : error ? "error" : "info";

        // Get location data for edit modal
        const [
          [regions],
          [countries],
          [plants],
          [departments],
          [areas],
          [subAreas],
          [employees]
        ] = await Promise.all([
          pool.query<RowDataPacket[]>(`SELECT id, name FROM it_equipment_region WHERE status = 1 ORDER BY name`),
          pool.query<RowDataPacket[]>(`SELECT id, name, region_id as parent_id FROM it_equipment_country WHERE status = 1 ORDER BY name`),
          pool.query<RowDataPacket[]>(`SELECT id, name, country_id as parent_id FROM it_equipment_plant WHERE status = 1 ORDER BY name`),
          pool.query<RowDataPacket[]>(`SELECT id, name, plant_id as parent_id FROM it_equipment_department WHERE status = 1 ORDER BY name`),
          pool.query<RowDataPacket[]>(`SELECT id, name, department_id as parent_id FROM it_equipment_area WHERE status = 1 ORDER BY name`),
          pool.query<RowDataPacket[]>(`SELECT id, name, area_id as parent_id FROM it_equipment_sub_area WHERE status = 1 ORDER BY name`),
          pool.query<RowDataPacket[]>(`SELECT employee_no, name FROM it_employees_list WHERE status = 1 ORDER BY name`)
        ]);

        const locationData = { regions, countries, plants, departments, areas, subAreas };

        return new Response(
          auditPage(
            allPeriods as Parameters<typeof auditPage>[0],
            defaultPeriod as Parameters<typeof auditPage>[1],
            isAdmin,
            hasPcPwView,
            session.username,
            hasAuditApprover,
            allPeriodsForTab as Parameters<typeof auditPage>[6],
            message,
            messageType,
            locationData as Parameters<typeof auditPage>[9],
            employees as Parameters<typeof auditPage>[10]
          ),
          { headers: { "Content-Type": "text/html" } }
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to load audit review page", err, { traceId });
        return new Response(`Error: ${errorMessage}`, { status: 500 });
      }
    }

    // Audit Search - API
    if (path === "/api/inventory-audit/search" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const query = url.searchParams.get("q")?.trim();
        if (!query) {
          return new Response(JSON.stringify({ success: false, error: "Search query required" }), {
            headers: { "Content-Type": "application/json" }
          });
        }

        // Get equipment from main table with latest record from either (log+equipment) or audit using CTE
        const [equipment] = await pool.query<RowDataPacket[]>(`
          WITH latest_records AS (
            SELECT l.equipment_id, l.assigned_to, l.equipment_sub_area_id, e.teamviewer, l.comment, l.created as record_date
            FROM it_equipment_log l
            INNER JOIN it_equipment e ON l.equipment_id = e.id
            UNION ALL
            SELECT equipment_id, assigned_to, equipment_sub_area_id, teamviewer, comment, COALESCE(updated, created) as record_date
            FROM it_equipment_audit
          ),
          latest_per_equipment AS (
            SELECT lr.*
            FROM latest_records lr
            INNER JOIN (
              SELECT equipment_id, MAX(record_date) as max_date
              FROM latest_records
              GROUP BY equipment_id
            ) mx ON lr.equipment_id = mx.equipment_id AND lr.record_date = mx.max_date
          )
          SELECT
            e.id,
            e.service_tag,
            t.type_name as type_name,
            pl.name as product_line_name,
            m.name as model_name,
            v.name as vendor_name,
            COALESCE(lpe.teamviewer, e.teamviewer) as teamviewer,
            lpe.assigned_to,
            emp.name as assigned_to_name,
            (SELECT MAX(a.created) FROM it_equipment_audit a WHERE a.equipment_id = e.id) as latest_audit_date,
            e.purchase_date,
            e.warranty_expiry_date,
            e.is_written_off,
            wor.reason as write_off_reason,
            e.repair_status,
            r.id as region_id,
            r.name as region_name,
            c.id as country_id,
            c.name as country_name,
            p.id as plant_id,
            p.name as plant_name,
            d.id as department_id,
            d.name as department_name,
            ar.id as area_id,
            ar.name as area_name,
            sa.name as sub_area_name,
            lpe.equipment_sub_area_id,
            lpe.comment
          FROM it_equipment e
          LEFT JOIN latest_per_equipment lpe ON e.id = lpe.equipment_id
          LEFT JOIN it_equipment_model m ON e.model_id = m.id
          LEFT JOIN it_equipment_product_line pl ON m.product_line_id = pl.id
          LEFT JOIN it_equipment_type t ON pl.type_id = t.id
          LEFT JOIN it_equipment_vendor v ON e.vendor_id = v.id
          LEFT JOIN it_equipment_write_off_reason wor ON e.is_written_off = wor.id
          LEFT JOIN it_employees_list emp ON lpe.assigned_to = emp.employee_no
          LEFT JOIN it_equipment_sub_area sa ON lpe.equipment_sub_area_id = sa.id
          LEFT JOIN it_equipment_area ar ON sa.area_id = ar.id
          LEFT JOIN it_equipment_department d ON ar.department_id = d.id
          LEFT JOIN it_equipment_plant p ON d.plant_id = p.id
          LEFT JOIN it_equipment_country c ON p.country_id = c.id
          LEFT JOIN it_equipment_region r ON c.region_id = r.id
          WHERE e.service_tag = ?
          LIMIT 1
        `, [query]);

        if (equipment.length === 0) {
          return new Response(JSON.stringify({ success: false, error: "Not found" }), {
            headers: { "Content-Type": "application/json" }
          });
        }

        return new Response(JSON.stringify({ success: true, data: equipment[0] }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        logger.error("Audit search failed", err, { traceId });
        return new Response(JSON.stringify({ success: false, error: "Search failed" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Equipment History API - Get all log entries for a device
    if (path === "/api/equipment/history" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const equipmentId = url.searchParams.get("equipment_id");
        if (!equipmentId) {
          return new Response(JSON.stringify({ success: false, error: "Equipment ID required" }), {
            headers: { "Content-Type": "application/json" }
          });
        }

        // Get all log entries for this equipment with location and employee details
        const [logs] = await pool.query<RowDataPacket[]>(`
          SELECT
            l.id,
            l.created,
            l.assigned_to,
            emp.name as assigned_to_name,
            l.equipment_sub_area_id,
            CONCAT_WS(' - ', p.name, d.name, ar.name, sa.name) as location,
            l.comment,
            l.updated_by,
            upd.name as updated_by_name,
            l.is_written_off,
            wor.reason as write_off_reason,
            ip.inventory_nr
          FROM it_equipment_log l
          LEFT JOIN it_employees_list emp ON l.assigned_to = emp.employee_no
          LEFT JOIN it_employees_list upd ON l.updated_by = upd.employee_no
          LEFT JOIN it_equipment_sub_area sa ON l.equipment_sub_area_id = sa.id
          LEFT JOIN it_equipment_area ar ON sa.area_id = ar.id
          LEFT JOIN it_equipment_department d ON ar.department_id = d.id
          LEFT JOIN it_equipment_plant p ON d.plant_id = p.id
          LEFT JOIN it_inventory_period ip ON l.inventory_period_id = ip.id
          LEFT JOIN it_equipment_write_off_reason wor ON l.is_written_off = wor.id
          WHERE l.equipment_id = ?
          ORDER BY l.created DESC
          LIMIT 50
        `, [equipmentId]);

        return new Response(JSON.stringify({ success: true, data: logs }), {
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        logger.error("Equipment history fetch failed", err, { traceId });
        return new Response(JSON.stringify({ success: false, error: "Failed to fetch history" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // Audit Review - API (live updates)
    if (path === "/api/inventory-audit/review" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const userPlantId = await getUserPlantId(session.username, pool);

        if (!hasAuditApprover) {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }

        const inventoryPeriodId = url.searchParams.get("period_id");

        // Get user's plant for filtering (if not admin)
        let allowedPlantId: number | null = null;

        if (!isAdmin && userPlantId !== null) {
          allowedPlantId = userPlantId;
        }

        let query = `
          SELECT 
            a.id,
            a.equipment_id,
            a.inventory_period_id,
            a.service_tag,
            a.teamviewer,
            a.assigned_to,
            a.comment,
            a.updated_by,
            a.created,
            a.updated,
            ip.inventory_nr,
            CONCAT(emp.first_name, ' ', emp.last_name) as assigned_to_name,
            CONCAT_WS(' - ',
              r.name,
              c.name,
              p.name,
              d.name,
              a_loc.name,
              sa.name
            ) as location,
            CONCAT_WS(' - ',
              v.name,
              t.type_name,
              pl.name,
              m.name
            ) as equipment_type
          FROM it_equipment_audit a
          LEFT JOIN it_inventory_period ip ON a.inventory_period_id = ip.id
          LEFT JOIN it_employees_list emp ON a.assigned_to = emp.employee_no
          LEFT JOIN it_equipment_sub_area sa ON a.equipment_sub_area_id = sa.id
          LEFT JOIN it_equipment_area a_loc ON sa.area_id = a_loc.id
          LEFT JOIN it_equipment_department d ON a_loc.department_id = d.id
          LEFT JOIN it_equipment_plant p ON d.plant_id = p.id
          LEFT JOIN it_equipment_country c ON p.country_id = c.id
          LEFT JOIN it_equipment_region r ON c.region_id = r.id
          LEFT JOIN it_equipment e ON a.equipment_id = e.id
          LEFT JOIN it_equipment_model m ON e.model_id = m.id
          LEFT JOIN it_equipment_product_line pl ON m.product_line_id = pl.id
          LEFT JOIN it_equipment_type t ON pl.type_id = t.id
          LEFT JOIN it_equipment_vendor v ON e.vendor_id = v.id
        `;

        const params: unknown[] = [];
        const whereConditions: string[] = [];

        // Filter by plant if not admin
        if (!isAdmin && allowedPlantId !== null) {
          whereConditions.push("d.plant_id = ?");
          params.push(allowedPlantId);
        }

        // Filter by inventory period if specified
        if (inventoryPeriodId) {
          whereConditions.push("a.inventory_period_id = ?");
          params.push(parseInt(inventoryPeriodId));
        }

        if (whereConditions.length > 0) {
          query += " WHERE " + whereConditions.join(" AND ");
        }

        query += " ORDER BY a.updated DESC";

        const [auditRecords] = await pool.query<RowDataPacket[]>(query, params);

        return new Response(
          JSON.stringify({ success: true, data: auditRecords }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to fetch audit review data", err, { traceId });
        return new Response(
          JSON.stringify({ success: false, error: errorMessage }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }

    // Audit Review - Comparison view (latest unique service tags with current equipment data)
    if (path === "/api/inventory-audit/review-compare" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const userPlantId = await getUserPlantId(session.username, pool);

        if (!hasAuditApprover) {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }

        const inventoryPeriodId = url.searchParams.get("period_id");

        let allowedPlantId: number | null = null;
        if (!isAdmin && userPlantId !== null) {
          allowedPlantId = userPlantId;
        }

        // Get latest audit entry per unique service tag, joined with current equipment data
        let query = `
          SELECT
            a.id,
            a.equipment_id,
            a.service_tag,
            a.updated,
            a.updated_by,
            ip.inventory_nr,
            CONCAT_WS(' - ', v.name, t.type_name, pl.name, m.name) as equipment_type,
            /* --- Audit entry values --- */
            a.assigned_to as audit_assigned_to,
            CONCAT(a_emp.first_name, ' ', a_emp.last_name) as audit_assigned_to_name,
            CONCAT_WS(' - ', a_r.name, a_c.name, a_p.name, a_d.name, a_area.name, a_sa.name) as audit_location,
            a.teamviewer as audit_teamviewer,
            a.comment as audit_comment,
            a.is_written_off as audit_is_written_off,
            a_wor.reason as audit_write_off_reason,
            /* --- Current equipment values --- */
            log.assigned_to as equip_assigned_to,
            CONCAT(e_emp.first_name, ' ', e_emp.last_name) as equip_assigned_to_name,
            CONCAT_WS(' - ', e_r.name, e_c.name, e_p.name, e_d.name, e_area.name, e_sa.name) as equip_location,
            e.teamviewer as equip_teamviewer,
            log.comment as equip_comment,
            e.is_written_off as equip_is_written_off,
            e_wor.reason as equip_write_off_reason
          FROM it_equipment_audit a
          INNER JOIN (
            SELECT service_tag, MAX(updated) as max_updated
            FROM it_equipment_audit
            GROUP BY service_tag
          ) latest ON a.service_tag = latest.service_tag AND a.updated = latest.max_updated
          LEFT JOIN it_inventory_period ip ON a.inventory_period_id = ip.id
          /* Audit location chain */
          LEFT JOIN it_employees_list a_emp ON a.assigned_to = a_emp.employee_no
          LEFT JOIN it_equipment_sub_area a_sa ON a.equipment_sub_area_id = a_sa.id
          LEFT JOIN it_equipment_area a_area ON a_sa.area_id = a_area.id
          LEFT JOIN it_equipment_department a_d ON a_area.department_id = a_d.id
          LEFT JOIN it_equipment_plant a_p ON a_d.plant_id = a_p.id
          LEFT JOIN it_equipment_country a_c ON a_p.country_id = a_c.id
          LEFT JOIN it_equipment_region a_r ON a_c.region_id = a_r.id
          LEFT JOIN it_equipment_write_off_reason a_wor ON a.is_written_off = a_wor.id
          /* Equipment + latest log */
          LEFT JOIN it_equipment e ON a.equipment_id = e.id
          LEFT JOIN it_equipment_model m ON e.model_id = m.id
          LEFT JOIN it_equipment_product_line pl ON m.product_line_id = pl.id
          LEFT JOIN it_equipment_type t ON pl.type_id = t.id
          LEFT JOIN it_equipment_vendor v ON e.vendor_id = v.id
          LEFT JOIN (
            SELECT l1.* FROM it_equipment_log l1
            INNER JOIN (
              SELECT equipment_id, MAX(created) as max_created
              FROM it_equipment_log
              GROUP BY equipment_id
            ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
          ) log ON e.id = log.equipment_id
          LEFT JOIN it_employees_list e_emp ON log.assigned_to = e_emp.employee_no
          LEFT JOIN it_equipment_sub_area e_sa ON log.equipment_sub_area_id = e_sa.id
          LEFT JOIN it_equipment_area e_area ON e_sa.area_id = e_area.id
          LEFT JOIN it_equipment_department e_d ON e_area.department_id = e_d.id
          LEFT JOIN it_equipment_plant e_p ON e_d.plant_id = e_p.id
          LEFT JOIN it_equipment_country e_c ON e_p.country_id = e_c.id
          LEFT JOIN it_equipment_region e_r ON e_c.region_id = e_r.id
          LEFT JOIN it_equipment_write_off_reason e_wor ON e.is_written_off = e_wor.id
        `;

        const params: unknown[] = [];
        const whereConditions: string[] = [];

        if (!isAdmin && allowedPlantId !== null) {
          whereConditions.push("a_d.plant_id = ?");
          params.push(allowedPlantId);
        }

        if (inventoryPeriodId) {
          whereConditions.push("a.inventory_period_id = ?");
          params.push(parseInt(inventoryPeriodId));
        }

        if (whereConditions.length > 0) {
          query += " WHERE " + whereConditions.join(" AND ");
        }

        query += " ORDER BY a.updated DESC";

        const [rows] = await pool.query<RowDataPacket[]>(query, params);

        // Build comparison data per row
        const data = rows.map(r => {
          const auditAssigned = r.audit_assigned_to
            ? r.audit_assigned_to + (r.audit_assigned_to_name ? ' - ' + r.audit_assigned_to_name : '')
            : null;
          const equipAssigned = r.equip_assigned_to
            ? r.equip_assigned_to + (r.equip_assigned_to_name ? ' - ' + r.equip_assigned_to_name : '')
            : null;
          const auditTv = r.audit_teamviewer != null ? String(r.audit_teamviewer) : null;
          const equipTv = r.equip_teamviewer != null ? String(r.equip_teamviewer) : null;
          const auditWo = r.audit_is_written_off ? (r.audit_write_off_reason || 'Yes') : 'No';
          const equipWo = r.equip_is_written_off ? (r.equip_write_off_reason || 'Yes') : 'No';

          const diffs = {
            assigned_to: (auditAssigned || '') !== (equipAssigned || ''),
            location: (r.audit_location || '') !== (r.equip_location || ''),
            teamviewer: (auditTv || '') !== (equipTv || ''),
            comment: (r.audit_comment || '') !== (r.equip_comment || ''),
            is_written_off: auditWo !== equipWo,
          };

          const hasChanges = Object.values(diffs).some(Boolean);

          return {
            id: r.id,
            equipment_id: r.equipment_id,
            service_tag: r.service_tag,
            updated: r.updated,
            updated_by: r.updated_by,
            inventory_nr: r.inventory_nr,
            equipment_type: r.equipment_type,
            hasChanges,
            diffs,
            audit: {
              assigned_to: auditAssigned,
              location: r.audit_location || null,
              teamviewer: auditTv,
              comment: r.audit_comment || null,
              is_written_off: auditWo,
            },
            equipment: {
              assigned_to: equipAssigned,
              location: r.equip_location || null,
              teamviewer: equipTv,
              comment: r.equip_comment || null,
              is_written_off: equipWo,
            },
          };
        });

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to fetch audit review comparison data", err, { traceId });
        return new Response(
          JSON.stringify({ success: false, error: errorMessage }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Audit Review - CSV Export
    if (path === "/inventory-audit/review/export" && req.method === "GET") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return Response.redirect("/login?redirect=/inventory-audit/review", 302);
      }

      try {
        const userPlantId = await getUserPlantId(session.username, pool);

        if (!hasAuditApprover) {
          const { errorPage } = await import("./templates/error");
          return new Response(
            errorPage(
              "Access Denied",
              "You do not have permission to export audit review data.",
              "You need the 'audit-approver' permission to export audit reviews. Please contact your administrator if you need access.",
              403,
              isAdmin,
              hasPcPwView,
              session.username,
              false
            ),
            {
              status: 403,
              headers: { "Content-Type": "text/html" }
            }
          );
        }

        const inventoryPeriodId = url.searchParams.get("period_id");

        // Get user's plant for filtering (if not admin)
        let allowedPlantId: number | null = null;

        if (!isAdmin && userPlantId !== null) {
          allowedPlantId = userPlantId;
        }

        let query = `
          SELECT 
            a.service_tag,
            a.teamviewer,
            a.assigned_to,
            CONCAT(emp.first_name, ' ', emp.last_name) as assigned_to_name,
            CONCAT_WS(' - ',
              r.name,
              c.name,
              p.name,
              d.name,
              a_loc.name,
              sa.name
            ) as location,
            CONCAT_WS(' - ',
              v.name,
              t.type_name,
              pl.name,
              m.name
            ) as equipment_type,
            a.comment,
            a.updated_by,
            DATE_FORMAT(a.created, '%Y-%m-%d %H:%i:%s') as created,
            DATE_FORMAT(a.updated, '%Y-%m-%d %H:%i:%s') as updated,
            ip.inventory_nr
          FROM it_equipment_audit a
          LEFT JOIN it_inventory_period ip ON a.inventory_period_id = ip.id
          LEFT JOIN it_employees_list emp ON a.assigned_to = emp.employee_no
          LEFT JOIN it_equipment_sub_area sa ON a.equipment_sub_area_id = sa.id
          LEFT JOIN it_equipment_area a_loc ON sa.area_id = a_loc.id
          LEFT JOIN it_equipment_department d ON a_loc.department_id = d.id
          LEFT JOIN it_equipment_plant p ON d.plant_id = p.id
          LEFT JOIN it_equipment_country c ON p.country_id = c.id
          LEFT JOIN it_equipment_region r ON c.region_id = r.id
          LEFT JOIN it_equipment e ON a.equipment_id = e.id
          LEFT JOIN it_equipment_model m ON e.model_id = m.id
          LEFT JOIN it_equipment_product_line pl ON m.product_line_id = pl.id
          LEFT JOIN it_equipment_type t ON pl.type_id = t.id
          LEFT JOIN it_equipment_vendor v ON e.vendor_id = v.id
        `;

        const params: unknown[] = [];
        const whereConditions: string[] = [];

        // Filter by plant if not admin
        if (!isAdmin && allowedPlantId !== null) {
          whereConditions.push("d.plant_id = ?");
          params.push(allowedPlantId);
        }

        // Filter by inventory period if specified
        if (inventoryPeriodId) {
          whereConditions.push("a.inventory_period_id = ?");
          params.push(parseInt(inventoryPeriodId));
        }

        if (whereConditions.length > 0) {
          query += " WHERE " + whereConditions.join(" AND ");
        }

        query += " ORDER BY a.updated DESC";

        const [auditRecords] = await pool.query<RowDataPacket[]>(query, params);

        // Generate CSV
        const headers = [
          "Service Tag",
          "TeamViewer",
          "Assigned To",
          "Assigned To Name",
          "Location",
          "Equipment Type",
          "Comment",
          "Updated By",
          "Created",
          "Updated",
          "Inventory Period"
        ];

        const csvRows = [
          headers.join(","),
          ...auditRecords.map(row => [
            `"${(row.service_tag || "").replace(/"/g, '""')}"`,
            `"${(row.teamviewer || "").toString().replace(/"/g, '""')}"`,
            `"${(row.assigned_to || "").replace(/"/g, '""')}"`,
            `"${(row.assigned_to_name || "").replace(/"/g, '""')}"`,
            `"${(row.location || "").replace(/"/g, '""')}"`,
            `"${(row.equipment_type || "").replace(/"/g, '""')}"`,
            `"${(row.comment || "").replace(/"/g, '""')}"`,
            `"${(row.updated_by || "").replace(/"/g, '""')}"`,
            `"${(row.created || "").replace(/"/g, '""')}"`,
            `"${(row.updated || "").replace(/"/g, '""')}"`,
            `"${(row.inventory_nr || "").replace(/"/g, '""')}"`
          ].join(","))
        ];

        const csv = csvRows.join("\n");
        const timestamp = new Date().toISOString().split('T')[0];

        return new Response(csv, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="inventory-audit-${timestamp}.csv"`
          }
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to export audit review", err, { traceId });
        return new Response(`Error: ${errorMessage}`, { status: 500 });
      }
    }

    // Audit Review - Apply to Main Table
    if (path === "/api/inventory-audit/apply" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const userPlantId = await getUserPlantId(session.username, pool);

        if (!hasAuditApprover) {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }

        const body = await req.json();
        const serviceTag = body.service_tag?.toString();

        if (!serviceTag) {
          return new Response(JSON.stringify({ error: "Service tag is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Get the latest audit entry for this service tag
        const [auditEntries] = await pool.query<RowDataPacket[]>(
          `SELECT a.*, e.id as equipment_id
           FROM it_equipment_audit a
           INNER JOIN it_equipment e ON a.equipment_id = e.id
           WHERE a.service_tag = ?
           ORDER BY a.updated DESC
           LIMIT 1`,
          [serviceTag]
        );

        if (auditEntries.length === 0) {
          return new Response(JSON.stringify({ error: "No audit entry found for this service tag" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }

        const audit = auditEntries[0];

        // Resolve employee_no for updated_by; use null for admin users (admin doesn't have employee_no)
        const employeeNo = await getEmployeeNo(session.username, pool);
        const updatedBy = isAdminUser(session.username) ? null : (employeeNo || null);

        // Update main equipment table (teamviewer only, as other fields shouldn't change)
        if (audit.teamviewer !== null) {
          await pool.query(
            "UPDATE it_equipment SET teamviewer = ?, updated = CURRENT_TIMESTAMP WHERE id = ?",
            [audit.teamviewer, audit.equipment_id]
          );
        }

        // Insert new log entry with audit data
        await pool.query(
          `INSERT INTO it_equipment_log (
            equipment_id, service_tag, assigned_to, equipment_sub_area_id, 
            inventory_period_id, comment, updated_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            audit.equipment_id,
            audit.service_tag,
            audit.assigned_to,
            audit.equipment_sub_area_id,
            audit.inventory_period_id,
            audit.comment,
            updatedBy
          ]
        );

        logger.info("Audit entry applied to main table", { traceId, serviceTag, equipmentId: audit.equipment_id, username: session.username });

        return new Response(
          JSON.stringify({ success: true, message: "Audit entry applied successfully" }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to apply audit entry", err, { traceId });
        return new Response(
          JSON.stringify({ success: false, error: errorMessage }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }

    // Audit Review - Apply Latest for All Service Tags
    if (path === "/api/inventory-audit/apply-all" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        const userPlantId = await getUserPlantId(session.username, pool);

        if (!hasAuditApprover) {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }

        const body = await req.json();
        const inventoryPeriodId = body.period_id ? parseInt(body.period_id.toString()) : null;

        // Resolve employee_no for updated_by; use null for admin users (admin doesn't have employee_no)
        const employeeNo = await getEmployeeNo(session.username, pool);
        const updatedBy = isAdminUser(session.username) ? null : (employeeNo || null);

        // Get latest audit entry for each unique service tag
        // If period_id is provided, only consider audits from that period
        let latestAuditsQuery = `
          SELECT a1.*, e.id as equipment_id
          FROM it_equipment_audit a1
          INNER JOIN it_equipment e ON a1.equipment_id = e.id
          INNER JOIN (
            SELECT service_tag, MAX(updated) as max_updated
            FROM it_equipment_audit
            ${inventoryPeriodId ? 'WHERE inventory_period_id = ?' : ''}
            GROUP BY service_tag
          ) a2 ON a1.service_tag = a2.service_tag AND a1.updated = a2.max_updated
          ${inventoryPeriodId ? 'WHERE a1.inventory_period_id = ?' : ''}
        `;

        const params: unknown[] = [];
        if (inventoryPeriodId) {
          params.push(inventoryPeriodId);
          params.push(inventoryPeriodId);
        }

        const [latestAudits] = await pool.query<RowDataPacket[]>(latestAuditsQuery, params);

        let appliedCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        // Apply each audit entry
        for (const audit of latestAudits) {
          try {
            // Update main equipment table (teamviewer only)
            if (audit.teamviewer !== null) {
              await pool.query(
                "UPDATE it_equipment SET teamviewer = ?, updated = CURRENT_TIMESTAMP WHERE id = ?",
                [audit.teamviewer, audit.equipment_id]
              );
            }

            // Insert new log entry with audit data
            await pool.query(
              `INSERT INTO it_equipment_log (
                equipment_id, service_tag, assigned_to, equipment_sub_area_id, 
                inventory_period_id, comment, updated_by
              ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                audit.equipment_id,
                audit.service_tag,
                audit.assigned_to,
                audit.equipment_sub_area_id,
                audit.inventory_period_id,
                audit.comment,
                updatedBy
              ]
            );

            appliedCount++;
          } catch (err) {
            errorCount++;
            const errorMsg = err instanceof Error ? err.message : "Unknown error";
            errors.push(`${audit.service_tag}: ${errorMsg}`);
            logger.error("Failed to apply audit entry for service tag", { traceId, serviceTag: audit.service_tag, error: errorMsg });
          }
        }

        logger.info("Bulk audit apply completed", { traceId, appliedCount, errorCount, username: session.username });

        return new Response(
          JSON.stringify({
            success: true,
            message: `Applied ${appliedCount} audit entries${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
            applied: appliedCount,
            errors: errorCount,
            errorDetails: errors.length > 0 ? errors : undefined
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to apply all audit entries", err, { traceId });
        return new Response(
          JSON.stringify({ success: false, error: errorMessage }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" }
          }
        );
      }
    }

    // Get printers from Bartender
    if (path === "/api/printers" && req.method === "GET") {
      try {
        logger.info("Fetching printers from Bartender", { traceId });
        const bartenderHost = process.env.BARTENDER_HOST || "http://eeprt01/";
        const host = bartenderHost.replace(/\/$/, "");
        const printersUrl = `${host}/integration/getprinters/execute`;

        const response = await fetch(printersUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          logger.error("Bartender API error", { traceId, status: response.status });
          throw new Error(`Bartender API returned ${response.status}`);
        }

        let responseText = await response.text();
        // Remove BOM if present
        responseText = responseText.replace(/^\uFEFF/, "");

        const apiData = JSON.parse(responseText) as Array<{
          Location?: string;
          DriverName?: string;
          PortName?: string;
          Name?: string;
        }>;

        // Transform API response
        const result = apiData
          .map((printer) => {
            const location = printer.Location || "";
            let department = "";
            let area = "";

            // Split location on dash (-) and trim both parts
            if (location.includes("-")) {
              const locationParts = location.split("-", 2);
              department = locationParts[0].trim();
              area = (locationParts[1] || "").trim();
              if (!area) {
                area = department;
              }
            } else {
              department = location.trim();
              area = department;
            }

            const driver = (printer.DriverName || "").toLowerCase();
            let type = "A4";

            // Determine paper type based on driver
            if (
              driver.includes("intermec") ||
              driver.includes("honeywell") ||
              driver.includes("easycoder")
            ) {
              type = "sticker";
            } else if (driver.includes("brother")) {
              type = "sticker-tiny";
            }

            // Clean IP address by removing suffix after underscore
            const cleanIp = (printer.PortName || "").split("_")[0];

            // Only return label/sticker printers
            if (type === "sticker" || type === "sticker-tiny") {
              return {
                name: printer.Name,
                ip: cleanIp,
                department: department,
                area: area,
                driver: printer.DriverName || "",
                type: type,
              };
            }

            return null;
          })
          .filter((item) => item !== null) as Array<{
            name: string;
            ip: string;
            department: string;
            area: string;
            driver: string;
            type: string;
          }>;

        logger.info("Printers fetched successfully", { traceId, count: result.length });
        return new Response(JSON.stringify({ success: true, data: result }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to fetch printers", err, { traceId });
        return new Response(
          JSON.stringify({
            error: true,
            message: "Failed to fetch printers. Printer server may be offline or the API may be down.",
            details: errorMessage,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Get printers from Bartender
    if (path === "/api/printers/all" && req.method === "GET") {
      try {
        logger.info("Fetching all printers from Bartender", { traceId });
        const bartenderHost = process.env.BARTENDER_HOST || "http://eeprt01/";
        const host = bartenderHost.replace(/\/$/, "");
        const printersUrl = `${host}/integration/getprinters/execute`;

        const response = await fetch(printersUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          logger.error("Bartender API error", { traceId, status: response.status });
          throw new Error(`Bartender API returned ${response.status}`);
        }

        let responseText = await response.text();
        // Remove BOM if present
        responseText = responseText.replace(/^\uFEFF/, "");

        const apiData = JSON.parse(responseText) as Array<{
          Location?: string;
          DriverName?: string;
          PortName?: string;
          Name?: string;
        }>;

        // Transform API response
        const result = apiData
          .map((printer) => {
            const location = printer.Location || "";
            let department = "";
            let area = "";

            // Split location on dash (-) and trim both parts
            if (location.includes("-")) {
              const locationParts = location.split("-", 2);
              department = locationParts[0].trim();
              area = (locationParts[1] || "").trim();
              if (!area) {
                area = department;
              }
            } else {
              department = location.trim();
              area = department;
            }




            // Clean IP address by removing suffix after underscore
            const cleanIp = (printer.PortName || "").split("_")[0];

            // Only return label/sticker printers
            return {
              name: printer.Name,
              ip: cleanIp,
              department: department,
              area: area,
              driver: printer.DriverName || "",
            };
          })
          .filter((item) => item !== null) as Array<{
            name: string;
            ip: string;
            department: string;
            area: string;
            driver: string;
            type: string;
          }>;

        logger.info("All printers fetched successfully", { traceId, count: result.length });
        return new Response(JSON.stringify({ success: true, data: result }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to fetch all printers", err, { traceId });
        return new Response(
          JSON.stringify({
            error: true,
            message: "Failed to fetch printers. Printer server may be offline or the API may be down.",
            details: errorMessage,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Dell warranty API
    if (path.startsWith("/api/dell-warranty/") && req.method === "GET") {
      const serviceTag = path.replace("/api/dell-warranty/", "");

      if (!serviceTag) {
        return new Response(
          JSON.stringify({ success: false, message: "Service tag is required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      try {
        const { getDellWarrantyInfo, isDellApiConfigured } = await import("./utils/dell");

        if (!isDellApiConfigured()) {
          return new Response(
            JSON.stringify({ success: false, message: "Dell API is not configured" }),
            { status: 503, headers: { "Content-Type": "application/json" } }
          );
        }

        const result = await getDellWarrantyInfo(serviceTag);
        return new Response(JSON.stringify(result), {
          status: result.success ? 200 : 404,
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Dell API error", { traceId, serviceTag, error: errorMessage });
        return new Response(
          JSON.stringify({ success: false, message: errorMessage }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Print label API
    if (path === "/api/print" && req.method === "POST") {
      try {
        const body = await req.json();
        const validated = printLabelSchema.parse(body);
        const service_tag = validated.service_tag;
        const printer = validated.printer || "EERAK-PRT103";
        const bartenderHost = process.env.BARTENDER_HOST || "http://eeprt01/";

        // Remove trailing slash from host if present
        const host = bartenderHost.replace(/\/$/, "");
        const printUrl = `${host}/Integration/ServiceTag/Execute`;

        const response = await fetch(printUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            service_tag: service_tag,
            printer: printer,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return new Response(
            JSON.stringify({ error: `Bartender error: ${errorText}` }),
            {
              status: response.status,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        return new Response(JSON.stringify({ success: true, message: "Label sent to printer" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Print printer name tag API
    if (path === "/api/print-printer-tag" && req.method === "POST") {
      try {
        const body = await req.json();
        const validated = printPrinterTagSchema.parse(body);
        const printer_name = validated.printer_name;
        const printer = validated.printer;
        logger.info("Print printer tag request", { traceId, printer_name, printer });
        const bartenderHost = process.env.BARTENDER_HOST || "http://eeprt01/";

        // Remove trailing slash from host if present
        const host = bartenderHost.replace(/\/$/, "");
        const printUrl = `${host}/Integration/PrinterTag/Execute`;

        const response = await fetch(printUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            printer_name: printer_name,
            printer: printer,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error("Bartender print error", { traceId, printer_name, printer, status: response.status, error: errorText });
          return new Response(
            JSON.stringify({ error: `Bartender error: ${errorText}` }),
            {
              status: response.status,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        logger.info("Printer tag sent successfully", { traceId, printer_name, printer });
        return new Response(JSON.stringify({ success: true, message: "Printer name tag sent to printer" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Print printer tag failed", err, { traceId });
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // API Routes for adding new items
    if (path.startsWith("/api/") && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return new Response(JSON.stringify({ error: "Authentication required" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const apiType = path.replace("/api/", "");

      try {
        const validated = apiAddItemSchema.parse(body);
        const name = validated.name;
        const parent_id = validated.parent_id;

        const employeeNo = await getEmployeeNo(session.username, pool);
        const clientIp = getClientIp(req);

        let hasPermission = false;
        let permissionRequired = "";
        let actionType = "";
        let actionData: Record<string, unknown> = { name };

        if (parent_id !== undefined) {
          actionData.parent_id = parent_id;
        }

        // Determine permission and action type based on API endpoint
        switch (apiType) {
          case "regions":
          case "countries":
          case "plants":
          case "departments":
          case "areas":
          case "sub-areas":
            permissionRequired = "locations_add";
            actionType = `add_${apiType.slice(0, -1)}`; // remove 's' from plural
            hasPermission = await hasLocationsAddPermission(session.username, pool);
            break;
          case "types":
          case "product-lines":
          case "models":
            permissionRequired = "types_add";
            actionType = `add_${apiType.replace("-", "_")}`;
            hasPermission = await hasTypesAddPermission(session.username, pool);
            break;
          case "vendors":
          case "suppliers":
            permissionRequired = "vendors_add";
            actionType = `add_${apiType.slice(0, -1)}`; // remove 's' from plural
            hasPermission = await hasVendorsAddPermission(session.username, pool);
            break;
          default:
            return new Response(JSON.stringify({ error: "Unknown API endpoint" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
        }

        // If no permission, create approval request
        if (!hasPermission) {
          if (!employeeNo) {
            return new Response(JSON.stringify({ error: "Unable to create approval request. Please contact your administrator." }), {
              status: 403,
              headers: { "Content-Type": "application/json" },
            });
          }

          const requestId = await createApprovalRequest(
            employeeNo,
            permissionRequired,
            actionType,
            actionData,
            clientIp,
            pool
          );

          if (requestId) {
            return new Response(JSON.stringify({
              message: "Approval request created",
              requestId,
              status: "pending_approval"
            }), {
              status: 202,
              headers: { "Content-Type": "application/json" },
            });
          } else {
            return new Response(JSON.stringify({ error: "Failed to create approval request. Please contact your administrator." }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        // User has permission, proceed with direct insert
        let result: ResultSetHeader;

        switch (apiType) {
          case "regions":
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_region (name, status) VALUES (?, 1)",
              [name]
            );
            break;
          case "countries":
            if (!parent_id) throw new Error("Region is required");
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_country (name, region_id, status) VALUES (?, ?, 1)",
              [name, parent_id]
            );
            break;
          case "plants":
            if (!parent_id) throw new Error("Country is required");
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_plant (name, country_id, status) VALUES (?, ?, 1)",
              [name, parent_id]
            );
            break;
          case "departments":
            if (!parent_id) throw new Error("Plant is required");
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_department (name, plant_id, status) VALUES (?, ?, 1)",
              [name, parent_id]
            );
            break;
          case "areas":
            if (!parent_id) throw new Error("Department is required");
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_area (name, department_id, status) VALUES (?, ?, 1)",
              [name, parent_id]
            );
            break;
          case "sub-areas":
            if (!parent_id) throw new Error("Area is required");
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_sub_area (name, area_id, status) VALUES (?, ?, 1)",
              [name, parent_id]
            );
            break;
          case "types":
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_type (type_name, status) VALUES (?, 1)",
              [name]
            );
            break;
          case "product-lines":
            if (!parent_id) throw new Error("Type is required");
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_product_line (name, type_id, status) VALUES (?, ?, 1)",
              [name, parent_id]
            );
            break;
          case "models":
            if (!parent_id) throw new Error("Product Line is required");
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_model (name, product_line_id, status) VALUES (?, ?, 1)",
              [name, parent_id]
            );
            break;
          case "vendors":
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_vendor (name) VALUES (?)",
              [name]
            );
            break;
          case "suppliers":
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_supplier (name) VALUES (?)",
              [name]
            );
            break;
          default:
            return new Response(JSON.stringify({ error: "Unknown API endpoint" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ id: result.insertId, name }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response("Not found", { status: 404 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    logger.error("Request handler error", err, { traceId, path });
    return new Response(searchPage("", null, errorMessage, false, false), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}

async function getAuditData(id: number, userPlantId: number | null = null, isAdmin: boolean = false): Promise<EditDataType | null> {
  // Get equipment with latest log entry joined
  const [equipment] = await pool.query<RowDataPacket[]>(`
    SELECT 
      e.*,
      t.id as type_id,
      t.type_name,
      pl.id as product_line_id,
      pl.name as product_line_name,
      m.name as model_name,
      v.name as vendor_name,
      log.assigned_to,
      log.equipment_sub_area_id,
      log.inventory_period_id,
      log.comment,
      CONCAT(emp.first_name, ' ', emp.last_name) as assigned_to_name,
      ip.inventory_nr,
      sa.area_id,
      a.department_id,
      d.plant_id,
      p.country_id,
      c.region_id,
      log.created as latest_audit_date,
      wor.reason as write_off_reason
    FROM it_equipment e
    LEFT JOIN it_equipment_model m ON e.model_id = m.id
    LEFT JOIN it_equipment_product_line pl ON m.product_line_id = pl.id
    LEFT JOIN it_equipment_type t ON pl.type_id = t.id
    LEFT JOIN it_equipment_vendor v ON e.vendor_id = v.id
    LEFT JOIN (
      SELECT l1.* FROM it_equipment_log l1
      INNER JOIN (
        SELECT equipment_id, MAX(created) as max_created
        FROM it_equipment_log
        GROUP BY equipment_id
      ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
    ) log ON e.id = log.equipment_id
    LEFT JOIN it_employees_list emp ON log.assigned_to = emp.employee_no
    LEFT JOIN it_inventory_period ip ON log.inventory_period_id = ip.id
    LEFT JOIN it_equipment_sub_area sa ON log.equipment_sub_area_id = sa.id
    LEFT JOIN it_equipment_area a ON sa.area_id = a.id
    LEFT JOIN it_equipment_department d ON a.department_id = d.id
    LEFT JOIN it_equipment_plant p ON d.plant_id = p.id
    LEFT JOIN it_equipment_country c ON p.country_id = c.id
    LEFT JOIN it_equipment_write_off_reason wor ON e.is_written_off = wor.id
    WHERE e.id = ?
  `, [id]);

  if (equipment.length === 0) {
    return null;
  }

  // Get user's plant hierarchy if not admin and userPlantId is provided
  let allowedRegionId: number | null = null;
  let allowedCountryId: number | null = null;
  let allowedPlantId: number | null = userPlantId;

  if (!isAdmin && userPlantId !== null) {
    // Get the country and region for the user's plant
    const [plantInfo] = await pool.query<RowDataPacket[]>(
      `SELECT p.id, p.country_id, c.region_id
       FROM it_equipment_plant p
       LEFT JOIN it_equipment_country c ON p.country_id = c.id
       WHERE p.id = ? AND p.status = 1`,
      [userPlantId]
    );

    if (plantInfo.length > 0) {
      allowedCountryId = plantInfo[0].country_id;
      allowedRegionId = plantInfo[0].region_id;
    }
  }

  // Get all lookup data in parallel with plant-based filtering
  const [
    [regions],
    [countries],
    [plants],
    [departments],
    [areas],
    [subAreas],
    [types],
    [productLines],
    [models],
    [employees],
    [inventoryPeriods],
    [vendors],
    [suppliers],
    [writeOffReasons]
  ] = await Promise.all([
    // Regions: only show if admin or matches user's region
    !isAdmin && allowedRegionId !== null
      ? pool.query<RowDataPacket[]>(`SELECT id, name FROM it_equipment_region WHERE status = 1 AND id = ? ORDER BY name`, [allowedRegionId])
      : pool.query<RowDataPacket[]>(`SELECT id, name FROM it_equipment_region WHERE status = 1 ORDER BY name`),
    // Countries: only show if admin or matches user's country
    !isAdmin && allowedCountryId !== null
      ? pool.query<RowDataPacket[]>(`SELECT id, name, region_id as parent_id FROM it_equipment_country WHERE status = 1 AND id = ? ORDER BY name`, [allowedCountryId])
      : pool.query<RowDataPacket[]>(`SELECT id, name, region_id as parent_id FROM it_equipment_country WHERE status = 1 ORDER BY name`),
    // Plants: only show if admin or matches user's plant
    !isAdmin && allowedPlantId !== null
      ? pool.query<RowDataPacket[]>(`SELECT id, name, country_id as parent_id FROM it_equipment_plant WHERE status = 1 AND id = ? ORDER BY name`, [allowedPlantId])
      : pool.query<RowDataPacket[]>(`SELECT id, name, country_id as parent_id FROM it_equipment_plant WHERE status = 1 ORDER BY name`),
    // Departments: only show if admin or belongs to user's plant
    !isAdmin && allowedPlantId !== null
      ? pool.query<RowDataPacket[]>(`SELECT id, name, plant_id as parent_id FROM it_equipment_department WHERE status = 1 AND plant_id = ? ORDER BY name`, [allowedPlantId])
      : pool.query<RowDataPacket[]>(`SELECT id, name, plant_id as parent_id FROM it_equipment_department WHERE status = 1 ORDER BY name`),
    // Areas: only show if admin or belongs to departments in user's plant
    !isAdmin && allowedPlantId !== null
      ? pool.query<RowDataPacket[]>(`SELECT a.id, a.name, a.department_id as parent_id FROM it_equipment_area a JOIN it_equipment_department d ON a.department_id = d.id WHERE a.status = 1 AND d.plant_id = ? ORDER BY a.name`, [allowedPlantId])
      : pool.query<RowDataPacket[]>(`SELECT id, name, department_id as parent_id FROM it_equipment_area WHERE status = 1 ORDER BY name`),
    // Sub Areas: only show if admin or belongs to areas in user's plant
    !isAdmin && allowedPlantId !== null
      ? pool.query<RowDataPacket[]>(`SELECT sa.id, sa.name, sa.area_id as parent_id FROM it_equipment_sub_area sa JOIN it_equipment_area a ON sa.area_id = a.id JOIN it_equipment_department d ON a.department_id = d.id WHERE sa.status = 1 AND d.plant_id = ? ORDER BY sa.name`, [allowedPlantId])
      : pool.query<RowDataPacket[]>(`SELECT id, name, area_id as parent_id FROM it_equipment_sub_area WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, type_name as name FROM it_equipment_type WHERE status = 1 ORDER BY type_name`),
    pool.query<RowDataPacket[]>(`SELECT id, name, type_id as parent_id FROM it_equipment_product_line WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name, product_line_id as parent_id FROM it_equipment_model WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT employee_no, CONCAT(first_name, ' ', last_name) as name FROM it_employees_list WHERE status = 1 ORDER BY last_name, first_name`),
    pool.query<RowDataPacket[]>(`SELECT id, inventory_nr as name, start_date, end_date FROM it_inventory_period ORDER BY start_date DESC`),
    pool.query<RowDataPacket[]>(`SELECT id, name FROM it_equipment_vendor ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name FROM it_equipment_supplier ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, reason as name FROM it_equipment_write_off_reason ORDER BY reason`)
  ]);

  return {
    equipment: equipment[0],
    regions,
    countries,
    plants,
    departments,
    areas,
    subAreas,
    types,
    productLines,
    models,
    employees,
    inventoryPeriods,
    vendors,
    suppliers,
    writeOffReasons
  } as unknown as EditDataType;
}

async function getAddData(serviceTag: string, userPlantId: number | null = null, isAdmin: boolean = false): Promise<AddDataType> {
  // Get user's plant hierarchy if not admin and userPlantId is provided
  let allowedRegionId: number | null = null;
  let allowedCountryId: number | null = null;
  let allowedPlantId: number | null = userPlantId;

  if (!isAdmin && userPlantId !== null) {
    // Get the country and region for the user's plant
    const [plantInfo] = await pool.query<RowDataPacket[]>(
      `SELECT p.id, p.country_id, c.region_id
       FROM it_equipment_plant p
       LEFT JOIN it_equipment_country c ON p.country_id = c.id
       WHERE p.id = ? AND p.status = 1`,
      [userPlantId]
    );

    if (plantInfo.length > 0) {
      allowedCountryId = plantInfo[0].country_id;
      allowedRegionId = plantInfo[0].region_id;
    }
  }

  const [
    [regions],
    [countries],
    [plants],
    [departments],
    [areas],
    [subAreas],
    [types],
    [productLines],
    [models],
    [vendors],
    [suppliers],
    [employees],
    [inventoryPeriods]
  ] = await Promise.all([
    // Regions: only show if admin or matches user's region
    !isAdmin && allowedRegionId !== null
      ? pool.query<RowDataPacket[]>(`SELECT id, name FROM it_equipment_region WHERE status = 1 AND id = ? ORDER BY name`, [allowedRegionId])
      : pool.query<RowDataPacket[]>(`SELECT id, name FROM it_equipment_region WHERE status = 1 ORDER BY name`),
    // Countries: only show if admin or matches user's country
    !isAdmin && allowedCountryId !== null
      ? pool.query<RowDataPacket[]>(`SELECT id, name, region_id as parent_id FROM it_equipment_country WHERE status = 1 AND id = ? ORDER BY name`, [allowedCountryId])
      : pool.query<RowDataPacket[]>(`SELECT id, name, region_id as parent_id FROM it_equipment_country WHERE status = 1 ORDER BY name`),
    // Plants: only show if admin or matches user's plant
    !isAdmin && allowedPlantId !== null
      ? pool.query<RowDataPacket[]>(`SELECT id, name, country_id as parent_id FROM it_equipment_plant WHERE status = 1 AND id = ? ORDER BY name`, [allowedPlantId])
      : pool.query<RowDataPacket[]>(`SELECT id, name, country_id as parent_id FROM it_equipment_plant WHERE status = 1 ORDER BY name`),
    // Departments: only show if admin or belongs to user's plant
    !isAdmin && allowedPlantId !== null
      ? pool.query<RowDataPacket[]>(`SELECT id, name, plant_id as parent_id FROM it_equipment_department WHERE status = 1 AND plant_id = ? ORDER BY name`, [allowedPlantId])
      : pool.query<RowDataPacket[]>(`SELECT id, name, plant_id as parent_id FROM it_equipment_department WHERE status = 1 ORDER BY name`),
    // Areas: only show if admin or belongs to departments in user's plant
    !isAdmin && allowedPlantId !== null
      ? pool.query<RowDataPacket[]>(`SELECT a.id, a.name, a.department_id as parent_id FROM it_equipment_area a JOIN it_equipment_department d ON a.department_id = d.id WHERE a.status = 1 AND d.plant_id = ? ORDER BY a.name`, [allowedPlantId])
      : pool.query<RowDataPacket[]>(`SELECT id, name, department_id as parent_id FROM it_equipment_area WHERE status = 1 ORDER BY name`),
    // Sub Areas: only show if admin or belongs to areas in user's plant
    !isAdmin && allowedPlantId !== null
      ? pool.query<RowDataPacket[]>(`SELECT sa.id, sa.name, sa.area_id as parent_id FROM it_equipment_sub_area sa JOIN it_equipment_area a ON sa.area_id = a.id JOIN it_equipment_department d ON a.department_id = d.id WHERE sa.status = 1 AND d.plant_id = ? ORDER BY sa.name`, [allowedPlantId])
      : pool.query<RowDataPacket[]>(`SELECT id, name, area_id as parent_id FROM it_equipment_sub_area WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, type_name as name FROM it_equipment_type WHERE status = 1 ORDER BY type_name`),
    pool.query<RowDataPacket[]>(`SELECT id, name, type_id as parent_id FROM it_equipment_product_line WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name, product_line_id as parent_id FROM it_equipment_model WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name FROM it_equipment_vendor ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name FROM it_equipment_supplier ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT employee_no, CONCAT(first_name, ' ', last_name) as name FROM it_employees_list WHERE status = 1 ORDER BY last_name, first_name`),
    pool.query<RowDataPacket[]>(`SELECT id, inventory_nr as name, start_date, end_date FROM it_inventory_period ORDER BY start_date DESC`)
  ]);

  return {
    serviceTag,
    regions,
    countries,
    plants,
    departments,
    areas,
    subAreas,
    types,
    productLines,
    models,
    vendors,
    suppliers,
    employees,
    inventoryPeriods
  } as unknown as AddDataType;
}

async function getLocationsData(): Promise<LocationsDataType> {
  const [
    [regions],
    [countries],
    [plants],
    [departments],
    [areas],
    [subAreas]
  ] = await Promise.all([
    pool.query<RowDataPacket[]>(`WITH latest AS (
        SELECT l1.equipment_id, l1.equipment_sub_area_id
        FROM it_equipment_log l1
        JOIN (
          SELECT equipment_id, MAX(created) AS max_created
          FROM it_equipment_log
          GROUP BY equipment_id
        ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
      )
      SELECT r.id, r.name, r.status,
        COUNT(lat.equipment_id) as equipment_count
      FROM it_equipment_region r
      LEFT JOIN it_equipment_country c ON c.region_id = r.id
      LEFT JOIN it_equipment_plant p ON p.country_id = c.id
      LEFT JOIN it_equipment_department d ON d.plant_id = p.id
      LEFT JOIN it_equipment_area a ON a.department_id = d.id
      LEFT JOIN it_equipment_sub_area sa ON sa.area_id = a.id
      LEFT JOIN latest lat ON lat.equipment_sub_area_id = sa.id
      GROUP BY r.id
      ORDER BY r.name`),
    pool.query<RowDataPacket[]>(`WITH latest AS (
        SELECT l1.equipment_id, l1.equipment_sub_area_id
        FROM it_equipment_log l1
        JOIN (
          SELECT equipment_id, MAX(created) AS max_created
          FROM it_equipment_log
          GROUP BY equipment_id
        ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
      )
      SELECT c.id, c.name, c.region_id as parent_id, c.status,
        COUNT(lat.equipment_id) as equipment_count
      FROM it_equipment_country c
      LEFT JOIN it_equipment_plant p ON p.country_id = c.id
      LEFT JOIN it_equipment_department d ON d.plant_id = p.id
      LEFT JOIN it_equipment_area a ON a.department_id = d.id
      LEFT JOIN it_equipment_sub_area sa ON sa.area_id = a.id
      LEFT JOIN latest lat ON lat.equipment_sub_area_id = sa.id
      GROUP BY c.id
      ORDER BY c.name`),
    pool.query<RowDataPacket[]>(`WITH latest AS (
        SELECT l1.equipment_id, l1.equipment_sub_area_id
        FROM it_equipment_log l1
        JOIN (
          SELECT equipment_id, MAX(created) AS max_created
          FROM it_equipment_log
          GROUP BY equipment_id
        ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
      )
      SELECT p.id, p.name, p.country_id as parent_id, p.status,
        COUNT(lat.equipment_id) as equipment_count
      FROM it_equipment_plant p
      LEFT JOIN it_equipment_department d ON d.plant_id = p.id
      LEFT JOIN it_equipment_area a ON a.department_id = d.id
      LEFT JOIN it_equipment_sub_area sa ON sa.area_id = a.id
      LEFT JOIN latest lat ON lat.equipment_sub_area_id = sa.id
      GROUP BY p.id
      ORDER BY p.name`),
    pool.query<RowDataPacket[]>(`WITH latest AS (
        SELECT l1.equipment_id, l1.equipment_sub_area_id
        FROM it_equipment_log l1
        JOIN (
          SELECT equipment_id, MAX(created) AS max_created
          FROM it_equipment_log
          GROUP BY equipment_id
        ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
      )
      SELECT d.id, d.name, d.plant_id as parent_id, d.status,
        COUNT(lat.equipment_id) as equipment_count
      FROM it_equipment_department d
      LEFT JOIN it_equipment_area a ON a.department_id = d.id
      LEFT JOIN it_equipment_sub_area sa ON sa.area_id = a.id
      LEFT JOIN latest lat ON lat.equipment_sub_area_id = sa.id
      GROUP BY d.id
      ORDER BY d.name`),
    pool.query<RowDataPacket[]>(`WITH latest AS (
        SELECT l1.equipment_id, l1.equipment_sub_area_id
        FROM it_equipment_log l1
        JOIN (
          SELECT equipment_id, MAX(created) AS max_created
          FROM it_equipment_log
          GROUP BY equipment_id
        ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
      )
      SELECT a.id, a.name, a.department_id as parent_id, a.status,
        COUNT(lat.equipment_id) as equipment_count
      FROM it_equipment_area a
      LEFT JOIN it_equipment_sub_area sa ON sa.area_id = a.id
      LEFT JOIN latest lat ON lat.equipment_sub_area_id = sa.id
      GROUP BY a.id
      ORDER BY a.name`),
    pool.query<RowDataPacket[]>(`WITH latest AS (
        SELECT l1.equipment_id, l1.equipment_sub_area_id
        FROM it_equipment_log l1
        JOIN (
          SELECT equipment_id, MAX(created) AS max_created
          FROM it_equipment_log
          GROUP BY equipment_id
        ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
      )
      SELECT sa.id, sa.name, sa.area_id as parent_id, sa.status,
        COUNT(lat.equipment_id) as equipment_count
      FROM it_equipment_sub_area sa
      LEFT JOIN latest lat ON lat.equipment_sub_area_id = sa.id
      GROUP BY sa.id
      ORDER BY sa.name`)
  ]);

  return {
    regions,
    countries,
    plants,
    departments,
    areas,
    subAreas
  } as unknown as LocationsDataType;
}

async function getVendorsAndSuppliersData() {
  const [vendors, suppliers] = await Promise.all([
    pool.query<RowDataPacket[]>(`
      SELECT 
        v.id,
        v.name,
        COUNT(DISTINCT e.id) as equipment_count
      FROM it_equipment_vendor v
      LEFT JOIN it_equipment e ON e.vendor_id = v.id
      GROUP BY v.id, v.name
      ORDER BY v.name
    `),
    pool.query<RowDataPacket[]>(`
      SELECT 
        s.id,
        s.name,
        s.email,
        s.phone_number,
        s.address,
        s.representative_name,
        s.sap_vendor_no,
        s.website,
        COUNT(DISTINCT e.id) as equipment_count
      FROM it_equipment_supplier s
      LEFT JOIN it_equipment e ON e.supplier_id = s.id
      GROUP BY s.id, s.name, s.email, s.phone_number, s.address, s.representative_name, s.sap_vendor_no, s.website
      ORDER BY s.name
    `),
  ]);

  return {
    vendors: vendors[0].map((v) => ({
      id: v.id,
      name: v.name,
      equipment_count: Number(v.equipment_count) || 0,
    })),
    suppliers: suppliers[0].map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email || "",
      phone_number: s.phone_number || "",
      address: s.address || "",
      representative_name: s.representative_name || "",
      sap_vendor_no: s.sap_vendor_no === null || s.sap_vendor_no === undefined ? null : Number(s.sap_vendor_no),
      website: s.website || "",
      equipment_count: Number(s.equipment_count) || 0,
    })),
  };
}

async function getWriteOffReasonsData() {
  const [writeOffReasons] = await pool.query<RowDataPacket[]>(`
    SELECT 
      wor.id,
      wor.reason,
      COUNT(DISTINCT e.id) as equipment_count
    FROM it_equipment_write_off_reason wor
    LEFT JOIN it_equipment e ON e.is_written_off = wor.id
    GROUP BY wor.id, wor.reason
    ORDER BY wor.reason
  `);

  return {
    writeOffReasons: (writeOffReasons as WriteOffReasonRow[]).map((w) => ({
      id: w.id,
      reason: w.reason,
      equipment_count: Number(w.equipment_count) || 0,
    })),
  };
}

async function getRepairsData() {
  const [needsRepair, atSupplier, returned] = await Promise.all([
    pool.query<RowDataPacket[]>(`
      SELECT 
        e.id,
        e.service_tag,
        m.name as model_name,
        v.name as vendor_name,
        s.name as supplier_name,
        s.email as supplier_email,
        e.repair_status,
        e.repair_note,
        e.repair_physical_location,
        e.repair_sent_date,
        e.repair_returned_date,
        e.repair_marked_backup_date,
        CASE 
          WHEN e.repair_sent_date IS NOT NULL 
          THEN DATEDIFF(CURRENT_DATE, e.repair_sent_date)
          ELSE NULL
        END as days_in_repair
      FROM it_equipment e
      LEFT JOIN it_equipment_model m ON e.model_id = m.id
      LEFT JOIN it_equipment_vendor v ON e.vendor_id = v.id
      LEFT JOIN it_equipment_supplier s ON e.supplier_id = s.id
      WHERE e.repair_status = 'needs_repair'
      ORDER BY e.repair_sent_date DESC, e.service_tag
    `),
    pool.query<RowDataPacket[]>(`
      SELECT 
        e.id,
        e.service_tag,
        m.name as model_name,
        v.name as vendor_name,
        s.name as supplier_name,
        s.email as supplier_email,
        e.repair_status,
        e.repair_note,
        e.repair_physical_location,
        e.repair_sent_date,
        e.repair_returned_date,
        e.repair_marked_backup_date,
        CASE 
          WHEN e.repair_sent_date IS NOT NULL 
          THEN DATEDIFF(CURRENT_DATE, e.repair_sent_date)
          ELSE NULL
        END as days_in_repair
      FROM it_equipment e
      LEFT JOIN it_equipment_model m ON e.model_id = m.id
      LEFT JOIN it_equipment_vendor v ON e.vendor_id = v.id
      LEFT JOIN it_equipment_supplier s ON e.supplier_id = s.id
      WHERE e.repair_status = 'at_supplier'
      ORDER BY e.repair_sent_date DESC, e.service_tag
    `),
    pool.query<RowDataPacket[]>(`
      SELECT 
        e.id,
        e.service_tag,
        m.name as model_name,
        v.name as vendor_name,
        s.name as supplier_name,
        s.email as supplier_email,
        e.repair_status,
        e.repair_note,
        e.repair_physical_location,
        e.repair_sent_date,
        e.repair_returned_date,
        e.repair_marked_backup_date,
        CASE 
          WHEN e.repair_sent_date IS NOT NULL AND e.repair_returned_date IS NOT NULL
          THEN DATEDIFF(e.repair_returned_date, e.repair_sent_date)
          WHEN e.repair_sent_date IS NOT NULL
          THEN DATEDIFF(CURRENT_DATE, e.repair_sent_date)
          ELSE NULL
        END as days_in_repair
      FROM it_equipment e
      LEFT JOIN it_equipment_model m ON e.model_id = m.id
      LEFT JOIN it_equipment_vendor v ON e.vendor_id = v.id
      LEFT JOIN it_equipment_supplier s ON e.supplier_id = s.id
      WHERE e.repair_status = 'returned'
      ORDER BY e.repair_returned_date DESC, e.service_tag
    `),
  ]);

  const mapRepairItem = (item: RepairItemRow) => ({
    id: item.id,
    service_tag: item.service_tag,
    model_name: item.model_name,
    vendor_name: item.vendor_name,
    supplier_name: item.supplier_name,
    supplier_email: item.supplier_email,
    repair_status: item.repair_status,
    repair_note: item.repair_note,
    repair_physical_location: item.repair_physical_location,
    repair_sent_date: item.repair_sent_date ? item.repair_sent_date.toISOString().split('T')[0] : null,
    repair_returned_date: item.repair_returned_date ? item.repair_returned_date.toISOString().split('T')[0] : null,
    repair_marked_backup_date: item.repair_marked_backup_date ? item.repair_marked_backup_date.toISOString().split('T')[0] : null,
    days_in_repair: item.days_in_repair !== null ? Number(item.days_in_repair) : null,
  });

  return {
    needsRepair: (needsRepair[0] as RepairItemRow[]).map(mapRepairItem),
    atSupplier: (atSupplier[0] as RepairItemRow[]).map(mapRepairItem),
    returned: (returned[0] as RepairItemRow[]).map(mapRepairItem),
  };
}

async function getTypesData() {
  const [types, models, productLines] = await Promise.all([
    pool.query<RowDataPacket[]>(`
      SELECT 
        t.id,
        t.type_name as name,
        t.status,
        COUNT(DISTINCT e.id) as equipment_count
      FROM it_equipment_type t
      LEFT JOIN it_equipment_product_line pl ON pl.type_id = t.id
      LEFT JOIN it_equipment_model m ON m.product_line_id = pl.id
      LEFT JOIN it_equipment e ON e.model_id = m.id
      GROUP BY t.id, t.type_name, t.status
      ORDER BY t.type_name
    `),
    pool.query<RowDataPacket[]>(`
      SELECT 
        m.id,
        m.name,
        m.product_line_id as parent_id,
        m.status,
        COUNT(DISTINCT e.id) as equipment_count
      FROM it_equipment_model m
      LEFT JOIN it_equipment e ON e.model_id = m.id
      GROUP BY m.id, m.name, m.product_line_id, m.status
      ORDER BY m.name
    `),
    pool.query<RowDataPacket[]>(`
      SELECT 
        pl.id,
        pl.name,
        pl.type_id as parent_id,
        pl.status,
        COUNT(DISTINCT e.id) as equipment_count
      FROM it_equipment_product_line pl
      LEFT JOIN it_equipment_model m ON m.product_line_id = pl.id
      LEFT JOIN it_equipment e ON e.model_id = m.id
      GROUP BY pl.id, pl.name, pl.type_id, pl.status
      ORDER BY pl.name
    `),
  ]);

  return {
    types: types[0].map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status ? 1 : 0,
      equipment_count: Number(t.equipment_count) || 0,
    })),
    models: models[0].map((m) => ({
      id: m.id,
      name: m.name,
      parent_id: m.parent_id,
      status: m.status ? 1 : 0,
      equipment_count: Number(m.equipment_count) || 0,
    })),
    productLines: productLines[0].map((pl) => ({
      id: pl.id,
      name: pl.name,
      parent_id: pl.parent_id,
      status: pl.status ? 1 : 0,
      equipment_count: Number(pl.equipment_count) || 0,
    })),
  };
}

// Run migrations on startup (before starting server)
try {
  await runMigrations();
  console.log("✅ Database migrations completed");
} catch (err) {
  logger.error("Failed to run migrations on startup", err);
  console.error("⚠️  Migration failed, but continuing server startup:", err);
}

// Validate email configuration
await validateEmailConfig();

// Start background scheduler for email notifications
startScheduler();

const tlsOptions = await getTlsOptions();

if (tlsOptions) {
  // HTTPS server
  serve({
    port: Number(HTTPS_PORT),
    fetch: handleRequest,
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
    fetch: handleRequest,
  });
}
