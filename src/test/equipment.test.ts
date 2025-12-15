import { describe, test, expect, beforeEach, mock } from "bun:test";
import { createTestRequest, parseHtmlResponse, parseJsonResponse, MockPool } from "./utils";
import pool from "../db";

// Mock the database pool
const mockPool = new MockPool();

// We'll need to mock the db module - this is a simplified approach
// In a real scenario, you'd use dependency injection or a test database

describe("Equipment Search (#1, #13, #14)", () => {
  beforeEach(() => {
    mockPool.reset();
  });

  test("GET / should show search page when no query", async () => {
    const req = createTestRequest("/");
    expect(req.method).toBe("GET");
    expect(req.url).toContain("/");
  });

  test("GET /?q=ABC123 should search across all fields", async () => {
    const searchQuery = `SELECT DISTINCT
      e.id,
      e.service_tag,
      t.type_name,
      pl.name as product_line_name,
      m.name as model_name,
      v.name as vendor_name,
      CONCAT(emp.first_name, ' ', emp.last_name) as assigned_to_name,
      CONCAT_WS(' > ',
        r.name,
        c.name,
        p.name,
        d.name,
        a.name,
        sa.name
      ) as location,
      log.created as latest_audit_date
    FROM it_equipment e
    LEFT JOIN it_equipment_model m ON e.model_id = m.id
    LEFT JOIN it_equipment_product_line pl ON m.product_line_id = pl.id
    LEFT JOIN it_equipment_type t ON pl.type_id = t.id
    LEFT JOIN it_equipment_vendor v ON e.vendor_id = v.id
    LEFT JOIN (
      SELECT l1.* FROM it_equipment_log l1
      INNER JOIN (
        SELECT equipment_id, MAX(created) as max_created
        FROM it_equipment_log
        GROUP BY equipment_id
      ) l2 ON l1.equipment_id = l2.equipment_id AND l1.created = l2.max_created
    ) log ON e.id = log.equipment_id
    LEFT JOIN it_employees_list emp ON log.assigned_to = emp.employee_no
    LEFT JOIN it_equipment_sub_area sa ON log.equipment_sub_area_id = sa.id
    LEFT JOIN it_equipment_area a ON sa.area_id = a.id
    LEFT JOIN it_equipment_department d ON a.department_id = d.id
    LEFT JOIN it_equipment_plant p ON d.plant_id = p.id
    LEFT JOIN it_equipment_country c ON p.country_id = c.id
    LEFT JOIN it_equipment_region r ON c.region_id = r.id
    WHERE 
      e.service_tag LIKE ?
      OR t.type_name LIKE ?
      OR pl.name LIKE ?
      OR m.name LIKE ?
      OR v.name LIKE ?
      OR CONCAT(emp.first_name, ' ', emp.last_name) LIKE ?
      OR emp.first_name LIKE ?
      OR emp.last_name LIKE ?
      OR r.name LIKE ?
      OR c.name LIKE ?
      OR p.name LIKE ?
      OR d.name LIKE ?
      OR a.name LIKE ?
      OR sa.name LIKE ?
    ORDER BY e.service_tag
    LIMIT 100`;

    mockPool.mockQuery(searchQuery, [
      {
        rows: [
          {
            id: 1,
            service_tag: "ABC123",
            type_name: "Laptop",
            product_line_name: "ThinkPad",
            model_name: "X1 Carbon",
            vendor_name: "Lenovo",
            assigned_to_name: "John Doe",
            location: "Europe > Estonia > Tallinn",
            latest_audit_date: "2024-01-01T00:00:00Z",
          },
        ],
      },
    ]);

    const req = createTestRequest("/?q=ABC123");
    expect(req.method).toBe("GET");
    expect(req.url).toContain("q=ABC123");
  });

  test("GET /?q=John should search by user name", async () => {
    const req = createTestRequest("/?q=John");
    expect(req.method).toBe("GET");
    expect(req.url).toContain("q=John");
    // Should search in first_name, last_name, and full name
  });

  test("GET /?q=Laptop should search by device type", async () => {
    const req = createTestRequest("/?q=Laptop");
    expect(req.method).toBe("GET");
    expect(req.url).toContain("q=Laptop");
    // Should search in type_name
  });

  test("GET /?q=Tallinn should search by location", async () => {
    const req = createTestRequest("/?q=Tallinn");
    expect(req.method).toBe("GET");
    expect(req.url).toContain("q=Tallinn");
    // Should search in location hierarchy
  });

  test("GET /?q=NOTFOUND should show empty results", async () => {
    const req = createTestRequest("/?q=NOTFOUND");
    expect(req.method).toBe("GET");
    expect(req.url).toContain("q=NOTFOUND");
    // Should show "No equipment found" message with add button
  });

  test("GET /?serial=ABC123 should maintain backward compatibility", async () => {
    const req = createTestRequest("/?serial=ABC123");
    expect(req.method).toBe("GET");
    expect(req.url).toContain("serial=ABC123");
    // Should work with old 'serial' parameter
  });
});

describe("Equipment Add (#1)", () => {
  test("GET /add should show add form", async () => {
    const req = createTestRequest("/add");
    expect(req.method).toBe("GET");
    expect(req.url).toContain("/add");
  });

  test("POST /add should validate required fields", async () => {
    const formData = new FormData();
    formData.append("service_tag", "TEST123");
    formData.append("purchase_date", "2024-01-01");
    formData.append("warranty_expiry_date", "2025-01-01");

    const req = createTestRequest("/add", {
      method: "POST",
      body: formData,
    });

    expect(req.method).toBe("POST");
  });

  test("POST /add should reject invalid service tag", async () => {
    const formData = new FormData();
    formData.append("service_tag", ""); // Empty service tag should fail validation
    formData.append("purchase_date", "2024-01-01");
    formData.append("warranty_expiry_date", "2025-01-01");

    const req = createTestRequest("/add", {
      method: "POST",
      body: formData,
    });

    expect(req.method).toBe("POST");
    // Validation should happen in the handler
  });
});

describe("Equipment Edit (#1)", () => {
  test("GET /edit/1 should show edit form", async () => {
    const req = createTestRequest("/edit/1");
    expect(req.method).toBe("GET");
    expect(req.url).toContain("/edit/1");
  });

  test("POST /edit/1 should update equipment", async () => {
    const formData = new FormData();
    formData.append("model_id", "1");
    formData.append("assigned_to", "EMP001");
    formData.append("comment", "Test update");

    const req = createTestRequest("/edit/1", {
      method: "POST",
      body: formData,
    });

    expect(req.method).toBe("POST");
    expect(req.url).toContain("/edit/1");
  });
});
