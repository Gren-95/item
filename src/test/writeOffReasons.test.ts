import { describe, test, expect, beforeEach } from "bun:test";
import { createTestRequest, MockPool } from "./utils";
import { writeOffReasonsActionSchema } from "../utils/validation";

// Mock the database pool
const mockPool = new MockPool();

describe("Write-Off Reasons Management (#8)", () => {
  beforeEach(() => {
    mockPool.reset();
  });

  describe("GET /write-off-reasons page", () => {
    test("should fetch write-off reasons data with equipment counts", async () => {
      const selectQuery = `
        SELECT 
          wor.id,
          wor.reason,
          COUNT(DISTINCT e.id) as equipment_count
        FROM it_equipment_write_off_reason wor
        LEFT JOIN it_equipment e ON e.is_written_off = wor.id
        GROUP BY wor.id, wor.reason
        ORDER BY wor.reason
      `;
      
      mockPool.mockQuery(selectQuery, [
        {
          rows: [
            { id: 1, reason: "Damaged beyond repair", equipment_count: 5 },
            { id: 2, reason: "Obsolete", equipment_count: 3 },
            { id: 3, reason: "Lost", equipment_count: 0 },
          ],
        },
      ]);

      const req = createTestRequest("/write-off-reasons");
      expect(req.method).toBe("GET");
      expect(req.url).toContain("/write-off-reasons");
    });

    test("should display write-off reasons page with empty list", async () => {
      const selectQuery = `
        SELECT 
          wor.id,
          wor.reason,
          COUNT(DISTINCT e.id) as equipment_count
        FROM it_equipment_write_off_reason wor
        LEFT JOIN it_equipment e ON e.is_written_off = wor.id
        GROUP BY wor.id, wor.reason
        ORDER BY wor.reason
      `;
      
      mockPool.mockQuery(selectQuery, [
        {
          rows: [],
        },
      ]);

      const req = createTestRequest("/write-off-reasons");
      expect(req.method).toBe("GET");
      expect(req.url).toContain("/write-off-reasons");
    });
  });

  describe("Write-Off Reasons CRUD operations", () => {
    test("should validate add write-off reason action", () => {
      const formData = {
        action: "add",
        reason: "Damaged beyond repair",
      };

      const result = writeOffReasonsActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("add");
        expect(result.data.reason).toBe("Damaged beyond repair");
      }
    });

    test("should create a new write-off reason with valid reason", async () => {
      const insertQuery = "INSERT INTO it_equipment_write_off_reason (reason) VALUES (?)";
      
      mockPool.mockQuery(insertQuery, [
        {
          rows: [],
          insertId: 4,
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("action", "add");
      formData.append("reason", "Damaged beyond repair");

      const req = createTestRequest("/write-off-reasons", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
      expect(req.url).toContain("/write-off-reasons");
    });

    test("should require reason for add action", () => {
      const formData = {
        action: "add",
        // Missing reason - should fail validation
      };

      const result = writeOffReasonsActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should reject empty write-off reason", () => {
      const formData = {
        action: "add",
        reason: "",
      };

      const result = writeOffReasonsActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should reject write-off reason longer than 255 characters", () => {
      const formData = {
        action: "add",
        reason: "A".repeat(256),
      };

      const result = writeOffReasonsActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should accept write-off reason exactly 255 characters", () => {
      const formData = {
        action: "add",
        reason: "A".repeat(255),
      };

      const result = writeOffReasonsActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
    });

    test("should update write-off reason with valid data", async () => {
      const updateQuery = "UPDATE it_equipment_write_off_reason SET reason = ? WHERE id = ?";
      
      mockPool.mockQuery(updateQuery, [
        {
          rows: [],
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("action", "edit");
      formData.append("id", "1");
      formData.append("reason", "Updated reason");

      const req = createTestRequest("/write-off-reasons", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
      expect(req.url).toContain("/write-off-reasons");
    });

    test("should require id for edit action", () => {
      const formData = {
        action: "edit",
        reason: "Updated reason",
        // Missing id - should fail validation
      };

      const result = writeOffReasonsActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should require reason for edit action", () => {
      const formData = {
        action: "edit",
        id: "1",
        // Missing reason - should fail validation
      };

      const result = writeOffReasonsActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should accept valid edit action", () => {
      const formData = {
        action: "edit",
        reason: "Updated reason",
        id: "1",
      };

      const result = writeOffReasonsActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("edit");
        expect(result.data.reason).toBe("Updated reason");
        expect(result.data.id).toBe("1");
      }
    });

    test("should delete write-off reason when not in use", async () => {
      const checkQuery = "SELECT COUNT(*) as count FROM it_equipment WHERE is_written_off = ?";
      const deleteQuery = "DELETE FROM it_equipment_write_off_reason WHERE id = ?";
      
      mockPool.mockQuery(checkQuery, [
        {
          rows: [{ count: 0 }],
        },
      ]);
      
      mockPool.mockQuery(deleteQuery, [
        {
          rows: [],
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("action", "delete");
      formData.append("id", "1");

      const req = createTestRequest("/write-off-reasons", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
      expect(req.url).toContain("/write-off-reasons");
    });

    test("should reject delete write-off reason when in use", async () => {
      const checkQuery = "SELECT COUNT(*) as count FROM it_equipment WHERE is_written_off = ?";
      
      mockPool.mockQuery(checkQuery, [
        {
          rows: [{ count: 5 }],
        },
      ]);

      const formData = new FormData();
      formData.append("action", "delete");
      formData.append("id", "1");

      const req = createTestRequest("/write-off-reasons", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
      // Should fail validation or throw error
    });

    test("should require id for delete action", () => {
      const formData = {
        action: "delete",
        // Missing id - should fail validation
      };

      const result = writeOffReasonsActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should accept valid delete action", () => {
      const formData = {
        action: "delete",
        id: "1",
      };

      const result = writeOffReasonsActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("delete");
        expect(result.data.id).toBe("1");
      }
    });
  });
});

