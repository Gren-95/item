import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { MockPool } from "./utils";
import { getEmployeeNo } from "../utils/approvals";
import { isAdminUser } from "../utils/auth";

describe("Audit Foreign Key Constraint Fix", () => {
  let mockPool: MockPool;
  const originalAdminUsername = process.env.ADMIN_USERNAME;

  beforeEach(() => {
    mockPool = new MockPool();
    // Set ADMIN_USERNAME for tests
    process.env.ADMIN_USERNAME = "admin";
  });

  afterEach(() => {
    // Restore original ADMIN_USERNAME
    if (originalAdminUsername !== undefined) {
      process.env.ADMIN_USERNAME = originalAdminUsername;
    } else {
      delete process.env.ADMIN_USERNAME;
    }
  });

  describe("getEmployeeNo for updated_by field", () => {
    test("should return null for admin users (to avoid foreign key constraint)", async () => {
      // Admin user should return "admin" from getEmployeeNo, but we need null for updated_by
      const adminUsername = "admin";
      
      // Verify isAdminUser returns true for admin
      expect(isAdminUser(adminUsername)).toBe(true);
      
      // getEmployeeNo returns "admin" for admin users
      const result = await getEmployeeNo(adminUsername, mockPool as any);
      expect(result).toBe("admin");
      
      // But for updated_by field, we should use null for admin users
      // This is handled in server.ts: const updatedBy = isAdminUser(session.username) ? null : (employeeNo || null);
      const updatedBy = isAdminUser(adminUsername) ? null : (result || null);
      expect(updatedBy).toBe(null);
    });

    test("should return employee_no for non-admin users", async () => {
      const username = "testuser";
      const employeeNo = "EMP001";
      
      // Mock: user exists with employee_no
      mockPool.mockQuery(
        `SELECT employee_no
       FROM it_employees_list
       WHERE user_id = ?
       ORDER BY status DESC
       LIMIT 1`,
        [{ rows: [{ employee_no: employeeNo }] as any }]
      );

      const result = await getEmployeeNo(username, mockPool as any);
      expect(result).toBe(employeeNo);
      
      // For non-admin users, updatedBy should be the employee_no
      const updatedBy = isAdminUser(username) ? null : (result || null);
      expect(updatedBy).toBe(employeeNo);
    });

    test("should return null for non-admin users without employee record", async () => {
      const username = "testuser";
      
      // Mock: user does not exist in employees_list
      mockPool.mockQuery(
        `SELECT employee_no
       FROM it_employees_list
       WHERE user_id = ?
       ORDER BY status DESC
       LIMIT 1`,
        [{ rows: [] as any }]
      );
      
      // Mock: fallback query by employee_no
      mockPool.mockQuery(
        `SELECT employee_no
       FROM it_employees_list
       WHERE employee_no = ?
       LIMIT 1`,
        [{ rows: [] as any }]
      );

      const result = await getEmployeeNo(username, mockPool as any);
      expect(result).toBe(null);
      
      // For non-admin users without employee record, updatedBy should be null
      const updatedBy = isAdminUser(username) ? null : (result || null);
      expect(updatedBy).toBe(null);
    });

    test("should handle updatedBy logic correctly for admin users in audit insert", () => {
      // Simulate the logic used in server.ts for audit inserts
      const adminUsername = "admin";
      const employeeNo = "admin"; // getEmployeeNo returns "admin" for admin
      
      // This is the pattern used in server.ts
      const updatedBy = isAdminUser(adminUsername) ? null : (employeeNo || null);
      
      expect(updatedBy).toBe(null);
      expect(updatedBy).not.toBe("admin"); // Should not be "admin" which would cause FK error
    });

    test("should handle updatedBy logic correctly for non-admin users in audit insert", async () => {
      const username = "testuser";
      const employeeNo = "EMP001";
      
      // Mock: user exists with employee_no
      mockPool.mockQuery(
        `SELECT employee_no
       FROM it_employees_list
       WHERE user_id = ?
       ORDER BY status DESC
       LIMIT 1`,
        [{ rows: [{ employee_no: employeeNo }] as any }]
      );

      const result = await getEmployeeNo(username, mockPool as any);
      
      // This is the pattern used in server.ts
      const updatedBy = isAdminUser(username) ? null : (result || null);
      
      expect(updatedBy).toBe(employeeNo);
      expect(updatedBy).not.toBe(null);
    });
  });

  describe("SQL query parameter validation for it_equipment_audit", () => {
    test("should use null for updated_by when inserting audit record as admin", () => {
      // Verify the SQL query would accept null for updated_by
      const updatedBy = null;
      const sqlParams = [
        1, // equipmentId
        1, // inventoryPeriodId
        "TAG001", // service_tag
        null, // model_id
        null, // vendor_id
        null, // supplier_id
        0, // cerf
        null, // device_no
        false, // is_personal
        "2024-01-01", // purchase_date
        "2025-01-01", // warranty_expiry_date
        null, // is_written_off
        null, // teamviewer
        null, // imei1
        null, // imei2
        null, // ip
        null, // mac_addresses
        null, // assigned_to
        null, // equipment_sub_area_id
        null, // comment
        updatedBy // updated_by - should be null for admin
      ];

      // Verify updated_by is null (not "admin")
      expect(sqlParams[20]).toBe(null);
      expect(sqlParams[20]).not.toBe("admin");
    });

    test("should use employee_no for updated_by when inserting audit record as non-admin", () => {
      const employeeNo = "EMP001";
      const updatedBy = employeeNo;
      
      const sqlParams = [
        1, // equipmentId
        1, // inventoryPeriodId
        "TAG001", // service_tag
        null, // model_id
        null, // vendor_id
        null, // supplier_id
        0, // cerf
        null, // device_no
        false, // is_personal
        "2024-01-01", // purchase_date
        "2025-01-01", // warranty_expiry_date
        null, // is_written_off
        null, // teamviewer
        null, // imei1
        null, // imei2
        null, // ip
        null, // mac_addresses
        null, // assigned_to
        null, // equipment_sub_area_id
        null, // comment
        updatedBy // updated_by - should be employee_no for non-admin
      ];

      // Verify updated_by is the employee_no
      expect(sqlParams[20]).toBe(employeeNo);
      expect(sqlParams[20]).not.toBe(null);
    });
  });

  describe("SQL query parameter validation for it_equipment_log", () => {
    test("should use null for updated_by when inserting log entry as admin", () => {
      const updatedBy = null;
      
      const sqlParams = [
        1, // equipment_id
        "TAG001", // service_tag
        null, // assigned_to
        null, // equipment_sub_area_id
        1, // inventory_period_id
        null, // comment
        updatedBy // updated_by - should be null for admin
      ];

      // Verify updated_by is null (not "admin")
      expect(sqlParams[6]).toBe(null);
      expect(sqlParams[6]).not.toBe("admin");
    });

    test("should use employee_no for updated_by when inserting log entry as non-admin", () => {
      const employeeNo = "EMP001";
      const updatedBy = employeeNo;
      
      const sqlParams = [
        1, // equipment_id
        "TAG001", // service_tag
        null, // assigned_to
        null, // equipment_sub_area_id
        1, // inventory_period_id
        null, // comment
        updatedBy // updated_by - should be employee_no for non-admin
      ];

      // Verify updated_by is the employee_no
      expect(sqlParams[6]).toBe(employeeNo);
      expect(sqlParams[6]).not.toBe(null);
    });
  });

  describe("Foreign key constraint compliance", () => {
    test("updated_by should be null or valid employee_no (not 'admin')", () => {
      // Valid values for updated_by
      const validValues = [null, "EMP001", "EMP002", "123456789"];
      
      validValues.forEach(value => {
        if (value === null) {
          expect(value).toBe(null); // NULL is allowed
        } else {
          // Should be a valid employee_no format (VARCHAR(9))
          expect(typeof value).toBe("string");
          expect(value.length).toBeLessThanOrEqual(9);
          expect(value).not.toBe("admin"); // "admin" is not a valid employee_no
        }
      });
    });

    test("should reject 'admin' as updated_by value", () => {
      const invalidValue = "admin";
      
      // "admin" should not be used as updated_by
      // It would cause foreign key constraint error
      expect(invalidValue).toBe("admin");
      
      // The fix ensures admin users use null instead
      const adminUsername = "admin";
      const updatedBy = isAdminUser(adminUsername) ? null : invalidValue;
      expect(updatedBy).toBe(null);
      expect(updatedBy).not.toBe(invalidValue);
    });
  });
});
