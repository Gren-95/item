import { describe, test, expect } from "bun:test";
import {
  equipmentAddSchema,
  equipmentEditSchema,
  apiAddItemSchema,
  locationsActionSchema,
  printLabelSchema,
  serviceTagSchema,
} from "../utils/validation";

describe("Input Validation", () => {
  describe("Service Tag Validation", () => {
    test("should accept valid service tag", () => {
      const result = serviceTagSchema.safeParse("ABC123");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("ABC123");
      }
    });

    test("should reject empty service tag", () => {
      const result = serviceTagSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    test("should reject service tag longer than 30 characters", () => {
      const longTag = "A".repeat(31);
      const result = serviceTagSchema.safeParse(longTag);
      expect(result.success).toBe(false);
    });
  });

  describe("Equipment Add Schema", () => {
    test("should accept valid equipment data", () => {
      const data = {
        service_tag: "TEST123",
        purchase_date: "2024-01-01",
        warranty_expiry_date: "2025-01-01",
        vendor_id: "1",
        supplier_id: "2",
      };

      const result = equipmentAddSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("should require service_tag", () => {
      const data = {
        purchase_date: "2024-01-01",
        warranty_expiry_date: "2025-01-01",
      };

      const result = equipmentAddSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should require purchase_date", () => {
      const data = {
        service_tag: "TEST123",
        warranty_expiry_date: "2025-01-01",
      };

      const result = equipmentAddSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should validate IP address format", () => {
      const data = {
        service_tag: "TEST123",
        purchase_date: "2024-01-01",
        warranty_expiry_date: "2025-01-01",
        ip: "192.168.1.1",
      };

      const result = equipmentAddSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("should reject invalid IP address", () => {
      const data = {
        service_tag: "TEST123",
        purchase_date: "2024-01-01",
        warranty_expiry_date: "2025-01-01",
        ip: "not.an.ip.address",
      };

      const result = equipmentAddSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("API Add Item Schema", () => {
    test("should accept valid item data", () => {
      const data = {
        name: "Test Item",
        parent_id: "1",
      };

      const result = apiAddItemSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("should require name", () => {
      const data = {
        parent_id: "1",
      };

      const result = apiAddItemSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should accept null parent_id", () => {
      const data = {
        name: "Test Item",
        parent_id: null,
      };

      const result = apiAddItemSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("Locations Action Schema", () => {
    test("should accept valid add action", () => {
      const data = {
        type: "region",
        action: "add",
        name: "Test Region",
      };

      const result = locationsActionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("should require name for add action", () => {
      const data = {
        type: "region",
        action: "add",
      };

      const result = locationsActionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should require id for edit action", () => {
      const data = {
        type: "region",
        action: "edit",
        name: "Updated Region",
      };

      const result = locationsActionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should accept valid edit action", () => {
      const data = {
        type: "region",
        action: "edit",
        name: "Updated Region",
        id: "1",
      };

      const result = locationsActionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("should accept valid activate action", () => {
      const data = {
        type: "region",
        action: "activate",
        id: "1",
      };

      const result = locationsActionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("Print Label Schema", () => {
    test("should accept valid print request", () => {
      const data = {
        service_tag: "ABC123",
        printer: "PRINTER01",
      };

      const result = printLabelSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("should require service_tag", () => {
      const data = {
        printer: "PRINTER01",
      };

      const result = printLabelSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should allow optional printer", () => {
      const data = {
        service_tag: "ABC123",
      };

      const result = printLabelSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
