#!/usr/bin/env bun

/**
 * Mock Data Import Script
 * 
 * Imports mock data into the IT Equipment Management database.
 * This script respects foreign key relationships and inserts data in the correct order.
 * 
 * Usage:
 *   bun run scripts/import-mock-data.ts
 *   bun run scripts/import-mock-data.ts --dry-run  (preview without inserting)
 *   bun run scripts/import-mock-data.ts --clear   (clear existing data first)
 */

import mysql from "mysql2/promise";
import { mockData } from "./mock-data";

const DB_HOST = process.env.DATABASE_HOST || "localhost";
const DB_PORT = parseInt(process.env.DATABASE_PORT || "3306");
const DB_USER = process.env.DATABASE_USER || "root";
const DB_PASSWORD = process.env.DATABASE_PASSWORD || process.env.MYSQL_ROOT_PASSWORD || "";
const DB_NAME = process.env.DATABASE_NAME || "it";

const DRY_RUN = process.argv.includes("--dry-run");
const CLEAR_EXISTING = process.argv.includes("--clear");

interface IdMap {
  [key: string]: number;
}

class MockDataImporter {
  private pool: mysql.Pool;
  private ids: IdMap = {};
  private syntheticIdCounter = 1;

  constructor() {
    this.pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private log(message: string): void {
    const prefix = DRY_RUN ? "[DRY RUN] " : "";
    console.log(`${prefix}${message}`);
  }

  private error(message: string, err?: unknown): void {
    console.error(`❌ ${message}`, err);
  }

  private success(message: string): void {
    console.log(`✅ ${message}`);
  }

  private registerId(key: string, id: number, extraKeys: string[] = []): number {
    this.ids[key] = id;
    for (const extra of extraKeys) {
      if (!this.ids[extra]) {
        this.ids[extra] = id;
      }
    }
    return id;
  }

  private assignSyntheticId(key: string, extraKeys: string[] = []): number {
    const id = this.syntheticIdCounter++;
    return this.registerId(key, id, extraKeys);
  }

  async clearExistingData(): Promise<void> {
    if (!CLEAR_EXISTING) return;

    this.log("Clearing existing data...");
    const tables = [
      "it_equipment_log",
      "it_equipment",
      "it_inventory_period",
      "it_equipment_write_off_reason",
      "it_equipment_sub_area",
      "it_equipment_area",
      "it_equipment_department",
      "it_equipment_plant",
      "it_equipment_country",
      "it_equipment_region",
      "it_equipment_model",
      "it_equipment_product_line",
      "it_equipment_type",
      "it_equipment_supplier",
      "it_equipment_vendor",
    ];

    try {
      await this.pool.query("SET FOREIGN_KEY_CHECKS = 0");
      for (const table of tables) {
        if (!DRY_RUN) {
          await this.pool.query(`DELETE FROM \`${table}\``);
        }
        this.log(`  Cleared ${table}`);
      }
      await this.pool.query("SET FOREIGN_KEY_CHECKS = 1");
      this.success("Existing data cleared");
    } catch (err) {
      this.error("Failed to clear existing data", err);
      throw err;
    }
  }

  async importRegions(): Promise<void> {
    this.log("Importing regions...");
    for (const region of mockData.regions) {
      try {
        if (DRY_RUN) {
          const id = this.assignSyntheticId(`region:${region.name}`);
          this.log(`  Would insert: ${region.name} (${region.code || "no code"}) (ID: ${id})`);
        } else {
          const [result] = await this.pool.query<mysql.ResultSetHeader>(
            "INSERT INTO it_equipment_region (name, code) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), code = VALUES(code)",
            [region.name, region.code || null]
          );
          const id = result.insertId || (await this.getId("region", region.name));
          this.registerId(`region:${region.name}`, id);
          this.log(`  Inserted: ${region.name} (ID: ${id})`);
        }
      } catch (err) {
        this.error(`Failed to insert region ${region.name}`, err);
      }
    }
    this.success(`Imported ${mockData.regions.length} regions`);
  }

  async importCountries(): Promise<void> {
    this.log("Importing countries...");
    for (const country of mockData.countries) {
      try {
        const regionId = this.ids[`region:${country.regionName}`];
        if (!regionId) {
          this.error(`Region not found: ${country.regionName}`);
          continue;
        }
        if (DRY_RUN) {
          const id = this.assignSyntheticId(`country:${country.name}`);
          this.log(`  Would insert: ${country.name} (region: ${country.regionName}) (ID: ${id})`);
        } else {
          const [result] = await this.pool.query<mysql.ResultSetHeader>(
            "INSERT INTO it_equipment_country (name, region_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), region_id = VALUES(region_id)",
            [country.name, regionId]
          );
          const id = result.insertId || (await this.getId("country", country.name));
          this.registerId(`country:${country.name}`, id);
          this.log(`  Inserted: ${country.name} (ID: ${id})`);
        }
      } catch (err) {
        this.error(`Failed to insert country ${country.name}`, err);
      }
    }
    this.success(`Imported ${mockData.countries.length} countries`);
  }

  async importPlants(): Promise<void> {
    this.log("Importing plants...");
    for (const plant of mockData.plants) {
      try {
        const countryId = this.ids[`country:${plant.countryName}`];
        if (!countryId) {
          this.error(`Country not found: ${plant.countryName}`);
          continue;
        }
        if (DRY_RUN) {
          const id = this.assignSyntheticId(`plant:${plant.name}`);
          this.log(`  Would insert: ${plant.name} (country: ${plant.countryName}) (ID: ${id})`);
        } else {
          const [result] = await this.pool.query<mysql.ResultSetHeader>(
            "INSERT INTO it_equipment_plant (name, country_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), country_id = VALUES(country_id)",
            [plant.name, countryId]
          );
          const id = result.insertId || (await this.getId("plant", plant.name, countryId));
          this.registerId(`plant:${plant.name}`, id, [`plant:${plant.name}:${plant.countryName}`]);
          this.log(`  Inserted: ${plant.name} (ID: ${id})`);
        }
      } catch (err) {
        this.error(`Failed to insert plant ${plant.name}`, err);
      }
    }
    this.success(`Imported ${mockData.plants.length} plants`);
  }

  async importDepartments(): Promise<void> {
    this.log("Importing departments...");
    for (const dept of mockData.departments) {
      try {
        const plantId = this.ids[`plant:${dept.plantName}`];
        if (!plantId) {
          this.error(`Plant not found: ${dept.plantName}`);
          continue;
        }
        if (DRY_RUN) {
          const id = this.assignSyntheticId(`department:${dept.name}:${dept.plantName}`, [`department:${dept.name}`]);
          this.log(`  Would insert: ${dept.name} (plant: ${dept.plantName}) (ID: ${id})`);
        } else {
          const [result] = await this.pool.query<mysql.ResultSetHeader>(
            "INSERT INTO it_equipment_department (name, plant_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), plant_id = VALUES(plant_id)",
            [dept.name, plantId]
          );
          const id = result.insertId || (await this.getId("department", dept.name, plantId));
          this.registerId(`department:${dept.name}:${dept.plantName}`, id, [`department:${dept.name}`]);
          this.log(`  Inserted: ${dept.name} (ID: ${id})`);
        }
      } catch (err) {
        this.error(`Failed to insert department ${dept.name}`, err);
      }
    }
    this.success(`Imported ${mockData.departments.length} departments`);
  }

  async importAreas(): Promise<void> {
    this.log("Importing areas...");
    for (const area of mockData.areas) {
      try {
        // Find department - need to match by name and plant
        const dept = mockData.departments.find(d => d.name === area.departmentName);
        if (!dept) {
          this.error(`Department not found in mock data: ${area.departmentName}`);
          continue;
        }
        const plantId = this.ids[`plant:${dept.plantName}`];
        if (!plantId) {
          this.error(`Plant not found: ${dept.plantName}`);
          continue;
        }
        // Use composite key or query database
        let deptId = this.ids[`department:${area.departmentName}:${dept.plantName}`];
        if (!deptId) {
          const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
            "SELECT id FROM it_equipment_department WHERE name = ? AND plant_id = ?",
            [area.departmentName, plantId]
          );
          if (rows.length > 0) {
            deptId = rows[0].id;
            this.ids[`department:${area.departmentName}:${dept.plantName}`] = deptId;
          } else {
            this.error(`Department not found in database: ${area.departmentName} (plant: ${dept.plantName})`);
            continue;
          }
        }
        if (DRY_RUN) {
          const id = this.assignSyntheticId(
            `area:${area.name}:${dept.plantName}`,
            [`area:${area.name}`, `area:${area.name}:${area.departmentName}`]
          );
          this.log(`  Would insert: ${area.name} (department: ${area.departmentName}) (ID: ${id})`);
        } else {
          const [result] = await this.pool.query<mysql.ResultSetHeader>(
            "INSERT INTO it_equipment_area (name, department_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), department_id = VALUES(department_id)",
            [area.name, deptId]
          );
          const id = result.insertId || (await this.getId("area", area.name, deptId));
          this.registerId(
            `area:${area.name}:${dept.plantName}`,
            id,
            [`area:${area.name}`, `area:${area.name}:${area.departmentName}`]
          );
          this.log(`  Inserted: ${area.name} (ID: ${id})`);
        }
      } catch (err) {
        this.error(`Failed to insert area ${area.name}`, err);
      }
    }
    this.success(`Imported ${mockData.areas.length} areas`);
  }

  async importSubAreas(): Promise<void> {
    this.log("Importing sub-areas...");
    for (const subArea of mockData.subAreas) {
      try {
        const area = mockData.areas.find(a => a.name === subArea.areaName);
        const areaId =
          this.ids[`area:${subArea.areaName}`] ||
          (area ? this.ids[`area:${subArea.areaName}:${area.departmentName}`] : undefined);
        if (!areaId) {
          // Try to find by matching any area with this name
          if (area) {
            const deptId = this.ids[`department:${area.departmentName}`];
            if (deptId) {
              const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
                "SELECT id FROM it_equipment_area WHERE name = ? AND department_id = ?",
                [subArea.areaName, deptId]
              );
              if (rows.length > 0) {
                this.ids[`area:${subArea.areaName}`] = rows[0].id;
                continue;
              }
            }
          }
          this.error(`Area not found: ${subArea.areaName}`);
          continue;
        }
        if (DRY_RUN) {
          const id = this.assignSyntheticId(
            `sub_area:${subArea.name}:${subArea.areaName}`,
            [`sub_area:${subArea.name}`]
          );
          this.log(
            `  Would insert: ${subArea.name} (area: ${subArea.areaName}, building: ${subArea.building || "none"}) (ID: ${id})`
          );
        } else {
          const [result] = await this.pool.query<mysql.ResultSetHeader>(
            "INSERT INTO it_equipment_sub_area (name, area_id, building, x, y) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), area_id = VALUES(area_id), building = VALUES(building), x = VALUES(x), y = VALUES(y)",
            [subArea.name, areaId, subArea.building || null, subArea.x || null, subArea.y || null]
          );
          const id = result.insertId || (await this.getId("sub_area", subArea.name, areaId));
          this.registerId(`sub_area:${subArea.name}:${subArea.areaName}`, id, [`sub_area:${subArea.name}`]);
          this.log(`  Inserted: ${subArea.name} (ID: ${id})`);
        }
      } catch (err) {
        this.error(`Failed to insert sub-area ${subArea.name}`, err);
      }
    }
    this.success(`Imported ${mockData.subAreas.length} sub-areas`);
  }

  async importTypes(): Promise<void> {
    this.log("Importing equipment types...");
    for (const type of mockData.types) {
      try {
        if (DRY_RUN) {
          const id = this.assignSyntheticId(`type:${type.type_name}`);
          this.log(`  Would insert: ${type.type_name} (ID: ${id})`);
        } else {
          const [result] = await this.pool.query<mysql.ResultSetHeader>(
            "INSERT INTO it_equipment_type (type_name, change_interval, expiry_interval) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE change_interval = VALUES(change_interval), expiry_interval = VALUES(expiry_interval)",
            [type.type_name, type.change_interval || null, type.expiry_interval || null]
          );
          const id = result.insertId || (await this.getId("type", type.type_name));
          this.registerId(`type:${type.type_name}`, id);
          this.log(`  Inserted: ${type.type_name} (ID: ${id})`);
        }
      } catch (err) {
        this.error(`Failed to insert type ${type.type_name}`, err);
      }
    }
    this.success(`Imported ${mockData.types.length} types`);
  }

  async importProductLines(): Promise<void> {
    this.log("Importing product lines...");
    for (const pl of mockData.productLines) {
      try {
        const typeId = this.ids[`type:${pl.typeName}`];
        if (!typeId) {
          this.error(`Type not found: ${pl.typeName}`);
          continue;
        }
        if (DRY_RUN) {
          const id = this.assignSyntheticId(`product_line:${pl.name}`, [`product_line:${pl.name}:${pl.typeName}`]);
          this.log(`  Would insert: ${pl.name} (type: ${pl.typeName}) (ID: ${id})`);
        } else {
          const [result] = await this.pool.query<mysql.ResultSetHeader>(
            "INSERT INTO it_equipment_product_line (name, type_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), type_id = VALUES(type_id)",
            [pl.name, typeId]
          );
          const id = result.insertId || (await this.getId("product_line", pl.name, typeId));
          this.registerId(`product_line:${pl.name}`, id, [`product_line:${pl.name}:${pl.typeName}`]);
          this.log(`  Inserted: ${pl.name} (ID: ${id})`);
        }
      } catch (err) {
        this.error(`Failed to insert product line ${pl.name}`, err);
      }
    }
    this.success(`Imported ${mockData.productLines.length} product lines`);
  }

  async importModels(): Promise<void> {
    this.log("Importing models...");
    for (const model of mockData.models) {
      try {
        const plId = this.ids[`product_line:${model.productLineName}`];
        if (!plId) {
          this.error(`Product line not found: ${model.productLineName}`);
          continue;
        }
        if (DRY_RUN) {
          const id = this.assignSyntheticId(`model:${model.name}`);
          this.log(`  Would insert: ${model.name} (product line: ${model.productLineName}) (ID: ${id})`);
        } else {
          const [result] = await this.pool.query<mysql.ResultSetHeader>(
            "INSERT INTO it_equipment_model (name, product_line_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), product_line_id = VALUES(product_line_id)",
            [model.name, plId]
          );
          const id = result.insertId || (await this.getId("model", model.name, plId));
          this.registerId(`model:${model.name}`, id);
          this.log(`  Inserted: ${model.name} (ID: ${id})`);
        }
      } catch (err) {
        this.error(`Failed to insert model ${model.name}`, err);
      }
    }
    this.success(`Imported ${mockData.models.length} models`);
  }

  async importVendors(): Promise<void> {
    this.log("Importing vendors...");
    for (const vendor of mockData.vendors) {
      try {
        if (DRY_RUN) {
          const id = this.assignSyntheticId(`vendor:${vendor.name}`);
          this.log(`  Would insert: ${vendor.name} (ID: ${id})`);
        } else {
          const [result] = await this.pool.query<mysql.ResultSetHeader>(
            "INSERT INTO it_equipment_vendor (name) VALUES (?) ON DUPLICATE KEY UPDATE name = VALUES(name)",
            [vendor.name]
          );
          const id = result.insertId || (await this.getId("vendor", vendor.name));
          this.registerId(`vendor:${vendor.name}`, id);
          this.log(`  Inserted: ${vendor.name} (ID: ${id})`);
        }
      } catch (err) {
        this.error(`Failed to insert vendor ${vendor.name}`, err);
      }
    }
    this.success(`Imported ${mockData.vendors.length} vendors`);
  }

  async importSuppliers(): Promise<void> {
    this.log("Importing suppliers...");
    for (const supplier of mockData.suppliers) {
      try {
        if (DRY_RUN) {
          const id = this.assignSyntheticId(`supplier:${supplier.name}`);
          this.log(`  Would insert: ${supplier.name} (ID: ${id})`);
        } else {
          const [result] = await this.pool.query<mysql.ResultSetHeader>(
            "INSERT INTO it_equipment_supplier (name, email, phone_number, address, representative_name, sap_vendor_no, website) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email), phone_number = VALUES(phone_number), address = VALUES(address), representative_name = VALUES(representative_name), sap_vendor_no = VALUES(sap_vendor_no), website = VALUES(website)",
            [supplier.name, supplier.email || null, supplier.phone_number || null, supplier.address || null, supplier.representative_name || null, supplier.sap_vendor_no || null, supplier.website || null]
          );
          const id = result.insertId || (await this.getId("supplier", supplier.name));
          this.registerId(`supplier:${supplier.name}`, id);
          this.log(`  Inserted: ${supplier.name} (ID: ${id})`);
        }
      } catch (err) {
        this.error(`Failed to insert supplier ${supplier.name}`, err);
      }
    }
    this.success(`Imported ${mockData.suppliers.length} suppliers`);
  }

  async importWriteOffReasons(): Promise<void> {
    this.log("Importing write-off reasons...");
    for (const reason of mockData.writeOffReasons) {
      try {
        if (DRY_RUN) {
          const id = this.assignSyntheticId(`write_off:${reason.reason}`);
          this.log(`  Would insert: ${reason.reason} (ID: ${id})`);
        } else {
          const [result] = await this.pool.query<mysql.ResultSetHeader>(
            "INSERT INTO it_equipment_write_off_reason (reason) VALUES (?)",
            [reason.reason]
          );
          const id = result.insertId;
          this.registerId(`write_off:${reason.reason}`, id);
          this.log(`  Inserted: ${reason.reason} (ID: ${id})`);
        }
      } catch (err) {
        this.error(`Failed to insert write-off reason ${reason.reason}`, err);
      }
    }
    this.success(`Imported ${mockData.writeOffReasons.length} write-off reasons`);
  }

  async importInventoryPeriods(): Promise<void> {
    this.log("Importing inventory periods...");
    for (const period of mockData.inventoryPeriods) {
      try {
        if (DRY_RUN) {
          const id = this.assignSyntheticId(`inventory:${period.inventory_nr}`);
          this.log(`  Would insert: ${period.inventory_nr} (${period.start_date} to ${period.end_date}) (ID: ${id})`);
        } else {
          const [result] = await this.pool.query<mysql.ResultSetHeader>(
            "INSERT INTO it_inventory_period (inventory_nr, start_date, end_date, comment) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE start_date = VALUES(start_date), end_date = VALUES(end_date), comment = VALUES(comment)",
            [period.inventory_nr, period.start_date, period.end_date, period.comment || null]
          );
          const id = result.insertId || (await this.getId("inventory_period", period.inventory_nr));
          this.registerId(`inventory:${period.inventory_nr}`, id);
          this.log(`  Inserted: ${period.inventory_nr} (ID: ${id})`);
        }
      } catch (err) {
        this.error(`Failed to insert inventory period ${period.inventory_nr}`, err);
      }
    }
    this.success(`Imported ${mockData.inventoryPeriods.length} inventory periods`);
  }

  async importEquipment(): Promise<void> {
    this.log("Importing equipment...");
    for (const eq of mockData.equipment) {
      try {
        const modelId = eq.modelName ? this.ids[`model:${eq.modelName}`] : null;
        const vendorId = eq.vendorName ? this.ids[`vendor:${eq.vendorName}`] : null;
        const supplierId = eq.supplierName ? this.ids[`supplier:${eq.supplierName}`] : null;

        if (DRY_RUN) {
          const id = this.assignSyntheticId(`equipment:${eq.service_tag}`);
          this.log(`  Would insert: ${eq.service_tag} (${eq.modelName || "no model"}) (ID: ${id})`);
        } else {
          const [result] = await this.pool.query<mysql.ResultSetHeader>(
            "INSERT INTO it_equipment (service_tag, model_id, vendor_id, supplier_id, cerf, purchase_date, warranty_expiry_date, teamviewer, ip, mac_addresses, is_personal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE model_id = VALUES(model_id), vendor_id = VALUES(vendor_id), supplier_id = VALUES(supplier_id), cerf = VALUES(cerf), purchase_date = VALUES(purchase_date), warranty_expiry_date = VALUES(warranty_expiry_date), teamviewer = VALUES(teamviewer), ip = VALUES(ip), mac_addresses = VALUES(mac_addresses), is_personal = VALUES(is_personal)",
            [eq.service_tag, modelId, vendorId, supplierId, eq.cerf || 0, eq.purchase_date, eq.warranty_expiry_date, eq.teamviewer || null, eq.ip || null, eq.mac_addresses || null, eq.is_personal ? 1 : 0]
          );
          const id = result.insertId || (await this.getId("equipment", eq.service_tag));
          this.registerId(`equipment:${eq.service_tag}`, id);
          this.log(`  Inserted: ${eq.service_tag} (ID: ${id})`);
        }
      } catch (err) {
        this.error(`Failed to insert equipment ${eq.service_tag}`, err);
      }
    }
    this.success(`Imported ${mockData.equipment.length} equipment items`);
  }

  async importEquipmentLogs(): Promise<void> {
    this.log("Importing equipment logs...");
    for (const log of mockData.equipmentLogs) {
      try {
        const equipmentId = this.ids[`equipment:${log.service_tag}`];
        if (!equipmentId) {
          this.error(`Equipment not found: ${log.service_tag}`);
          continue;
        }

        let subAreaId: number | null = null;
        if (log.subAreaName) {
          // Try to find sub-area - check multiple key formats
          let areaId = this.ids[`area:${log.subAreaName}`];
          if (!areaId) {
            const subArea = mockData.subAreas.find(sa => sa.name === log.subAreaName);
            if (subArea) {
              // Try to find area by name and department
              const area = mockData.areas.find(a => a.name === subArea.areaName);
              if (area) {
                const dept = mockData.departments.find(d => d.name === area.departmentName);
                if (dept) {
                  const plantId = this.ids[`plant:${dept.plantName}`];
                  if (plantId) {
                    const [deptRows] = await this.pool.query<mysql.RowDataPacket[]>(
                      "SELECT id FROM it_equipment_department WHERE name = ? AND plant_id = ?",
                      [area.departmentName, plantId]
                    );
                    if (deptRows.length > 0) {
                      const [areaRows] = await this.pool.query<mysql.RowDataPacket[]>(
                        "SELECT id FROM it_equipment_area WHERE name = ? AND department_id = ?",
                        [subArea.areaName, deptRows[0].id]
                      );
                      if (areaRows.length > 0) {
                        areaId = areaRows[0].id;
                      }
                    }
                  }
                }
              }
            }
          }
          if (areaId) {
            const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
              "SELECT id FROM it_equipment_sub_area WHERE name = ? AND area_id = ?",
              [log.subAreaName, areaId]
            );
            if (rows.length > 0) {
              subAreaId = rows[0].id;
            }
          }
        }

        let inventoryPeriodId: number | null = null;
        if (log.inventory_nr) {
          inventoryPeriodId = this.ids[`inventory:${log.inventory_nr}`] || null;
        }

        if (DRY_RUN) {
          this.log(`  Would insert log for: ${log.service_tag} (assigned: ${log.assigned_to || "none"})`);
        } else {
          await this.pool.query(
            "INSERT INTO it_equipment_log (equipment_id, service_tag, assigned_to, equipment_sub_area_id, inventory_period_id, comment) VALUES (?, ?, ?, ?, ?, ?)",
            [equipmentId, log.service_tag, log.assigned_to || null, subAreaId, inventoryPeriodId, log.comment || null]
          );
          this.log(`  Inserted log for: ${log.service_tag}`);
        }
      } catch (err) {
        this.error(`Failed to insert equipment log for ${log.service_tag}`, err);
      }
    }
    this.success(`Imported ${mockData.equipmentLogs.length} equipment logs`);
  }

  private async getId(table: string, name: string, parentId?: number): Promise<number> {
    let query: string;
    let params: unknown[];

    switch (table) {
      case "region":
        query = "SELECT id FROM it_equipment_region WHERE name = ?";
        params = [name];
        break;
      case "country":
        query = "SELECT id FROM it_equipment_country WHERE name = ?";
        params = [name];
        break;
      case "plant":
        query = "SELECT id FROM it_equipment_plant WHERE name = ? AND country_id = ?";
        params = [name, parentId!];
        break;
      case "department":
        query = "SELECT id FROM it_equipment_department WHERE name = ? AND plant_id = ?";
        params = [name, parentId!];
        break;
      case "area":
        query = "SELECT id FROM it_equipment_area WHERE name = ? AND department_id = ?";
        params = [name, parentId!];
        break;
      case "sub_area":
        query = "SELECT id FROM it_equipment_sub_area WHERE name = ? AND area_id = ?";
        params = [name, parentId!];
        break;
      case "type":
        query = "SELECT id FROM it_equipment_type WHERE type_name = ?";
        params = [name];
        break;
      case "product_line":
        query = "SELECT id FROM it_equipment_product_line WHERE name = ? AND type_id = ?";
        params = [name, parentId!];
        break;
      case "model":
        query = "SELECT id FROM it_equipment_model WHERE name = ? AND product_line_id = ?";
        params = [name, parentId!];
        break;
      case "vendor":
        query = "SELECT id FROM it_equipment_vendor WHERE name = ?";
        params = [name];
        break;
      case "supplier":
        query = "SELECT id FROM it_equipment_supplier WHERE name = ?";
        params = [name];
        break;
      case "inventory_period":
        query = "SELECT id FROM it_inventory_period WHERE inventory_nr = ?";
        params = [name];
        break;
      case "equipment":
        query = "SELECT id FROM it_equipment WHERE service_tag = ?";
        params = [name];
        break;
      default:
        throw new Error(`Unknown table: ${table}`);
    }

    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(query, params);
    if (rows.length > 0) {
      return rows[0].id;
    }
    throw new Error(`Could not find ID for ${table}: ${name}`);
  }

  async importAll(): Promise<void> {
    try {
      console.log("🚀 Starting mock data import...");
      console.log(`📊 Database: ${DB_NAME} @ ${DB_HOST}:${DB_PORT}`);
      if (DRY_RUN) {
        console.log("⚠️  DRY RUN MODE - No data will be inserted");
      }
      if (CLEAR_EXISTING) {
        console.log("🗑️  CLEAR MODE - Existing data will be deleted");
      }
      console.log("");

      await this.clearExistingData();

      // Import in dependency order
      await this.importRegions();
      await this.importCountries();
      await this.importPlants();
      await this.importDepartments();
      await this.importAreas();
      await this.importSubAreas();
      await this.importTypes();
      await this.importProductLines();
      await this.importModels();
      await this.importVendors();
      await this.importSuppliers();
      await this.importWriteOffReasons();
      await this.importInventoryPeriods();
      await this.importEquipment();
      await this.importEquipmentLogs();

      console.log("");
      this.success("Mock data import completed successfully!");
    } catch (err) {
      this.error("Mock data import failed", err);
      throw err;
    }
  }
}

// Main execution
async function main() {
  const importer = new MockDataImporter();
  try {
    await importer.importAll();
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  } finally {
    await importer.close();
  }
}

if (import.meta.main) {
  main();
}
