import { serve, file } from "bun";
import pool from "./db";
import { searchPage } from "./templates/search";
import { auditPage } from "./templates/audit";
import { addPage } from "./templates/add";
import { locationsPage } from "./templates/locations";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

const PORT = process.env.PORT || 3000;

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // Static files
  if (path.startsWith("/css/") || path.startsWith("/js/") || path.startsWith("/icons/") || path === "/manifest.webmanifest") {
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
        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT id FROM it_equipment WHERE service_tag LIKE ? ORDER BY service_tag LIMIT 1`,
          [`%${serial.trim()}%`]
        );

        if (rows.length > 0) {
          // Redirect directly to edit page (prefilled form)
          return Response.redirect(`${url.origin}/edit/${rows[0].id}`, 303);
        }
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
        // Insert into equipment table (static data only)
        const [result] = await pool.query<ResultSetHeader>(`
          INSERT INTO it_equipment (
            service_tag, vendor_id, supplier_id, model_id,
            purchase_date, warranty_expiry_date, teamviewer, cerf, ip, mac_addresses
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          service_tag,
          vendor_id || null,
          supplier_id || null,
          model_id || null,
          purchase_date,
          warranty_expiry_date,
          teamviewer || null,
          cerf || 0,
          ip || null,
          mac_addresses || null
        ]);

        const equipmentId = result.insertId;

        // Insert initial log entry (dynamic/audit data)
        const inventory_period_id = formData.get("inventory_period_id") || null;
        await pool.query(`
          INSERT INTO it_equipment_log (
            equipment_id, service_tag, assigned_to, equipment_sub_area_id, inventory_period_id, comment
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          equipmentId,
          service_tag,
          assigned_to || null,
          equipment_sub_area_id || null,
          inventory_period_id || null,
          comment || null
        ]);

        // Redirect to the edit page for the newly created equipment
        return Response.redirect(`${url.origin}/edit/${equipmentId}?success=1`, 303);
      } catch (err: any) {
        const addData = await getAddData(service_tag);
        return new Response(addPage(addData, false, err.message), {
          headers: { "Content-Type": "text/html" },
        });
      }
    }

    // Edit page - GET
    if (path.match(/^\/edit\/\d+$/) && req.method === "GET") {
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

    // Edit page - POST (save)
    if (path.match(/^\/edit\/\d+$/) && req.method === "POST") {
      const id = parseInt(path.split("/")[2]);
      const formData = await req.formData();
      
      // Extract form values
      const model_id = formData.get("model_id") || null;
      const equipment_sub_area_id = formData.get("equipment_sub_area_id") || null;
      const assigned_to = formData.get("assigned_to") || null;
      const teamviewer = formData.get("teamviewer") || null;
      const comment = formData.get("comment") || null;
      const inventory_period_id = formData.get("inventory_period_id") || null;
      const vendor_id = formData.get("vendor_id") || null;
      const supplier_id = formData.get("supplier_id") || null;
      const purchase_date = formData.get("purchase_date") || null;
      const warranty_expiry_date = formData.get("warranty_expiry_date") || null;
      const cerf = formData.get("cerf") || 0;
      const ip = formData.get("ip") || null;
      const mac_addresses = formData.get("mac_addresses") || null;

      try {
        // Get the equipment record for service_tag
        const [equipment] = await pool.query<RowDataPacket[]>(`
          SELECT service_tag FROM it_equipment WHERE id = ?
        `, [id]);

        if (equipment.length === 0) {
          return new Response("Equipment not found", { status: 404 });
        }

        const service_tag = equipment[0].service_tag;

        // Update the equipment table (static data only)
        await pool.query(`
          UPDATE it_equipment SET
            model_id = ?,
            vendor_id = ?,
            supplier_id = ?,
            purchase_date = ?,
            warranty_expiry_date = ?,
            cerf = ?,
            ip = ?,
            mac_addresses = ?,
            teamviewer = ?,
            updated = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [
          model_id || null,
          vendor_id || null,
          supplier_id || null,
          purchase_date || null,
          warranty_expiry_date || null,
          cerf || 0,
          ip || null,
          mac_addresses || null,
          teamviewer || null,
          id
        ]);

        // Insert new log entry (dynamic/audit data)
        await pool.query(`
          INSERT INTO it_equipment_log (
            equipment_id, service_tag, assigned_to, equipment_sub_area_id, inventory_period_id, comment
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          id,
          service_tag,
          assigned_to || null,
          equipment_sub_area_id || null,
          inventory_period_id || null,
          comment || null
        ]);

        return Response.redirect(`${url.origin}/edit/${id}?success=1`, 303);
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

    // Locations management - GET
    if (path === "/locations" && req.method === "GET") {
      const success = url.searchParams.get("success") || "";
      const error = url.searchParams.get("error") || "";
      const data = await getLocationsData();
      return new Response(locationsPage(data, success, error), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Locations management - POST (add/edit/activate/deactivate)
    if (path === "/locations" && req.method === "POST") {
      const form = await req.formData();
      const action = (form.get("action") || "").toString();
      const type = (form.get("type") || "").toString();
      const id = form.get("id") ? Number(form.get("id")) : null;
      const name = form.get("name") ? form.get("name")!.toString().trim() : "";
      const parent_id = form.get("parent_id") ? Number(form.get("parent_id")) : null;

      const map: Record<
        string,
        { table: string; parent?: string }
      > = {
        region: { table: "it_equipment_region" },
        country: { table: "it_equipment_country", parent: "region_id" },
        plant: { table: "it_equipment_plant", parent: "country_id" },
        department: { table: "it_equipment_department", parent: "plant_id" },
        area: { table: "it_equipment_area", parent: "department_id" },
        sub_area: { table: "it_equipment_sub_area", parent: "area_id" },
      };

      if (!map[type]) {
        return Response.redirect(`/locations?error=${encodeURIComponent("Unknown type")}`, 303);
      }

      try {
        const { table, parent } = map[type];

        if (action === "add") {
          if (!name) throw new Error("Name is required");
          if (parent && !parent_id) throw new Error("Parent is required");
          const cols = ["name", "status"];
          const vals: any[] = [name, 1];
          if (parent) {
            cols.push(parent);
            vals.push(parent_id);
          }
          const placeholders = cols.map(() => "?").join(", ");
          await pool.query(
            `INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders})`,
            vals
          );
        } else if (action === "edit") {
          if (!id) throw new Error("ID is required");
          if (!name) throw new Error("Name is required");
          await pool.query(`UPDATE ${table} SET name = ? WHERE id = ?`, [name, id]);
        } else if (action === "deactivate" || action === "activate") {
          if (!id) throw new Error("ID is required");
          const status = action === "activate" ? 1 : 0;
          await pool.query(`UPDATE ${table} SET status = ? WHERE id = ?`, [status, id]);
        } else {
          throw new Error("Unknown action");
        }

        return Response.redirect(`/locations?success=${encodeURIComponent("Saved")}`, 303);
      } catch (err: any) {
        return Response.redirect(`/locations?error=${encodeURIComponent(err.message)}`, 303);
      }
    }

    // API Routes for adding new items
    if (path.startsWith("/api/") && req.method === "POST") {
      const body = await req.json();
      const name = body.name?.trim();
      const parent_id = body.parent_id || null;

      if (!name) {
        return new Response(JSON.stringify({ error: "Name is required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      try {
        let result: ResultSetHeader;
        const apiType = path.replace("/api/", "");

        switch (apiType) {
          case "regions":
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_region (name, status) VALUES (?, 1)",
              [name]
            );
            break;
          case "countries":
            if (!parent_id) throw new Error("Region is required");
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_country (name, region_id, status) VALUES (?, ?, 1)",
              [name, parent_id]
            );
            break;
          case "plants":
            if (!parent_id) throw new Error("Country is required");
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_plant (name, country_id, status) VALUES (?, ?, 1)",
              [name, parent_id]
            );
            break;
          case "departments":
            if (!parent_id) throw new Error("Plant is required");
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_department (name, plant_id, status) VALUES (?, ?, 1)",
              [name, parent_id]
            );
            break;
          case "areas":
            if (!parent_id) throw new Error("Department is required");
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_area (name, department_id, status) VALUES (?, ?, 1)",
              [name, parent_id]
            );
            break;
          case "sub-areas":
            if (!parent_id) throw new Error("Area is required");
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_sub_area (name, area_id, status) VALUES (?, ?, 1)",
              [name, parent_id]
            );
            break;
          case "types":
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_type (type_name, status) VALUES (?, 1)",
              [name]
            );
            break;
          case "product-lines":
            if (!parent_id) throw new Error("Type is required");
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_product_line (name, type_id, status) VALUES (?, ?, 1)",
              [name, parent_id]
            );
            break;
          case "models":
            if (!parent_id) throw new Error("Product Line is required");
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_model (name, product_line_id, status) VALUES (?, ?, 1)",
              [name, parent_id]
            );
            break;
          case "vendors":
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_vendor (name) VALUES (?)",
              [name]
            );
            break;
          case "suppliers":
            [result] = await pool.query<ResultSetHeader>(
              "INSERT INTO it_equipment_supplier (name) VALUES (?)",
              [name]
            );
            break;
          default:
            return new Response(JSON.stringify({ error: "Unknown API endpoint" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ id: result.insertId, name }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
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
  // Get equipment with latest log entry joined
  const [equipment] = await pool.query<RowDataPacket[]>(`
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
      log.created as latest_audit_date
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
    [employees],
    [inventoryPeriods],
    [vendors],
    [suppliers]
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
    pool.query<RowDataPacket[]>(`SELECT employee_no, CONCAT(first_name, ' ', last_name) as name FROM it_employees_list WHERE status = 1 ORDER BY last_name, first_name`),
    pool.query<RowDataPacket[]>(`SELECT id, inventory_nr as name, start_date, end_date FROM it_inventory_period ORDER BY start_date DESC`),
    pool.query<RowDataPacket[]>(`SELECT id, name FROM it_equipment_vendor ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, name FROM it_equipment_supplier ORDER BY name`)
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
    suppliers
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
    [employees],
    [inventoryPeriods]
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
    pool.query<RowDataPacket[]>(`SELECT employee_no, CONCAT(first_name, ' ', last_name) as name FROM it_employees_list WHERE status = 1 ORDER BY last_name, first_name`),
    pool.query<RowDataPacket[]>(`SELECT id, inventory_nr as name, start_date, end_date FROM it_inventory_period ORDER BY start_date DESC`)
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
    inventoryPeriods
  };
}

async function getLocationsData() {
  const [
    [regions],
    [countries],
    [plants],
    [departments],
    [areas],
    [subAreas]
  ] = await Promise.all([
    pool.query<RowDataPacket[]>(`WITH latest AS (
        SELECT l1.equipment_id, l1.equipment_sub_area_id
        FROM it_equipment_log l1
        JOIN (
          SELECT equipment_id, MAX(created) AS max_created
          FROM it_equipment_log
          GROUP BY equipment_id
        ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
      )
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
    pool.query<RowDataPacket[]>(`WITH latest AS (
        SELECT l1.equipment_id, l1.equipment_sub_area_id
        FROM it_equipment_log l1
        JOIN (
          SELECT equipment_id, MAX(created) AS max_created
          FROM it_equipment_log
          GROUP BY equipment_id
        ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
      )
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
    pool.query<RowDataPacket[]>(`WITH latest AS (
        SELECT l1.equipment_id, l1.equipment_sub_area_id
        FROM it_equipment_log l1
        JOIN (
          SELECT equipment_id, MAX(created) AS max_created
          FROM it_equipment_log
          GROUP BY equipment_id
        ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
      )
      SELECT p.id, p.name, p.country_id as parent_id, p.status,
        COUNT(lat.equipment_id) as equipment_count
      FROM it_equipment_plant p
      LEFT JOIN it_equipment_department d ON d.plant_id = p.id
      LEFT JOIN it_equipment_area a ON a.department_id = d.id
      LEFT JOIN it_equipment_sub_area sa ON sa.area_id = a.id
      LEFT JOIN latest lat ON lat.equipment_sub_area_id = sa.id
      GROUP BY p.id
      ORDER BY p.name`),
    pool.query<RowDataPacket[]>(`WITH latest AS (
        SELECT l1.equipment_id, l1.equipment_sub_area_id
        FROM it_equipment_log l1
        JOIN (
          SELECT equipment_id, MAX(created) AS max_created
          FROM it_equipment_log
          GROUP BY equipment_id
        ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
      )
      SELECT d.id, d.name, d.plant_id as parent_id, d.status,
        COUNT(lat.equipment_id) as equipment_count
      FROM it_equipment_department d
      LEFT JOIN it_equipment_area a ON a.department_id = d.id
      LEFT JOIN it_equipment_sub_area sa ON sa.area_id = a.id
      LEFT JOIN latest lat ON lat.equipment_sub_area_id = sa.id
      GROUP BY d.id
      ORDER BY d.name`),
    pool.query<RowDataPacket[]>(`WITH latest AS (
        SELECT l1.equipment_id, l1.equipment_sub_area_id
        FROM it_equipment_log l1
        JOIN (
          SELECT equipment_id, MAX(created) AS max_created
          FROM it_equipment_log
          GROUP BY equipment_id
        ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
      )
      SELECT a.id, a.name, a.department_id as parent_id, a.status,
        COUNT(lat.equipment_id) as equipment_count
      FROM it_equipment_area a
      LEFT JOIN it_equipment_sub_area sa ON sa.area_id = a.id
      LEFT JOIN latest lat ON lat.equipment_sub_area_id = sa.id
      GROUP BY a.id
      ORDER BY a.name`),
    pool.query<RowDataPacket[]>(`WITH latest AS (
        SELECT l1.equipment_id, l1.equipment_sub_area_id
        FROM it_equipment_log l1
        JOIN (
          SELECT equipment_id, MAX(created) AS max_created
          FROM it_equipment_log
          GROUP BY equipment_id
        ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
      )
      SELECT sa.id, sa.name, sa.area_id as parent_id, sa.status,
        COUNT(lat.equipment_id) as equipment_count
      FROM it_equipment_sub_area sa
      LEFT JOIN latest lat ON lat.equipment_sub_area_id = sa.id
      GROUP BY sa.id
      ORDER BY sa.name`)
  ]);

  return {
    regions,
    countries,
    plants,
    departments,
    areas,
    subAreas
  };
}

console.log(`🚀 Server running at http://localhost:${PORT}`);

serve({
  port: PORT as number,
  fetch: handleRequest,
});
