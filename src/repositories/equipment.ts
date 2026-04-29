import type { Pool, RowDataPacket } from "mysql2/promise";
import { addPage } from "../templates/add";
import { editPage } from "../templates/edit";

type AddDataType = Parameters<typeof addPage>[0];
type EditDataType = Parameters<typeof editPage>[0];

export interface PlantHierarchy {
  allowedRegionId: number | null;
  allowedCountryId: number | null;
  allowedPlantId: number | null;
}

/**
 * For non-admin users with a plant assignment, look up the country and
 * region above that plant so we can scope down hierarchical lookups.
 * Returns all-null for admins (they see every plant).
 */
export async function getPlantHierarchy(
  pool: Pool,
  userPlantId: number | null,
  isAdmin: boolean
): Promise<PlantHierarchy> {
  if (isAdmin || userPlantId === null) {
    return { allowedRegionId: null, allowedCountryId: null, allowedPlantId: isAdmin ? null : userPlantId };
  }
  const [plantInfo] = await pool.query<RowDataPacket[]>(
    `SELECT p.id, p.country_id, c.region_id
     FROM it_equipment_plant p
     LEFT JOIN it_equipment_country c ON p.country_id = c.id
     WHERE p.id = ? AND p.status = 1`,
    [userPlantId]
  );
  if (plantInfo.length > 0) {
    return {
      allowedRegionId: plantInfo[0].region_id,
      allowedCountryId: plantInfo[0].country_id,
      allowedPlantId: userPlantId,
    };
  }
  return { allowedRegionId: null, allowedCountryId: null, allowedPlantId: userPlantId };
}

/**
 * Region/country/plant/department/area/sub-area lookup queries used by
 * both /add and /edit.  Each query is scoped down for non-admin users by
 * the plant hierarchy supplied.
 */
async function loadLocationDropdowns(pool: Pool, hier: PlantHierarchy, isAdmin: boolean) {
  const { allowedRegionId, allowedCountryId, allowedPlantId } = hier;
  return Promise.all([
    !isAdmin && allowedRegionId !== null
      ? pool.query<RowDataPacket[]>(
          `SELECT id, name FROM it_equipment_region WHERE status = 1 AND id = ? ORDER BY name`,
          [allowedRegionId]
        )
      : pool.query<RowDataPacket[]>(
          `SELECT id, name FROM it_equipment_region WHERE status = 1 ORDER BY name`
        ),
    !isAdmin && allowedCountryId !== null
      ? pool.query<RowDataPacket[]>(
          `SELECT id, name, region_id as parent_id FROM it_equipment_country WHERE status = 1 AND id = ? ORDER BY name`,
          [allowedCountryId]
        )
      : pool.query<RowDataPacket[]>(
          `SELECT id, name, region_id as parent_id FROM it_equipment_country WHERE status = 1 ORDER BY name`
        ),
    !isAdmin && allowedPlantId !== null
      ? pool.query<RowDataPacket[]>(
          `SELECT id, name, country_id as parent_id FROM it_equipment_plant WHERE status = 1 AND id = ? ORDER BY name`,
          [allowedPlantId]
        )
      : pool.query<RowDataPacket[]>(
          `SELECT id, name, country_id as parent_id FROM it_equipment_plant WHERE status = 1 ORDER BY name`
        ),
    !isAdmin && allowedPlantId !== null
      ? pool.query<RowDataPacket[]>(
          `SELECT id, name, plant_id as parent_id FROM it_equipment_department WHERE status = 1 AND plant_id = ? ORDER BY name`,
          [allowedPlantId]
        )
      : pool.query<RowDataPacket[]>(
          `SELECT id, name, plant_id as parent_id FROM it_equipment_department WHERE status = 1 ORDER BY name`
        ),
    !isAdmin && allowedPlantId !== null
      ? pool.query<RowDataPacket[]>(
          `SELECT a.id, a.name, a.department_id as parent_id FROM it_equipment_area a JOIN it_equipment_department d ON a.department_id = d.id WHERE a.status = 1 AND d.plant_id = ? ORDER BY a.name`,
          [allowedPlantId]
        )
      : pool.query<RowDataPacket[]>(
          `SELECT id, name, department_id as parent_id FROM it_equipment_area WHERE status = 1 ORDER BY name`
        ),
    !isAdmin && allowedPlantId !== null
      ? pool.query<RowDataPacket[]>(
          `SELECT sa.id, sa.name, sa.area_id as parent_id FROM it_equipment_sub_area sa JOIN it_equipment_area a ON sa.area_id = a.id JOIN it_equipment_department d ON a.department_id = d.id WHERE sa.status = 1 AND d.plant_id = ? ORDER BY sa.name`,
          [allowedPlantId]
        )
      : pool.query<RowDataPacket[]>(
          `SELECT id, name, area_id as parent_id FROM it_equipment_sub_area WHERE status = 1 ORDER BY name`
        ),
  ]);
}

const TYPE_DROPDOWNS = `SELECT id, type_name as name FROM it_equipment_type WHERE status = 1 ORDER BY type_name`;
const PRODUCT_LINE_DROPDOWNS = `SELECT id, name, type_id as parent_id FROM it_equipment_product_line WHERE status = 1 ORDER BY name`;
const MODEL_DROPDOWNS = `SELECT id, name, product_line_id as parent_id FROM it_equipment_model WHERE status = 1 ORDER BY name`;
const VENDOR_DROPDOWN = `SELECT id, name FROM it_equipment_vendor ORDER BY name`;
const SUPPLIER_DROPDOWN = `SELECT id, name FROM it_equipment_supplier ORDER BY name`;
const EMPLOYEE_DROPDOWN = `SELECT employee_no, CONCAT(first_name, ' ', last_name) as name FROM it_employees_list WHERE status = 1 ORDER BY last_name, first_name`;
const INVENTORY_PERIOD_DROPDOWN = `SELECT id, inventory_nr as name, start_date, end_date FROM it_inventory_period ORDER BY start_date DESC`;

export async function getAuditData(
  pool: Pool,
  id: number,
  userPlantId: number | null = null,
  isAdmin: boolean = false
): Promise<EditDataType | null> {
  const [equipment] = await pool.query<RowDataPacket[]>(
    `
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
    `,
    [id]
  );

  if (equipment.length === 0) return null;

  const hier = await getPlantHierarchy(pool, userPlantId, isAdmin);
  const [
    [regions],
    [countries],
    [plants],
    [departments],
    [areas],
    [subAreas],
  ] = await loadLocationDropdowns(pool, hier, isAdmin);

  const [
    [types],
    [productLines],
    [models],
    [employees],
    [inventoryPeriods],
    [vendors],
    [suppliers],
    [writeOffReasons],
  ] = await Promise.all([
    pool.query<RowDataPacket[]>(TYPE_DROPDOWNS),
    pool.query<RowDataPacket[]>(PRODUCT_LINE_DROPDOWNS),
    pool.query<RowDataPacket[]>(MODEL_DROPDOWNS),
    pool.query<RowDataPacket[]>(EMPLOYEE_DROPDOWN),
    pool.query<RowDataPacket[]>(INVENTORY_PERIOD_DROPDOWN),
    pool.query<RowDataPacket[]>(VENDOR_DROPDOWN),
    pool.query<RowDataPacket[]>(SUPPLIER_DROPDOWN),
    pool.query<RowDataPacket[]>(`SELECT id, reason as name FROM it_equipment_write_off_reason ORDER BY reason`),
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
    writeOffReasons,
  } as unknown as EditDataType;
}

export async function getAddData(
  pool: Pool,
  serviceTag: string,
  userPlantId: number | null = null,
  isAdmin: boolean = false
): Promise<AddDataType> {
  const hier = await getPlantHierarchy(pool, userPlantId, isAdmin);
  const [
    [regions],
    [countries],
    [plants],
    [departments],
    [areas],
    [subAreas],
  ] = await loadLocationDropdowns(pool, hier, isAdmin);

  const [
    [types],
    [productLines],
    [models],
    [vendors],
    [suppliers],
    [employees],
    [inventoryPeriods],
  ] = await Promise.all([
    pool.query<RowDataPacket[]>(TYPE_DROPDOWNS),
    pool.query<RowDataPacket[]>(PRODUCT_LINE_DROPDOWNS),
    pool.query<RowDataPacket[]>(MODEL_DROPDOWNS),
    pool.query<RowDataPacket[]>(VENDOR_DROPDOWN),
    pool.query<RowDataPacket[]>(SUPPLIER_DROPDOWN),
    pool.query<RowDataPacket[]>(EMPLOYEE_DROPDOWN),
    pool.query<RowDataPacket[]>(INVENTORY_PERIOD_DROPDOWN),
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
    inventoryPeriods,
  } as unknown as AddDataType;
}
