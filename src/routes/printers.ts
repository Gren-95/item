import { logger } from "../utils/logger";
import { printLabelSchema, printPrinterTagSchema } from "../utils/validation";
import type { RequestContext } from "./types";
import type { Router } from "./router";

export function registerPrintersRoutes(router: Router): void {
  router.get("/api/printers", listStickerPrinters);
  router.get("/api/printers/all", listAllPrinters);
  router.get(/^\/api\/dell-warranty\/.+$/, dellWarrantyGet);
  router.post("/api/print", printLabel);
  router.post("/api/print-printer-tag", printPrinterTag);
}

interface BartenderPrinter {
  Location?: string;
  DriverName?: string;
  PortName?: string;
  Name?: string;
}

interface NormalisedPrinter {
  name: string | undefined;
  ip: string;
  department: string;
  area: string;
  driver: string;
  type?: string;
}

function splitLocation(location: string): { department: string; area: string } {
  if (location.includes("-")) {
    const [first, second] = location.split("-", 2);
    const department = first.trim();
    const area = (second || "").trim() || department;
    return { department, area };
  }
  const department = location.trim();
  return { department, area: department };
}

function classifyPaper(driverName: string): string {
  const driver = driverName.toLowerCase();
  if (
    driver.includes("intermec") ||
    driver.includes("honeywell") ||
    driver.includes("easycoder")
  ) {
    return "sticker";
  }
  if (driver.includes("brother")) {
    return "sticker-tiny";
  }
  return "A4";
}

async function fetchBartenderPrinters(traceId: string): Promise<BartenderPrinter[] | null> {
  const bartenderHost = process.env.BARTENDER_HOST;
  if (!bartenderHost) return null;

  logger.info("Fetching printers from Bartender", { traceId });
  const host = bartenderHost.replace(/\/$/, "");
  const response = await fetch(`${host}/integration/getprinters/execute`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    logger.error("Bartender API error", { traceId, status: response.status });
    throw new Error(`Bartender API returned ${response.status}`);
  }

  const responseText = (await response.text()).replace(/^﻿/, "");
  return JSON.parse(responseText) as BartenderPrinter[];
}

function normalisePrinter(printer: BartenderPrinter, includeType: boolean): NormalisedPrinter {
  const { department, area } = splitLocation(printer.Location || "");
  const cleanIp = (printer.PortName || "").split("_")[0];
  const base: NormalisedPrinter = {
    name: printer.Name,
    ip: cleanIp,
    department,
    area,
    driver: printer.DriverName || "",
  };
  if (includeType) base.type = classifyPaper(printer.DriverName || "");
  return base;
}

async function listStickerPrinters(ctx: RequestContext): Promise<Response> {
  const { traceId, currentUsername } = ctx;
  if (!currentUsername) {
    return new Response(
      JSON.stringify({ success: false, message: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  try {
    const printers = await fetchBartenderPrinters(traceId);
    if (!printers) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = printers
      .map((p) => normalisePrinter(p, true))
      .filter((p) => p.type === "sticker" || p.type === "sticker-tiny");

    logger.info("Printers fetched successfully", { traceId, count: result.length });
    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    logger.error("Failed to fetch printers", err, { traceId });
    return new Response(
      JSON.stringify({
        error: true,
        message: "Failed to fetch printers. Printer server may be offline or the API may be down.",
        details: "An unexpected error occurred. Please try again.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function listAllPrinters(ctx: RequestContext): Promise<Response> {
  const { traceId } = ctx;
  try {
    const printers = await fetchBartenderPrinters(traceId);
    if (!printers) {
      return new Response(JSON.stringify({ success: true, data: [] }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = printers.map((p) => normalisePrinter(p, false));

    logger.info("All printers fetched successfully", { traceId, count: result.length });
    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    logger.error("Failed to fetch all printers", err, { traceId });
    return new Response(
      JSON.stringify({
        error: true,
        message: "Failed to fetch printers. Printer server may be offline or the API may be down.",
        details: "An unexpected error occurred. Please try again.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function dellWarrantyGet(ctx: RequestContext): Promise<Response> {
  const { path, traceId } = ctx;
  const serviceTag = path.replace("/api/dell-warranty/", "");

  if (!serviceTag) {
    return new Response(
      JSON.stringify({ success: false, message: "Service tag is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { getDellWarrantyInfo, isDellApiConfigured } = await import("../utils/dell");

    if (!isDellApiConfigured()) {
      return new Response(
        JSON.stringify({ success: false, message: "Dell API is not configured" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = await getDellWarrantyInfo(serviceTag);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 404,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const errorMessage = "An unexpected error occurred. Please try again.";
    logger.error("Dell API error", { traceId, serviceTag, error: errorMessage, err });
    return new Response(JSON.stringify({ success: false, message: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function printLabel(ctx: RequestContext): Promise<Response> {
  const { req, currentUsername } = ctx;
  if (!currentUsername) {
    return new Response(
      JSON.stringify({ success: false, message: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  try {
    const bartenderHost = process.env.BARTENDER_HOST || "";
    if (!bartenderHost) {
      return new Response(
        JSON.stringify({ success: false, error: "Printer service not configured" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
    const body = await req.json();
    const validated = printLabelSchema.parse(body);
    const service_tag = validated.service_tag;
    const printer = validated.printer || "EERAK-PRT103";

    const host = bartenderHost.replace(/\/$/, "");
    const response = await fetch(`${host}/Integration/ServiceTag/Execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_tag, printer }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Bartender error: ${errorText}` }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "Label sent to printer" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function printPrinterTag(ctx: RequestContext): Promise<Response> {
  const { req, traceId, currentUsername } = ctx;
  if (!currentUsername) {
    return new Response(
      JSON.stringify({ success: false, message: "Authentication required" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }
  try {
    const bartenderHost = process.env.BARTENDER_HOST || "";
    if (!bartenderHost) {
      return new Response(
        JSON.stringify({ success: false, error: "Printer service not configured" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
    const body = await req.json();
    const validated = printPrinterTagSchema.parse(body);
    const printer_name = validated.printer_name;
    const printer = validated.printer;
    logger.info("Print printer tag request", { traceId, printer_name, printer });

    const host = bartenderHost.replace(/\/$/, "");
    const response = await fetch(`${host}/Integration/PrinterTag/Execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ printer_name, printer }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Bartender print error", {
        traceId,
        printer_name,
        printer,
        status: response.status,
        error: errorText,
      });
      return new Response(JSON.stringify({ error: `Bartender error: ${errorText}` }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    logger.info("Printer tag sent successfully", { traceId, printer_name, printer });
    return new Response(
      JSON.stringify({ success: true, message: "Printer name tag sent to printer" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    logger.error("Print printer tag failed", err, { traceId });
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
