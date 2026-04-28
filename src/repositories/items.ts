import type { Pool, RowDataPacket } from "mysql2/promise";

/**
 * Item type configuration for the /api/<resource> POST CRUD endpoints
 * (and the /api/* approval-flow execution).
 *
 * - `nameCol` covers the one outlier (`it_equipment_type.type_name`) so the
 *   rest of the code can speak in terms of a generic "name".
 * - `parentCol` is set on resources whose row links to a parent (e.g. a
 *   country needs a region_id). Resources without it are top-level
 *   (regions, types, vendors, suppliers).
 * - `withStatus` is true for tables that have a `status TINYINT` column we
 *   default to 1 on insert.
 */
export interface ItemConfig {
  table: string;
  nameCol: string;
  parentCol?: string;
  withStatus: boolean;
}

export const ITEM_CONFIG: Record<string, ItemConfig> = {
  regions: { table: "it_equipment_region", nameCol: "name", withStatus: true },
  countries: { table: "it_equipment_country", nameCol: "name", parentCol: "region_id", withStatus: true },
  plants: { table: "it_equipment_plant", nameCol: "name", parentCol: "country_id", withStatus: true },
  departments: { table: "it_equipment_department", nameCol: "name", parentCol: "plant_id", withStatus: true },
  areas: { table: "it_equipment_area", nameCol: "name", parentCol: "department_id", withStatus: true },
  "sub-areas": { table: "it_equipment_sub_area", nameCol: "name", parentCol: "area_id", withStatus: true },
  types: { table: "it_equipment_type", nameCol: "type_name", withStatus: true },
  "product-lines": { table: "it_equipment_product_line", nameCol: "name", parentCol: "type_id", withStatus: true },
  models: { table: "it_equipment_model", nameCol: "name", parentCol: "product_line_id", withStatus: true },
  vendors: { table: "it_equipment_vendor", nameCol: "name", withStatus: false },
  suppliers: { table: "it_equipment_supplier", nameCol: "name", withStatus: false },
};

export function isKnownItemType(apiType: string): boolean {
  return apiType in ITEM_CONFIG;
}

/**
 * Find an existing row by name (and optional parent), used for duplicate
 * detection on the /api/<resource> CRUD endpoints.
 */
export async function findExistingItem(
  pool: Pool,
  apiType: string,
  name: string,
  parentId?: number | null
): Promise<{ id: number; name: string } | null> {
  const config = ITEM_CONFIG[apiType];
  if (!config) return null;

  const where = config.parentCol
    ? `${config.nameCol} = ? AND ${config.parentCol} = ?`
    : `${config.nameCol} = ?`;
  const params: (string | number | null)[] = config.parentCol
    ? [name, parentId ?? null]
    : [name];

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, ${config.nameCol} AS name FROM ${config.table} WHERE ${where} LIMIT 1`,
    params
  );
  return rows.length > 0 ? { id: rows[0].id as number, name: rows[0].name as string } : null;
}

/**
 * Insert a new row of `apiType` with `name` (and `parentId` when required).
 * Returns the new row's id.
 */
export async function insertItem(
  pool: Pool,
  apiType: string,
  name: string,
  parentId?: number | null
): Promise<number> {
  const config = ITEM_CONFIG[apiType];
  if (!config) throw new Error(`Unknown item type: ${apiType}`);
  if (config.parentCol && parentId == null) {
    throw new Error(`${apiType} requires a parent id`);
  }

  const cols = [config.nameCol];
  const placeholders = ["?"];
  const params: (string | number)[] = [name];

  if (config.parentCol && parentId != null) {
    cols.push(config.parentCol);
    placeholders.push("?");
    params.push(parentId);
  }
  if (config.withStatus) {
    cols.push("status");
    placeholders.push("1");
  }

  const [result] = await pool.query<import("mysql2").ResultSetHeader>(
    `INSERT INTO ${config.table} (${cols.join(", ")}) VALUES (${placeholders.join(", ")})`,
    params
  );
  return result.insertId;
}
