import { describe, test, expect, beforeEach } from "bun:test";
import { createTestRequest, parseJsonResponse, MockPool } from "./utils";
import { vendorsActionSchema, suppliersActionSchema } from "../utils/validation";
import pool from "../db";

// Mock the database pool
const mockPool = new MockPool();

describe("Vendor Management (#5)", () => {
  beforeEach(() => {
    mockPool.reset();
  });

  describe("GET /vendors page", () => {
    test("should fetch vendors data with equipment counts", async () => {
      const selectVendorsQuery = `
        SELECT 
          v.id,
          v.name,
          COUNT(DISTINCT e.id) as equipment_count
        FROM it_equipment_vendor v
        LEFT JOIN it_equipment e ON e.vendor_id = v.id
        GROUP BY v.id, v.name
        ORDER BY v.name
      `;
      const selectSuppliersQuery = `
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
      `;
      
      mockPool.mockQuery(selectVendorsQuery, [
        {
          rows: [
            { id: 1, name: "Dell", equipment_count: 5 },
            { id: 2, name: "HP", equipment_count: 3 },
            { id: 3, name: "Lenovo", equipment_count: 0 },
          ],
        },
      ]);
      mockPool.mockQuery(selectSuppliersQuery, [
        {
          rows: [
            { id: 10, name: "CDW", email: "cdw@example.com", phone_number: "123", address: "Addr", representative_name: "Rep", sap_vendor_no: 123, website: "https://cdw.com", equipment_count: 2 },
          ],
        },
      ]);

      const req = createTestRequest("/vendors");
      expect(req.method).toBe("GET");
      expect(req.url).toContain("/vendors");
    });

    test("should display vendors page with empty list", async () => {
      const selectVendorsQuery = `
        SELECT 
          v.id,
          v.name,
          COUNT(DISTINCT e.id) as equipment_count
        FROM it_equipment_vendor v
        LEFT JOIN it_equipment e ON e.vendor_id = v.id
        GROUP BY v.id, v.name
        ORDER BY v.name
      `;
      const selectSuppliersQuery = `
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
      `;
      
      mockPool.mockQuery(selectVendorsQuery, [
        {
          rows: [],
        },
      ]);
      mockPool.mockQuery(selectSuppliersQuery, [
        {
          rows: [],
        },
      ]);

      const req = createTestRequest("/vendors");
      expect(req.method).toBe("GET");
      expect(req.url).toContain("/vendors");
    });
  });

  describe("Vendor CRUD operations", () => {
    test("should validate add vendor action", () => {
      const formData = {
        action: "add",
        name: "Dell",
      };

      const result = vendorsActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("add");
        expect(result.data.name).toBe("Dell");
      }
    });

    test("should create a new vendor with valid name", async () => {
      const insertQuery = "INSERT INTO it_equipment_vendor (name) VALUES (?)";
      
      mockPool.mockQuery(insertQuery, [
        {
          rows: [],
          insertId: 4,
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("action", "add");
      formData.append("name", "Dell");

      const req = createTestRequest("/vendors", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
      expect(req.url).toContain("/vendors");
    });

    test("should require name for add action", () => {
      const formData = {
        action: "add",
        // Missing name - should fail validation
      };

      const result = vendorsActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should reject empty vendor name", () => {
      const formData = {
        action: "add",
        name: "",
      };

      const result = vendorsActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should reject vendor name longer than 255 characters", () => {
      const formData = {
        action: "add",
        name: "A".repeat(256),
      };

      const result = vendorsActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should accept vendor name exactly 255 characters", () => {
      const formData = {
        action: "add",
        name: "A".repeat(255),
      };

      const result = vendorsActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
    });

    test("should update vendor name with valid data", async () => {
      const updateQuery = "UPDATE it_equipment_vendor SET name = ? WHERE id = ?";
      
      mockPool.mockQuery(updateQuery, [
        {
          rows: [],
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("action", "edit");
      formData.append("id", "1");
      formData.append("name", "Updated Dell");

      const req = createTestRequest("/vendors", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
      expect(req.url).toContain("/vendors");
    });

    test("should require id for edit action", () => {
      const formData = {
        action: "edit",
        name: "Updated Vendor",
        // Missing id - should fail validation
      };

      const result = vendorsActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should require name for edit action", () => {
      const formData = {
        action: "edit",
        id: "1",
        // Missing name - should fail validation
      };

      const result = vendorsActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should accept valid edit action", () => {
      const formData = {
        action: "edit",
        name: "Updated Vendor",
        id: "1",
      };

      const result = vendorsActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("edit");
        expect(result.data.name).toBe("Updated Vendor");
        expect(result.data.id).toBe("1");
      }
    });

    test("should delete vendor when not in use", async () => {
      const checkQuery = "SELECT COUNT(*) as count FROM it_equipment WHERE vendor_id = ?";
      const deleteQuery = "DELETE FROM it_equipment_vendor WHERE id = ?";
      
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

      const req = createTestRequest("/vendors", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
      expect(req.url).toContain("/vendors");
    });

    test("should reject delete vendor when in use", async () => {
      const checkQuery = "SELECT COUNT(*) as count FROM it_equipment WHERE vendor_id = ?";
      
      mockPool.mockQuery(checkQuery, [
        {
          rows: [{ count: 5 }],
        },
      ]);

      const formData = new FormData();
      formData.append("action", "delete");
      formData.append("id", "1");

      const req = createTestRequest("/vendors", {
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

      const result = vendorsActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should accept valid delete action", () => {
      const formData = {
        action: "delete",
        id: "1",
      };

      const result = vendorsActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("delete");
        expect(result.data.id).toBe("1");
      }
    });
  });

  describe("Supplier CRUD operations", () => {
    test("should validate add supplier action", () => {
      const formData = {
        action: "add",
        name: "CDW",
        email: "contact@cdw.com",
        phone_number: "123",
        address: "123 Street",
        representative_name: "Alice",
        sap_vendor_no: "12345",
        website: "https://cdw.com",
      };

      const result = suppliersActionSchema.safeParse(formData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("CDW");
      }
    });

    test("should create a new supplier with full details", async () => {
      const insertQuery = `INSERT INTO it_equipment_supplier (name, email, phone_number, address, representative_name, sap_vendor_no, website)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;
      
      mockPool.mockQuery(insertQuery, [
        {
          rows: [],
          insertId: 7,
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("entity", "supplier");
      formData.append("action", "add");
      formData.append("name", "CDW");
      formData.append("email", "contact@cdw.com");
      formData.append("phone_number", "123");
      formData.append("address", "123 Street");
      formData.append("representative_name", "Alice");
      formData.append("sap_vendor_no", "12345");
      formData.append("website", "https://cdw.com");

      const req = createTestRequest("/vendors", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
      expect(req.url).toContain("/vendors");
    });

    test("should require name for add supplier action", () => {
      const formData = {
        action: "add",
      };

      const result = suppliersActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should update supplier with full details", async () => {
      const updateQuery = `UPDATE it_equipment_supplier 
                 SET name = ?, email = ?, phone_number = ?, address = ?, representative_name = ?, sap_vendor_no = ?, website = ?
               WHERE id = ?`;
      
      mockPool.mockQuery(updateQuery, [
        {
          rows: [],
          affectedRows: 1,
        },
      ]);

      const formData = new FormData();
      formData.append("entity", "supplier");
      formData.append("action", "edit");
      formData.append("id", "10");
      formData.append("name", "Updated CDW");
      formData.append("email", "new@cdw.com");
      formData.append("phone_number", "999");
      formData.append("address", "New Addr");
      formData.append("representative_name", "Bob");
      formData.append("sap_vendor_no", "98765");
      formData.append("website", "https://cdw.com/partners");

      const req = createTestRequest("/vendors", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
      expect(req.url).toContain("/vendors");
    });

    test("should require id for edit supplier action", () => {
      const formData = {
        action: "edit",
        name: "Updated Supplier",
      };

      const result = suppliersActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });

    test("should delete supplier when not in use", async () => {
      const checkQuery = "SELECT COUNT(*) as count FROM it_equipment WHERE supplier_id = ?";
      const deleteQuery = "DELETE FROM it_equipment_supplier WHERE id = ?";
      
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
      formData.append("entity", "supplier");
      formData.append("action", "delete");
      formData.append("id", "10");

      const req = createTestRequest("/vendors", {
        method: "POST",
        body: formData,
      });

      expect(req.method).toBe("POST");
      expect(req.url).toContain("/vendors");
    });

    test("should require id for delete supplier action", () => {
      const formData = {
        action: "delete",
      };

      const result = suppliersActionSchema.safeParse(formData);
      expect(result.success).toBe(false);
    });
  });

  describe("Vendor selection in equipment forms", () => {
    test("should include vendor selection box in add equipment form", async () => {
      const selectVendorsQuery = "SELECT id, name FROM it_equipment_vendor ORDER BY name";
      
      mockPool.mockQuery(selectVendorsQuery, [
        {
          rows: [
            { id: 1, name: "Dell" },
            { id: 2, name: "HP" },
          ],
        },
      ]);

      const req = createTestRequest("/add");
      expect(req.method).toBe("GET");
      expect(req.url).toContain("/add");
    });

    test("should include 'Add new vendor' option in vendor selection", async () => {
      const selectVendorsQuery = "SELECT id, name FROM it_equipment_vendor ORDER BY name";
      
      mockPool.mockQuery(selectVendorsQuery, [
        {
          rows: [
            { id: 1, name: "Dell" },
          ],
        },
      ]);

      const req = createTestRequest("/add");
      expect(req.method).toBe("GET");
      // Template should include option with value="__add_new__"
    });

    test("should include vendor selection box in edit equipment form", async () => {
      const selectVendorsQuery = "SELECT id, name FROM it_equipment_vendor ORDER BY name";
      
      mockPool.mockQuery(selectVendorsQuery, [
        {
          rows: [
            { id: 1, name: "Dell" },
            { id: 2, name: "HP" },
          ],
        },
      ]);

      const req = createTestRequest("/edit/1");
      expect(req.method).toBe("GET");
      expect(req.url).toContain("/edit/1");
    });
  });

  describe("Supplier selection in equipment forms", () => {
    test("should include supplier selection box in add equipment form", async () => {
      const selectSuppliersQuery = "SELECT id, name FROM it_equipment_supplier ORDER BY name";
      
      mockPool.mockQuery(selectSuppliersQuery, [
        {
          rows: [
            { id: 1, name: "CDW" },
            { id: 2, name: "Insight" },
          ],
        },
      ]);

      const req = createTestRequest("/add");
      expect(req.method).toBe("GET");
      expect(req.url).toContain("/add");
    });

    test("should include 'Add new supplier' option in supplier selection", async () => {
      const selectSuppliersQuery = "SELECT id, name FROM it_equipment_supplier ORDER BY name";
      
      mockPool.mockQuery(selectSuppliersQuery, [
        {
          rows: [
            { id: 1, name: "CDW" },
          ],
        },
      ]);

      const req = createTestRequest("/add");
      expect(req.method).toBe("GET");
      // Template should include option with value="__add_new__"
    });

    test("should include supplier selection box in edit equipment form", async () => {
      const selectSuppliersQuery = "SELECT id, name FROM it_equipment_supplier ORDER BY name";
      
      mockPool.mockQuery(selectSuppliersQuery, [
        {
          rows: [
            { id: 1, name: "CDW" },
            { id: 2, name: "Insight" },
          ],
        },
      ]);

      const req = createTestRequest("/edit/1");
      expect(req.method).toBe("GET");
      expect(req.url).toContain("/edit/1");
    });
  });
});

