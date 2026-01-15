import { describe, test, expect, beforeEach, mock, spyOn } from "bun:test";
import { getDellWarrantyInfo, isDellApiConfigured, clearTokenCache } from "../utils/dell";

describe("Dell Warranty API Integration", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
    // Clear the token cache
    clearTokenCache();
    // Clear fetch mock
    global.fetch = mock(() => Promise.resolve(new Response()));
  });

  describe("isDellApiConfigured", () => {
    test("should return true when credentials are configured", () => {
      process.env.DELL_CLIENT_ID = "test-client-id";
      process.env.DELL_CLIENT_SECRET = "test-client-secret";
      
      expect(isDellApiConfigured()).toBe(true);
    });

    test("should return false when client ID is missing", () => {
      delete process.env.DELL_CLIENT_ID;
      process.env.DELL_CLIENT_SECRET = "test-client-secret";
      
      expect(isDellApiConfigured()).toBe(false);
    });

    test("should return false when client secret is missing", () => {
      process.env.DELL_CLIENT_ID = "test-client-id";
      delete process.env.DELL_CLIENT_SECRET;
      
      expect(isDellApiConfigured()).toBe(false);
    });

    test("should return false when both credentials are missing", () => {
      delete process.env.DELL_CLIENT_ID;
      delete process.env.DELL_CLIENT_SECRET;
      
      expect(isDellApiConfigured()).toBe(false);
    });
  });

  describe("getDellWarrantyInfo - Configuration Errors", () => {
    test("should return error when API is not configured", async () => {
      delete process.env.DELL_CLIENT_ID;
      delete process.env.DELL_CLIENT_SECRET;

      const result = await getDellWarrantyInfo("TEST123");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Dell API credentials not configured");
      expect(result.data).toBeUndefined();
    });
  });

  describe("getDellWarrantyInfo - Token Authentication", () => {
    beforeEach(() => {
      process.env.DELL_CLIENT_ID = "test-client-id";
      process.env.DELL_CLIENT_SECRET = "test-client-secret";
    });

    test("should successfully fetch warranty info with valid service tag", async () => {
      // Mock token request
      const tokenResponse = {
        access_token: "mock-access-token",
        token_type: "Bearer",
        expires_in: 3600
      };

      // Mock entitlements request
      const entitlementsResponse = [{
        serviceTag: "ABC1234",
        productLineDescription: "OptiPlex 7090",
        productLobDescription: "Desktop",
        shipDate: "2023-01-15T00:00:00Z",
        entitlements: [
          {
            serviceLevelDescription: "ProSupport Plus",
            startDate: "2023-01-15T00:00:00Z",
            endDate: "2026-01-15T00:00:00Z",
            entitlementType: "INITIAL"
          }
        ]
      }];

      global.fetch = mock((url: string) => {
        if (url.includes("/auth/oauth/v2/token")) {
          return Promise.resolve(new Response(JSON.stringify(tokenResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        } else if (url.includes("/asset-entitlements")) {
          return Promise.resolve(new Response(JSON.stringify(entitlementsResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        }
        return Promise.resolve(new Response("", { status: 404 }));
      });

      const result = await getDellWarrantyInfo("ABC1234");

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.serviceTag).toBe("ABC1234");
      expect(result.data?.model).toBe("OptiPlex 7090");
      expect(result.data?.productLine).toBe("Desktop");
      expect(result.data?.shipDate).toBe("2023-01-15");
      expect(result.data?.warrantyStart).toBe("2023-01-15");
      expect(result.data?.warrantyEnd).toBe("2026-01-15");
      expect(result.data?.entitlements).toHaveLength(1);
      expect(result.data?.entitlements[0].serviceLevel).toBe("ProSupport Plus");
      expect(result.data?.entitlements[0].startDate).toBe("15.01.2023");
      expect(result.data?.entitlements[0].endDate).toBe("15.01.2026");
      expect(result.data?.entitlements[0].type).toBe("INITIAL");
    });

    test("should handle token request failure", async () => {
      const originalFetch = global.fetch;
      let callCount = 0;
      
      global.fetch = async (url: string | URL | Request) => {
        callCount++;
        const urlString = typeof url === 'string' ? url : url.toString();
        if (urlString.includes("/auth/oauth/v2/token")) {
          return new Response("Unauthorized", { status: 401 });
        }
        // Should not reach here
        throw new Error("Unexpected fetch call to: " + urlString);
      };

      const result = await getDellWarrantyInfo("ABC1234");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Token request failed");
      expect(result.data).toBeUndefined();
      expect(callCount).toBe(1); // Only token request should be made
      
      global.fetch = originalFetch;
    });

    test("should handle missing access token in response", async () => {
      const tokenResponse = {
        token_type: "Bearer",
        expires_in: 3600
        // access_token is missing
      };

      const originalFetch = global.fetch;
      let callCount = 0;
      
      global.fetch = async (url: string | URL | Request) => {
        callCount++;
        const urlString = typeof url === 'string' ? url : url.toString();
        if (urlString.includes("/auth/oauth/v2/token")) {
          return new Response(JSON.stringify(tokenResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
        // Should not reach here
        throw new Error("Unexpected fetch call to: " + urlString);
      };

      const result = await getDellWarrantyInfo("ABC1234");

      expect(result.success).toBe(false);
      expect(result.message).toBe("No access token in response");
      expect(callCount).toBe(1); // Only token request should be made
      
      global.fetch = originalFetch;
    });
  });

  describe("getDellWarrantyInfo - Entitlements API", () => {
    beforeEach(() => {
      process.env.DELL_CLIENT_ID = "test-client-id";
      process.env.DELL_CLIENT_SECRET = "test-client-secret";
    });

    test("should handle service tag not found", async () => {
      const tokenResponse = {
        access_token: "mock-access-token",
        token_type: "Bearer",
        expires_in: 3600
      };

      global.fetch = mock((url: string) => {
        if (url.includes("/auth/oauth/v2/token")) {
          return Promise.resolve(new Response(JSON.stringify(tokenResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        } else if (url.includes("/asset-entitlements")) {
          return Promise.resolve(new Response(JSON.stringify([]), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        }
        return Promise.resolve(new Response("", { status: 404 }));
      });

      const result = await getDellWarrantyInfo("INVALID123");

      expect(result.success).toBe(false);
      expect(result.message).toBe("No warranty information found for this service tag");
      expect(result.data).toBeUndefined();
    });

    test("should handle entitlements API error", async () => {
      const tokenResponse = {
        access_token: "mock-access-token",
        token_type: "Bearer",
        expires_in: 3600
      };

      global.fetch = mock((url: string) => {
        if (url.includes("/auth/oauth/v2/token")) {
          return Promise.resolve(new Response(JSON.stringify(tokenResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        } else if (url.includes("/asset-entitlements")) {
          return Promise.resolve(new Response("Internal Server Error", { status: 500 }));
        }
        return Promise.resolve(new Response("", { status: 404 }));
      });

      const result = await getDellWarrantyInfo("ABC1234");

      expect(result.success).toBe(false);
      expect(result.message).toContain("API request failed");
    });

    test("should handle expired token (401) and clear cache", async () => {
      const tokenResponse = {
        access_token: "mock-access-token",
        token_type: "Bearer",
        expires_in: 3600
      };

      global.fetch = mock((url: string) => {
        if (url.includes("/auth/oauth/v2/token")) {
          return Promise.resolve(new Response(JSON.stringify(tokenResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        } else if (url.includes("/asset-entitlements")) {
          return Promise.resolve(new Response("Unauthorized", { status: 401 }));
        }
        return Promise.resolve(new Response("", { status: 404 }));
      });

      const result = await getDellWarrantyInfo("ABC1234");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Invalid authentication");
    });
  });

  describe("getDellWarrantyInfo - Data Formatting", () => {
    beforeEach(() => {
      process.env.DELL_CLIENT_ID = "test-client-id";
      process.env.DELL_CLIENT_SECRET = "test-client-secret";
    });

    test("should handle device with no entitlements", async () => {
      const tokenResponse = {
        access_token: "mock-access-token",
        token_type: "Bearer",
        expires_in: 3600
      };

      const entitlementsResponse = [{
        serviceTag: "ABC1234",
        productLineDescription: "OptiPlex 7090",
        shipDate: "2023-01-15T00:00:00Z",
        entitlements: []
      }];

      global.fetch = mock((url: string) => {
        if (url.includes("/auth/oauth/v2/token")) {
          return Promise.resolve(new Response(JSON.stringify(tokenResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        } else if (url.includes("/asset-entitlements")) {
          return Promise.resolve(new Response(JSON.stringify(entitlementsResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        }
        return Promise.resolve(new Response("", { status: 404 }));
      });

      const result = await getDellWarrantyInfo("ABC1234");

      expect(result.success).toBe(true);
      expect(result.data?.entitlements).toHaveLength(0);
      expect(result.data?.warrantyStart).toBeNull();
      expect(result.data?.warrantyEnd).toBeNull();
    });

    test("should handle multiple entitlements and find earliest/latest dates", async () => {
      const tokenResponse = {
        access_token: "mock-access-token",
        token_type: "Bearer",
        expires_in: 3600
      };

      const entitlementsResponse = [{
        serviceTag: "ABC1234",
        productLineDescription: "OptiPlex 7090",
        shipDate: "2023-01-15T00:00:00Z",
        entitlements: [
          {
            serviceLevelDescription: "Basic Warranty",
            startDate: "2023-01-15T00:00:00Z",
            endDate: "2024-01-15T00:00:00Z",
            entitlementType: "INITIAL"
          },
          {
            serviceLevelDescription: "ProSupport Plus",
            startDate: "2024-01-15T00:00:00Z",
            endDate: "2026-01-15T00:00:00Z",
            entitlementType: "EXTENDED"
          },
          {
            serviceLevelDescription: "Hardware Support",
            startDate: "2022-12-01T00:00:00Z",
            endDate: "2027-12-01T00:00:00Z",
            entitlementType: "ADDON"
          }
        ]
      }];

      global.fetch = mock((url: string) => {
        if (url.includes("/auth/oauth/v2/token")) {
          return Promise.resolve(new Response(JSON.stringify(tokenResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        } else if (url.includes("/asset-entitlements")) {
          return Promise.resolve(new Response(JSON.stringify(entitlementsResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        }
        return Promise.resolve(new Response("", { status: 404 }));
      });

      const result = await getDellWarrantyInfo("ABC1234");

      expect(result.success).toBe(true);
      expect(result.data?.entitlements).toHaveLength(3);
      // Earliest start date should be 2022-12-01
      expect(result.data?.warrantyStart).toBe("2022-12-01");
      // Latest end date should be 2027-12-01
      expect(result.data?.warrantyEnd).toBe("2027-12-01");
    });

    test("should handle null/undefined optional fields", async () => {
      const tokenResponse = {
        access_token: "mock-access-token",
        token_type: "Bearer",
        expires_in: 3600
      };

      const entitlementsResponse = [{
        serviceTag: "ABC1234",
        // productLineDescription is missing
        // shipDate is missing
        entitlements: [
          {
            // serviceLevelDescription is missing
            startDate: "2023-01-15T00:00:00Z",
            endDate: "2026-01-15T00:00:00Z",
            // entitlementType is missing
          }
        ]
      }];

      global.fetch = mock((url: string) => {
        if (url.includes("/auth/oauth/v2/token")) {
          return Promise.resolve(new Response(JSON.stringify(tokenResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        } else if (url.includes("/asset-entitlements")) {
          return Promise.resolve(new Response(JSON.stringify(entitlementsResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        }
        return Promise.resolve(new Response("", { status: 404 }));
      });

      const result = await getDellWarrantyInfo("ABC1234");

      expect(result.success).toBe(true);
      expect(result.data?.model).toBeNull();
      expect(result.data?.productLine).toBeNull();
      expect(result.data?.shipDate).toBeNull();
      expect(result.data?.entitlements[0].serviceLevel).toBeNull();
      expect(result.data?.entitlements[0].type).toBeNull();
    });

    test("should handle invalid date formats", async () => {
      const tokenResponse = {
        access_token: "mock-access-token",
        token_type: "Bearer",
        expires_in: 3600
      };

      const entitlementsResponse = [{
        serviceTag: "ABC1234",
        shipDate: "invalid-date",
        entitlements: [
          {
            serviceLevelDescription: "ProSupport",
            startDate: "not-a-date",
            endDate: "also-not-a-date",
            entitlementType: "INITIAL"
          }
        ]
      }];

      global.fetch = mock((url: string) => {
        if (url.includes("/auth/oauth/v2/token")) {
          return Promise.resolve(new Response(JSON.stringify(tokenResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        } else if (url.includes("/asset-entitlements")) {
          return Promise.resolve(new Response(JSON.stringify(entitlementsResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        }
        return Promise.resolve(new Response("", { status: 404 }));
      });

      const result = await getDellWarrantyInfo("ABC1234");

      expect(result.success).toBe(true);
      expect(result.data?.shipDate).toBeNull();
      expect(result.data?.warrantyStart).toBeNull();
      expect(result.data?.warrantyEnd).toBeNull();
      expect(result.data?.entitlements[0].startDate).toBeNull();
      expect(result.data?.entitlements[0].endDate).toBeNull();
    });
  });

  describe("getDellWarrantyInfo - Date Formatting", () => {
    beforeEach(() => {
      process.env.DELL_CLIENT_ID = "test-client-id";
      process.env.DELL_CLIENT_SECRET = "test-client-secret";
    });

    test("should format dates correctly (DD.MM.YYYY for display, YYYY-MM-DD for forms)", async () => {
      const tokenResponse = {
        access_token: "mock-access-token",
        token_type: "Bearer",
        expires_in: 3600
      };

      const entitlementsResponse = [{
        serviceTag: "ABC1234",
        shipDate: "2023-03-25T10:30:00Z",
        entitlements: [
          {
            serviceLevelDescription: "ProSupport",
            startDate: "2023-03-25T00:00:00Z",
            endDate: "2026-03-25T23:59:59Z",
            entitlementType: "INITIAL"
          }
        ]
      }];

      global.fetch = mock((url: string) => {
        if (url.includes("/auth/oauth/v2/token")) {
          return Promise.resolve(new Response(JSON.stringify(tokenResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        } else if (url.includes("/asset-entitlements")) {
          return Promise.resolve(new Response(JSON.stringify(entitlementsResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }));
        }
        return Promise.resolve(new Response("", { status: 404 }));
      });

      const result = await getDellWarrantyInfo("ABC1234");

      expect(result.success).toBe(true);
      // ISO format for form inputs
      expect(result.data?.shipDate).toBe("2023-03-25");
      expect(result.data?.warrantyStart).toBe("2023-03-25");
      expect(result.data?.warrantyEnd).toBe("2026-03-25");
      // DD.MM.YYYY format for display
      expect(result.data?.entitlements[0].startDate).toBe("25.03.2023");
      expect(result.data?.entitlements[0].endDate).toBe("25.03.2026");
    });
  });

  describe("getDellWarrantyInfo - Network Errors", () => {
    beforeEach(() => {
      process.env.DELL_CLIENT_ID = "test-client-id";
      process.env.DELL_CLIENT_SECRET = "test-client-secret";
    });

    test("should handle network fetch errors", async () => {
      global.fetch = mock(() => {
        throw new Error("Network error");
      });

      const result = await getDellWarrantyInfo("ABC1234");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Network error");
    });

    test("should handle generic errors", async () => {
      global.fetch = mock(() => {
        throw "Unknown error";
      });

      const result = await getDellWarrantyInfo("ABC1234");

      expect(result.success).toBe(false);
      expect(result.message).toBe("Unknown error occurred");
    });
  });
});
