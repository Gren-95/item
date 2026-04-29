import type { RowDataPacket } from "mysql2";
import { logger } from "../utils/logger";
import { vendorsPage } from "../templates/vendors";
import { writeOffPage } from "../templates/write-off";
import {
  getUserPlantId,
  hasManageVendorsPermission,
  hasVendorsAddPermission,
  hasVendorsDeletePermission,
  hasVendorsEditPermission,
  hasVendorsViewPermission,
  hasWriteOffReasonsAddPermission,
  hasWriteOffReasonsDeletePermission,
  hasWriteOffReasonsEditPermission,
  hasWriteOffReasonsViewPermission,
} from "../utils/auth";
import {
  suppliersActionSchema,
  vendorsActionSchema,
  writeOffReasonsActionSchema,
} from "../utils/validation";
import { createApprovalRequest, getClientIp, getEmployeeNo } from "../utils/approvals";
import {
  getVendorsAndSuppliersData,
  getWriteOffReasonsData,
} from "../repositories/management";
import type { RequestContext } from "./types";
import type { Router } from "./router";

export function registerVendorsRoutes(router: Router): void {
  router.get("/vendors", vendorsGet);
  router.post("/vendors", vendorsPost);
  router.get("/write-off-reasons", writeOffGet);
  router.post("/write-off-reasons", writeOffPost);
}

async function vendorsGet(ctx: RequestContext): Promise<Response> {
  const { url, pool, isAdmin, hasPcPwView, hasAuditApprover, currentUsername } = ctx;
  const username = currentUsername!;
  const userPlantId = await getUserPlantId(username, pool);
  const hasView = await hasVendorsViewPermission(username, pool, userPlantId);
  if (!hasView) {
    return new Response(
      vendorsPage(
        await getVendorsAndSuppliersData(pool),
        "",
        "Actions require approval.",
        isAdmin,
        hasPcPwView,
        username
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  }
  const success = url.searchParams.get("success") || "";
  const error = url.searchParams.get("error") || "";
  const data = await getVendorsAndSuppliersData(pool);
  return new Response(
    vendorsPage(data, success, error, isAdmin, hasPcPwView, username, hasAuditApprover),
    { headers: { "Content-Type": "text/html" } }
  );
}

async function vendorsPost(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool, currentUsername } = ctx;
  const username = currentUsername!;

  const hasManageVendors = await hasManageVendorsPermission(username, pool);
  if (!hasManageVendors) {
    return Response.redirect(
      "/vendors?error=" +
        encodeURIComponent("You do not have permission to manage vendors/suppliers"),
      303
    );
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
        representative_name: form.get("representative_name")
          ? form.get("representative_name")!.toString().trim()
          : "",
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

      const employeeNo = await getEmployeeNo(username, pool);
      const clientIp = getClientIp(req);
      const userPlantId = await getUserPlantId(username, pool);

      const approve = async (
        permKey: string,
        actionType: string,
        actionData: Record<string, unknown>
      ): Promise<Response> => {
        if (!employeeNo) {
          return Response.redirect(
            "/vendors?error=" +
              encodeURIComponent(
                "Unable to create approval request. Please contact your administrator."
              ),
            303
          );
        }
        const requestId = await createApprovalRequest(
          employeeNo,
          userPlantId ? `${userPlantId}_${permKey}` : permKey,
          actionType,
          actionData,
          clientIp,
          pool
        );
        if (requestId) {
          return Response.redirect(
            "/vendors?success=" +
              encodeURIComponent("Approval request created (ID: " + requestId + ")"),
            303
          );
        }
        return Response.redirect(
          "/vendors?error=" +
            encodeURIComponent(
              "Failed to create approval request. Please contact your administrator."
            ),
          303
        );
      };

      if (action === "add") {
        const hasAdd = await hasVendorsAddPermission(username, pool, userPlantId);
        if (!hasAdd) {
          return approve("vendors_add", "add_supplier", {
            entity: "supplier",
            name,
            email,
            phone_number,
            address,
            representative_name,
            sap_vendor_no,
            website,
          });
        }
        await pool.query(
          `INSERT INTO it_equipment_supplier (name, email, phone_number, address, representative_name, sap_vendor_no, website)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [name!, email, phone_number, address, representative_name, sap_vendor_no, website]
        );
      } else if (action === "edit") {
        const hasEdit = await hasVendorsEditPermission(username, pool, userPlantId);
        if (!hasEdit) {
          return approve("vendors_edit", "edit_supplier", {
            entity: "supplier",
            id,
            name,
            email,
            phone_number,
            address,
            representative_name,
            sap_vendor_no,
            website,
          });
        }
        await pool.query(
          `UPDATE it_equipment_supplier
             SET name = ?, email = ?, phone_number = ?, address = ?, representative_name = ?, sap_vendor_no = ?, website = ?
           WHERE id = ?`,
          [name!, email, phone_number, address, representative_name, sap_vendor_no, website, id!]
        );
      } else if (action === "delete") {
        const hasDelete = await hasVendorsDeletePermission(username, pool, userPlantId);
        if (!hasDelete) {
          return approve("vendors_delete", "delete_supplier", { entity: "supplier", id });
        }
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

      const employeeNo = await getEmployeeNo(username, pool);
      const clientIp = getClientIp(req);
      const userPlantId = await getUserPlantId(username, pool);

      const approve = async (
        permKey: string,
        actionType: string,
        actionData: Record<string, unknown>
      ): Promise<Response> => {
        if (!employeeNo) {
          return Response.redirect(
            "/vendors?error=" +
              encodeURIComponent(
                "Unable to create approval request. Please contact your administrator."
              ),
            303
          );
        }
        const requestId = await createApprovalRequest(
          employeeNo,
          userPlantId ? `${userPlantId}_${permKey}` : permKey,
          actionType,
          actionData,
          clientIp,
          pool
        );
        if (requestId) {
          return Response.redirect(
            "/vendors?success=" +
              encodeURIComponent("Approval request created (ID: " + requestId + ")"),
            303
          );
        }
        return Response.redirect(
          "/vendors?error=" +
            encodeURIComponent(
              "Failed to create approval request. Please contact your administrator."
            ),
          303
        );
      };

      if (action === "add") {
        const hasAdd = await hasVendorsAddPermission(username, pool, userPlantId);
        if (!hasAdd) {
          return approve("vendors_add", "add_vendor", { entity: "vendor", name });
        }
        await pool.query("INSERT INTO it_equipment_vendor (name) VALUES (?)", [name!]);
      } else if (action === "edit") {
        const hasEdit = await hasVendorsEditPermission(username, pool, userPlantId);
        if (!hasEdit) {
          return approve("vendors_edit", "edit_vendor", { entity: "vendor", id, name });
        }
        await pool.query("UPDATE it_equipment_vendor SET name = ? WHERE id = ?", [name!, id!]);
      } else if (action === "delete") {
        const hasDelete = await hasVendorsDeletePermission(username, pool, userPlantId);
        if (!hasDelete) {
          return approve("vendors_delete", "delete_vendor", { entity: "vendor", id });
        }
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
    logger.error("Failed to manage vendor/supplier", err, {
      traceId,
      action: rawCommon.action,
      entity,
    });
    return Response.redirect(
      `/vendors?error=${encodeURIComponent("An unexpected error occurred. Please try again.")}`,
      303
    );
  }
}

async function writeOffGet(ctx: RequestContext): Promise<Response> {
  const { url, pool, isAdmin, hasPcPwView, hasAuditApprover, currentUsername } = ctx;
  const username = currentUsername!;
  const userPlantId = await getUserPlantId(username, pool);
  const hasView = await hasWriteOffReasonsViewPermission(username, pool, userPlantId);
  const data = await getWriteOffReasonsData(pool);
  if (!hasView) {
    return new Response(
      writeOffPage(
        data,
        "",
        "Actions require approval.",
        isAdmin,
        hasPcPwView,
        username,
        hasAuditApprover
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  }
  const success = url.searchParams.get("success") || "";
  const error = url.searchParams.get("error") || "";
  return new Response(
    writeOffPage(data, success, error, isAdmin, hasPcPwView, username, hasAuditApprover),
    { headers: { "Content-Type": "text/html" } }
  );
}

async function writeOffPost(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool, currentUsername } = ctx;
  const username = currentUsername!;

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
    const userPlantId = await getUserPlantId(username, pool);
    const employeeNo = await getEmployeeNo(username, pool);
    const clientIp = getClientIp(req);

    const approve = async (
      permKey: string,
      actionType: string,
      actionData: Record<string, unknown>
    ): Promise<Response> => {
      if (!employeeNo) {
        return Response.redirect(
          "/write-off-reasons?error=" +
            encodeURIComponent(
              "Unable to create approval request. Please contact your administrator."
            ),
          303
        );
      }
      const requestId = await createApprovalRequest(
        employeeNo,
        userPlantId ? `${userPlantId}_${permKey}` : permKey,
        actionType,
        actionData,
        clientIp,
        pool
      );
      if (requestId) {
        return Response.redirect(
          "/write-off-reasons?success=" +
            encodeURIComponent("Approval request created (ID: " + requestId + ")"),
          303
        );
      }
      return Response.redirect(
        "/write-off-reasons?error=" +
          encodeURIComponent(
            "Failed to create approval request. Please contact your administrator."
          ),
        303
      );
    };

    if (action === "add") {
      const hasAdd = await hasWriteOffReasonsAddPermission(username, pool, userPlantId);
      if (!hasAdd) {
        return approve("write_off_reasons_add", "add_write_off_reason", { reason });
      }
      if (!reason) throw new Error("Reason is required");
      await pool.query("INSERT INTO it_equipment_write_off_reason (reason) VALUES (?)", [reason]);
    } else if (action === "edit") {
      const hasEdit = await hasWriteOffReasonsEditPermission(username, pool, userPlantId);
      if (!hasEdit) {
        return approve("write_off_reasons_edit", "edit_write_off_reason", { id, reason });
      }
      if (!id) throw new Error("ID is required");
      if (!reason) throw new Error("Reason is required");
      await pool.query("UPDATE it_equipment_write_off_reason SET reason = ? WHERE id = ?", [
        reason,
        id,
      ]);
    } else if (action === "delete") {
      const hasDelete = await hasWriteOffReasonsDeletePermission(username, pool, userPlantId);
      if (!hasDelete) {
        const [inUse] = await pool.query<RowDataPacket[]>(
          "SELECT COUNT(*) as count FROM it_equipment WHERE is_written_off = ?",
          [id]
        );
        if (inUse[0].count > 0) {
          return Response.redirect(
            "/write-off-reasons?error=" +
              encodeURIComponent("Cannot delete write-off reason that is in use"),
            303
          );
        }
        return approve("write_off_reasons_delete", "delete_write_off_reason", { id });
      }
      if (!id) throw new Error("ID is required");
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
    logger.error("Failed to manage write-off reason", err, { traceId, rawData });
    return Response.redirect(
      `/write-off-reasons?error=${encodeURIComponent(
        "An unexpected error occurred. Please try again."
      )}`,
      303
    );
  }
}
