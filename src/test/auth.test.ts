import { describe, test, expect, beforeEach } from "bun:test";
import { MockPool } from "./utils";
import {
  hasItemLoginPermission,
  hasAdminPermission,
  hasPermission,
  hasSearchPermission,
  hasAddEquipmentPermission,
  hasEditEquipmentPermission,
} from "../utils/auth";

describe("Authentication and Permissions", () => {
  let mockPool: MockPool;

  beforeEach(() => {
    mockPool = new MockPool();
  });

  describe("hasItemLoginPermission", () => {
    test("should return true when user has login permission with plant_id = 0", async () => {
      // Mock: user exists and is active
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      // Mock: user has login permission (global, plant_id = 0)
      mockPool.mockQuery(
        `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND permission = 'login'
         AND plant_id = 0
         AND role IN ('user','admin')
       LIMIT 1`,
        [{ rows: [{ id: 1 }] as any }]
      );

      const result = await hasItemLoginPermission("testuser", mockPool as any);
      expect(result).toBe(true);
    });

    test("should return false when user does not exist", async () => {
      // Mock: user does not exist
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [] as any }]
      );

      const result = await hasItemLoginPermission("nonexistent", mockPool as any);
      expect(result).toBe(false);
    });

    test("should return false when user exists but has no login permission", async () => {
      // Mock: user exists and is active
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      // Mock: user has no login permission
      mockPool.mockQuery(
        `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND permission = 'login'
         AND plant_id = 0
         AND role IN ('user','admin')
       LIMIT 1`,
        [{ rows: [] as any }]
      );

      const result = await hasItemLoginPermission("testuser", mockPool as any);
      expect(result).toBe(false);
    });

    test("should return false when user has login permission but with plant_id != 0", async () => {
      // Mock: user exists and is active
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      // Mock: user has login permission but with plant_id = 1 (not global)
      // The query specifically checks for plant_id = 0, so this should return empty
      mockPool.mockQuery(
        `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND permission = 'login'
         AND plant_id = 0
         AND role IN ('user','admin')
       LIMIT 1`,
        [{ rows: [] as any }]
      );

      const result = await hasItemLoginPermission("testuser", mockPool as any);
      expect(result).toBe(false);
    });

    test("should return false when user has login permission but role is not 'user' or 'admin'", async () => {
      // Mock: user exists and is active
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      // Mock: query checks for role IN ('user','admin'), so invalid role won't match
      mockPool.mockQuery(
        `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND permission = 'login'
         AND plant_id = 0
         AND role IN ('user','admin')
       LIMIT 1`,
        [{ rows: [] as any }]
      );

      const result = await hasItemLoginPermission("testuser", mockPool as any);
      expect(result).toBe(false);
    });

    test("should return false on database error", async () => {
      // Mock: database error
      const errorPool = {
        query: async () => {
          throw new Error("Database connection failed");
        },
      };

      const result = await hasItemLoginPermission("testuser", errorPool as any);
      expect(result).toBe(false);
    });
  });

  describe("hasAdminPermission", () => {
    test("should return true when user has admin role", async () => {
      // Mock: user exists and is active
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      // Mock: user has admin role
      mockPool.mockQuery(
        `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND role = 'admin'
       LIMIT 1`,
        [{ rows: [{ id: 1 }] as any }]
      );

      const result = await hasAdminPermission("testuser", mockPool as any);
      expect(result).toBe(true);
    });

    test("should return false when user does not exist", async () => {
      // Mock: user does not exist
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [] as any }]
      );

      const result = await hasAdminPermission("nonexistent", mockPool as any);
      expect(result).toBe(false);
    });

    test("should return false when user exists but has no admin role", async () => {
      // Mock: user exists and is active
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      // Mock: user has no admin role
      mockPool.mockQuery(
        `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND role = 'admin'
       LIMIT 1`,
        [{ rows: [] as any }]
      );

      const result = await hasAdminPermission("testuser", mockPool as any);
      expect(result).toBe(false);
    });

    test("should return false on database error", async () => {
      // Mock: database error
      const errorPool = {
        query: async () => {
          throw new Error("Database connection failed");
        },
      };

      const result = await hasAdminPermission("testuser", errorPool as any);
      expect(result).toBe(false);
    });
  });

  describe("hasPermission", () => {
    test("should return true when user has specific permission with 'user' role", async () => {
      // Mock: user exists
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      // Mock: get user's plant_id
      mockPool.mockQuery(
        "SELECT employee_no FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ employee_no: "12345" }] as any }]
      );

      // Mock: get plant_id from equipment assignment
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
        [{ rows: [{ plant_id: 1 }] as any }]
      );

      // Mock: check for global_admin (should return empty - user doesn't have it)
      mockPool.mockQuery(
        `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = 0
         AND permission = 'global_admin'
         AND role = 'admin'
       LIMIT 1`,
        [{ rows: [] as any }]
      );

      // Mock: user has permission with 'user' role
      mockPool.mockQuery(
        `SELECT id, role FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = ?
         AND permission = ?
         AND role IN (?, ?)`,
        [{ rows: [{ id: 1, role: "user" }] as any }]
      );

      const result = await hasPermission("testuser", mockPool as any, "search", 1, false);
      expect(result).toBe(true);
    });

    test("should return true when user has specific permission with 'admin' role", async () => {
      // Mock: user exists
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      // Mock: get user's plant_id
      mockPool.mockQuery(
        "SELECT employee_no FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ employee_no: "12345" }] as any }]
      );

      // Mock: get plant_id from equipment assignment
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
        [{ rows: [{ plant_id: 1 }] as any }]
      );

      // Mock: check for global_admin (should return empty - user doesn't have it)
      mockPool.mockQuery(
        `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = 0
         AND permission = 'global_admin'
         AND role = 'admin'
       LIMIT 1`,
        [{ rows: [] as any }]
      );

      // Mock: user has permission with 'admin' role
      mockPool.mockQuery(
        `SELECT id, role FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = ?
         AND permission = ?
         AND role IN (?, ?)`,
        [{ rows: [{ id: 1, role: "admin" }] as any }]
      );

      const result = await hasPermission("testuser", mockPool as any, "search", 1, false);
      expect(result).toBe(true);
    });

    test("should return false when user does not have the permission", async () => {
      // Mock: user exists
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      // Mock: get user's plant_id
      mockPool.mockQuery(
        "SELECT employee_no FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ employee_no: "12345" }] as any }]
      );

      // Mock: get plant_id from equipment assignment
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
        [{ rows: [{ plant_id: 1 }] as any }]
      );

      // Mock: check for global_admin (should return empty)
      mockPool.mockQuery(
        `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = 0
         AND permission = 'global_admin'
         AND role = 'admin'
       LIMIT 1`,
        [{ rows: [] as any }]
      );

      // Mock: user has no permission
      mockPool.mockQuery(
        `SELECT id, role FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = ?
         AND permission = ?
         AND role IN (?, ?)`,
        [{ rows: [] as any }]
      );

      const result = await hasPermission("testuser", mockPool as any, "search", 1, false);
      expect(result).toBe(false);
    });

    test("should return true when requireAdmin is true and user has admin role", async () => {
      // Mock: user exists
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      // Mock: get user's plant_id
      mockPool.mockQuery(
        "SELECT employee_no FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ employee_no: "12345" }] as any }]
      );

      // Mock: get plant_id from equipment assignment
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
        [{ rows: [{ plant_id: 1 }] as any }]
      );

      // Mock: check for global_admin (should return empty)
      mockPool.mockQuery(
        `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = 0
         AND permission = 'global_admin'
         AND role = 'admin'
       LIMIT 1`,
        [{ rows: [] as any }]
      );

      // Mock: user has permission with 'admin' role
      mockPool.mockQuery(
        `SELECT id, role FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = ?
         AND permission = ?
         AND role IN (?, ?)
       LIMIT 1`,
        [{ rows: [{ id: 1, role: "admin" }] as any }]
      );

      const result = await hasPermission("testuser", mockPool as any, "search", 1, true);
      expect(result).toBe(true);
    });

    test("should return false when requireAdmin is true but user only has 'user' role", async () => {
      // Mock: user exists
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      // Mock: get user's plant_id
      mockPool.mockQuery(
        "SELECT employee_no FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ employee_no: "12345" }] as any }]
      );

      // Mock: get plant_id from equipment assignment
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
        [{ rows: [{ plant_id: 1 }] as any }]
      );

      // Mock: user has permission with 'user' role (not admin)
      mockPool.mockQuery(
        `SELECT id, role FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = ?
         AND permission = ?
         AND role IN (?, ?)
       LIMIT 1`,
        [{ rows: [{ id: 1, role: "user" }] as any }]
      );

      const result = await hasPermission("testuser", mockPool as any, "search", 1, true);
      expect(result).toBe(false);
    });
  });

  describe("hasSearchPermission", () => {
    test("should return true when user is admin", async () => {
      // Mock: user is admin
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      mockPool.mockQuery(
        `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND role = 'admin'
       LIMIT 1`,
        [{ rows: [{ id: 1 }] as any }]
      );

      const result = await hasSearchPermission("testuser", mockPool as any);
      expect(result).toBe(true);
    });

    test("should return true when user has search permission", async () => {
      // Mock: user is not admin
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      mockPool.mockQuery(
        `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND role = 'admin'
       LIMIT 1`,
        [{ rows: [] as any }]
      );

      // Mock: get user's plant_id
      mockPool.mockQuery(
        "SELECT employee_no FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ employee_no: "12345" }] as any }]
      );

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
        [{ rows: [{ plant_id: 1 }] as any }]
      );

      // Mock: check for global_admin (should return empty)
      mockPool.mockQuery(
        `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = 0
         AND permission = 'global_admin'
         AND role = 'admin'
       LIMIT 1`,
        [{ rows: [] as any }]
      );

      // Mock: user has search permission
      mockPool.mockQuery(
        `SELECT id, role FROM it_user_permissions
       WHERE user_id = ?
         AND plant_id = ?
         AND permission = ?
         AND role IN (?, ?)`,
        [{ rows: [{ id: 1, role: "user" }] as any }]
      );

      const result = await hasSearchPermission("testuser", mockPool as any);
      expect(result).toBe(true);
    });
  });

  describe("hasAddEquipmentPermission", () => {
    test("should return true when user is admin", async () => {
      // Mock: user is admin
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      mockPool.mockQuery(
        `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND role = 'admin'
       LIMIT 1`,
        [{ rows: [{ id: 1 }] as any }]
      );

      const result = await hasAddEquipmentPermission("testuser", mockPool as any);
      expect(result).toBe(true);
    });
  });

  describe("hasEditEquipmentPermission", () => {
    test("should return true when user is admin", async () => {
      // Mock: user is admin
      mockPool.mockQuery(
        "SELECT user_id FROM `it_employees_list` WHERE `user_id` = ? AND `status` = 1",
        [{ rows: [{ user_id: "testuser" }] as any }]
      );

      mockPool.mockQuery(
        `SELECT id FROM it_user_permissions
       WHERE user_id = ?
         AND role = 'admin'
       LIMIT 1`,
        [{ rows: [{ id: 1 }] as any }]
      );

      const result = await hasEditEquipmentPermission("testuser", mockPool as any);
      expect(result).toBe(true);
    });
  });
});

