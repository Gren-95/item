import { logger } from "../utils/logger";
import { typesPage } from "../templates/types";
import { errorPage } from "../templates/error";
import {
  getUserPlantId,
  hasManageTypesPermission,
  hasTypesAddPermission,
  hasTypesDeletePermission,
  hasTypesEditPermission,
  hasTypesViewPermission,
} from "../utils/auth";
import { typesActionSchema } from "../utils/validation";
import { createApprovalRequest, getClientIp, getEmployeeNo } from "../utils/approvals";
import { getTypesData } from "../repositories/management";
import type { RequestContext } from "./types";
import type { Router } from "./router";

interface TypeKindConfig {
  table: string;
  nameCol: string;          // it_equipment_type uses type_name
  parentCol?: string;        // model needs product_line_id; product-line needs type_id
  actionSlug: string;        // type → "type", product-line → "product_line", model → "model"
}

const KIND: Record<string, TypeKindConfig> = {
  type: { table: "it_equipment_type", nameCol: "type_name", actionSlug: "type" },
  "product-line": {
    table: "it_equipment_product_line",
    nameCol: "name",
    parentCol: "type_id",
    actionSlug: "product_line",
  },
  model: {
    table: "it_equipment_model",
    nameCol: "name",
    parentCol: "product_line_id",
    actionSlug: "model",
  },
};

export function registerTypesRoutes(router: Router): void {
  router.get("/types", typesGet);
  router.post("/types", typesPost);
}

async function typesGet(ctx: RequestContext): Promise<Response> {
  const { url, pool, isAdmin, hasPcPwView, hasAuditApprover, currentUsername } = ctx;
  const username = currentUsername!;
  const userPlantId = await getUserPlantId(username, pool);
  const hasView = await hasTypesViewPermission(username, pool, userPlantId);
  if (!hasView) {
    return new Response(
      errorPage(
        "Access Denied",
        "You do not have permission to view types/configurations.",
        "You need the 'types_view' or 'types_edit' permission to access this page. Please contact your administrator if you need access.",
        403,
        isAdmin,
        hasPcPwView,
        username,
        hasAuditApprover
      ),
      { status: 403, headers: { "Content-Type": "text/html" } }
    );
  }
  const success = url.searchParams.get("success") || "";
  const error = url.searchParams.get("error") || "";
  const data = await getTypesData(pool);
  return new Response(
    typesPage(data, success, error, isAdmin, hasPcPwView, username, hasAuditApprover),
    { headers: { "Content-Type": "text/html" } }
  );
}

async function typesPost(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool, currentUsername } = ctx;
  const username = currentUsername!;

  const hasManageTypes = await hasManageTypesPermission(username, pool);
  if (!hasManageTypes) {
    return Response.redirect(
      "/types?error=" +
        encodeURIComponent("You do not have permission to manage types/configurations"),
      303
    );
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
    const kind = KIND[validated.type];
    if (!kind) throw new Error("Unknown type");

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
          "/types?error=" +
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
          "/types?success=" +
            encodeURIComponent("Approval request created (ID: " + requestId + ")"),
          303
        );
      }
      return Response.redirect(
        "/types?error=" +
          encodeURIComponent(
            "Failed to create approval request. Please contact your administrator."
          ),
        303
      );
    };

    if (action === "add") {
      const hasAdd = await hasTypesAddPermission(username, pool, userPlantId);
      if (!hasAdd) {
        return approve("types_add", `add_${kind.actionSlug}`, {
          type: validated.type,
          name,
          ...(kind.parentCol ? { parent_id } : {}),
        });
      }
      if (kind.parentCol) {
        await pool.query(
          `INSERT INTO ${kind.table} (${kind.nameCol}, ${kind.parentCol}, status) VALUES (?, ?, 1)`,
          [name!, parent_id!]
        );
      } else {
        await pool.query(`INSERT INTO ${kind.table} (${kind.nameCol}, status) VALUES (?, 1)`, [
          name!,
        ]);
      }
    } else if (action === "edit") {
      const hasEdit = await hasTypesEditPermission(username, pool, userPlantId);
      if (!hasEdit) {
        return approve("types_edit", `edit_${kind.actionSlug}`, {
          type: validated.type,
          id,
          name,
        });
      }
      await pool.query(`UPDATE ${kind.table} SET ${kind.nameCol} = ? WHERE id = ?`, [name!, id!]);
    } else if (action === "deactivate" || action === "activate") {
      const hasDelete = await hasTypesDeletePermission(username, pool, userPlantId);
      if (!hasDelete) {
        return approve(
          "types_delete",
          `${action}_${kind.actionSlug}`,
          { type: validated.type, id, action }
        );
      }
      const status = action === "activate" ? 1 : 0;
      await pool.query(`UPDATE ${kind.table} SET status = ? WHERE id = ?`, [status, id!]);
    } else {
      throw new Error("Unknown action");
    }

    return Response.redirect(`/types?success=${encodeURIComponent("Saved")}`, 303);
  } catch (err) {
    logger.error("Failed to manage type/model", err, { traceId, rawData });
    return Response.redirect(
      `/types?error=${encodeURIComponent("An unexpected error occurred. Please try again.")}`,
      303
    );
  }
}
