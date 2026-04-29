import type { RowDataPacket } from "mysql2";
import { logger } from "../utils/logger";
import { getUserPlantId, hasPermission } from "../utils/auth";
import type { RequestContext } from "./types";
import type { Router } from "./router";

export function registerApiRoutes(router: Router): void {
  router.get("/api/check-permission", checkPermissionGet);
  router.get("/api/permissions/expiring", expiringPermissionsGet);
  router.get("/api/permissions/audit-log", permissionsAuditLogGet);
  router.get("/api/search-suggestions", searchSuggestionsGet);
  router.get("/api/equipment/search-by-tag", searchByTagGet);
  router.get("/api/equipment/history", equipmentHistoryGet);
}

async function checkPermissionGet(ctx: RequestContext): Promise<Response> {
  const { url, traceId, pool, currentUsername } = ctx;
  const username = currentUsername!;

  try {
    const permission = url.searchParams.get("permission");
    if (!permission) {
      return new Response(JSON.stringify({ error: "Permission parameter required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userPlantId = await getUserPlantId(username, pool);
    const hasPermissionResult = await hasPermission(username, pool, permission, userPlantId);

    return new Response(
      JSON.stringify({
        hasPermission: hasPermissionResult,
        requiresApproval: !hasPermissionResult,
        message: hasPermissionResult
          ? "You have permission to perform this action"
          : "This action requires approval from an administrator",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    logger.error("Error checking permission", err, { traceId });
    return new Response(JSON.stringify({ error: "Failed to check permission" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function expiringPermissionsGet(ctx: RequestContext): Promise<Response> {
  const { url, traceId, pool, isAdmin } = ctx;

  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Admin permission required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const days = parseInt(url.searchParams.get("days") || "30");

    const [expiringPermissions] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        p.id, p.user_id, p.plant_id, p.permission, p.role, p.comment,
        p.expiry_date, p.added_by_user_id,
        pl.name as plant_name, e.name as user_name,
        DATEDIFF(p.expiry_date, CURDATE()) as days_until_expiry
      FROM it_user_permissions p
      LEFT JOIN it_equipment_plant pl ON p.plant_id = pl.id
      LEFT JOIN it_employees_list e ON p.user_id = e.user_id
      WHERE p.expiry_date IS NOT NULL
        AND p.expiry_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
      ORDER BY p.expiry_date ASC
      `,
      [days]
    );

    const [expiredPermissions] = await pool.query<RowDataPacket[]>(`
      SELECT
        p.id, p.user_id, p.plant_id, p.permission, p.role, p.comment,
        p.expiry_date, p.added_by_user_id,
        pl.name as plant_name, e.name as user_name,
        DATEDIFF(CURDATE(), p.expiry_date) as days_since_expiry
      FROM it_user_permissions p
      LEFT JOIN it_equipment_plant pl ON p.plant_id = pl.id
      LEFT JOIN it_employees_list e ON p.user_id = e.user_id
      WHERE p.expiry_date IS NOT NULL
        AND p.expiry_date < CURDATE()
      ORDER BY p.expiry_date DESC
      LIMIT 50
    `);

    return new Response(
      JSON.stringify({ expiring: expiringPermissions, expired: expiredPermissions }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    logger.error("Error fetching expiring permissions", err, { traceId });
    return new Response(JSON.stringify({ error: "Failed to fetch expiring permissions" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function permissionsAuditLogGet(ctx: RequestContext): Promise<Response> {
  const { url, traceId, pool, isAdmin } = ctx;

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

    let countQuery = "SELECT COUNT(*) as total FROM it_permission_audit_log";
    const countParams: string[] = [];
    if (userId) {
      countQuery += " WHERE user_id = ?";
      countParams.push(userId);
    }
    const [countResult] = await pool.query<RowDataPacket[]>(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    return new Response(JSON.stringify({ data: auditLog, total, limit, offset }), {
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

async function searchSuggestionsGet(ctx: RequestContext): Promise<Response> {
  const { url, traceId, pool } = ctx;
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
  } catch (err) {
    logger.error("Search suggestions failed", err, { traceId });
    return new Response(JSON.stringify([]), {
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function searchByTagGet(ctx: RequestContext): Promise<Response> {
  const { url, traceId, pool } = ctx;
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

async function equipmentHistoryGet(ctx: RequestContext): Promise<Response> {
  const { url, traceId, pool } = ctx;

  try {
    const equipmentId = url.searchParams.get("equipment_id");
    if (!equipmentId) {
      return new Response(
        JSON.stringify({ success: false, error: "Equipment ID required" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const [logs] = await pool.query<RowDataPacket[]>(
      `
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
      `,
      [equipmentId]
    );

    return new Response(JSON.stringify({ success: true, data: logs }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    logger.error("Equipment history fetch failed", err, { traceId });
    return new Response(JSON.stringify({ success: false, error: "Failed to fetch history" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
