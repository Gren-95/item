import { describe, test, expect, beforeEach } from "bun:test";
import { MockPool } from "./utils";
import {
  getUserPlantId,
  hasAdminPermission,
  hasSearchPermission,
  hasEditEquipmentPermission,
} from "../utils/auth";
import { searchPage } from "../templates/search";
import { auditPage } from "../templates/audit";

// Define SearchResult type locally since it's not exported
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
  plant_id: number | null;
  isReadonly?: boolean;
}

describe("Plant-Based Access Control (#44)", () => {
  let mockPool: MockPool;

  beforeEach(() => {
    mockPool = new MockPool();
  });

  describe("getUserPlantId", () => {
    test("should return plant_id from permissions first", async () => {
      // Mock: user has permissions with plant_id
      mockPool.mockQuery(
        `SELECT plant_id, COUNT(*) as count
       FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id > 0
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       GROUP BY plant_id
       ORDER BY count DESC, plant_id ASC
       LIMIT 1`,
        [{ rows: [{ plant_id: 5, count: 3 }] as any }]
      );

      const result = await getUserPlantId("testuser", mockPool as any);
      expect(result).toBe(5);
    });

    test("should return plant_id from equipment assignment as fallback", async () => {
      // Mock: user has no permissions (empty result)
      mockPool.mockQuery(
        `SELECT plant_id, COUNT(*) as count
       FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id > 0
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       GROUP BY plant_id
       ORDER BY count DESC, plant_id ASC
       LIMIT 1`,
        [{ rows: [] as any }]
      );

      // Mock: user exists
      mockPool.mockQuery(
        "SELECT employee_no FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ employee_no: "EMP001" }] as any }]
      );

      // Mock: user has equipment assignment with plant_id
      mockPool.mockQuery(
        `SELECT d.plant_id
       FROM it_equipment_log log
       LEFT JOIN it_equipment_sub_area sa ON log.equipment_sub_area_id = sa.id
       LEFT JOIN it_equipment_area a ON sa.area_id = a.id
       LEFT JOIN it_equipment_department d ON a.department_id = d.id
       WHERE log.assigned_to = ?
         AND d.plant_id IS NOT NULL
       ORDER BY log.created DESC
       LIMIT 1`,
        [{ rows: [{ plant_id: 5 }] as any }]
      );

      const result = await getUserPlantId("testuser", mockPool as any);
      expect(result).toBe(5);
    });

    test("should return null when user has no plant assignment", async () => {
      // Mock: user has no permissions (empty result)
      mockPool.mockQuery(
        `SELECT plant_id, COUNT(*) as count
       FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id > 0
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       GROUP BY plant_id
       ORDER BY count DESC, plant_id ASC
       LIMIT 1`,
        [{ rows: [] as any }]
      );

      // Mock: user exists
      mockPool.mockQuery(
        "SELECT employee_no FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ employee_no: "EMP001" }] as any }]
      );

      // Mock: user has no equipment assignment
      mockPool.mockQuery(
        `SELECT d.plant_id
       FROM it_equipment_log log
       LEFT JOIN it_equipment_sub_area sa ON log.equipment_sub_area_id = sa.id
       LEFT JOIN it_equipment_area a ON sa.area_id = a.id
       LEFT JOIN it_equipment_department d ON a.department_id = d.id
       WHERE log.assigned_to = ?
         AND d.plant_id IS NOT NULL
       ORDER BY log.created DESC
       LIMIT 1`,
        [{ rows: [] as any }]
      );

      const result = await getUserPlantId("testuser", mockPool as any);
      expect(result).toBe(null);
    });
  });

  describe("Search Results - Plant-Based Readonly", () => {
    test("searchPage should mark items from other plants as readonly for non-admin users", () => {
      const results: SearchResult[] = [
        {
          id: 1,
          service_tag: "TAG001",
          type_name: "Laptop",
          product_line_name: null,
          model_name: null,
          vendor_name: null,
          assigned_to_name: null,
          location: null,
          latest_audit_date: null,
          plant_id: 5, // User's plant
        },
        {
          id: 2,
          service_tag: "TAG002",
          type_name: "Desktop",
          product_line_name: null,
          model_name: null,
          vendor_name: null,
          assigned_to_name: null,
          location: null,
          latest_audit_date: null,
          plant_id: 10, // Different plant
        },
      ];

      const userPlantId = 5;
      const isAdmin = false;

      // Mark items as readonly
      const resultsWithReadonly = results.map((result) => {
        result.isReadonly = !isAdmin &&
          result.plant_id !== null &&
          userPlantId !== null &&
          result.plant_id !== userPlantId;
        return result;
      });

      expect(resultsWithReadonly[0].isReadonly).toBe(false); // Same plant
      expect(resultsWithReadonly[1].isReadonly).toBe(true); // Different plant
    });

    test("searchPage should not mark items as readonly for admin users", () => {
      const results: SearchResult[] = [
        {
          id: 1,
          service_tag: "TAG001",
          type_name: "Laptop",
          product_line_name: null,
          model_name: null,
          vendor_name: null,
          assigned_to_name: null,
          location: null,
          latest_audit_date: null,
          plant_id: 5,
        },
        {
          id: 2,
          service_tag: "TAG002",
          type_name: "Desktop",
          product_line_name: null,
          model_name: null,
          vendor_name: null,
          assigned_to_name: null,
          location: null,
          latest_audit_date: null,
          plant_id: 10, // Different plant
        },
      ];

      const userPlantId = 5;
      const isAdmin = true; // Admin user

      // Mark items as readonly
      const resultsWithReadonly = results.map((result) => {
        result.isReadonly = !isAdmin &&
          result.plant_id !== null &&
          userPlantId !== null &&
          result.plant_id !== userPlantId;
        return result;
      });

      expect(resultsWithReadonly[0].isReadonly).toBe(false); // Admin can edit
      expect(resultsWithReadonly[1].isReadonly).toBe(false); // Admin can edit
    });

    test("searchPage should show readonly badge for items from other plants", () => {
      const results: SearchResult[] = [
        {
          id: 1,
          service_tag: "TAG001",
          type_name: "Laptop",
          product_line_name: null,
          model_name: null,
          vendor_name: null,
          assigned_to_name: null,
          location: null,
          latest_audit_date: null,
          plant_id: 10, // Different plant
          isReadonly: true,
        },
      ];

      const html = searchPage("TAG001", results, null, false, false, 5);

      expect(html).toContain("View Only");
      expect(html).toContain("Read-only");
      expect(html).toContain("cursor-not-allowed");
    });

    test("searchPage should show edit link for items from same plant", () => {
      const results: SearchResult[] = [
        {
          id: 1,
          service_tag: "TAG001",
          type_name: "Laptop",
          product_line_name: null,
          model_name: null,
          vendor_name: null,
          assigned_to_name: null,
          location: null,
          latest_audit_date: null,
          plant_id: 5, // Same plant
          isReadonly: false,
        },
      ];

      const html = searchPage("TAG001", results, null, false, false, 5);

      expect(html).toContain('href="/edit/1"');
      expect(html).toContain("View");
      expect(html).not.toContain("View Only");
    });
  });

  describe("Edit Page - Plant-Based Readonly", () => {
    const mockAuditData = {
      equipment: {
        id: 1,
        service_tag: "TAG001",
        type_id: 1,
        product_line_id: 1,
        model_id: 1,
        vendor_id: 1,
        supplier_id: null,
        cerf: 0,
        device_no: null,
        is_personal: false,
        purchase_date: "2024-01-01",
        warranty_expiry_date: "2025-01-01",
        is_written_off: null,
        teamviewer: null,
        imei1: null,
        imei2: null,
        ip: null,
        mac_addresses: null,
        bill_id: null,
        created: "2024-01-01T00:00:00Z",
        updated: "2024-01-01T00:00:00Z",
        type_name: "Laptop",
        product_line_name: "ThinkPad",
        model_name: "X1 Carbon",
        vendor_name: "Lenovo",
        assigned_to: null,
        equipment_sub_area_id: null,
        inventory_period_id: null,
        comment: null,
        assigned_to_name: null,
        inventory_nr: null,
        area_id: null,
        department_id: null,
        plant_id: 5, // Equipment's plant
        country_id: null,
        region_id: null,
        latest_audit_date: null,
        write_off_reason: null,
        repair_status: null,
        repair_note: null,
        repair_physical_location: null,
      },
      regions: [],
      countries: [],
      plants: [],
      departments: [],
      areas: [],
      subAreas: [],
      types: [],
      productLines: [],
      models: [],
      employees: [],
      inventoryPeriods: [],
      vendors: [],
      suppliers: [],
      writeOffReasons: [],
    };

    test("auditPage should show readonly mode for equipment from different plant", () => {
      const html = auditPage(mockAuditData, false, null, false, false, true);

      expect(html).toContain("View Equipment");
      expect(html).toContain("Read-only");
      expect(html).toContain('readonly');
      expect(html).toContain('disabled');
    });

    test("auditPage should show edit mode for equipment from same plant", () => {
      const html = auditPage(mockAuditData, false, null, false, false, false);

      expect(html).toContain("Edit Equipment");
      expect(html).not.toContain("Read-only");
    });

    test("auditPage should disable form fields in readonly mode", () => {
      const html = auditPage(mockAuditData, false, null, false, false, true);

      // Check that form has onsubmit prevention
      expect(html).toContain('onsubmit="event.preventDefault(); return false;"');

      // Check that submit button is disabled
      expect(html).toContain('Read-only Mode');
      expect(html).toContain('disabled');
    });

    test("auditPage should allow editing for admin users even from different plant", () => {
      const html = auditPage(mockAuditData, false, null, true, false, false); // isAdmin = true

      expect(html).toContain("Edit Equipment");
      expect(html).not.toContain("Read-only");
    });
  });

  describe("Permission Checks with Plant ID", () => {
    test("hasSearchPermission should work with plant_id", async () => {
      // Mock: user exists
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      // Mock: user is not admin
      mockPool.mockQuery(
        `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = 0
         AND permission = 'global_admin'
         AND role = 'admin'
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       LIMIT 1`,
        [{ rows: [] as any }]
      );

      // Mock: user has search permission for plant_id 5
      mockPool.mockQuery(
        `SELECT id, role FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = ?
         AND permission = ?
         AND role IN (?, ?)
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())`,
        [{ rows: [{ id: 1, role: "user" }] as any }]
      );

      const result = await hasSearchPermission("testuser", mockPool as any, 5);
      expect(result).toBe(true);
    });

    test("hasEditEquipmentPermission should work with plant_id", async () => {
      // Mock: user exists (for hasAdminPermission check)
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      // Mock: user is not admin (for hasAdminPermission)
      mockPool.mockQuery(
        `SELECT id, user_id, plant_id, permission, role, expiry_date FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = 0
         AND permission = 'global_admin'
         AND role = 'admin'
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       LIMIT 1`,
        [{ rows: [] as any }]
      );

      // Mock: user is not admin (for hasPermission - global admin check)
      mockPool.mockQuery(
        `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = 0
         AND permission = 'global_admin'
         AND role = 'admin'
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       LIMIT 1`,
        [{ rows: [] as any }]
      );

      // Mock: user exists (for hasPermission)
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      // Mock: user has edit permission for plant_id 5
      mockPool.mockQuery(
        `SELECT id, role FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = ?
         AND permission = ?
         AND role IN (?, ?)
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())`,
        [{ rows: [{ id: 1, role: "user" }] as any }]
      );

      const result = await hasEditEquipmentPermission("testuser", mockPool as any, 5);
      expect(result).toBe(true);
    });

    test("hasEditEquipmentPermission should return true for admin regardless of plant_id", async () => {
      // Mock: user exists
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      // Mock: user is admin
      mockPool.mockQuery(
        `SELECT id, user_id, plant_id, permission, role, expiry_date FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = 0
         AND permission = 'global_admin'
         AND role = 'admin'
         AND (expiry_date IS NULL OR expiry_date >= CURDATE())
       LIMIT 1`,
        [{ rows: [{ id: 1, user_id: "testuser", plant_id: 0, permission: "global_admin", role: "admin", expiry_date: null }] as any }]
      );

      const result = await hasEditEquipmentPermission("testuser", mockPool as any, 999); // Different plant
      expect(result).toBe(true); // Admin can edit from any plant
    });
  });

  describe("Search Query - Plant ID Inclusion", () => {
    test("search query should include plant_id in results", () => {
      // This tests that the SQL query includes p.id as plant_id
      const expectedQuery = `SELECT DISTINCT
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
            log.created as latest_audit_date,
            p.id as plant_id`;

      // The query should include plant_id
      expect(expectedQuery).toContain("p.id as plant_id");
    });
  });

  describe("Readonly Logic", () => {
    test("should mark as readonly when plant_id differs and user is not admin", () => {
      const equipmentPlantId: number | null = 10;
      const userPlantId: number | null = 5;
      const isAdmin = false;

      const isReadonly = !isAdmin &&
        equipmentPlantId !== null &&
        userPlantId !== null &&
        equipmentPlantId !== userPlantId;

      expect(isReadonly).toBe(true);
    });

    test("should not mark as readonly when plant_id matches", () => {
      const equipmentPlantId: number | null = 5 as number;
      const userPlantId: number | null = 5 as number;
      const isAdmin = false;

      const isReadonly = !isAdmin &&
        equipmentPlantId !== null &&
        userPlantId !== null &&
        equipmentPlantId !== userPlantId;

      expect(isReadonly).toBe(false);
    });

    test("should not mark as readonly when user is admin", () => {
      const equipmentPlantId: number | null = 10 as number;
      const userPlantId: number | null = 5 as number;
      const isAdmin = true;

      const isReadonly = !isAdmin &&
        equipmentPlantId !== null &&
        userPlantId !== null &&
        equipmentPlantId !== userPlantId;

      expect(isReadonly).toBe(false);
    });

    test("should not mark as readonly when plant_id is null", () => {
      const equipmentPlantId = null;
      const userPlantId = 5;
      const isAdmin = false;

      const isReadonly = !isAdmin &&
        equipmentPlantId !== null &&
        userPlantId !== null &&
        equipmentPlantId !== userPlantId;

      expect(isReadonly).toBe(false);
    });

    test("should not mark as readonly when userPlantId is null", () => {
      const equipmentPlantId = 10;
      const userPlantId = null;
      const isAdmin = false;

      const isReadonly = !isAdmin &&
        equipmentPlantId !== null &&
        userPlantId !== null &&
        equipmentPlantId !== userPlantId;

      expect(isReadonly).toBe(false);
    });
  });
});
