import type { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { parseEstonianDate } from "../utils/date";

const LOCATION_TYPE_TABLES: Record<string, string> = {
  region: "it_equipment_region",
  country: "it_equipment_country",
  plant: "it_equipment_plant",
  department: "it_equipment_department",
  area: "it_equipment_area",
  sub_area: "it_equipment_sub_area",
};

const LOCATION_TYPE_PARENT: Record<string, string | undefined> = {
  region: undefined,
  country: "region_id",
  plant: "country_id",
  department: "plant_id",
  area: "department_id",
  sub_area: "area_id",
};

/**
 * Returns the new value for a field in an approval-driven edit when the
 * field on the request payload is "" / null / undefined (treat as
 * unchanged) versus a real value (use the new value).
 */
function pickEdit<T>(incoming: unknown, current: T): T {
  if (incoming !== null && incoming !== undefined && incoming !== "") return incoming as T;
  return current;
}

export async function executeApprovedAction(
  actionType: string,
  actionData: Record<string, unknown>,
  pool: Pool
): Promise<void> {
  try {
    if (actionType === "add_location") {
      const type = actionData.type as string;
      const name = actionData.name as string;
      const parent_id = actionData.parent_id as number | null;
      const table = LOCATION_TYPE_TABLES[type];
      if (!table) throw new Error("Unknown location type");
      const parent = LOCATION_TYPE_PARENT[type];

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
      return;
    }

    if (actionType === "edit_location") {
      const type = actionData.type as string;
      const id = actionData.id as number;
      const name = actionData.name as string;
      const table = LOCATION_TYPE_TABLES[type];
      if (!table) throw new Error("Unknown location type");
      await pool.query(`UPDATE ${table} SET name = ? WHERE id = ?`, [name, id]);
      return;
    }

    if (actionType === "activate_location" || actionType === "deactivate_location") {
      const type = actionData.type as string;
      const id = actionData.id as number;
      const status = actionType === "activate_location" ? 1 : 0;
      const table = LOCATION_TYPE_TABLES[type];
      if (!table) throw new Error("Unknown location type");
      await pool.query(`UPDATE ${table} SET status = ? WHERE id = ?`, [status, id]);
      return;
    }

    if (actionType === "add_equipment") {
      const service_tag = actionData.service_tag as string;
      const purchase_date =
        parseEstonianDate(actionData.purchase_date as string) ||
        (actionData.purchase_date as string);
      const warranty_expiry_date =
        parseEstonianDate(actionData.warranty_expiry_date as string) ||
        (actionData.warranty_expiry_date as string);
      const cerf = (actionData.cerf as number) || 0;

      const [result] = await pool.query<ResultSetHeader>(
        `INSERT INTO it_equipment (
          service_tag, vendor_id, supplier_id, model_id,
          purchase_date, warranty_expiry_date, teamviewer, cerf, ip, mac_addresses,
          imei1, imei2
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          service_tag,
          actionData.vendor_id as number | null,
          actionData.supplier_id as number | null,
          actionData.model_id as number | null,
          purchase_date,
          warranty_expiry_date,
          actionData.teamviewer as number | null,
          cerf,
          actionData.ip as string | null,
          actionData.mac_addresses as string | null,
          actionData.imei1 as string | null,
          actionData.imei2 as string | null,
        ]
      );

      await pool.query(
        `INSERT INTO it_equipment_log (
          equipment_id, service_tag, assigned_to, equipment_sub_area_id, inventory_period_id, comment
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          result.insertId,
          service_tag,
          actionData.assigned_to as string | null,
          actionData.equipment_sub_area_id as number | null,
          actionData.inventory_period_id as number | null,
          actionData.comment as string | null,
        ]
      );
      return;
    }

    if (actionType === "edit_equipment") {
      const id = actionData.id as number;

      const [currentEquipment] = await pool.query<RowDataPacket[]>(
        `SELECT e.*, el.assigned_to, el.equipment_sub_area_id, el.comment, el.inventory_period_id
         FROM it_equipment e
         LEFT JOIN it_equipment_log el ON e.id = el.equipment_id
         WHERE e.id = ?
         ORDER BY el.id DESC LIMIT 1`,
        [id]
      );
      if (currentEquipment.length === 0) throw new Error("Equipment not found");

      const current = currentEquipment[0];
      const service_tag = current.service_tag;

      const purchaseDateRaw = pickEdit(actionData.purchase_date, current.purchase_date);
      const warrantyDateRaw = pickEdit(
        actionData.warranty_expiry_date,
        current.warranty_expiry_date
      );

      await pool.query(
        `UPDATE it_equipment SET
          model_id = ?, vendor_id = ?, supplier_id = ?, purchase_date = ?,
          warranty_expiry_date = ?, cerf = ?, ip = ?, mac_addresses = ?,
          imei1 = ?, imei2 = ?,
          teamviewer = ?, updated = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          pickEdit(actionData.model_id, current.model_id),
          pickEdit(actionData.vendor_id, current.vendor_id),
          pickEdit(actionData.supplier_id, current.supplier_id),
          typeof purchaseDateRaw === "string"
            ? parseEstonianDate(purchaseDateRaw) || purchaseDateRaw
            : purchaseDateRaw,
          typeof warrantyDateRaw === "string"
            ? parseEstonianDate(warrantyDateRaw) || warrantyDateRaw
            : warrantyDateRaw,
          pickEdit(actionData.cerf, current.cerf),
          pickEdit(actionData.ip, current.ip),
          pickEdit(actionData.mac_addresses, current.mac_addresses),
          pickEdit(actionData.imei1, current.imei1),
          pickEdit(actionData.imei2, current.imei2),
          pickEdit(actionData.teamviewer, current.teamviewer),
          id,
        ]
      );

      await pool.query(
        `INSERT INTO it_equipment_log (
          equipment_id, service_tag, assigned_to, equipment_sub_area_id, inventory_period_id, comment
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          service_tag,
          pickEdit(actionData.assigned_to, current.assigned_to),
          pickEdit(actionData.equipment_sub_area_id, current.equipment_sub_area_id),
          pickEdit(actionData.inventory_period_id, current.inventory_period_id),
          pickEdit(actionData.comment, current.comment),
        ]
      );
      return;
    }

    if (actionType === "add_write_off_reason") {
      await pool.query("INSERT INTO it_equipment_write_off_reason (reason) VALUES (?)", [
        actionData.reason as string,
      ]);
      return;
    }

    if (actionType === "add_supplier") {
      await pool.query(
        `INSERT INTO it_equipment_supplier (name, email, phone_number, address, representative_name, sap_vendor_no, website)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          actionData.name as string,
          actionData.email as string | null,
          actionData.phone_number as string | null,
          actionData.address as string | null,
          actionData.representative_name as string | null,
          actionData.sap_vendor_no as string | null,
          actionData.website as string | null,
        ]
      );
      return;
    }

    if (actionType === "add_vendor") {
      await pool.query("INSERT INTO it_equipment_vendor (name) VALUES (?)", [
        actionData.name as string,
      ]);
      return;
    }

    if (actionType === "add_type") {
      await pool.query("INSERT INTO it_equipment_type (type_name, status) VALUES (?, 1)", [
        actionData.name as string,
      ]);
      return;
    }

    if (actionType === "add_product_line") {
      await pool.query(
        "INSERT INTO it_equipment_product_line (name, type_id, status) VALUES (?, ?, 1)",
        [actionData.name as string, actionData.parent_id as number]
      );
      return;
    }

    if (actionType === "add_model") {
      await pool.query(
        "INSERT INTO it_equipment_model (name, product_line_id, status) VALUES (?, ?, 1)",
        [actionData.name as string, actionData.parent_id as number]
      );
      return;
    }
  } catch (error) {
    console.error("Error executing approved action:", error);
    throw error;
  }
}
