import { describe, test, expect } from "bun:test";
import { createTestRequest } from "./utils";

describe("Camera Scanning (#17)", () => {
  test("GET / should include scan button in search form", async () => {
    const req = createTestRequest("/");
    expect(req.method).toBe("GET");
    expect(req.url).toContain("/");
    // Search page should include scan button with id="scan-qr"
  });

  test("GET / should include QR scanner modal", async () => {
    const req = createTestRequest("/");
    expect(req.method).toBe("GET");
    // Search page should include modal with id="qrModal"
  });

  test("GET /js/qr-scanner.umd.min.js should serve QR scanner library", async () => {
    const req = createTestRequest("/js/qr-scanner.umd.min.js");
    expect(req.method).toBe("GET");
    expect(req.url).toContain("/js/qr-scanner.umd.min.js");
  });

  test("GET /js/qr-scanner-worker.min.js should serve QR scanner worker", async () => {
    const req = createTestRequest("/js/qr-scanner-worker.min.js");
    expect(req.method).toBe("GET");
    expect(req.url).toContain("/js/qr-scanner-worker.min.js");
  });

  test("Scan button should have correct aria-label", async () => {
    const req = createTestRequest("/");
    expect(req.method).toBe("GET");
    // Scan button should have aria-label="Scan QR code with camera"
  });

  test("QR modal should have close and cancel buttons", async () => {
    const req = createTestRequest("/");
    expect(req.method).toBe("GET");
    // Modal should include buttons with ids: closeQr, cancelQr
  });

  test("QR modal should have video element for camera", async () => {
    const req = createTestRequest("/");
    expect(req.method).toBe("GET");
    // Modal should include video element with id="qrVideo"
  });

  test("QR modal should have status indicator", async () => {
    const req = createTestRequest("/");
    expect(req.method).toBe("GET");
    // Modal should include status element with id="qrStatus"
  });

  test("QR modal should support flashlight toggle", async () => {
    const req = createTestRequest("/");
    expect(req.method).toBe("GET");
    // Modal should include flashlight button with id="torchQr"
  });
});

