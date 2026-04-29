import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { logger } from "../utils/logger";
import { searchPage } from "../templates/search";
import { addPage } from "../templates/add";
import { editPage } from "../templates/edit";
import { errorPage } from "../templates/error";
import {
  hasAddEquipmentPermission,
  hasAdminPermission,
  hasEditEquipmentPermission,
  hasManageLocationsPermission,
  hasPcPwViewPermission,
  hasRepairsSendPermission,
  getUserPlantId,
} from "../utils/auth";
import { equipmentAddSchema, equipmentEditSchema } from "../utils/validation";
import { createApprovalRequest, getClientIp, getEmployeeNo } from "../utils/approvals";
import { sendApprovalNotification } from "../utils/email";
import { getAddData, getAuditData, getPlantHierarchy } from "../repositories/equipment";
import type { RequestContext } from "./types";
import type { Router } from "./router";

type AddDataType = Parameters<typeof addPage>[0];
type EditDataType = Parameters<typeof editPage>[0];

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

export function registerEquipmentRoutes(router: Router): void {
  router.get("/", searchGet);
  router.get("/add", addGet);
  router.post("/add", addPost);
  router.get(/^\/edit\/\d+$/, editGet);
  router.post(/^\/edit\/\d+$/, editPost);
}

async function searchGet(ctx: RequestContext): Promise<Response> {
  const { url, traceId, pool, isAdmin, hasPcPwView, hasAuditApprover, currentUsername } = ctx;
  const username = currentUsername!;
  const userPlantId = await getUserPlantId(username, pool);

  const query = url.searchParams.get("q") || url.searchParams.get("serial") || "";
  const PAGE_SIZE = 25;
  const showAll = url.searchParams.get("all") === "1";
  const page = showAll ? 1 : Math.max(1, parseInt(url.searchParams.get("page") || "1") || 1);

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

  if (!query || !query.trim()) {
    return new Response(
      searchPage("", null, null, isAdmin, hasPcPwView, userPlantId, username, hasAuditApprover),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  const trimmed = query.trim();
  const isWildcard = trimmed === "*";
  logger.info("Search request", { traceId, query: trimmed, page, filters: columnFilters });

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

  const whereParts: string[] = [];
  const allParams: (string | number)[] = [];

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
    for (let i = 0; i < 14; i++) allParams.push(searchTerm);
  }

  const filterCols: Array<[keyof typeof columnFilters, string]> = [
    ["serial", `e.service_tag LIKE ?`],
    ["type", `t.type_name LIKE ?`],
    ["pline", `pl.name LIKE ?`],
    ["model", `m.name LIKE ?`],
    ["vendor", `v.name LIKE ?`],
    ["assigned", `CONCAT(emp.first_name, ' ', emp.last_name) LIKE ?`],
    ["location", `CONCAT_WS(' > ', r.name, c.name, p.name, d.name, a.name, sa.name) LIKE ?`],
    ["date", `DATE_FORMAT(log.created, '%d.%m.%Y') LIKE ?`],
  ];
  for (const [key, sql] of filterCols) {
    if (columnFilters[key]) {
      whereParts.push(sql);
      allParams.push(`%${columnFilters[key]}%`);
    }
  }

  const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

  const [countResult] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT e.id) as total ${baseFrom} ${whereClause}`,
    allParams
  );
  const totalCount = countResult[0]?.total || 0;
  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = showAll ? 1 : Math.min(page, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const limitClause = showAll ? "" : "LIMIT ? OFFSET ?";
  const queryParams: (string | number)[] = showAll
    ? [...allParams]
    : [...allParams, PAGE_SIZE, offset];

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT DISTINCT
      e.id,
      e.service_tag,
      t.type_name,
      pl.name as product_line_name,
      m.name as model_name,
      v.name as vendor_name,
      CONCAT(emp.first_name, ' ', emp.last_name) as assigned_to_name,
      CONCAT_WS(' > ', r.name, c.name, p.name, d.name, a.name, sa.name) as location,
      log.created as latest_audit_date,
      p.id as plant_id
    ${baseFrom}
    ${whereClause}
    ORDER BY e.service_tag
    ${limitClause}`,
    queryParams
  );

  logger.info("Search results", {
    traceId,
    query: trimmed,
    count: rows.length,
    totalCount,
    page: currentPage,
    totalPages,
    showAll,
  });

  const resultsWithReadonly = rows.map((row: RowDataPacket) => {
    const result = row as SearchResult;
    result.isReadonly =
      !isAdmin && result.plant_id !== null && userPlantId !== null && result.plant_id !== userPlantId;
    return result;
  });

  return new Response(
    searchPage(
      trimmed,
      resultsWithReadonly.length > 0 ? resultsWithReadonly : [],
      null,
      isAdmin,
      hasPcPwView,
      userPlantId,
      username,
      hasAuditApprover,
      currentPage,
      totalPages,
      totalCount,
      showAll ? totalCount : PAGE_SIZE,
      showAll,
      columnFilters
    ),
    { headers: { "Content-Type": "text/html" } }
  );
}

async function addGet(ctx: RequestContext): Promise<Response> {
  const { url, pool, isAdmin, hasPcPwView, currentUsername } = ctx;
  const username = currentUsername!;
  const serial = url.searchParams.get("serial") || "";
  const userPlantId = await getUserPlantId(username, pool);
  const data = await getAddData(pool, serial, userPlantId, isAdmin);
  return new Response(addPage(data, false, null, isAdmin, hasPcPwView, username), {
    headers: { "Content-Type": "text/html" },
  });
}

async function addPost(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool, isAdmin, hasPcPwView, currentUsername, url } = ctx;
  const username = currentUsername!;

  const formData = await req.formData();

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

  const userPlantId = await getUserPlantId(username, pool);
  const hasAdd = await hasAddEquipmentPermission(username, pool, userPlantId);

  const renderAddPageWithMessage = async (
    serviceTag: string,
    success: boolean,
    error: string | null
  ): Promise<Response> => {
    const data = await getAddData(pool, serviceTag, userPlantId, isAdmin);
    return new Response(addPage(data, success, error, isAdmin, hasPcPwView, username), {
      headers: { "Content-Type": "text/html" },
    });
  };

  if (!hasAdd) {
    const employeeNo = await getEmployeeNo(username, pool);
    const clientIp = getClientIp(req);

    if (!employeeNo) {
      return renderAddPageWithMessage(
        rawData.service_tag || "",
        false,
        "Unable to create approval request. Please contact your administrator."
      );
    }

    const requestId = await createApprovalRequest(
      employeeNo,
      userPlantId ? `${userPlantId}_add` : "add",
      "add_equipment",
      rawData,
      clientIp,
      pool
    );

    if (requestId) {
      sendApprovalNotification(
        requestId,
        userPlantId ? `${userPlantId}_add` : "add",
        "add_equipment",
        rawData,
        employeeNo,
        pool
      ).catch((err) => console.error("Failed to send approval notification:", err));

      // The page renders the approval-request id as a non-error info message;
      // the addPage template currently has no info channel, so it goes in `error`.
      return renderAddPageWithMessage(
        rawData.service_tag || "",
        false,
        `Approval request created (ID: ${requestId})`
      );
    }
    return renderAddPageWithMessage(
      rawData.service_tag || "",
      false,
      "Failed to create approval request. Please contact your administrator."
    );
  }

  try {
    const validated = equipmentAddSchema.parse(rawData);
    const cerf = validated.cerf || 0;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO it_equipment (
        service_tag, vendor_id, supplier_id, model_id,
        purchase_date, warranty_expiry_date, teamviewer, cerf, ip, mac_addresses,
        imei1, imei2
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        validated.service_tag,
        validated.vendor_id || null,
        validated.supplier_id || null,
        validated.model_id || null,
        validated.purchase_date,
        validated.warranty_expiry_date,
        validated.teamviewer || null,
        cerf,
        validated.ip || null,
        validated.mac_addresses || null,
        validated.imei1 || null,
        validated.imei2 || null,
      ]
    );

    const equipmentId = result.insertId;

    await pool.query(
      `INSERT INTO it_equipment_log (
        equipment_id, service_tag, assigned_to, equipment_sub_area_id, inventory_period_id, comment
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        equipmentId,
        validated.service_tag,
        validated.assigned_to || null,
        validated.equipment_sub_area_id || null,
        validated.inventory_period_id || null,
        validated.comment || null,
      ]
    );

    return Response.redirect(`${url.origin}/edit/${equipmentId}?success=1`, 303);
  } catch (err) {
    logger.error("Failed to add equipment", err, { traceId, serviceTag: rawData.service_tag });
    return renderAddPageWithMessage(
      rawData.service_tag || "",
      false,
      "An unexpected error occurred. Please try again."
    );
  }
}

async function editGet(ctx: RequestContext): Promise<Response> {
  const { path, url, pool, isAdmin, hasPcPwView, hasAuditApprover, currentUsername } = ctx;
  const username = currentUsername!;
  const id = parseInt(path.split("/")[2]);

  const userPlantId = await getUserPlantId(username, pool);
  const hasEditPermission = await hasEditEquipmentPermission(username, pool, userPlantId);
  const success = url.searchParams.get("success") === "1";

  if (!hasEditPermission) {
    const auditData = await getAuditData(pool, id, userPlantId, isAdmin);
    if (!auditData) {
      return new Response("Equipment not found", { status: 404 });
    }
    const hasManageLocations =
      isAdmin || (await hasManageLocationsPermission(username, pool, userPlantId));
    return new Response(
      editPage(
        auditData,
        false,
        "You do not have permission to edit equipment. Please contact your administrator.",
        isAdmin,
        hasPcPwView,
        false,
        userPlantId,
        null,
        null,
        username,
        hasAuditApprover,
        hasManageLocations
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  const auditData = await getAuditData(pool, id, userPlantId, isAdmin);
  if (!auditData) {
    return new Response("Equipment not found", { status: 404 });
  }

  const hasManageLocations =
    isAdmin || (await hasManageLocationsPermission(username, pool, userPlantId));

  const equipmentPlantId = auditData.equipment.plant_id as number | null;
  const isCrossPlant =
    !isAdmin &&
    equipmentPlantId !== null &&
    userPlantId !== null &&
    equipmentPlantId !== userPlantId;

  if (isCrossPlant) {
    return new Response(
      errorPage(
        "Access Denied",
        "You do not have permission to view this equipment.",
        "This equipment belongs to a different plant. Please contact your administrator if you need access.",
        403,
        isAdmin,
        hasPcPwView,
        username ?? "",
        hasAuditApprover
      ),
      { status: 403, headers: { "Content-Type": "text/html" } }
    );
  }

  const { allowedRegionId, allowedCountryId } = await getPlantHierarchy(
    pool,
    userPlantId,
    isAdmin
  );

  return new Response(
    editPage(
      auditData,
      success,
      null,
      isAdmin,
      hasPcPwView,
      false,
      userPlantId,
      allowedRegionId,
      allowedCountryId,
      username,
      hasAuditApprover,
      hasManageLocations
    ),
    { headers: { "Content-Type": "text/html" } }
  );
}

async function editPost(ctx: RequestContext): Promise<Response> {
  const { req, traceId, path, url, pool, hasAuditApprover, currentUsername } = ctx;
  const username = currentUsername!;
  const id = parseInt(path.split("/")[2]);
  const formData = await req.formData();

  const isAdminPost = await hasAdminPermission(username, pool);
  const hasPcPwViewPost = await hasPcPwViewPermission(username, pool);
  const userPlantId = await getUserPlantId(username, pool);

  const auditData = await getAuditData(pool, id, userPlantId, isAdminPost);
  if (!auditData) {
    return new Response("Equipment not found", { status: 404 });
  }

  const equipmentPlantId = auditData.equipment.plant_id as number | null;
  const isReadonly =
    !isAdminPost &&
    equipmentPlantId !== null &&
    userPlantId !== null &&
    equipmentPlantId !== userPlantId;

  const hasManageLocationsPost =
    isAdminPost || (await hasManageLocationsPermission(username, pool, userPlantId));

  const renderEdit = (data: EditDataType, success: false | string, error: string | null): Response =>
    new Response(
      editPage(
        data,
        success,
        error,
        isAdminPost,
        hasPcPwViewPost,
        isReadonly,
        userPlantId,
        null,
        null,
        username,
        hasAuditApprover,
        hasManageLocationsPost
      ),
      { headers: { "Content-Type": "text/html" } }
    );

  if (isReadonly) {
    const { allowedRegionId, allowedCountryId } = await getPlantHierarchy(
      pool,
      userPlantId,
      isAdminPost
    );
    return new Response(
      editPage(
        auditData,
        false,
        "Cannot edit: This equipment belongs to another plant. You can only view it.",
        isAdminPost,
        hasPcPwViewPost,
        true,
        userPlantId,
        allowedRegionId,
        allowedCountryId,
        username,
        hasAuditApprover,
        hasManageLocationsPost
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  const hasEditPermissionPost = await hasEditEquipmentPermission(username, pool, userPlantId);

  if (!hasEditPermissionPost) {
    const employeeNo = await getEmployeeNo(username, pool);
    const clientIp = getClientIp(req);

    if (!employeeNo) {
      return renderEdit(
        auditData,
        false,
        "Unable to create approval request. Please contact your administrator."
      );
    }

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

    const requestId = await createApprovalRequest(
      employeeNo,
      "edit",
      "edit_equipment",
      rawData,
      clientIp,
      pool
    );

    if (requestId) {
      sendApprovalNotification(
        requestId,
        "edit",
        "edit_equipment",
        rawData,
        employeeNo,
        pool
      ).catch((err) => console.error("Failed to send approval notification:", err));

      return renderEdit(auditData, `Approval request created (ID: ${requestId})`, null);
    }
    return renderEdit(
      auditData,
      false,
      "Failed to create approval request. Please contact your administrator."
    );
  }

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
    const cerf = validated.cerf || 0;
    const is_written_off = validated.is_written_off ? Number(validated.is_written_off) : null;
    const write_off_comment = rawData.write_off_comment
      ? rawData.write_off_comment.toString().trim()
      : null;
    const repair_status = rawData.repair_status ? rawData.repair_status.toString() : null;
    const repair_note = rawData.repair_note ? rawData.repair_note.toString().trim() : null;
    const repair_physical_location = rawData.repair_physical_location
      ? rawData.repair_physical_location.toString().trim()
      : null;

    if (is_written_off && !write_off_comment) {
      return renderEdit(
        auditData,
        false,
        "Write-off comment is required when writing off equipment."
      );
    }

    if (repair_status === "needs_repair" && !repair_note) {
      return renderEdit(
        auditData,
        false,
        "Repair note is required when registering equipment for repair."
      );
    }

    const [equipment] = await pool.query<RowDataPacket[]>(
      `SELECT service_tag FROM it_equipment WHERE id = ?`,
      [id]
    );
    if (equipment.length === 0) {
      return new Response("Equipment not found", { status: 404 });
    }
    const service_tag = equipment[0].service_tag;

    let repairSentDate = null;
    let repairReturnedDate = null;
    let repairMarkedBackupDate = null;

    if (repair_status === "needs_repair") {
      const [existing] = await pool.query<RowDataPacket[]>(
        "SELECT repair_sent_date FROM it_equipment WHERE id = ?",
        [id]
      );
      repairSentDate = existing[0]?.repair_sent_date || null;
    } else if (!repair_status) {
      // Clear all
    } else {
      const [existing] = await pool.query<RowDataPacket[]>(
        "SELECT repair_sent_date, repair_returned_date, repair_marked_backup_date FROM it_equipment WHERE id = ?",
        [id]
      );
      repairSentDate = existing[0]?.repair_sent_date || null;
      repairReturnedDate = existing[0]?.repair_returned_date || null;
      repairMarkedBackupDate = existing[0]?.repair_marked_backup_date || null;
    }

    await pool.query(
      `UPDATE it_equipment SET
        model_id = ?, vendor_id = ?, supplier_id = ?, purchase_date = ?,
        warranty_expiry_date = ?, cerf = ?, ip = ?, mac_addresses = ?,
        imei1 = ?, imei2 = ?, teamviewer = ?, is_written_off = ?,
        repair_status = ?, repair_note = ?, repair_physical_location = ?,
        repair_sent_date = ?, repair_returned_date = ?, repair_marked_backup_date = ?,
        updated = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        validated.model_id || null,
        validated.vendor_id || null,
        validated.supplier_id || null,
        validated.purchase_date || null,
        validated.warranty_expiry_date || null,
        cerf,
        validated.ip || null,
        validated.mac_addresses || null,
        validated.imei1 || null,
        validated.imei2 || null,
        validated.teamviewer || null,
        is_written_off,
        repair_status || null,
        repair_note || null,
        repair_physical_location || null,
        repairSentDate,
        repairReturnedDate,
        repairMarkedBackupDate,
        id,
      ]
    );

    let logComment: string | null = validated.comment || null;
    if (is_written_off && write_off_comment) {
      logComment = logComment
        ? `[Write-Off: ${write_off_comment}] ${logComment}`
        : `[Write-Off: ${write_off_comment}]`;
    } else if (!is_written_off && write_off_comment) {
      logComment = logComment
        ? `[Restored from write-off] ${logComment}`
        : `[Restored from write-off]`;
    }

    await pool.query(
      `INSERT INTO it_equipment_log (
        equipment_id, service_tag, assigned_to, equipment_sub_area_id, inventory_period_id, comment, is_written_off
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        service_tag,
        validated.assigned_to || null,
        validated.equipment_sub_area_id || null,
        validated.inventory_period_id || null,
        logComment,
        is_written_off || null,
      ]
    );

    if (action === "send_to_repair") {
      const hasSendRepair = await hasRepairsSendPermission(username, pool, userPlantId);
      if (!hasSendRepair) {
        const employeeNo = await getEmployeeNo(username, pool);
        const clientIp = getClientIp(req);
        if (!employeeNo) {
          return renderEdit(
            auditData,
            false,
            "Unable to create approval request. Please contact your administrator."
          );
        }
        const requestId = await createApprovalRequest(
          employeeNo,
          userPlantId ? `${userPlantId}_repairs_send` : "repairs_send",
          "send_to_repair",
          { id, ...rawData },
          clientIp,
          pool
        );
        if (requestId) {
          return renderEdit(auditData, false, `Approval request created (ID: ${requestId})`);
        }
        return renderEdit(
          auditData,
          false,
          "Failed to create approval request. Please contact your administrator."
        );
      }
      return Response.redirect(
        `${url.origin}/repairs?success=${encodeURIComponent("Equipment sent to repair")}`,
        303
      );
    }

    return Response.redirect(`${url.origin}/edit/${id}?success=1`, 303);
  } catch (err) {
    logger.error("Failed to edit equipment", err, { traceId, equipmentId: id });
    const reloaded = await getAuditData(pool, id, userPlantId, isAdminPost);
    if (!reloaded) {
      return new Response("Equipment not found", { status: 404 });
    }
    return renderEdit(reloaded, false, "An unexpected error occurred. Please try again.");
  }
}
