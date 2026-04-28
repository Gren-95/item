import type { Pool, RowDataPacket } from "mysql2/promise";

interface WriteOffReasonRow extends RowDataPacket {
  id: number;
  reason: string;
  equipment_count: number;
}

export async function getVendorsAndSuppliersData(pool: Pool) {
  const [vendors, suppliers] = await Promise.all([
    pool.query<RowDataPacket[]>(`
      SELECT
        v.id,
        v.name,
        COUNT(DISTINCT e.id) as equipment_count
      FROM it_equipment_vendor v
      LEFT JOIN it_equipment e ON e.vendor_id = v.id
      GROUP BY v.id, v.name
      ORDER BY v.name
    `),
    pool.query<RowDataPacket[]>(`
      SELECT
        s.id,
        s.name,
        s.email,
        s.phone_number,
        s.address,
        s.representative_name,
        s.sap_vendor_no,
        s.website,
        COUNT(DISTINCT e.id) as equipment_count
      FROM it_equipment_supplier s
      LEFT JOIN it_equipment e ON e.supplier_id = s.id
      GROUP BY s.id, s.name, s.email, s.phone_number, s.address, s.representative_name, s.sap_vendor_no, s.website
      ORDER BY s.name
    `),
  ]);

  return {
    vendors: vendors[0].map((v) => ({
      id: v.id,
      name: v.name,
      equipment_count: Number(v.equipment_count) || 0,
    })),
    suppliers: suppliers[0].map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email || "",
      phone_number: s.phone_number || "",
      address: s.address || "",
      representative_name: s.representative_name || "",
      sap_vendor_no:
        s.sap_vendor_no === null || s.sap_vendor_no === undefined
          ? null
          : Number(s.sap_vendor_no),
      website: s.website || "",
      equipment_count: Number(s.equipment_count) || 0,
    })),
  };
}

export async function getWriteOffReasonsData(pool: Pool) {
  const [writeOffReasons] = await pool.query<RowDataPacket[]>(`
    SELECT
      wor.id,
      wor.reason,
      COUNT(DISTINCT e.id) as equipment_count
    FROM it_equipment_write_off_reason wor
    LEFT JOIN it_equipment e ON e.is_written_off = wor.id
    GROUP BY wor.id, wor.reason
    ORDER BY wor.reason
  `);

  return {
    writeOffReasons: (writeOffReasons as WriteOffReasonRow[]).map((w) => ({
      id: w.id,
      reason: w.reason,
      equipment_count: Number(w.equipment_count) || 0,
    })),
  };
}

export async function getTypesData(pool: Pool) {
  const [types, models, productLines] = await Promise.all([
    pool.query<RowDataPacket[]>(`
      SELECT
        t.id,
        t.type_name as name,
        t.status,
        COUNT(DISTINCT e.id) as equipment_count
      FROM it_equipment_type t
      LEFT JOIN it_equipment_product_line pl ON pl.type_id = t.id
      LEFT JOIN it_equipment_model m ON m.product_line_id = pl.id
      LEFT JOIN it_equipment e ON e.model_id = m.id
      GROUP BY t.id, t.type_name, t.status
      ORDER BY t.type_name
    `),
    pool.query<RowDataPacket[]>(`
      SELECT
        m.id,
        m.name,
        m.product_line_id as parent_id,
        m.status,
        COUNT(DISTINCT e.id) as equipment_count
      FROM it_equipment_model m
      LEFT JOIN it_equipment e ON e.model_id = m.id
      GROUP BY m.id, m.name, m.product_line_id, m.status
      ORDER BY m.name
    `),
    pool.query<RowDataPacket[]>(`
      SELECT
        pl.id,
        pl.name,
        pl.type_id as parent_id,
        pl.status,
        COUNT(DISTINCT e.id) as equipment_count
      FROM it_equipment_product_line pl
      LEFT JOIN it_equipment_model m ON m.product_line_id = pl.id
      LEFT JOIN it_equipment e ON e.model_id = m.id
      GROUP BY pl.id, pl.name, pl.type_id, pl.status
      ORDER BY pl.name
    `),
  ]);

  return {
    types: types[0].map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status ? 1 : 0,
      equipment_count: Number(t.equipment_count) || 0,
    })),
    models: models[0].map((m) => ({
      id: m.id,
      name: m.name,
      parent_id: m.parent_id,
      status: m.status ? 1 : 0,
      equipment_count: Number(m.equipment_count) || 0,
    })),
    productLines: productLines[0].map((pl) => ({
      id: pl.id,
      name: pl.name,
      parent_id: pl.parent_id,
      status: pl.status ? 1 : 0,
      equipment_count: Number(pl.equipment_count) || 0,
    })),
  };
}

const LOCATION_LATEST_CTE = `WITH latest AS (
  SELECT l1.equipment_id, l1.equipment_sub_area_id
  FROM it_equipment_log l1
  JOIN (
    SELECT equipment_id, MAX(created) AS max_created
    FROM it_equipment_log
    GROUP BY equipment_id
  ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
)`;

export async function getLocationsData(pool: Pool) {
  const [
    [regions],
    [countries],
    [plants],
    [departments],
    [areas],
    [subAreas],
  ] = await Promise.all([
    pool.query<RowDataPacket[]>(`${LOCATION_LATEST_CTE}
      SELECT r.id, r.name, r.status,
        COUNT(lat.equipment_id) as equipment_count
      FROM it_equipment_region r
      LEFT JOIN it_equipment_country c ON c.region_id = r.id
      LEFT JOIN it_equipment_plant p ON p.country_id = c.id
      LEFT JOIN it_equipment_department d ON d.plant_id = p.id
      LEFT JOIN it_equipment_area a ON a.department_id = d.id
      LEFT JOIN it_equipment_sub_area sa ON sa.area_id = a.id
      LEFT JOIN latest lat ON lat.equipment_sub_area_id = sa.id
      GROUP BY r.id
      ORDER BY r.name`),
    pool.query<RowDataPacket[]>(`${LOCATION_LATEST_CTE}
      SELECT c.id, c.name, c.region_id as parent_id, c.status,
        COUNT(lat.equipment_id) as equipment_count
      FROM it_equipment_country c
      LEFT JOIN it_equipment_plant p ON p.country_id = c.id
      LEFT JOIN it_equipment_department d ON d.plant_id = p.id
      LEFT JOIN it_equipment_area a ON a.department_id = d.id
      LEFT JOIN it_equipment_sub_area sa ON sa.area_id = a.id
      LEFT JOIN latest lat ON lat.equipment_sub_area_id = sa.id
      GROUP BY c.id
      ORDER BY c.name`),
    pool.query<RowDataPacket[]>(`${LOCATION_LATEST_CTE}
      SELECT p.id, p.name, p.country_id as parent_id, p.status,
        COUNT(lat.equipment_id) as equipment_count
      FROM it_equipment_plant p
      LEFT JOIN it_equipment_department d ON d.plant_id = p.id
      LEFT JOIN it_equipment_area a ON a.department_id = d.id
      LEFT JOIN it_equipment_sub_area sa ON sa.area_id = a.id
      LEFT JOIN latest lat ON lat.equipment_sub_area_id = sa.id
      GROUP BY p.id
      ORDER BY p.name`),
    pool.query<RowDataPacket[]>(`${LOCATION_LATEST_CTE}
      SELECT d.id, d.name, d.plant_id as parent_id, d.status,
        COUNT(lat.equipment_id) as equipment_count
      FROM it_equipment_department d
      LEFT JOIN it_equipment_area a ON a.department_id = d.id
      LEFT JOIN it_equipment_sub_area sa ON sa.area_id = a.id
      LEFT JOIN latest lat ON lat.equipment_sub_area_id = sa.id
      GROUP BY d.id
      ORDER BY d.name`),
    pool.query<RowDataPacket[]>(`${LOCATION_LATEST_CTE}
      SELECT a.id, a.name, a.department_id as parent_id, a.status,
        COUNT(lat.equipment_id) as equipment_count
      FROM it_equipment_area a
      LEFT JOIN it_equipment_sub_area sa ON sa.area_id = a.id
      LEFT JOIN latest lat ON lat.equipment_sub_area_id = sa.id
      GROUP BY a.id
      ORDER BY a.name`),
    pool.query<RowDataPacket[]>(`${LOCATION_LATEST_CTE}
      SELECT sa.id, sa.name, sa.area_id as parent_id, sa.status,
        COUNT(lat.equipment_id) as equipment_count
      FROM it_equipment_sub_area sa
      LEFT JOIN latest lat ON lat.equipment_sub_area_id = sa.id
      GROUP BY sa.id
      ORDER BY sa.name`),
  ]);

  return { regions, countries, plants, departments, areas, subAreas };
}
