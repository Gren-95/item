import { serve } from "bun";
import nodePath from "path";
import pool from "./db";
import { searchPage } from "./templates/search";
import { editPage } from "./templates/edit";
import { addPage } from "./templates/add";
import { locationsPage } from "./templates/locations";
import { logger } from "./utils/logger";
import { getSessionFromRequest } from "./utils/session";
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
import { escapeHtml } from "./templates/components";
import { getEmployeeNo, createApprovalRequest, getClientIp } from "./utils/approvals";
import { validateEmailConfig, sendApprovalNotification } from "./utils/email";
import { startScheduler } from "./utils/scheduler";
import { parseEstonianDate } from "./utils/date";
import {
  hasAdminPermission,
  hasAddEquipmentPermission,
  hasEditEquipmentPermission,
  getUserPlantId,
  hasLocationsViewPermission,
  hasLocationsAddPermission,
  hasLocationsEditPermission,
  hasLocationsDeletePermission,
  hasManageLocationsPermission,
  hasRepairsSendPermission,
  hasPcPwViewPermission,
  isAdminUser,
} from "./utils/auth";
import {
  equipmentAddSchema,
  equipmentEditSchema,
  locationsActionSchema,
} from "./utils/validation";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
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
  const { currentUsername, isAdmin, hasPcPwView, hasAuditApprover } = ctx;

  const routerResponse = await router.dispatch(ctx);
  if (routerResponse) return routerResponse;

  // Routes (legacy if/else — being migrated to routes/*.ts modules)
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
        const errorMessage = "An unexpected error occurred. Please try again.";
        logger.error("Inventory periods action failed", err, { traceId });
        return Response.redirect("/inventory-audit/review?error=" + encodeURIComponent(errorMessage) + "#periods", 303);
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
      const PAGE_SIZE = 25;
      const showAll = url.searchParams.get("all") === "1";
      const page = showAll ? 1 : Math.max(1, parseInt(url.searchParams.get("page") || "1") || 1);

      // Parse column filters (capped at 200 chars to prevent abuse)
      const cap = (v: string) => v.trim().slice(0, 200);
      const columnFilters = {
        serial: cap(url.searchParams.get("f_serial") || ""),
        type: cap(url.searchParams.get("f_type") || ""),
        pline: cap(url.searchParams.get("f_pline") || ""),
        model: cap(url.searchParams.get("f_model") || ""),
        vendor: cap(url.searchParams.get("f_vendor") || ""),
        assigned: cap(url.searchParams.get("f_assigned") || ""),
        location: cap(url.searchParams.get("f_location") || ""),
        date: cap(url.searchParams.get("f_date") || ""),
      };

      if (query && query.trim()) {
        const trimmed = query.trim();
        const isWildcard = trimmed === "*";
        logger.info("Search request", { traceId, query: trimmed, page, filters: columnFilters });

        // Base query with all joins
        const baseFrom = `
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
          LEFT JOIN it_equipment_region r ON c.region_id = r.id`;

        // Build WHERE conditions
        const whereParts: string[] = [];
        const allParams: (string | number)[] = [];

        // Main search (OR across all fields)
        if (!isWildcard) {
          const searchTerm = `%${trimmed}%`;
          whereParts.push(`(
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
          )`);
          allParams.push(
            searchTerm, searchTerm, searchTerm, searchTerm, searchTerm,
            searchTerm, searchTerm, searchTerm, searchTerm, searchTerm,
            searchTerm, searchTerm, searchTerm, searchTerm
          );
        }

        // Column filters (AND — each narrows the results)
        if (columnFilters.serial) {
          whereParts.push(`e.service_tag LIKE ?`);
          allParams.push(`%${columnFilters.serial}%`);
        }
        if (columnFilters.type) {
          whereParts.push(`t.type_name LIKE ?`);
          allParams.push(`%${columnFilters.type}%`);
        }
        if (columnFilters.pline) {
          whereParts.push(`pl.name LIKE ?`);
          allParams.push(`%${columnFilters.pline}%`);
        }
        if (columnFilters.model) {
          whereParts.push(`m.name LIKE ?`);
          allParams.push(`%${columnFilters.model}%`);
        }
        if (columnFilters.vendor) {
          whereParts.push(`v.name LIKE ?`);
          allParams.push(`%${columnFilters.vendor}%`);
        }
        if (columnFilters.assigned) {
          whereParts.push(`CONCAT(emp.first_name, ' ', emp.last_name) LIKE ?`);
          allParams.push(`%${columnFilters.assigned}%`);
        }
        if (columnFilters.location) {
          whereParts.push(`CONCAT_WS(' > ', r.name, c.name, p.name, d.name, a.name, sa.name) LIKE ?`);
          allParams.push(`%${columnFilters.location}%`);
        }
        if (columnFilters.date) {
          whereParts.push(`DATE_FORMAT(log.created, '%d.%m.%Y') LIKE ?`);
          allParams.push(`%${columnFilters.date}%`);
        }

        const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

        // Get total count
        const [countResult] = await pool.query<RowDataPacket[]>(
          `SELECT COUNT(DISTINCT e.id) as total ${baseFrom} ${whereClause}`,
          allParams
        );
        const totalCount = countResult[0]?.total || 0;
        const totalPages = showAll ? 1 : Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
        const currentPage = showAll ? 1 : Math.min(page, totalPages);
        const offset = (currentPage - 1) * PAGE_SIZE;

        // Get results (all or paginated)
        const limitClause = showAll ? '' : 'LIMIT ? OFFSET ?';
        const queryParams: (string | number)[] = showAll ? [...allParams] : [...allParams, PAGE_SIZE, offset];

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
          ${baseFrom}
          ${whereClause}
          ORDER BY e.service_tag
          ${limitClause}`,
          queryParams
        );

        logger.info("Search results", { traceId, query: trimmed, count: rows.length, totalCount, page: currentPage, totalPages, showAll });

        // Mark items as readonly if they're from a different plant (unless user is admin)
        const resultsWithReadonly = rows.map((row: RowDataPacket) => {
          const result = row as SearchResult;
          result.isReadonly = !isAdmin &&
            result.plant_id !== null &&
            userPlantId !== null &&
            result.plant_id !== userPlantId;
          return result;
        });

        return new Response(searchPage(trimmed, resultsWithReadonly.length > 0 ? resultsWithReadonly : [], null, isAdmin, hasPcPwView, userPlantId, currentUsername, hasAuditApprover, currentPage, totalPages, totalCount, showAll ? totalCount : PAGE_SIZE, showAll, columnFilters), {
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
        imei1: formData.get("imei1") || null,
        imei2: formData.get("imei2") || null,
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
        const imei1 = validated.imei1;
        const imei2 = validated.imei2;
        // Insert into equipment table (static data only)
        const [result] = await pool.query<ResultSetHeader>(`
          INSERT INTO it_equipment (
            service_tag, vendor_id, supplier_id, model_id,
            purchase_date, warranty_expiry_date, teamviewer, cerf, ip, mac_addresses,
            imei1, imei2
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          mac_addresses || null,
          imei1 || null,
          imei2 || null
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
        const errorMessage = "An unexpected error occurred. Please try again.";
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

      // Deny access to equipment from a different plant
      const equipmentPlantId = auditData.equipment.plant_id as number | null;
      const isCrossPlant = !isAdmin &&
        equipmentPlantId !== null &&
        userPlantId !== null &&
        equipmentPlantId !== userPlantId;

      if (isCrossPlant) {
        const { errorPage } = await import("./templates/error");
        return new Response(
          errorPage(
            "Access Denied",
            "You do not have permission to view this equipment.",
            "This equipment belongs to a different plant. Please contact your administrator if you need access.",
            403,
            isAdmin,
            hasPcPwView,
            currentUsername ?? "",
            hasAuditApprover
          ),
          {
            status: 403,
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
          imei1: formData.get("imei1") || null,
          imei2: formData.get("imei2") || null,
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
        imei1: formData.get("imei1") || null,
        imei2: formData.get("imei2") || null,
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
        const imei1 = validated.imei1;
        const imei2 = validated.imei2;
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
            imei1 = ?,
            imei2 = ?,
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
          imei1 || null,
          imei2 || null,
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
        const errorMessage = "An unexpected error occurred. Please try again.";
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
        const errorMessage = "An unexpected error occurred. Please try again.";
        return Response.redirect(`/locations?error=${encodeURIComponent(errorMessage)}`, 303);
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
        const errorMessage = "An unexpected error occurred. Please try again.";
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
        const proposedLocation = form.get("proposed_location")?.toString()?.trim() || null;
        const proposedDepartmentId = form.get("proposed_department_id")?.toString()?.trim() || null;
        const proposedAreaName = form.get("proposed_area_name")?.toString()?.trim() || null;
        const proposedSubAreaName = form.get("proposed_sub_area_name")?.toString()?.trim() || null;

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
        const auditSubAreaId = proposedLocation
          ? null  // Clear sub_area_id when using proposed location
          : (equipmentSubAreaId !== null ? (equipmentSubAreaId ? parseInt(equipmentSubAreaId) : null) : eq.equipment_sub_area_id);
        const auditComment = comment !== null ? comment : eq.comment;
        const auditTeamviewer = teamviewer !== null ? (teamviewer ? parseInt(teamviewer) : null) : eq.latest_teamviewer;
        const auditProposedLocation = proposedLocation || null;
        const auditProposedLocationStatus = proposedLocation ? "pending" : null;
        const auditProposedDeptId = proposedLocation && proposedDepartmentId ? parseInt(proposedDepartmentId) : null;
        const auditProposedAreaName = proposedLocation ? proposedAreaName : null;
        const auditProposedSubAreaName = proposedLocation ? proposedSubAreaName : null;

        // Update ONLY the audit table - do NOT update main equipment table or log table
        await pool.query(
          `INSERT INTO it_equipment_audit (
            equipment_id, inventory_period_id, service_tag, model_id, vendor_id, supplier_id,
            cerf, device_no, is_personal, purchase_date, warranty_expiry_date, is_written_off,
            teamviewer, imei1, imei2, ip, mac_addresses, assigned_to, equipment_sub_area_id,
            proposed_location, proposed_location_status,
            proposed_department_id, proposed_area_name, proposed_sub_area_name,
            comment, updated_by, created, updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE
            teamviewer = VALUES(teamviewer),
            assigned_to = VALUES(assigned_to),
            equipment_sub_area_id = VALUES(equipment_sub_area_id),
            proposed_location = VALUES(proposed_location),
            proposed_location_status = VALUES(proposed_location_status),
            proposed_department_id = VALUES(proposed_department_id),
            proposed_area_name = VALUES(proposed_area_name),
            proposed_sub_area_name = VALUES(proposed_sub_area_name),
            comment = VALUES(comment),
            updated_by = VALUES(updated_by),
            updated = CURRENT_TIMESTAMP`,
          [
            equipmentId, inventoryPeriodId, serviceTag, eq.model_id, eq.vendor_id, eq.supplier_id,
            eq.cerf, eq.device_no, eq.is_personal, eq.purchase_date, eq.warranty_expiry_date, eq.is_written_off,
            auditTeamviewer, eq.imei1, eq.imei2, eq.ip, eq.mac_addresses, auditAssignedTo, auditSubAreaId,
            auditProposedLocation, auditProposedLocationStatus,
            auditProposedDeptId, auditProposedAreaName, auditProposedSubAreaName,
            auditComment, updatedBy
          ]
        );

        logger.info("Audit quick edit saved", { traceId, equipmentId, username: session.username });

        return Response.redirect(`/inventory-audit?search=${encodeURIComponent(serviceTag)}&success=${encodeURIComponent("Audit updated successfully")}`, 303);
      } catch (err) {
        const errorMessage = "An unexpected error occurred. Please try again.";
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
        logger.error("Failed to load audit review page", err, { traceId });
        return new Response("An internal error occurred. Please try again later.", { status: 500 });
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
            lpe.comment,
            latest_audit.proposed_location,
            latest_audit.proposed_location_status
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
          LEFT JOIN (
            SELECT a1.equipment_id, a1.proposed_location, a1.proposed_location_status
            FROM it_equipment_audit a1
            INNER JOIN (
              SELECT equipment_id, MAX(updated) as max_updated
              FROM it_equipment_audit
              GROUP BY equipment_id
            ) a2 ON a1.equipment_id = a2.equipment_id AND a1.updated = a2.max_updated
          ) latest_audit ON e.id = latest_audit.equipment_id
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
        const errorMessage = "An unexpected error occurred. Please try again.";
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
            a.proposed_location as audit_proposed_location,
            a.proposed_location_status as audit_proposed_location_status,
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

          // If there's a proposed location, use it as the audit location display
          const auditLocationDisplay = r.audit_proposed_location
            ? r.audit_proposed_location
            : (r.audit_location || null);

          const diffs = {
            assigned_to: (auditAssigned || '') !== (equipAssigned || ''),
            location: (auditLocationDisplay || '') !== (r.equip_location || ''),
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
              location: auditLocationDisplay,
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
            proposed_location: r.audit_proposed_location || null,
            proposed_location_status: r.audit_proposed_location_status || null,
          };
        });

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        const errorMessage = "An unexpected error occurred. Please try again.";
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
        logger.error("Failed to export audit review", err, { traceId });
        return new Response("An internal error occurred. Please try again later.", { status: 500 });
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

        // Check if there's a pending proposed location - block apply until resolved
        if (audit.proposed_location && audit.proposed_location_status === 'pending') {
          return new Response(
            JSON.stringify({ success: false, error: "Cannot apply: this audit entry has a pending proposed location. Please approve or reject it first." }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        // Use the resolved sub_area_id (may have been updated by approve-location)
        const resolvedSubAreaId = audit.equipment_sub_area_id;

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
            resolvedSubAreaId,
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
        const errorMessage = "An unexpected error occurred. Please try again.";
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

    // Audit Review - Approve proposed location (creates location in hierarchy)
    if (path === "/api/inventory-audit/approve-location" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        if (!hasAuditApprover) {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }

        const body = await req.json();
        const auditId = parseInt(body.audit_id?.toString() || "0");

        if (!auditId) {
          return new Response(JSON.stringify({ error: "Audit entry ID is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Get the audit entry with stored structured fields
        const [auditEntries] = await pool.query<RowDataPacket[]>(
          "SELECT * FROM it_equipment_audit WHERE id = ?",
          [auditId]
        );

        if (auditEntries.length === 0) {
          return new Response(JSON.stringify({ error: "Audit entry not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }

        const audit = auditEntries[0];

        if (!audit.proposed_location || audit.proposed_location_status !== 'pending') {
          return new Response(JSON.stringify({ error: "This audit entry does not have a pending proposed location" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Use stored structured fields, or fall back to parsing proposed_location text
        let departmentId = audit.proposed_department_id;
        let areaName = audit.proposed_area_name || "";
        let subAreaName = audit.proposed_sub_area_name || "";

        // Fallback: parse "Country - Plant - Department - Area - SubArea" from proposed_location text
        if (!departmentId || !areaName || !subAreaName) {
          const parts = (audit.proposed_location || "").split(" - ").map((p: string) => p.trim());
          if (parts.length >= 5) {
            // Format: Country - Plant - Department - Area - SubArea
            const deptName = parts[2];
            areaName = areaName || parts[3];
            subAreaName = subAreaName || parts[4];
            if (!departmentId && deptName) {
              const [deptRows] = await pool.query<RowDataPacket[]>(
                "SELECT id FROM it_equipment_department WHERE name = ? LIMIT 1",
                [deptName]
              );
              if (deptRows.length > 0) {
                departmentId = deptRows[0].id;
              }
            }
          } else if (parts.length >= 2 && !areaName && !subAreaName) {
            // Fallback for old "Area - SubArea" format
            areaName = parts[parts.length - 2];
            subAreaName = parts[parts.length - 1];
          }
        }

        if (!departmentId || !areaName || !subAreaName) {
          return new Response(JSON.stringify({ error: "Cannot determine location data. Please re-edit this audit entry using the quick edit modal so that the department, area, and sub-area are saved." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Find or create the area under the department
        let areaId: number;
        const [existingAreas] = await pool.query<RowDataPacket[]>(
          "SELECT id FROM it_equipment_area WHERE department_id = ? AND name = ?",
          [departmentId, areaName]
        );
        if (existingAreas.length > 0) {
          areaId = existingAreas[0].id;
        } else {
          const [areaInsert] = await pool.query<ResultSetHeader>(
            "INSERT INTO it_equipment_area (department_id, name) VALUES (?, ?)",
            [departmentId, areaName]
          );
          areaId = areaInsert.insertId;
          logger.info("Created new area for approved location", { traceId, areaId, areaName, departmentId });
        }

        // Find or create the sub-area under the area
        let subAreaId: number;
        const [existingSubAreas] = await pool.query<RowDataPacket[]>(
          "SELECT id FROM it_equipment_sub_area WHERE area_id = ? AND name = ?",
          [areaId, subAreaName]
        );
        if (existingSubAreas.length > 0) {
          subAreaId = existingSubAreas[0].id;
        } else {
          const [subAreaInsert] = await pool.query<ResultSetHeader>(
            "INSERT INTO it_equipment_sub_area (area_id, name) VALUES (?, ?)",
            [areaId, subAreaName]
          );
          subAreaId = subAreaInsert.insertId;
          logger.info("Created new sub-area for approved location", { traceId, subAreaId, subAreaName, areaId });
        }

        // Update the audit entry: set the new sub_area_id and mark location as approved
        await pool.query(
          `UPDATE it_equipment_audit SET
            equipment_sub_area_id = ?,
            proposed_location_status = 'approved',
            updated = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [subAreaId, auditId]
        );

        logger.info("Proposed location approved and created", {
          traceId,
          auditId,
          proposedLocation: audit.proposed_location,
          departmentId,
          areaId,
          areaName,
          subAreaId,
          subAreaName,
          username: session.username
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: `Location "${areaName} - ${subAreaName}" created successfully`,
            area_id: areaId,
            sub_area_id: subAreaId
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        const errorMessage = "An unexpected error occurred. Please try again.";
        logger.error("Failed to approve proposed location", err, { traceId });
        return new Response(
          JSON.stringify({ success: false, error: errorMessage }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Audit Review - Reject proposed location (optionally reassign to existing location)
    if (path === "/api/inventory-audit/reject-location" && req.method === "POST") {
      const session = getSessionFromRequest(req);
      if (!session) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }

      try {
        if (!hasAuditApprover) {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }

        const body = await req.json();
        const auditId = parseInt(body.audit_id?.toString() || "0");
        const reassignSubAreaId = body.reassign_sub_area_id ? parseInt(body.reassign_sub_area_id.toString()) : null;

        if (!auditId) {
          return new Response(JSON.stringify({ error: "Audit entry ID is required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Get the audit entry
        const [auditEntries] = await pool.query<RowDataPacket[]>(
          "SELECT * FROM it_equipment_audit WHERE id = ?",
          [auditId]
        );

        if (auditEntries.length === 0) {
          return new Response(JSON.stringify({ error: "Audit entry not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }

        const audit = auditEntries[0];

        if (!audit.proposed_location || audit.proposed_location_status !== 'pending') {
          return new Response(JSON.stringify({ error: "This audit entry does not have a pending proposed location" }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }

        // Update the audit entry: mark as rejected, optionally reassign to existing location
        await pool.query(
          `UPDATE it_equipment_audit SET
            equipment_sub_area_id = ?,
            proposed_location_status = 'rejected',
            updated = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [reassignSubAreaId, auditId]
        );

        logger.info("Proposed location rejected", {
          traceId,
          auditId,
          proposedLocation: audit.proposed_location,
          reassignSubAreaId,
          username: session.username
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: reassignSubAreaId
              ? "Proposed location rejected and reassigned to existing location"
              : "Proposed location rejected"
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        const errorMessage = "An unexpected error occurred. Please try again.";
        logger.error("Failed to reject proposed location", err, { traceId });
        return new Response(
          JSON.stringify({ success: false, error: errorMessage }),
          { status: 500, headers: { "Content-Type": "application/json" } }
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
        const errorMessage = "An unexpected error occurred. Please try again.";
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

    return new Response("Not found", { status: 404 });
  } catch (err) {
    logger.error("Request handler error", err, { traceId, path });
    return new Response(searchPage("", null, "An unexpected error occurred. Please try again later.", false, false), {
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
