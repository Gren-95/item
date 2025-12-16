import { serve, file } from "bun";
import path from "path";
import pool from "./db";
import { searchPage } from "./templates/search";
import { auditPage } from "./templates/audit";
import { addPage } from "./templates/add";
import { locationsPage } from "./templates/locations";
import { typesPage } from "./templates/types";
import { vendorsPage } from "./templates/vendors";
import { writeOffReasonsPage } from "./templates/writeOffReasons";
import { logger } from "./utils/logger";
import {
  equipmentAddSchema,
  equipmentEditSchema,
  apiAddItemSchema,
  locationsActionSchema,
  typesActionSchema,
  vendorsActionSchema,
  suppliersActionSchema,
  writeOffReasonsActionSchema,
  printLabelSchema,
} from "./utils/validation";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { randomUUID } from "crypto";

interface SearchResult {
  id: number;
  service_tag: string;
  type_name: string | null;
  product_line_name: string | null;
  model_name: string | null;
  vendor_name: string | null;
  assigned_to_name: string | null;
  location: string | null;
  latest_audit_date: string | null;
}

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const DEFAULT_CERT_PATH = path.join(process.cwd(), "certs", "ssl.pem");
const DEFAULT_KEY_PATH = path.join(process.cwd(), "certs", "ssl-key.pem");
const HTTPS_CERT_FILE = process.env.HTTPS_CERT_FILE || DEFAULT_CERT_PATH;
const HTTPS_KEY_FILE = process.env.HTTPS_KEY_FILE || DEFAULT_KEY_PATH;

async function getTlsOptions() {
  try {
    const certFile = Bun.file(HTTPS_CERT_FILE);
    const keyFile = Bun.file(HTTPS_KEY_FILE);

    if (!(await certFile.exists()) || !(await keyFile.exists())) {
      console.warn(
        `[HTTPS] TLS cert/key not found. Expected cert: ${HTTPS_CERT_FILE}, key: ${HTTPS_KEY_FILE}`
      );
      return null;
    }

    const [cert, key] = await Promise.all([certFile.text(), keyFile.text()]);
    if (!cert.trim() || !key.trim()) {
      console.warn("[HTTPS] TLS cert or key is empty");
      return null;
    }

    return { cert, key };
  } catch {
    console.warn("[HTTPS] Failed to load TLS cert/key");
    return null;
  }
}

async function handleRequest(req: Request): Promise<Response> {
  const traceId = randomUUID();
  const url = new URL(req.url);
  const path = url.pathname;
  
  logger.info("Request received", { traceId, method: req.method, path });

  // Static files
  if (path === "/favicon.ico") {
    const ico = file("./public/icons/icon.png");
    if (await ico.exists()) {
      return new Response(ico, { headers: { "Content-Type": "image/png" } });
    }
  }

  // Serve qr-scanner library files
  if (path === "/js/qr-scanner.umd.min.js") {
    const libFile = file("./node_modules/qr-scanner/qr-scanner.umd.min.js");
    if (await libFile.exists()) {
      return new Response(libFile, { headers: { "Content-Type": "application/javascript" } });
    }
    return new Response("Not found", { status: 404 });
  }
  if (path === "/js/qr-scanner-worker.min.js") {
    const workerFile = file("./node_modules/qr-scanner/qr-scanner-worker.min.js");
    if (await workerFile.exists()) {
      return new Response(workerFile, { headers: { "Content-Type": "application/javascript" } });
    }
    return new Response("Not found", { status: 404 });
  }

  if (path.startsWith("/css/") || path.startsWith("/js/") || path.startsWith("/icons/") || path === "/manifest.webmanifest") {
    const filePath = `./public${path}`;
    const staticFile = file(filePath);
    if (await staticFile.exists()) {
      return new Response(staticFile);
    }
    return new Response("Not found", { status: 404 });
  }

  // Health check endpoint
  if (path === "/health" && req.method === "GET") {
    try {
      // Check database connection
      await pool.query("SELECT 1");
      return new Response(
        JSON.stringify({
          status: "healthy",
          timestamp: new Date().toISOString(),
          traceId,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (err) {
      logger.error("Health check failed", err, { traceId });
      return new Response(
        JSON.stringify({
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          traceId,
        }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // Routes
  try {
    // Home / Search page
    if (path === "/" && req.method === "GET") {
      const query = url.searchParams.get("q") || url.searchParams.get("serial") || "";
      
      if (query && query.trim()) {
        const trimmed = query.trim();
        logger.info("Search request", { traceId, query: trimmed });
        
        // Comprehensive search query covering all fields
        const searchTerm = `%${trimmed}%`;
        const [rows] = await pool.query<RowDataPacket[]>(
          `SELECT DISTINCT
            e.id,
            e.service_tag,
            t.type_name,
            pl.name as product_line_name,
            m.name as model_name,
            v.name as vendor_name,
            CONCAT(emp.first_name, ' ', emp.last_name) as assigned_to_name,
            CONCAT_WS(' > ',
              r.name,
              c.name,
              p.name,
              d.name,
              a.name,
              sa.name
            ) as location,
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
          LEFT JOIN it_equipment_sub_area sa ON log.equipment_sub_area_id = sa.id
          LEFT JOIN it_equipment_area a ON sa.area_id = a.id
          LEFT JOIN it_equipment_department d ON a.department_id = d.id
          LEFT JOIN it_equipment_plant p ON d.plant_id = p.id
          LEFT JOIN it_equipment_country c ON p.country_id = c.id
          LEFT JOIN it_equipment_region r ON c.region_id = r.id
          WHERE 
            e.service_tag LIKE ?
            OR t.type_name LIKE ?
            OR pl.name LIKE ?
            OR m.name LIKE ?
            OR v.name LIKE ?
            OR CONCAT(emp.first_name, ' ', emp.last_name) LIKE ?
            OR emp.first_name LIKE ?
            OR emp.last_name LIKE ?
            OR r.name LIKE ?
            OR c.name LIKE ?
            OR p.name LIKE ?
            OR d.name LIKE ?
            OR a.name LIKE ?
            OR sa.name LIKE ?
          ORDER BY e.service_tag
          LIMIT 100`,
          [
            searchTerm, // service_tag
            searchTerm, // type_name
            searchTerm, // product_line name
            searchTerm, // model name
            searchTerm, // vendor name
            searchTerm, // full name
            searchTerm, // first_name
            searchTerm, // last_name
            searchTerm, // region
            searchTerm, // country
            searchTerm, // plant
            searchTerm, // department
            searchTerm, // area
            searchTerm  // sub_area
          ]
        );

        logger.info("Search results", { traceId, query: trimmed, count: rows.length });
        return new Response(searchPage(trimmed, rows.length > 0 ? (rows as SearchResult[]) : []), {
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
      
      // Validate input
      const rawData = {
        service_tag: formData.get("service_tag") as string,
        vendor_id: formData.get("vendor_id") || null,
        supplier_id: formData.get("supplier_id") || null,
        model_id: formData.get("model_id") || null,
        purchase_date: formData.get("purchase_date") as string,
        warranty_expiry_date: formData.get("warranty_expiry_date") as string,
        equipment_sub_area_id: formData.get("equipment_sub_area_id") || null,
        assigned_to: formData.get("assigned_to") || null,
        teamviewer: formData.get("teamviewer") || null,
        cerf: formData.get("cerf") || "0",
        ip: formData.get("ip") || null,
        mac_addresses: formData.get("mac_addresses") || null,
        comment: formData.get("comment") || null,
        inventory_period_id: formData.get("inventory_period_id") || null,
      };

      try {
        const validated = equipmentAddSchema.parse(rawData);
        
        const service_tag = validated.service_tag;
        const vendor_id = validated.vendor_id;
        const supplier_id = validated.supplier_id;
        const model_id = validated.model_id;
        const purchase_date = validated.purchase_date;
        const warranty_expiry_date = validated.warranty_expiry_date;
        const equipment_sub_area_id = validated.equipment_sub_area_id;
        const assigned_to = validated.assigned_to;
        const teamviewer = validated.teamviewer;
        const cerf = validated.cerf || 0;
        const ip = validated.ip;
        const mac_addresses = validated.mac_addresses;
        const comment = validated.comment;
        const inventory_period_id = validated.inventory_period_id;
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
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to add equipment", err, { traceId, serviceTag: rawData.service_tag });
        const addData = await getAddData(rawData.service_tag || "");
        return new Response(addPage(addData, false, errorMessage), {
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
      
      // Extract and validate form values
      const rawData = {
        model_id: formData.get("model_id") || null,
        equipment_sub_area_id: formData.get("equipment_sub_area_id") || null,
        assigned_to: formData.get("assigned_to") || null,
        teamviewer: formData.get("teamviewer") || null,
        comment: formData.get("comment") || null,
        inventory_period_id: formData.get("inventory_period_id") || null,
        vendor_id: formData.get("vendor_id") || null,
        supplier_id: formData.get("supplier_id") || null,
        purchase_date: formData.get("purchase_date") || null,
        warranty_expiry_date: formData.get("warranty_expiry_date") || null,
        cerf: formData.get("cerf") || "0",
        ip: formData.get("ip") || null,
        mac_addresses: formData.get("mac_addresses") || null,
        is_written_off: formData.get("is_written_off") || null,
        write_off_comment: formData.get("write_off_comment") || null,
      };

      try {
        const validated = equipmentEditSchema.parse(rawData);
        
        const model_id = validated.model_id;
        const equipment_sub_area_id = validated.equipment_sub_area_id;
        const assigned_to = validated.assigned_to;
        const teamviewer = validated.teamviewer;
        const comment = validated.comment;
        const inventory_period_id = validated.inventory_period_id;
        const vendor_id = validated.vendor_id;
        const supplier_id = validated.supplier_id;
        const purchase_date = validated.purchase_date;
        const warranty_expiry_date = validated.warranty_expiry_date;
        const cerf = validated.cerf || 0;
        const ip = validated.ip;
        const mac_addresses = validated.mac_addresses;
        const is_written_off = validated.is_written_off ? Number(validated.is_written_off) : null;
        const write_off_comment = rawData.write_off_comment ? rawData.write_off_comment.toString().trim() : null;
        
        // Validate: if writing off, comment is required
        if (is_written_off && !write_off_comment) {
          const auditData = await getAuditData(id);
          if (!auditData) {
            return new Response("Equipment not found", { status: 404 });
          }
          return new Response(auditPage(auditData, false, "Write-off comment is required when writing off equipment."), {
            headers: { "Content-Type": "text/html" },
          });
        }
        
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
            is_written_off = ?,
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
          is_written_off,
          id
        ]);

        // Combine comment and write-off comment if writing off
        let logComment = comment || null;
        if (is_written_off && write_off_comment) {
          if (logComment) {
            logComment = `[Write-Off: ${write_off_comment}] ${logComment}`;
          } else {
            logComment = `[Write-Off: ${write_off_comment}]`;
          }
        } else if (!is_written_off && write_off_comment) {
          // If un-writing off, add a note about restoration
          if (logComment) {
            logComment = `[Restored from write-off] ${logComment}`;
          } else {
            logComment = `[Restored from write-off]`;
          }
        }

        // Insert new log entry (dynamic/audit data)
        await pool.query(`
          INSERT INTO it_equipment_log (
            equipment_id, service_tag, assigned_to, equipment_sub_area_id, inventory_period_id, comment, is_written_off
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          id,
          service_tag,
          assigned_to || null,
          equipment_sub_area_id || null,
          inventory_period_id || null,
          logComment,
          is_written_off || null
        ]);

        return Response.redirect(`${url.origin}/edit/${id}?success=1`, 303);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to edit equipment", err, { traceId, equipmentId: id });
        const auditData = await getAuditData(id);
        if (!auditData) {
          return new Response("Equipment not found", { status: 404 });
        }
        return new Response(auditPage(auditData, false, errorMessage), {
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

        const { table, parent } = map[type];

        if (action === "add") {
          if (!name) throw new Error("Name is required");
          if (parent && !parent_id) throw new Error("Parent is required");
          const cols = ["name", "status"];
          const vals: (string | number)[] = [name!, 1];
          if (parent && parent_id !== null) {
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
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        return Response.redirect(`/locations?error=${encodeURIComponent(errorMessage)}`, 303);
      }
    }

    // Vendors & Suppliers management - GET
    if (path === "/vendors" && req.method === "GET") {
      const success = url.searchParams.get("success") || "";
      const error = url.searchParams.get("error") || "";
      const data = await getVendorsAndSuppliersData();
      return new Response(vendorsPage(data, success, error), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Vendors & Suppliers management - POST (add/edit/delete)
    if (path === "/vendors" && req.method === "POST") {
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
            representative_name: form.get("representative_name") ? form.get("representative_name")!.toString().trim() : "",
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

          if (action === "add") {
            await pool.query(
              `INSERT INTO it_equipment_supplier (name, email, phone_number, address, representative_name, sap_vendor_no, website)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [name!, email, phone_number, address, representative_name, sap_vendor_no, website]
            );
          } else if (action === "edit") {
            await pool.query(
              `UPDATE it_equipment_supplier 
                 SET name = ?, email = ?, phone_number = ?, address = ?, representative_name = ?, sap_vendor_no = ?, website = ?
               WHERE id = ?`,
              [name!, email, phone_number, address, representative_name, sap_vendor_no, website, id!]
            );
          } else if (action === "delete") {
            // Check if supplier is in use
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

          if (action === "add") {
            await pool.query(
              "INSERT INTO it_equipment_vendor (name) VALUES (?)",
              [name!]
            );
          } else if (action === "edit") {
            await pool.query("UPDATE it_equipment_vendor SET name = ? WHERE id = ?", [name!, id!]);
          } else if (action === "delete") {
            // Check if vendor is in use
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
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to manage vendor/supplier", err, { traceId, action: rawCommon.action, entity });
        return Response.redirect(`/vendors?error=${encodeURIComponent(errorMessage)}`, 303);
      }
    }

    // Types management - GET
    if (path === "/types" && req.method === "GET") {
      const success = url.searchParams.get("success") || "";
      const error = url.searchParams.get("error") || "";
      const data = await getTypesData();
      return new Response(typesPage(data, success, error), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Types management - POST (add/edit/activate/deactivate)
    if (path === "/types" && req.method === "POST") {
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

        if (validated.type === "type") {
          if (action === "add") {
            await pool.query(
              "INSERT INTO it_equipment_type (type_name, status) VALUES (?, 1)",
              [name!]
            );
          } else if (action === "edit") {
            await pool.query("UPDATE it_equipment_type SET type_name = ? WHERE id = ?", [name!, id!]);
          } else if (action === "deactivate" || action === "activate") {
            const status = action === "activate" ? 1 : 0;
            await pool.query("UPDATE it_equipment_type SET status = ? WHERE id = ?", [status, id!]);
          } else {
            throw new Error("Unknown action");
          }
        } else if (validated.type === "product-line") {
          if (action === "add") {
            await pool.query(
              "INSERT INTO it_equipment_product_line (name, type_id, status) VALUES (?, ?, 1)",
              [name!, parent_id!]
            );
          } else if (action === "edit") {
            await pool.query("UPDATE it_equipment_product_line SET name = ? WHERE id = ?", [name!, id!]);
          } else if (action === "deactivate" || action === "activate") {
            const status = action === "activate" ? 1 : 0;
            await pool.query("UPDATE it_equipment_product_line SET status = ? WHERE id = ?", [status, id!]);
          } else {
            throw new Error("Unknown action");
          }
        } else if (validated.type === "model") {
          if (action === "add") {
            await pool.query(
              "INSERT INTO it_equipment_model (name, product_line_id, status) VALUES (?, ?, 1)",
              [name!, parent_id!]
            );
          } else if (action === "edit") {
            await pool.query("UPDATE it_equipment_model SET name = ? WHERE id = ?", [name!, id!]);
          } else if (action === "deactivate" || action === "activate") {
            const status = action === "activate" ? 1 : 0;
            await pool.query("UPDATE it_equipment_model SET status = ? WHERE id = ?", [status, id!]);
          } else {
            throw new Error("Unknown action");
          }
        } else {
          throw new Error("Unknown type");
        }

        return Response.redirect(`/types?success=${encodeURIComponent("Saved")}`, 303);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to manage type/model", err, { traceId, rawData });
        return Response.redirect(`/types?error=${encodeURIComponent(errorMessage)}`, 303);
      }
    }

    // Write-Off Reasons management - GET
    if (path === "/write-off-reasons" && req.method === "GET") {
      const success = url.searchParams.get("success") || "";
      const error = url.searchParams.get("error") || "";
      const data = await getWriteOffReasonsData();
      return new Response(writeOffReasonsPage(data, success, error), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Write-Off Reasons management - POST (add/edit/delete)
    if (path === "/write-off-reasons" && req.method === "POST") {
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

        if (action === "add") {
          if (!reason) throw new Error("Reason is required");
          await pool.query(
            "INSERT INTO it_equipment_write_off_reason (reason) VALUES (?)",
            [reason]
          );
        } else if (action === "edit") {
          if (!id) throw new Error("ID is required");
          if (!reason) throw new Error("Reason is required");
          await pool.query("UPDATE it_equipment_write_off_reason SET reason = ? WHERE id = ?", [reason, id]);
        } else if (action === "delete") {
          if (!id) throw new Error("ID is required");
          // Check if reason is in use
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
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        logger.error("Failed to manage write-off reason", err, { traceId, rawData });
        return Response.redirect(`/write-off-reasons?error=${encodeURIComponent(errorMessage)}`, 303);
      }
    }

    // Get printers from Bartender
    if (path === "/api/printers" && req.method === "GET") {
      try {
        const bartenderHost = process.env.BARTENDER_HOST || "http://eeprt01/";
        const host = bartenderHost.replace(/\/$/, "");
        const printersUrl = `${host}/integration/getprinters/execute`;

        const response = await fetch(printersUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Bartender API returned ${response.status}`);
        }

        let responseText = await response.text();
        // Remove BOM if present
        responseText = responseText.replace(/^\uFEFF/, "");
        
        const apiData = JSON.parse(responseText) as Array<{
          Location?: string;
          DriverName?: string;
          PortName?: string;
          Name?: string;
        }>;

        // Transform API response
        const result = apiData
          .map((printer) => {
            const location = printer.Location || "";
            let department = "";
            let area = "";

            // Split location on dash (-) and trim both parts
            if (location.includes("-")) {
              const locationParts = location.split("-", 2);
              department = locationParts[0].trim();
              area = (locationParts[1] || "").trim();
              if (!area) {
                area = department;
              }
            } else {
              department = location.trim();
              area = department;
            }

            const driver = (printer.DriverName || "").toLowerCase();
            let type = "A4";

            // Determine paper type based on driver
            if (
              driver.includes("intermec") ||
              driver.includes("honeywell") ||
              driver.includes("easycoder")
            ) {
              type = "sticker";
            } else if (driver.includes("brother")) {
              type = "sticker-tiny";
            }

            // Clean IP address by removing suffix after underscore
            const cleanIp = (printer.PortName || "").split("_")[0];

            // Only return sticker printers
            if (type === "sticker-tiny") {
              return {
                name: printer.Name,
                ip: cleanIp,
                department: department,
                area: area,
                driver: printer.DriverName || "",
                type: type,
              };
            }

            return null;
          })
          .filter((item) => item !== null) as Array<{
            name: string;
            ip: string;
            department: string;
            area: string;
            driver: string;
            type: string;
          }>;

        return new Response(JSON.stringify({ success: true, data: result }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        return new Response(
          JSON.stringify({
            error: true,
            message: "Failed to fetch printers. Printer server may be offline or the API may be down.",
            details: errorMessage,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Print label API
    if (path === "/api/print" && req.method === "POST") {
      try {
        const body = await req.json();
        const validated = printLabelSchema.parse(body);
        const service_tag = validated.service_tag;
        const printer = validated.printer || "EERAK-PRT103";
        const bartenderHost = process.env.BARTENDER_HOST || "http://eeprt01/";

        // Remove trailing slash from host if present
        const host = bartenderHost.replace(/\/$/, "");
        const printUrl = `${host}/Integration/ServiceTag/Execute`;

        const response = await fetch(printUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            service_tag: service_tag,
            printer: printer,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          return new Response(
            JSON.stringify({ error: `Bartender error: ${errorText}` }),
            {
              status: response.status,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        return new Response(JSON.stringify({ success: true, message: "Label sent to printer" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // API Routes for adding new items
    if (path.startsWith("/api/") && req.method === "POST") {
      const body = await req.json();
      const apiType = path.replace("/api/", "");

      try {
        const validated = apiAddItemSchema.parse(body);
        const name = validated.name;
        const parent_id = validated.parent_id;
        
        let result: ResultSetHeader;

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
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    return new Response("Not found", { status: 404 });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    logger.error("Request handler error", err, { traceId, path });
    return new Response(searchPage("", null, errorMessage), {
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
    [suppliers],
    [writeOffReasons]
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
    pool.query<RowDataPacket[]>(`SELECT id, name FROM it_equipment_supplier ORDER BY name`),
    pool.query<RowDataPacket[]>(`SELECT id, reason as name FROM it_equipment_write_off_reason ORDER BY reason`)
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
    writeOffReasons
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

async function getVendorsAndSuppliersData() {
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
      sap_vendor_no: s.sap_vendor_no === null || s.sap_vendor_no === undefined ? null : Number(s.sap_vendor_no),
      website: s.website || "",
      equipment_count: Number(s.equipment_count) || 0,
    })),
  };
}

async function getWriteOffReasonsData() {
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
    writeOffReasons: writeOffReasons.map((w: any) => ({
      id: w.id,
      reason: w.reason,
      equipment_count: Number(w.equipment_count) || 0,
    })),
  };
}

async function getTypesData() {
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

const tlsOptions = await getTlsOptions();

if (tlsOptions) {
  // HTTPS server
  serve({
    port: Number(HTTPS_PORT),
    fetch: handleRequest,
    tls: tlsOptions,
  });

  // HTTP server to redirect to HTTPS
  serve({
    port: Number(PORT),
    fetch: (req: Request) => {
      const url = new URL(req.url);
      url.protocol = "https:";
      url.port = HTTPS_PORT.toString();
      return Response.redirect(url.toString(), 301);
    },
  });

  console.log(`🔒 HTTPS enabled on port ${HTTPS_PORT}`);
} else {
  console.log(
    `🚀 HTTPS not enabled (missing or invalid cert/key). Server running at http://localhost:${PORT}`
  );
  serve({
    port: Number(PORT),
    fetch: handleRequest,
  });
}
