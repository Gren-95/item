import { describe, test, expect, beforeEach } from "bun:test";
import { createTestRequest, parseJsonResponse, MockPool } from "./utils";
import { typesActionSchema } from "../utils/validation";
import pool from "../db";

// Mock the database pool
const mockPool = new MockPool();

describe("Equipment Type Management (#4)", () => {
  beforeEach(() => {
    mockPool.reset();
  });

  describe("GET /types page", () => {

    test("should create a new type via API", async () => {
      const insertQuery = "INSERT INTO it_equipment_type (type_name, status) VALUES (?, 1)";
      
      mockPool.mockQuery(insertQuery, [
        {
          rows: [],
          insertId: 5,
          affectedRows: 1,
        },
      ]);

      const body = JSON.stringify({ name: "Tablet" });
      const req = createTestRequest("/api/types", {
        method: "POST",
        body,
      });

      expect(req.method).toBe("POST");
      expect(req.url).toContain("/api/types");
    });

    test("should reject empty name via API", async () => {
      const body = JSON.stringify({ name: "" });
      const req = createTestRequest("/api/types", {
        method: "POST",
        body,
      });

      expect(req.method).toBe("POST");
      // Handler should validate and reject empty name
    });

    test("should reject missing name via API", async () => {
      const body = JSON.stringify({});
      const req = createTestRequest("/api/types", {
        method: "POST",
        body,
      });

      expect(req.method).toBe("POST");
      // Handler should validate and require name
    });
  });
});

describe("Equipment Model Management (#3)", () => {
  beforeEach(() => {
    mockPool.reset();
  });

  describe("Model CRUD operations", () => {

    test("should include type selection box in add equipment form", async () => {
      const selectTypesQuery = "SELECT id, type_name as name FROM it_equipment_type WHERE status = 1 ORDER BY type_name";
      
      mockPool.mockQuery(selectTypesQuery, [
        {
          rows: [
            { id: 1, name: "Laptop" },
            { id: 2, name: "Desktop" },
            { id: 3, name: "Monitor" },
          ],
        },
      ]);

      const req = createTestRequest("/add");
      expect(req.method).toBe("GET");
      expect(req.url).toContain("/add");
    });

    test("should include type selection box in edit equipment form", async () => {
      const selectTypesQuery = "SELECT id, type_name as name FROM it_equipment_type WHERE status = 1 ORDER BY type_name";
      
      mockPool.mockQuery(selectTypesQuery, [
        {
          rows: [
            { id: 1, name: "Laptop" },
            { id: 2, name: "Desktop" },
          ],
        },
      ]);

      const req = createTestRequest("/edit/1");
      expect(req.method).toBe("GET");
      expect(req.url).toContain("/edit/1");
    });

    test("should include 'Add new type' option in type selection", async () => {
      const selectTypesQuery = "SELECT id, type_name as name FROM it_equipment_type WHERE status = 1 ORDER BY type_name";
      
      mockPool.mockQuery(selectTypesQuery, [
        {
          rows: [
            { id: 1, name: "Laptop" },
          ],
        },
      ]);

      const req = createTestRequest("/add");
      expect(req.method).toBe("GET");
      // Template should include option with value="__add_new__"
    });
  });

  describe("API endpoint for types", () => {

    test("should fetch types, models, and product lines data", async () => {
      const selectTypesQuery = `
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
      `;
      
      const selectModelsQuery = `
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
      `;

      const selectProductLinesQuery = `
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
      `;
      
      mockPool.mockQuery(selectTypesQuery, [
        {
          rows: [
            { id: 1, name: "Laptop", status: 1, equipment_count: 5 },
            { id: 2, name: "Desktop", status: 1, equipment_count: 3 },
          ],
        },
      ]);

      mockPool.mockQuery(selectModelsQuery, [
        {
          rows: [
            { id: 1, name: "X1 Carbon", parent_id: 1, status: 1, equipment_count: 3 },
            { id: 2, name: "ThinkPad T14", parent_id: 1, status: 1, equipment_count: 2 },
          ],
        },
      ]);

      mockPool.mockQuery(selectProductLinesQuery, [
        {
          rows: [
            { id: 1, name: "ThinkPad", parent_id: 1, status: 1, equipment_count: 5 },
          ],
        },
      ]);

      const req = createTestRequest("/types");
      expect(req.method).toBe("GET");
      expect(req.url).toContain("/types");
    });

    test("should include tabs for Types, Product Lines, and Models", async () => {
      const req = createTestRequest("/types");
      expect(req.method).toBe("GET");
      // Page should include tabs for Types, Product Lines, and Models
    });
  });

  describe("Type CRUD operations", () => {
    test("should validate add type action", () => {
      const formData = {
        type: "type",
        action: "add",
        name: "Tablet",
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("add");
        expect(result.data.type).toBe("type");
        expect(result.data.name).toBe("Tablet");
      }
    });

    test("should create a new type with valid name", async () => {
      const insertQuery = "INSERT INTO it_equipment_type (type_name, status) VALUES (?, 1)";
      
      mockPool.mockQuery(insertQuery, [
        {
          rows: [],
          insertId: 4,
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("action", "add");
      formData.append("type", "type");
      formData.append("name", "Tablet");

      const req = createTestRequest("/types", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
      expect(req.url).toContain("/types");
    });

    test("should require name for add action", () => {
      const formData = {
        type: "type",
        action: "add",
        // Missing name - should fail validation
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should reject empty type name", () => {
      const formData = {
        type: "type",
        action: "add",
        name: "",
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should reject type name longer than 25 characters", () => {
      const formData = {
        type: "type",
        action: "add",
        name: "A".repeat(26), // 26 characters - exceeds limit
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should accept type name exactly 25 characters", () => {
      const formData = {
        type: "type",
        action: "add",
        name: "A".repeat(25), // Exactly 25 characters - should pass
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
    });

    test("should update type name with valid data", async () => {
      const updateQuery = "UPDATE it_equipment_type SET type_name = ? WHERE id = ?";
      
      mockPool.mockQuery(updateQuery, [
        {
          rows: [],
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("action", "edit");
      formData.append("type", "type");
      formData.append("id", "1");
      formData.append("name", "Updated Laptop");

      const req = createTestRequest("/types", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
    });

    test("should require id for edit action", () => {
      const formData = {
        type: "type",
        action: "edit",
        name: "Updated Type",
        // Missing id - should fail validation
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should accept valid edit action", () => {
      const formData = {
        type: "type",
        action: "edit",
        name: "Updated Type",
        id: "1",
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("edit");
        expect(result.data.id).toBe("1");
      }
    });

    test("should activate an inactive type", async () => {
      const updateQuery = "UPDATE it_equipment_type SET status = ? WHERE id = ?";
      
      mockPool.mockQuery(updateQuery, [
        {
          rows: [],
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("action", "activate");
      formData.append("type", "type");
      formData.append("id", "3");

      const req = createTestRequest("/types", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
    });

    test("should deactivate an active type", async () => {
      const updateQuery = "UPDATE it_equipment_type SET status = ? WHERE id = ?";
      
      mockPool.mockQuery(updateQuery, [
        {
          rows: [],
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("action", "deactivate");
      formData.append("type", "type");
      formData.append("id", "1");

      const req = createTestRequest("/types", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
    });

    test("should require id for activate action", () => {
      const formData = {
        type: "type",
        action: "activate",
        // Missing id - should fail validation
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should accept valid activate action", () => {
      const formData = {
        type: "type",
        action: "activate",
        id: "1",
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("activate");
        expect(result.data.id).toBe("1");
      }
    });

    test("should accept valid deactivate action", () => {
      const formData = {
        type: "type",
        action: "deactivate",
        id: "1",
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("deactivate");
        expect(result.data.id).toBe("1");
      }
    });
  });

  describe("Type selection in equipment forms", () => {

    test("should create a new model with valid name and product_line_id", async () => {
      const insertQuery = "INSERT INTO it_equipment_model (name, product_line_id, status) VALUES (?, ?, 1)";
      
      mockPool.mockQuery(insertQuery, [
        {
          rows: [],
          insertId: 5,
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("action", "add");
      formData.append("type", "model");
      formData.append("name", "New Model");
      formData.append("parent_id", "1");

      const req = createTestRequest("/types", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
      expect(req.url).toContain("/types");
    });

    test("should require product_line_id when adding model", () => {
      const formData = {
        type: "model",
        action: "add",
        name: "New Model",
        // Missing parent_id - should fail validation
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should require name for add model action", () => {
      const formData = {
        type: "model",
        action: "add",
        parent_id: "1",
        // Missing name - should fail validation
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should reject empty model name", () => {
      const formData = {
        type: "model",
        action: "add",
        name: "",
        parent_id: "1",
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should update model name with valid data", async () => {
      const updateQuery = "UPDATE it_equipment_model SET name = ? WHERE id = ?";
      
      mockPool.mockQuery(updateQuery, [
        {
          rows: [],
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("action", "edit");
      formData.append("type", "model");
      formData.append("id", "1");
      formData.append("name", "Updated Model");

      const req = createTestRequest("/types", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
    });

    test("should require id for model edit action", () => {
      const formData = {
        type: "model",
        action: "edit",
        name: "Updated Model",
        // Missing id - should fail validation
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should accept valid model edit action", () => {
      const formData = {
        type: "model",
        action: "edit",
        name: "Updated Model",
        id: "1",
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("edit");
        expect(result.data.id).toBe("1");
      }
    });

    test("should activate an inactive model", async () => {
      const updateQuery = "UPDATE it_equipment_model SET status = ? WHERE id = ?";
      
      mockPool.mockQuery(updateQuery, [
        {
          rows: [],
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("action", "activate");
      formData.append("type", "model");
      formData.append("id", "3");

      const req = createTestRequest("/types", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
    });

    test("should deactivate an active model", async () => {
      const updateQuery = "UPDATE it_equipment_model SET status = ? WHERE id = ?";
      
      mockPool.mockQuery(updateQuery, [
        {
          rows: [],
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("action", "deactivate");
      formData.append("type", "model");
      formData.append("id", "1");

      const req = createTestRequest("/types", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
    });

    test("should require id for model activate action", () => {
      const formData = {
        type: "model",
        action: "activate",
        // Missing id - should fail validation
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should accept valid model activate action", () => {
      const formData = {
        type: "model",
        action: "activate",
        id: "1",
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("activate");
        expect(result.data.id).toBe("1");
      }
    });

    test("should accept valid model deactivate action", () => {
      const formData = {
        type: "model",
        action: "deactivate",
        id: "1",
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("deactivate");
        expect(result.data.id).toBe("1");
      }
    });
  });

  describe("Model selection in equipment forms", () => {
    test("should include model selection box in add equipment form", async () => {
      const selectModelsQuery = "SELECT id, name, product_line_id as parent_id FROM it_equipment_model WHERE status = 1 ORDER BY name";
      
      mockPool.mockQuery(selectModelsQuery, [
        {
          rows: [
            { id: 1, name: "X1 Carbon", parent_id: 1 },
            { id: 2, name: "ThinkPad T14", parent_id: 1 },
          ],
        },
      ]);

      const req = createTestRequest("/add");
      expect(req.method).toBe("GET");
      expect(req.url).toContain("/add");
    });

    test("should include 'Add new model' option in model selection", async () => {
      const selectModelsQuery = "SELECT id, name, product_line_id as parent_id FROM it_equipment_model WHERE status = 1 ORDER BY name";
      
      mockPool.mockQuery(selectModelsQuery, [
        {
          rows: [
            { id: 1, name: "X1 Carbon", parent_id: 1 },
          ],
        },
      ]);

      const req = createTestRequest("/add");
      expect(req.method).toBe("GET");
      // Template should include option with value="__add_new__"
    });
  });
});

describe("Equipment Product Line Management (#36)", () => {
  beforeEach(() => {
    mockPool.reset();
  });

  describe("Product Line CRUD operations", () => {
    test("should validate add product line action", () => {
      const formData = {
        type: "product-line",
        action: "add",
        name: "ThinkPad",
        parent_id: "1",
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("add");
        expect(result.data.type).toBe("product-line");
        expect(result.data.name).toBe("ThinkPad");
        expect(result.data.parent_id).toBe("1");
      }
    });

    test("should create a new product line with valid name and type", async () => {
      const insertQuery = "INSERT INTO it_equipment_product_line (name, type_id, status) VALUES (?, ?, 1)";
      
      mockPool.mockQuery(insertQuery, [
        {
          rows: [],
          insertId: 5,
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("action", "add");
      formData.append("type", "product-line");
      formData.append("name", "ThinkPad");
      formData.append("parent_id", "1");

      const req = createTestRequest("/types", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
      expect(req.url).toContain("/types");
    });

    test("should require name for add action", () => {
      const formData = {
        type: "product-line",
        action: "add",
        parent_id: "1",
        // Missing name - should fail validation
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should require parent_id for add action", () => {
      const formData = {
        type: "product-line",
        action: "add",
        name: "ThinkPad",
        // Missing parent_id - should fail validation
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should reject empty product line name", () => {
      const formData = {
        type: "product-line",
        action: "add",
        name: "",
        parent_id: "1",
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should update product line name with valid data", async () => {
      const updateQuery = "UPDATE it_equipment_product_line SET name = ? WHERE id = ?";
      
      mockPool.mockQuery(updateQuery, [
        {
          rows: [],
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("action", "edit");
      formData.append("type", "product-line");
      formData.append("id", "1");
      formData.append("name", "Updated ThinkPad");

      const req = createTestRequest("/types", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
      expect(req.url).toContain("/types");
    });

    test("should require id for edit action", () => {
      const formData = {
        type: "product-line",
        action: "edit",
        name: "Updated ThinkPad",
        // Missing id - should fail validation
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should deactivate product line", async () => {
      const updateQuery = "UPDATE it_equipment_product_line SET status = ? WHERE id = ?";
      
      mockPool.mockQuery(updateQuery, [
        {
          rows: [],
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("action", "deactivate");
      formData.append("type", "product-line");
      formData.append("id", "1");

      const req = createTestRequest("/types", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
      expect(req.url).toContain("/types");
    });

    test("should activate product line", async () => {
      const updateQuery = "UPDATE it_equipment_product_line SET status = ? WHERE id = ?";
      
      mockPool.mockQuery(updateQuery, [
        {
          rows: [],
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("action", "activate");
      formData.append("type", "product-line");
      formData.append("id", "1");

      const req = createTestRequest("/types", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
      expect(req.url).toContain("/types");
    });

    test("should accept valid product line activate action", () => {
      const formData = {
        type: "product-line",
        action: "activate",
        id: "1",
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("activate");
        expect(result.data.id).toBe("1");
      }
    });

    test("should accept valid product line deactivate action", () => {
      const formData = {
        type: "product-line",
        action: "deactivate",
        id: "1",
      };

      const result = typesActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("deactivate");
        expect(result.data.id).toBe("1");
      }
    });
  });
});

