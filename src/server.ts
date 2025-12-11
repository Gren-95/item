import { serve, file } from "bun";
import pool from "./db";
import { searchPage } from "./templates/search";
import { auditPage } from "./templates/audit";
import { addPage } from "./templates/add";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

const PORT = process.env.PORT || 3000;

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // Static files
  if (path.startsWith("/css/") || path.startsWith("/js/")) {
    const filePath = `./public${path}`;
    const staticFile = file(filePath);
    if (await staticFile.exists()) {
      return new Response(staticFile);
    }
    return new Response("Not found", { status: 404 });
  }

  // Routes
  try {
    // Home / Search page
    if (path === "/" && req.method === "GET") {
      const serial = url.searchParams.get("serial");
      
      if (serial && serial.trim()) {
        const [rows] = await pool.query<RowDataPacket[]>(`
          SELECT 
            e.id,
            e.service_tag,
            t.type_name,
            m.name as model_name,
            v.name as vendor_name,
            CONCAT(emp.first_name, ' ', emp.last_name) as assigned_to_name,
            CONCAT_WS(' > ', r.name, c.name, p.name, d.name, a.name, sa.name) as location
          FROM it_equipment e
          LEFT JOIN it_equipment_model m ON e.model_id = m.id
          LEFT JOIN it_equipment_product_line pl ON m.product_line_id = pl.id
          LEFT JOIN it_equipment_type t ON pl.type_id = t.id
          LEFT JOIN it_equipment_vendor v ON e.vendor_id = v.id
          LEFT JOIN it_employees_list emp ON e.assigned_to = emp.employee_no
          LEFT JOIN it_equipment_sub_area sa ON e.equipment_sub_area_id = sa.id
          LEFT JOIN it_equipment_area a ON sa.area_id = a.id
          LEFT JOIN it_equipment_department d ON a.department_id = d.id
          LEFT JOIN it_equipment_plant p ON d.plant_id = p.id
          LEFT JOIN it_equipment_country c ON p.country_id = c.id
          LEFT JOIN it_equipment_region r ON c.region_id = r.id
          WHERE e.service_tag LIKE ?
          ORDER BY e.service_tag
          LIMIT 50
        `, [`%${serial.trim()}%`]);

        return new Response(searchPage(serial, rows as any[]), {
          headers: { "Content-Type": "text/html" },
        });
      }

      return new Response(searchPage(), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Add equipment page - GET
    if (path === "/add" && req.method === "GET") {
      const serial = url.searchParams.get("serial") || "";
      const addData = await getAddData(serial);
      
      return new Response(addPage(addData), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Add equipment page - POST
    if (path === "/add" && req.method === "POST") {
      const formData = await req.formData();
      
      const service_tag = formData.get("service_tag") as string;
      const vendor_id = formData.get("vendor_id") || null;
      const supplier_id = formData.get("supplier_id") || null;
      const model_id = formData.get("model_id") || null;
      const purchase_date = formData.get("purchase_date") as string;
      const warranty_expiry_date = formData.get("warranty_expiry_date") as string;
      const equipment_sub_area_id = formData.get("equipment_sub_area_id") || null;
      const assigned_to = formData.get("assigned_to") || null;
      const teamviewer = formData.get("teamviewer") || null;
      const cerf = formData.get("cerf") || 0;
      const ip = formData.get("ip") || null;
      const mac_addresses = formData.get("mac_addresses") || null;
      const comment = formData.get("comment") || null;

      try {
        const [result] = await pool.query<ResultSetHeader>(`
          INSERT INTO it_equipment (
            service_tag, vendor_id, supplier_id, model_id,
            purchase_date, warranty_expiry_date, equipment_sub_area_id,
            assigned_to, teamviewer, cerf, ip, mac_addresses, comment
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          service_tag,
          vendor_id || null,
          supplier_id || null,
          model_id || null,
          purchase_date,
          warranty_expiry_date,
          equipment_sub_area_id || null,
          assigned_to || null,
          teamviewer || null,
          cerf || 0,
          ip || null,
          mac_addresses || null,
          comment || null
        ]);

        // Redirect to the audit page for the newly created equipment
        return Response.redirect(`${url.origin}/audit/${result.insertId}?success=1`, 303);
      } catch (err: any) {
        const addData = await getAddData(service_tag);
        return new Response(addPage(addData, false, err.message), {
          headers: { "Content-Type": "text/html" },
        });
      }
    }

    // Audit page - GET
    if (path.match(/^\/audit\/\d+$/) && req.method === "GET") {
      const id = parseInt(path.split("/")[2]);
      const success = url.searchParams.get("success") === "1";
      
      const auditData = await getAuditData(id);
      if (!auditData) {
        return new Response("Equipment not found", { status: 404 });
      }

      return new Response(auditPage(auditData, success), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Audit page - POST (save audit)
    if (path.match(/^\/audit\/\d+$/) && req.method === "POST") {
      const id = parseInt(path.split("/")[2]);
      const formData = await req.formData();
      
      // Extract form values
      const model_id = formData.get("model_id") || null;
      const equipment_sub_area_id = formData.get("equipment_sub_area_id") || null;
      const assigned_to = formData.get("assigned_to") || null;
      const teamviewer = formData.get("teamviewer") || null;

      try {
        // Update the equipment record
        await pool.query(`
          UPDATE it_equipment SET
            model_id = ?,
            equipment_sub_area_id = ?,
            assigned_to = ?,
            teamviewer = ?,
            updated = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          model_id || null,
          equipment_sub_area_id || null,
          assigned_to || null,
          teamviewer || null,
          id
        ]);

        // Create audit record
        const [equipment] = await pool.query<RowDataPacket[]>(`
          SELECT * FROM it_equipment WHERE id = ?
        `, [id]);

        if (equipment.length > 0) {
          const eq = equipment[0];
          await pool.query(`
            INSERT INTO it_equipment_audit (
              equipment_id, service_tag, model_id, vendor_id, supplier_id,
              cerf, device_no, is_personal, purchase_date, warranty_expiry_date,
              is_written_off, teamviewer, imei1, imei2, ip, mac_addresses,
              assigned_to, equipment_sub_area_id, comment, bill_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            eq.id, eq.service_tag, eq.model_id, eq.vendor_id, eq.supplier_id,
            eq.cerf, eq.device_no, eq.is_personal, eq.purchase_date, eq.warranty_expiry_date,
            eq.is_written_off, eq.teamviewer, eq.imei1, eq.imei2, eq.ip, eq.mac_addresses,
            eq.assigned_to, eq.equipment_sub_area_id, eq.comment, eq.bill_id
          ]);
        }

        return Response.redirect(`${url.origin}/audit/${id}?success=1`, 303);
      } catch (err: any) {
        const auditData = await getAuditData(id);
        if (!auditData) {
          return new Response("Equipment not found", { status: 404 });
        }
        return new Response(auditPage(auditData, false, err.message), {
          headers: { "Content-Type": "text/html" },
        });
      }
    }

    return new Response("Not found", { status: 404 });
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(searchPage("", null, err.message), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    });
  }
}

async function getAuditData(id: number) {
  // Get equipment with all joined data
  const [equipment] = await pool.query<RowDataPacket[]>(`
    SELECT 
      e.*,
      t.id as type_id,
      t.type_name,
      pl.id as product_line_id,
      pl.name as product_line_name,
      m.name as model_name,
      v.name as vendor_name,
      CONCAT(emp.first_name, ' ', emp.last_name) as assigned_to_name,
      sa.area_id,
      a.department_id,
      d.plant_id,
      p.country_id,
      c.region_id,
      (SELECT MAX(created) FROM it_equipment_audit WHERE equipment_id = e.id) as latest_audit_date
    FROM it_equipment e
    LEFT JOIN it_equipment_model m ON e.model_id = m.id
    LEFT JOIN it_equipment_product_line pl ON m.product_line_id = pl.id
    LEFT JOIN it_equipment_type t ON pl.type_id = t.id
    LEFT JOIN it_equipment_vendor v ON e.vendor_id = v.id
    LEFT JOIN it_employees_list emp ON e.assigned_to = emp.employee_no
    LEFT JOIN it_equipment_sub_area sa ON e.equipment_sub_area_id = sa.id
    LEFT JOIN it_equipment_area a ON sa.area_id = a.id
    LEFT JOIN it_equipment_department d ON a.department_id = d.id
    LEFT JOIN it_equipment_plant p ON d.plant_id = p.id
    LEFT JOIN it_equipment_country c ON p.country_id = c.id
    WHERE e.id = ?
  `, [id]);

  if (equipment.length === 0) {
    return null;
  }

  // Get all lookup data in parallel
  const [
    [regions],
    [countries],
    [plants],
    [departments],
    [areas],
    [subAreas],
    [types],
    [productLines],
    [models],
    [employees]
  ] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT id, name FROM it_equipment_region WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name, region_id as parent_id FROM it_equipment_country WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name, country_id as parent_id FROM it_equipment_plant WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name, plant_id as parent_id FROM it_equipment_department WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name, department_id as parent_id FROM it_equipment_area WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name, area_id as parent_id FROM it_equipment_sub_area WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, type_name as name FROM it_equipment_type WHERE status = 1 ORDER BY type_name`),
    pool.query<RowDataPacket[]>(`SELECT id, name, type_id as parent_id FROM it_equipment_product_line WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name, product_line_id as parent_id FROM it_equipment_model WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT employee_no, CONCAT(first_name, ' ', last_name) as name FROM it_employees_list WHERE status = 1 ORDER BY last_name, first_name`)
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
    employees
  };
}

async function getAddData(serviceTag: string) {
  const [
    [regions],
    [countries],
    [plants],
    [departments],
    [areas],
    [subAreas],
    [types],
    [productLines],
    [models],
    [vendors],
    [suppliers],
    [employees]
  ] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT id, name FROM it_equipment_region WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name, region_id as parent_id FROM it_equipment_country WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name, country_id as parent_id FROM it_equipment_plant WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name, plant_id as parent_id FROM it_equipment_department WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name, department_id as parent_id FROM it_equipment_area WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name, area_id as parent_id FROM it_equipment_sub_area WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, type_name as name FROM it_equipment_type WHERE status = 1 ORDER BY type_name`),
    pool.query<RowDataPacket[]>(`SELECT id, name, type_id as parent_id FROM it_equipment_product_line WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name, product_line_id as parent_id FROM it_equipment_model WHERE status = 1 ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name FROM it_equipment_vendor ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name FROM it_equipment_supplier ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT employee_no, CONCAT(first_name, ' ', last_name) as name FROM it_employees_list WHERE status = 1 ORDER BY last_name, first_name`)
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
    employees
  };
}

console.log(`🚀 Server running at http://localhost:${PORT}`);

serve({
  port: PORT as number,
  fetch: handleRequest,
});
