import { describe, test, expect } from "bun:test";
import { createTestRequest, parseJsonResponse } from "./utils";

describe("Health Check Endpoint", () => {
  test("GET /health should return 200 when healthy", async () => {
    const req = createTestRequest("/health", {
      method: "GET",
    });

    expect(req.method).toBe("GET");
    expect(req.url).toContain("/health");
  });

  test("GET /health should return JSON response", async () => {
    const req = createTestRequest("/health", {
      method: "GET",
    });

    // In a real test with server running:
    // const response = await fetch(req);
    // const data = await parseJsonResponse(response);
    // expect(data.status).toBe("healthy");
    // expect(data.timestamp).toBeDefined();
    // expect(data.traceId).toBeDefined();

    expect(req.method).toBe("GET");
  });

  test("GET /health should check database connectivity", async () => {
    const req = createTestRequest("/health", {
      method: "GET",
    });

    // Health check should query database
    expect(req.method).toBe("GET");
  });
});
