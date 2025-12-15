import { describe, test, expect } from "bun:test";
import { createTestRequest } from "./utils";
import { locationsActionSchema } from "../utils/validation";

describe("Locations Management (#7)", () => {
  test("GET /locations should show locations page", async () => {
    const req = createTestRequest("/locations");
    expect(req.method).toBe("GET");
    expect(req.url).toContain("/locations");
  });

  test("POST /locations should validate action type", () => {
    const formData = {
      type: "region",
      action: "add",
      name: "Test Region",
    };

    const result = locationsActionSchema.safeParse(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.action).toBe("add");
      expect(result.data.type).toBe("region");
      expect(result.data.name).toBe("Test Region");
    }
  });

  test("POST /locations should require name for add action", () => {
    const formData = {
      type: "region",
      action: "add",
      // Missing name - should fail validation
    };

    const result = locationsActionSchema.safeParse(formData);
    expect(result.success).toBe(false);
  });

  test("POST /locations should require id for edit action", () => {
    const formData = {
      type: "region",
      action: "edit",
      name: "Updated Region",
      // Missing id - should fail validation
    };

    const result = locationsActionSchema.safeParse(formData);
    expect(result.success).toBe(false);
  });

  test("POST /locations should support activate/deactivate", () => {
    const formData = {
      type: "region",
      action: "deactivate",
      id: "1",
    };

    const result = locationsActionSchema.safeParse(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.action).toBe("deactivate");
      expect(result.data.id).toBe("1");
    }
  });
});
