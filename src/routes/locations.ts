import { logger } from "../utils/logger";
import { locationsPage } from "../templates/locations";
import {
  getUserPlantId,
  hasLocationsAddPermission,
  hasLocationsDeletePermission,
  hasLocationsEditPermission,
  hasLocationsViewPermission,
} from "../utils/auth";
import { locationsActionSchema } from "../utils/validation";
import { createApprovalRequest, getClientIp, getEmployeeNo } from "../utils/approvals";
import { getLocationsData } from "../repositories/management";
import type { RequestContext } from "./types";
import type { Router } from "./router";

interface LocationKindConfig {
  table: string;
  parent?: string;
}

const KIND: Record<string, LocationKindConfig> = {
  region: { table: "it_equipment_region" },
  country: { table: "it_equipment_country", parent: "region_id" },
  plant: { table: "it_equipment_plant", parent: "country_id" },
  department: { table: "it_equipment_department", parent: "plant_id" },
  area: { table: "it_equipment_area", parent: "department_id" },
  sub_area: { table: "it_equipment_sub_area", parent: "area_id" },
};

export function registerLocationsRoutes(router: Router): void {
  router.get("/locations", locationsGet);
  router.post("/locations", locationsPost);
}

async function locationsGet(ctx: RequestContext): Promise<Response> {
  const { url, pool, isAdmin, hasPcPwView, hasAuditApprover, currentUsername } = ctx;
  const username = currentUsername!;
  const success = url.searchParams.get("success") || "";
  const error = url.searchParams.get("error") || "";
  const userPlantId = await getUserPlantId(username, pool);
  const hasView = await hasLocationsViewPermission(username, pool, userPlantId);
  const data = (await getLocationsData(pool)) as unknown as Parameters<typeof locationsPage>[0];
  if (!hasView) {
    const fallbackError = success ? "" : "Actions require approval.";
    return new Response(
      locationsPage(
        data,
        success,
        error || fallbackError,
        isAdmin,
        hasPcPwView,
        username,
        hasAuditApprover
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  }
  return new Response(
    locationsPage(data, success, error, isAdmin, hasPcPwView, username, hasAuditApprover),
    { headers: { "Content-Type": "text/html" } }
  );
}

async function locationsPost(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool, currentUsername } = ctx;
  const username = currentUsername!;

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
    const kind = KIND[type];
    if (!kind) {
      return Response.redirect(`/locations?error=${encodeURIComponent("Unknown type")}`, 303);
    }

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
          "/locations?error=" +
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
          "/locations?success=" +
            encodeURIComponent("Approval request created (ID: " + requestId + ")"),
          303
        );
      }
      return Response.redirect(
        "/locations?error=" + encodeURIComponent("Failed to create approval request"),
        303
      );
    };

    if (action === "add") {
      const hasAdd = await hasLocationsAddPermission(username, pool, userPlantId);
      if (!hasAdd) {
        const actionData: Record<string, unknown> = { type, name };
        if (parent_id !== null) actionData.parent_id = parent_id;
        return approve("locations_add", "add_location", actionData);
      }
      if (!name) throw new Error("Name is required");
      if (kind.parent && !parent_id) throw new Error("Parent is required");

      const cols = ["name", "status"];
      const vals: (string | number)[] = [name, 1];
      if (kind.parent && parent_id !== null) {
        cols.push(kind.parent);
        vals.push(parent_id);
      }
      const placeholders = cols.map(() => "?").join(", ");
      await pool.query(
        `INSERT INTO ${kind.table} (${cols.join(",")}) VALUES (${placeholders})`,
        vals
      );
    } else if (action === "edit") {
      const hasEdit = await hasLocationsEditPermission(username, pool, userPlantId);
      if (!hasEdit) {
        return approve("locations_edit", "edit_location", { type, id, name });
      }
      if (!id) throw new Error("ID is required");
      if (!name) throw new Error("Name is required");
      await pool.query(`UPDATE ${kind.table} SET name = ? WHERE id = ?`, [name, id]);
    } else if (action === "deactivate" || action === "activate") {
      const hasDelete = await hasLocationsDeletePermission(username, pool, userPlantId);
      if (!hasDelete) {
        return approve(
          "locations_delete",
          action === "activate" ? "activate_location" : "deactivate_location",
          { type, id, action }
        );
      }
      if (!id) throw new Error("ID is required");
      const status = action === "activate" ? 1 : 0;
      await pool.query(`UPDATE ${kind.table} SET status = ? WHERE id = ?`, [status, id]);
    } else {
      throw new Error("Unknown action");
    }

    return Response.redirect(`/locations?success=${encodeURIComponent("Saved")}`, 303);
  } catch (err) {
    logger.error("Failed to manage location", err, { traceId, rawData });
    return Response.redirect(
      `/locations?error=${encodeURIComponent("An unexpected error occurred. Please try again.")}`,
      303
    );
  }
}
