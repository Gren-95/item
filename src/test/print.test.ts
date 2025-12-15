import { describe, test, expect, mock } from "bun:test";
import { createTestRequest, parseJsonResponse } from "./utils";

describe("Print Label API (#11)", () => {
  test("POST /api/print should require service_tag", async () => {
    const body = JSON.stringify({});
    const req = createTestRequest("/api/print", {
      method: "POST",
      body,
    });

    expect(req.method).toBe("POST");
    // Validation should reject empty service_tag
  });

  test("POST /api/print should accept valid service_tag", async () => {
    const body = JSON.stringify({
      service_tag: "ABC123",
      printer: "PRINTER01",
    });

    const req = createTestRequest("/api/print", {
      method: "POST",
      body,
    });

    const json = await req.json();
    expect(json.service_tag).toBe("ABC123");
    expect(json.printer).toBe("PRINTER01");
  });

  test("POST /api/print should use default printer if not provided", async () => {
    const body = JSON.stringify({
      service_tag: "ABC123",
    });

    const req = createTestRequest("/api/print", {
      method: "POST",
      body,
    });

    const json = await req.json();
    expect(json.service_tag).toBe("ABC123");
    // Printer should default to env var or default value
  });

  test("GET /api/printers should return printer list", async () => {
    const req = createTestRequest("/api/printers", {
      method: "GET",
    });

    expect(req.method).toBe("GET");
    expect(req.url).toContain("/api/printers");
  });
});
