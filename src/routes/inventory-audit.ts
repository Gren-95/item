import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { logger } from "../utils/logger";
import { errorPage } from "../templates/error";
import { getUserPlantId, isAdminUser } from "../utils/auth";
import { getEmployeeNo } from "../utils/approvals";
import type { RequestContext } from "./types";
import type { Router } from "./router";

export function registerInventoryAuditRoutes(router: Router): void {
  router.post("/inventory-audit/save", auditSave);
  router.post("/inventory-audit/quick-edit", auditQuickEdit);
  router.get("/inventory-audit/review", auditReviewGet);
  router.get("/api/inventory-audit/search", auditSearchApi);
  router.get("/api/inventory-audit/review", auditReviewApi);
  router.get("/api/inventory-audit/review-compare", auditReviewCompare);
  router.get("/inventory-audit/review/export", auditReviewExport);
  router.post("/api/inventory-audit/apply", auditApply);
  router.post("/api/inventory-audit/approve-location", auditApproveLocation);
  router.post("/api/inventory-audit/reject-location", auditRejectLocation);
  router.post("/api/inventory-audit/apply-all", auditApplyAll);
}

/**
 * Latest record per equipment combining the log and audit tables — used by
 * /inventory-audit/save and /inventory-audit/quick-edit for the "current
 * values" they fall back on when the form leaves a field unchanged.
 */
const LATEST_PER_EQUIPMENT_CTE = `
  WITH latest_records AS (
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
`;

async function auditSave(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool, currentUsername } = ctx;
  const username = currentUsername!;
  try {
    const form = await req.formData();
    const equipmentId = parseInt(form.get("equipment_id")?.toString() || "0");
    const inventoryPeriodId = parseInt(form.get("inventory_period_id")?.toString() || "0");

    if (!equipmentId || !inventoryPeriodId) throw new Error("Missing required fields");

    const [equipment] = await pool.query<RowDataPacket[]>(
      `${LATEST_PER_EQUIPMENT_CTE}
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

    if (equipment.length === 0) throw new Error("Equipment not found");
    const eq = equipment[0];

    const employeeNo = await getEmployeeNo(username, pool);
    const updatedBy = isAdminUser(username) ? null : employeeNo || null;

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
        eq.comment, updatedBy,
      ]
    );

    logger.info("Audit record saved", { traceId, equipmentId, inventoryPeriodId, username });

    return Response.redirect(
      `/inventory-audit?search=${encodeURIComponent(eq.service_tag)}&success=${encodeURIComponent("Audit recorded successfully")}`,
      303
    );
  } catch (err) {
    logger.error("Failed to save audit record", err, { traceId });
    return Response.redirect(
      `/inventory-audit?error=${encodeURIComponent("An unexpected error occurred. Please try again.")}`,
      303
    );
  }
}

async function auditQuickEdit(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool, currentUsername } = ctx;
  const username = currentUsername!;
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

    if (!equipmentId || !inventoryPeriodId) throw new Error("Missing required fields");

    const [equipmentRows] = await pool.query<RowDataPacket[]>(
      `${LATEST_PER_EQUIPMENT_CTE}
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

    if (equipmentRows.length === 0) throw new Error("Equipment not found");
    const eq = equipmentRows[0];
    const serviceTag = eq.service_tag;

    const employeeNo = await getEmployeeNo(username, pool);
    const updatedBy = isAdminUser(username) ? null : employeeNo || null;

    const auditAssignedTo = assignedTo !== null ? assignedTo : eq.assigned_to;
    const auditSubAreaId = proposedLocation
      ? null
      : equipmentSubAreaId !== null
      ? equipmentSubAreaId
        ? parseInt(equipmentSubAreaId)
        : null
      : eq.equipment_sub_area_id;
    const auditComment = comment !== null ? comment : eq.comment;
    const auditTeamviewer =
      teamviewer !== null ? (teamviewer ? parseInt(teamviewer) : null) : eq.latest_teamviewer;
    const auditProposedLocation = proposedLocation || null;
    const auditProposedLocationStatus = proposedLocation ? "pending" : null;
    const auditProposedDeptId =
      proposedLocation && proposedDepartmentId ? parseInt(proposedDepartmentId) : null;
    const auditProposedAreaName = proposedLocation ? proposedAreaName : null;
    const auditProposedSubAreaName = proposedLocation ? proposedSubAreaName : null;

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
        auditComment, updatedBy,
      ]
    );

    logger.info("Audit quick edit saved", { traceId, equipmentId, username });

    return Response.redirect(
      `/inventory-audit?search=${encodeURIComponent(serviceTag)}&success=${encodeURIComponent("Audit updated successfully")}`,
      303
    );
  } catch (err) {
    logger.error("Failed to quick edit audit", err, { traceId });
    return Response.redirect(
      `/inventory-audit?error=${encodeURIComponent("An unexpected error occurred. Please try again.")}`,
      303
    );
  }
}

async function auditReviewGet(ctx: RequestContext): Promise<Response> {
  const { url, traceId, pool, isAdmin, hasPcPwView, hasAuditApprover, currentUsername } = ctx;
  const username = currentUsername!;

  try {
    const userPlantId = await getUserPlantId(username, pool);

    let allowedPlantId: number | null = null;
    if (!isAdmin && userPlantId !== null) {
      allowedPlantId = userPlantId;
    }

    const { auditPage } = await import("../templates/audit");

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

    const [latestPeriods] = await pool.query<RowDataPacket[]>(
      latestPeriodsQuery,
      latestPeriodsParams
    );

    const defaultPeriod =
      latestPeriods.length > 0
        ? latestPeriods[0]
        : allPeriods.length > 0
        ? allPeriods[0]
        : null;

    const [allPeriodsForTab] = await pool.query<RowDataPacket[]>(
      `SELECT id, inventory_nr, start_date, end_date, comment, confirmed_by, created
       FROM it_inventory_period
       ORDER BY start_date DESC`
    );

    const success = url.searchParams.get("success");
    const error = url.searchParams.get("error");
    const message = success || error;
    const messageType: "success" | "error" | "info" = success ? "success" : error ? "error" : "info";

    const [
      [regions],
      [countries],
      [plants],
      [departments],
      [areas],
      [subAreas],
      [employees],
    ] = await Promise.all([
      pool.query<RowDataPacket[]>(`SELECT id, name FROM it_equipment_region WHERE status = 1 ORDER BY name`),
      pool.query<RowDataPacket[]>(`SELECT id, name, region_id as parent_id FROM it_equipment_country WHERE status = 1 ORDER BY name`),
      pool.query<RowDataPacket[]>(`SELECT id, name, country_id as parent_id FROM it_equipment_plant WHERE status = 1 ORDER BY name`),
      pool.query<RowDataPacket[]>(`SELECT id, name, plant_id as parent_id FROM it_equipment_department WHERE status = 1 ORDER BY name`),
      pool.query<RowDataPacket[]>(`SELECT id, name, department_id as parent_id FROM it_equipment_area WHERE status = 1 ORDER BY name`),
      pool.query<RowDataPacket[]>(`SELECT id, name, area_id as parent_id FROM it_equipment_sub_area WHERE status = 1 ORDER BY name`),
      pool.query<RowDataPacket[]>(`SELECT employee_no, name FROM it_employees_list WHERE status = 1 ORDER BY name`),
    ]);

    const locationData = { regions, countries, plants, departments, areas, subAreas };

    return new Response(
      auditPage(
        allPeriods as Parameters<typeof auditPage>[0],
        defaultPeriod as Parameters<typeof auditPage>[1],
        isAdmin,
        hasPcPwView,
        username,
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

async function auditSearchApi(ctx: RequestContext): Promise<Response> {
  const { url, traceId, pool } = ctx;
  try {
    const query = url.searchParams.get("q")?.trim();
    if (!query) {
      return new Response(JSON.stringify({ success: false, error: "Search query required" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const [equipment] = await pool.query<RowDataPacket[]>(
      `${LATEST_PER_EQUIPMENT_CTE.replace("eq.teamviewer", "e.teamviewer").replace(
        "INNER JOIN it_equipment eq ON l.equipment_id = eq.id",
        "INNER JOIN it_equipment e ON l.equipment_id = e.id"
      )}
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
      `,
      [query]
    );

    if (equipment.length === 0) {
      return new Response(JSON.stringify({ success: false, error: "Not found" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, data: equipment[0] }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    logger.error("Audit search failed", err, { traceId });
    return new Response(JSON.stringify({ success: false, error: "Search failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function auditReviewApi(ctx: RequestContext): Promise<Response> {
  const { url, traceId, pool, isAdmin, hasAuditApprover, currentUsername } = ctx;
  const username = currentUsername!;

  if (!hasAuditApprover) {
    return new Response(JSON.stringify({ error: "Access denied" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const userPlantId = await getUserPlantId(username, pool);
    const inventoryPeriodId = url.searchParams.get("period_id");

    const allowedPlantId = !isAdmin && userPlantId !== null ? userPlantId : null;

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
        CONCAT_WS(' - ', r.name, c.name, p.name, d.name, a_loc.name, sa.name) as location,
        CONCAT_WS(' - ', v.name, t.type_name, pl.name, m.name) as equipment_type
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

    if (!isAdmin && allowedPlantId !== null) {
      whereConditions.push("d.plant_id = ?");
      params.push(allowedPlantId);
    }
    if (inventoryPeriodId) {
      whereConditions.push("a.inventory_period_id = ?");
      params.push(parseInt(inventoryPeriodId));
    }
    if (whereConditions.length > 0) query += " WHERE " + whereConditions.join(" AND ");
    query += " ORDER BY a.updated DESC";

    const [auditRecords] = await pool.query<RowDataPacket[]>(query, params);

    return new Response(JSON.stringify({ success: true, data: auditRecords }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    logger.error("Failed to fetch audit review data", err, { traceId });
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function auditReviewCompare(ctx: RequestContext): Promise<Response> {
  const { url, traceId, pool, isAdmin, currentUsername } = ctx;
  const username = currentUsername!;
  try {
    const userPlantId = await getUserPlantId(username, pool);
    if (!ctx.hasAuditApprover) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const inventoryPeriodId = url.searchParams.get("period_id");
    const allowedPlantId = !isAdmin && userPlantId !== null ? userPlantId : null;

    let query = `
      SELECT
        a.id,
        a.equipment_id,
        a.service_tag,
        a.updated,
        a.updated_by,
        ip.inventory_nr,
        CONCAT_WS(' - ', v.name, t.type_name, pl.name, m.name) as equipment_type,
        a.assigned_to as audit_assigned_to,
        CONCAT(a_emp.first_name, ' ', a_emp.last_name) as audit_assigned_to_name,
        CONCAT_WS(' - ', a_r.name, a_c.name, a_p.name, a_d.name, a_area.name, a_sa.name) as audit_location,
        a.teamviewer as audit_teamviewer,
        a.comment as audit_comment,
        a.is_written_off as audit_is_written_off,
        a_wor.reason as audit_write_off_reason,
        a.proposed_location as audit_proposed_location,
        a.proposed_location_status as audit_proposed_location_status,
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
      LEFT JOIN it_employees_list a_emp ON a.assigned_to = a_emp.employee_no
      LEFT JOIN it_equipment_sub_area a_sa ON a.equipment_sub_area_id = a_sa.id
      LEFT JOIN it_equipment_area a_area ON a_sa.area_id = a_area.id
      LEFT JOIN it_equipment_department a_d ON a_area.department_id = a_d.id
      LEFT JOIN it_equipment_plant a_p ON a_d.plant_id = a_p.id
      LEFT JOIN it_equipment_country a_c ON a_p.country_id = a_c.id
      LEFT JOIN it_equipment_region a_r ON a_c.region_id = a_r.id
      LEFT JOIN it_equipment_write_off_reason a_wor ON a.is_written_off = a_wor.id
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
    if (whereConditions.length > 0) query += " WHERE " + whereConditions.join(" AND ");
    query += " ORDER BY a.updated DESC";

    const [rows] = await pool.query<RowDataPacket[]>(query, params);

    const data = rows.map((r) => {
      const auditAssigned = r.audit_assigned_to
        ? r.audit_assigned_to + (r.audit_assigned_to_name ? " - " + r.audit_assigned_to_name : "")
        : null;
      const equipAssigned = r.equip_assigned_to
        ? r.equip_assigned_to + (r.equip_assigned_to_name ? " - " + r.equip_assigned_to_name : "")
        : null;
      const auditTv = r.audit_teamviewer != null ? String(r.audit_teamviewer) : null;
      const equipTv = r.equip_teamviewer != null ? String(r.equip_teamviewer) : null;
      const auditWo = r.audit_is_written_off ? r.audit_write_off_reason || "Yes" : "No";
      const equipWo = r.equip_is_written_off ? r.equip_write_off_reason || "Yes" : "No";

      const auditLocationDisplay = r.audit_proposed_location
        ? r.audit_proposed_location
        : r.audit_location || null;

      const diffs = {
        assigned_to: (auditAssigned || "") !== (equipAssigned || ""),
        location: (auditLocationDisplay || "") !== (r.equip_location || ""),
        teamviewer: (auditTv || "") !== (equipTv || ""),
        comment: (r.audit_comment || "") !== (r.equip_comment || ""),
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

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    logger.error("Failed to fetch audit review comparison data", err, { traceId });
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function auditReviewExport(ctx: RequestContext): Promise<Response> {
  const { url, traceId, pool, isAdmin, hasPcPwView, hasAuditApprover, currentUsername } = ctx;
  const username = currentUsername!;
  try {
    const userPlantId = await getUserPlantId(username, pool);

    if (!hasAuditApprover) {
      return new Response(
        errorPage(
          "Access Denied",
          "You do not have permission to export audit review data.",
          "You need the 'audit-approver' permission to export audit reviews. Please contact your administrator if you need access.",
          403,
          isAdmin,
          hasPcPwView,
          username,
          false
        ),
        { status: 403, headers: { "Content-Type": "text/html" } }
      );
    }

    const inventoryPeriodId = url.searchParams.get("period_id");
    const allowedPlantId = !isAdmin && userPlantId !== null ? userPlantId : null;

    let query = `
      SELECT
        a.service_tag,
        a.teamviewer,
        a.assigned_to,
        CONCAT(emp.first_name, ' ', emp.last_name) as assigned_to_name,
        CONCAT_WS(' - ', r.name, c.name, p.name, d.name, a_loc.name, sa.name) as location,
        CONCAT_WS(' - ', v.name, t.type_name, pl.name, m.name) as equipment_type,
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
    if (!isAdmin && allowedPlantId !== null) {
      whereConditions.push("d.plant_id = ?");
      params.push(allowedPlantId);
    }
    if (inventoryPeriodId) {
      whereConditions.push("a.inventory_period_id = ?");
      params.push(parseInt(inventoryPeriodId));
    }
    if (whereConditions.length > 0) query += " WHERE " + whereConditions.join(" AND ");
    query += " ORDER BY a.updated DESC";

    const [auditRecords] = await pool.query<RowDataPacket[]>(query, params);

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
      "Inventory Period",
    ];

    const csvRows = [
      headers.join(","),
      ...auditRecords.map((row) =>
        [
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
          `"${(row.inventory_nr || "").replace(/"/g, '""')}"`,
        ].join(",")
      ),
    ];

    const csv = csvRows.join("\n");
    const timestamp = new Date().toISOString().split("T")[0];

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="inventory-audit-${timestamp}.csv"`,
      },
    });
  } catch (err) {
    logger.error("Failed to export audit review", err, { traceId });
    return new Response("An internal error occurred. Please try again later.", { status: 500 });
  }
}

async function auditApply(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool, hasAuditApprover, currentUsername } = ctx;
  const username = currentUsername!;
  if (!hasAuditApprover) {
    return new Response(JSON.stringify({ error: "Access denied" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const serviceTag = body.service_tag?.toString();
    if (!serviceTag) {
      return new Response(JSON.stringify({ error: "Service tag is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

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
      return new Response(
        JSON.stringify({ error: "No audit entry found for this service tag" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const audit = auditEntries[0];
    const employeeNo = await getEmployeeNo(username, pool);
    const updatedBy = isAdminUser(username) ? null : employeeNo || null;

    if (audit.proposed_location && audit.proposed_location_status === "pending") {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Cannot apply: this audit entry has a pending proposed location. Please approve or reject it first.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const resolvedSubAreaId = audit.equipment_sub_area_id;

    if (audit.teamviewer !== null) {
      await pool.query(
        "UPDATE it_equipment SET teamviewer = ?, updated = CURRENT_TIMESTAMP WHERE id = ?",
        [audit.teamviewer, audit.equipment_id]
      );
    }

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
        updatedBy,
      ]
    );

    logger.info("Audit entry applied to main table", {
      traceId,
      serviceTag,
      equipmentId: audit.equipment_id,
      username,
    });

    return new Response(
      JSON.stringify({ success: true, message: "Audit entry applied successfully" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    logger.error("Failed to apply audit entry", err, { traceId });
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function auditApproveLocation(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool, hasAuditApprover, currentUsername } = ctx;
  const username = currentUsername!;

  if (!hasAuditApprover) {
    return new Response(JSON.stringify({ error: "Access denied" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const auditId = parseInt(body.audit_id?.toString() || "0");
    if (!auditId) {
      return new Response(JSON.stringify({ error: "Audit entry ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const [auditEntries] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM it_equipment_audit WHERE id = ?",
      [auditId]
    );
    if (auditEntries.length === 0) {
      return new Response(JSON.stringify({ error: "Audit entry not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const audit = auditEntries[0];

    if (!audit.proposed_location || audit.proposed_location_status !== "pending") {
      return new Response(
        JSON.stringify({ error: "This audit entry does not have a pending proposed location" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    let departmentId = audit.proposed_department_id;
    let areaName = audit.proposed_area_name || "";
    let subAreaName = audit.proposed_sub_area_name || "";

    if (!departmentId || !areaName || !subAreaName) {
      const parts = (audit.proposed_location || "").split(" - ").map((p: string) => p.trim());
      if (parts.length >= 5) {
        const deptName = parts[2];
        areaName = areaName || parts[3];
        subAreaName = subAreaName || parts[4];
        if (!departmentId && deptName) {
          const [deptRows] = await pool.query<RowDataPacket[]>(
            "SELECT id FROM it_equipment_department WHERE name = ? LIMIT 1",
            [deptName]
          );
          if (deptRows.length > 0) departmentId = deptRows[0].id;
        }
      } else if (parts.length >= 2 && !areaName && !subAreaName) {
        areaName = parts[parts.length - 2];
        subAreaName = parts[parts.length - 1];
      }
    }

    if (!departmentId || !areaName || !subAreaName) {
      return new Response(
        JSON.stringify({
          error:
            "Cannot determine location data. Please re-edit this audit entry using the quick edit modal so that the department, area, and sub-area are saved.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

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
      logger.info("Created new area for approved location", {
        traceId,
        areaId,
        areaName,
        departmentId,
      });
    }

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
      logger.info("Created new sub-area for approved location", {
        traceId,
        subAreaId,
        subAreaName,
        areaId,
      });
    }

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
      username,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Location "${areaName} - ${subAreaName}" created successfully`,
        area_id: areaId,
        sub_area_id: subAreaId,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    logger.error("Failed to approve proposed location", err, { traceId });
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function auditRejectLocation(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool, hasAuditApprover, currentUsername } = ctx;
  const username = currentUsername!;
  if (!hasAuditApprover) {
    return new Response(JSON.stringify({ error: "Access denied" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const auditId = parseInt(body.audit_id?.toString() || "0");
    const reassignSubAreaId = body.reassign_sub_area_id
      ? parseInt(body.reassign_sub_area_id.toString())
      : null;

    if (!auditId) {
      return new Response(JSON.stringify({ error: "Audit entry ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const [auditEntries] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM it_equipment_audit WHERE id = ?",
      [auditId]
    );
    if (auditEntries.length === 0) {
      return new Response(JSON.stringify({ error: "Audit entry not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const audit = auditEntries[0];

    if (!audit.proposed_location || audit.proposed_location_status !== "pending") {
      return new Response(
        JSON.stringify({ error: "This audit entry does not have a pending proposed location" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

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
      username,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: reassignSubAreaId
          ? "Proposed location rejected and reassigned to existing location"
          : "Proposed location rejected",
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    logger.error("Failed to reject proposed location", err, { traceId });
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function auditApplyAll(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool, hasAuditApprover, currentUsername } = ctx;
  const username = currentUsername!;
  if (!hasAuditApprover) {
    return new Response(JSON.stringify({ error: "Access denied" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const inventoryPeriodId = body.period_id ? parseInt(body.period_id.toString()) : null;

    const employeeNo = await getEmployeeNo(username, pool);
    const updatedBy = isAdminUser(username) ? null : employeeNo || null;

    const latestAuditsQuery = `
      SELECT a1.*, e.id as equipment_id
      FROM it_equipment_audit a1
      INNER JOIN it_equipment e ON a1.equipment_id = e.id
      INNER JOIN (
        SELECT service_tag, MAX(updated) as max_updated
        FROM it_equipment_audit
        ${inventoryPeriodId ? "WHERE inventory_period_id = ?" : ""}
        GROUP BY service_tag
      ) a2 ON a1.service_tag = a2.service_tag AND a1.updated = a2.max_updated
      ${inventoryPeriodId ? "WHERE a1.inventory_period_id = ?" : ""}
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

    for (const audit of latestAudits) {
      try {
        if (audit.teamviewer !== null) {
          await pool.query(
            "UPDATE it_equipment SET teamviewer = ?, updated = CURRENT_TIMESTAMP WHERE id = ?",
            [audit.teamviewer, audit.equipment_id]
          );
        }
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
            updatedBy,
          ]
        );
        appliedCount++;
      } catch (err) {
        errorCount++;
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        errors.push(`${audit.service_tag}: ${errorMsg}`);
        logger.error("Failed to apply audit entry for service tag", {
          traceId,
          serviceTag: audit.service_tag,
          error: errorMsg,
        });
      }
    }

    logger.info("Bulk audit apply completed", {
      traceId,
      appliedCount,
      errorCount,
      username,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Applied ${appliedCount} audit entries${errorCount > 0 ? `, ${errorCount} errors` : ""}`,
        applied: appliedCount,
        errors: errorCount,
        errorDetails: errors.length > 0 ? errors : undefined,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    logger.error("Failed to apply all audit entries", err, { traceId });
    return new Response(
      JSON.stringify({ success: false, error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
