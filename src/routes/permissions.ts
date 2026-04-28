import type { RowDataPacket } from "mysql2";
import { logger } from "../utils/logger";
import { permissionsPage } from "../templates/permissions";
import { isRateLimited } from "../utils/security";
import { parseEstonianDate } from "../utils/date";
import { getClientIp } from "../utils/approvals";
import type { RequestContext } from "./types";
import type { Router } from "./router";

interface PlantRow extends RowDataPacket {
  id: number;
  name: string;
}

export function registerPermissionsRoutes(router: Router): void {
  router.get("/permissions", permissionsGet);
  router.post("/permissions", permissionsPost);
}

async function permissionsGet(ctx: RequestContext): Promise<Response> {
  const { url, traceId, pool, isAdmin, hasPcPwView, hasAuditApprover, currentUsername } = ctx;
  const username = currentUsername!;
  const success = url.searchParams.get("success") || "";
  const error = url.searchParams.get("error") || "";

  if (!isAdmin) {
    return new Response(
      permissionsPage(
        { users: [], permissions: [] },
        false,
        hasPcPwView,
        "",
        "",
        username,
        hasAuditApprover
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  }

  try {
    const [users] = await pool.query<RowDataPacket[]>(
      "SELECT user_id, user_id AS user, name, email as mail, status as active, employee_no FROM `it_employees_list` WHERE status = 1 ORDER BY name"
    );

    const [permissions] = await pool.query<RowDataPacket[]>(
      `SELECT id, user_id, plant_id, permission, role, comment,
              DATE_FORMAT(created, '%Y-%m-%d') as start_date,
              DATE_FORMAT(updated, '%Y-%m-%d') as end_date,
              DATE_FORMAT(expiry_date, '%Y-%m-%d') as expiry_date,
              added_by_user_id
       FROM it_user_permissions
       ORDER BY user_id, permission, role`
    );

    const [plants] = await pool.query<PlantRow[]>(
      "SELECT id, name FROM it_equipment_plant WHERE status = 1 ORDER BY name"
    );

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
          plantMap,
          plants: plantsList,
        },
        isAdmin,
        hasPcPwView,
        success,
        error,
        username,
        hasAuditApprover
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  } catch (err) {
    logger.error("Error loading permissions page", err, { traceId });
    return new Response(
      permissionsPage(
        { users: [], permissions: [] },
        false,
        hasPcPwView,
        "",
        "Error loading permissions",
        username,
        hasAuditApprover
      ),
      { headers: { "Content-Type": "text/html" } }
    );
  }
}

async function permissionsPost(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool, isAdmin, currentUsername } = ctx;
  const username = currentUsername!;

  if (!isAdmin) {
    return Response.redirect(
      "/permissions?error=" + encodeURIComponent("You do not have admin permission"),
      303
    );
  }

  if (isRateLimited(`perm:${username}`)) {
    return Response.redirect(
      "/permissions?error=" +
        encodeURIComponent("Too many permission changes. Please wait and try again."),
      303
    );
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
      const added_by_user_id = username;

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
        plantIdIsNaN: Number.isNaN(plant_id),
      });

      if (!user_id || !access_key || !value || !comment || Number.isNaN(plant_id)) {
        const missingFields: string[] = [];
        if (!user_id) missingFields.push("User");
        if (Number.isNaN(plant_id)) missingFields.push("Plant");
        if (!access_key) missingFields.push("Permission");
        if (!value) missingFields.push("Role");
        if (!comment) missingFields.push("Comment");

        const errorMsg = `Missing required fields: ${missingFields.join(", ")}`;
        logger.warn("Permission validation failed", { traceId, errorMsg, missingFields });
        return Response.redirect("/permissions?error=" + encodeURIComponent(errorMsg), 303);
      }

      if (permission === "login" && plant_id !== 0) {
        return Response.redirect(
          "/permissions?error=" +
            encodeURIComponent("Login permission must be global (plant_id=0)"),
          303
        );
      }

      if (permission === "global_admin" && plant_id !== 0) {
        return Response.redirect(
          "/permissions?error=" +
            encodeURIComponent("global_admin permission must be global (plant_id=0)"),
          303
        );
      }

      await pool.query(
        `INSERT INTO it_user_permissions
         (user_id, plant_id, permission, role, comment, expiry_date, added_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user_id, plant_id, access_key, value, comment, expiry_date, added_by_user_id]
      );

      const clientIp = getClientIp(req);
      await pool
        .query(
          `INSERT INTO it_permission_audit_log
           (action, user_id, plant_id, permission, role, expiry_date, comment, changed_by, ip_address)
           VALUES ('add', ?, ?, ?, ?, ?, ?, ?, ?)`,
          [user_id, plant_id, access_key, value, expiry_date, comment, username, clientIp]
        )
        .catch((err) => logger.error("Failed to log permission audit", err, { traceId }));

      logger.info("Permission added", {
        traceId,
        user_id,
        access_key,
        value,
        expiry_date,
        added_by_user_id,
      });
      return Response.redirect(
        "/permissions?success=" + encodeURIComponent("Permission added successfully"),
        303
      );
    }

    if (action === "delete") {
      const permission_id = parseInt(formData.get("permission_id")?.toString() || "0");
      if (!permission_id) {
        return Response.redirect(
          "/permissions?error=" + encodeURIComponent("Invalid permission ID"),
          303
        );
      }

      const [permToDelete] = await pool.query<RowDataPacket[]>(
        "SELECT user_id, plant_id, permission, role, expiry_date, comment FROM it_user_permissions WHERE id = ?",
        [permission_id]
      );

      await pool.query("DELETE FROM it_user_permissions WHERE id = ?", [permission_id]);

      if (permToDelete.length > 0) {
        const perm = permToDelete[0];
        const clientIp = getClientIp(req);
        await pool
          .query(
            `INSERT INTO it_permission_audit_log
             (action, user_id, plant_id, permission, old_role, old_expiry_date, comment, changed_by, ip_address)
             VALUES ('delete', ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              perm.user_id,
              perm.plant_id,
              perm.permission,
              perm.role,
              perm.expiry_date,
              perm.comment,
              username,
              clientIp,
            ]
          )
          .catch((err) => logger.error("Failed to log permission audit", err, { traceId }));
      }

      logger.info("Permission deleted", { traceId, permission_id });
      return Response.redirect(
        "/permissions?success=" + encodeURIComponent("Permission deleted successfully"),
        303
      );
    }

    return Response.redirect("/permissions?error=" + encodeURIComponent("Invalid action"), 303);
  } catch (err) {
    logger.error("Error processing permission action", err, { traceId, action });
    return Response.redirect(
      "/permissions?error=" +
        encodeURIComponent("An unexpected error occurred. Please try again."),
      303
    );
  }
}
