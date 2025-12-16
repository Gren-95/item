import { describe, test, expect } from "bun:test";
import {
  equipmentAddSchema,
  equipmentEditSchema,
  apiAddItemSchema,
  locationsActionSchema,
  typesActionSchema,
  vendorsActionSchema,
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

  describe("Types Action Schema", () => {
    test("should accept valid add type action", () => {
      const data = {
        type: "type",
        action: "add",
        name: "Tablet",
      };

      const result = typesActionSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("add");
        expect(result.data.type).toBe("type");
        expect(result.data.name).toBe("Tablet");
      }
    });

    test("should require name for add type action", () => {
      const data = {
        type: "type",
        action: "add",
      };

      const result = typesActionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should require id for edit type action", () => {
      const data = {
        type: "type",
        action: "edit",
        name: "Updated Type",
      };

      const result = typesActionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should accept valid edit type action", () => {
      const data = {
        type: "type",
        action: "edit",
        name: "Updated Type",
        id: "1",
      };

      const result = typesActionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("should reject type name longer than 25 characters", () => {
      const data = {
        type: "type",
        action: "add",
        name: "A".repeat(26),
      };

      const result = typesActionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should accept type name exactly 25 characters", () => {
      const data = {
        type: "type",
        action: "add",
        name: "A".repeat(25),
      };

      const result = typesActionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("should accept valid add model action", () => {
      const data = {
        type: "model",
        action: "add",
        name: "New Model",
        parent_id: "1",
      };

      const result = typesActionSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("add");
        expect(result.data.type).toBe("model");
        expect(result.data.name).toBe("New Model");
        expect(result.data.parent_id).toBe("1");
      }
    });

    test("should require parent_id for add model action", () => {
      const data = {
        type: "model",
        action: "add",
        name: "New Model",
      };

      const result = typesActionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should require name for add model action", () => {
      const data = {
        type: "model",
        action: "add",
        parent_id: "1",
      };

      const result = typesActionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should accept valid edit model action", () => {
      const data = {
        type: "model",
        action: "edit",
        name: "Updated Model",
        id: "1",
      };

      const result = typesActionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("should accept valid activate model action", () => {
      const data = {
        type: "model",
        action: "activate",
        id: "1",
      };

      const result = typesActionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("should accept valid deactivate model action", () => {
      const data = {
        type: "model",
        action: "deactivate",
        id: "1",
      };

      const result = typesActionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("should accept valid add product-line action", () => {
      const data = {
        type: "product-line",
        action: "add",
        name: "ThinkPad",
        parent_id: "1",
      };

      const result = typesActionSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("add");
        expect(result.data.type).toBe("product-line");
        expect(result.data.name).toBe("ThinkPad");
        expect(result.data.parent_id).toBe("1");
      }
    });

    test("should require parent_id for add product-line action", () => {
      const data = {
        type: "product-line",
        action: "add",
        name: "ThinkPad",
      };

      const result = typesActionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should require name for add product-line action", () => {
      const data = {
        type: "product-line",
        action: "add",
        parent_id: "1",
      };

      const result = typesActionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should accept valid edit product-line action", () => {
      const data = {
        type: "product-line",
        action: "edit",
        name: "Updated Product Line",
        id: "1",
      };

      const result = typesActionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("should accept valid activate product-line action", () => {
      const data = {
        type: "product-line",
        action: "activate",
        id: "1",
      };

      const result = typesActionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("should accept valid deactivate product-line action", () => {
      const data = {
        type: "product-line",
        action: "deactivate",
        id: "1",
      };

      const result = typesActionSchema.safeParse(data);
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

  describe("Vendors Action Schema", () => {
    test("should accept valid add vendor action", () => {
      const data = {
        action: "add",
        name: "Dell",
      };

      const result = vendorsActionSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.action).toBe("add");
        expect(result.data.name).toBe("Dell");
      }
    });

    test("should require name for add vendor action", () => {
      const data = {
        action: "add",
      };

      const result = vendorsActionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should require id for edit vendor action", () => {
      const data = {
        action: "edit",
        name: "Updated Vendor",
      };

      const result = vendorsActionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should require name for edit vendor action", () => {
      const data = {
        action: "edit",
        id: "1",
      };

      const result = vendorsActionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should accept valid edit vendor action", () => {
      const data = {
        action: "edit",
        name: "Updated Vendor",
        id: "1",
      };

      const result = vendorsActionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("should require id for delete vendor action", () => {
      const data = {
        action: "delete",
      };

      const result = vendorsActionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should accept valid delete vendor action", () => {
      const data = {
        action: "delete",
        id: "1",
      };

      const result = vendorsActionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    test("should reject vendor name longer than 255 characters", () => {
      const data = {
        action: "add",
        name: "A".repeat(256),
      };

      const result = vendorsActionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    test("should accept vendor name exactly 255 characters", () => {
      const data = {
        action: "add",
        name: "A".repeat(255),
      };

      const result = vendorsActionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
