import type { RowDataPacket } from "mysql2";
import { logger } from "../utils/logger";
import { labelPrintingPage } from "../templates/label-printing";
import { hasPcPwEditPermission, hasPcPwViewPermission } from "../utils/auth";
import type { RequestContext } from "./types";
import type { Router } from "./router";

interface PcPassword {
  id: number;
  user: string;
  evocon: string | null;
  pw: string;
  status: number;
}

export function registerLabelsRoutes(router: Router): void {
  router.get("/labels", labelsGet);
  router.post("/labels", pcPasswordsPost);
  router.get("/pc-pw", pcPwGetRedirect);
  router.post("/pc-pw", pcPasswordsPost);
  router.get("/printer-labels", printerLabelsRedirect);
  router.post("/api/pc-pw/print", pcPwPrintPost);
}

async function labelsGet(ctx: RequestContext): Promise<Response> {
  const { url, traceId, pool, isAdmin, hasPcPwView, hasAuditApprover, currentUsername } = ctx;
  const username = currentUsername!;
  const activeTab = url.searchParams.get("tab") || "service-tag";
  const success = url.searchParams.get("success") || "";
  const error = url.searchParams.get("error") || "";

  logger.info("Label Printing page access", { traceId, username, tab: activeTab });
  const hasPcPwEdit = await hasPcPwEditPermission(username, pool);

  let passwords: PcPassword[] = [];
  if (hasPcPwView) {
    try {
      const [rows] = await pool.query<RowDataPacket[]>(
        "SELECT id, user, evocon, pw, status FROM it_pc_pw ORDER BY user"
      );
      passwords = rows as PcPassword[];
    } catch (err) {
      logger.error("Error loading PC passwords for label printing", err, { traceId });
    }
  }

  return new Response(
    labelPrintingPage(
      { passwords, hasPcPwView, hasPcPwEdit },
      isAdmin,
      hasPcPwView,
      username,
      hasAuditApprover,
      activeTab,
      success,
      error
    ),
    { headers: { "Content-Type": "text/html" } }
  );
}

/**
 * Handles both /labels and /pc-pw POST: add or delete a PC password row.
 * Both endpoints redirect to /labels?tab=passwords on completion, so the
 * legacy /pc-pw route is just an alias.
 */
async function pcPasswordsPost(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool, currentUsername } = ctx;
  const username = currentUsername!;

  const hasEdit = await hasPcPwEditPermission(username, pool);
  if (!hasEdit) {
    return Response.redirect(
      "/labels?tab=passwords&error=" +
        encodeURIComponent("You do not have permission to edit PC passwords"),
      303
    );
  }

  const formData = await req.formData();
  const action = formData.get("action")?.toString();

  try {
    if (action === "add") {
      const user = formData.get("user")?.toString() || "";
      const evocon = formData.get("evocon")?.toString() || null;
      const pw = formData.get("pw")?.toString() || "";
      const status = parseInt(formData.get("status")?.toString() || "1");

      if (!user || !pw) {
        return Response.redirect(
          "/labels?tab=passwords&error=" + encodeURIComponent("User and password are required"),
          303
        );
      }

      await pool.query(
        "INSERT INTO it_pc_pw (user, evocon, pw, status) VALUES (?, ?, ?, ?)",
        [user, evocon, pw, status]
      );

      logger.info("PC password added", { traceId, user });
      return Response.redirect(
        "/labels?tab=passwords&success=" + encodeURIComponent("Password added successfully"),
        303
      );
    }

    if (action === "delete") {
      const id = parseInt(formData.get("id")?.toString() || "0");
      if (!id) {
        return Response.redirect(
          "/labels?tab=passwords&error=" + encodeURIComponent("Invalid password ID"),
          303
        );
      }

      await pool.query("DELETE FROM it_pc_pw WHERE id = ?", [id]);

      logger.info("PC password deleted", { traceId, id });
      return Response.redirect(
        "/labels?tab=passwords&success=" + encodeURIComponent("Password deleted successfully"),
        303
      );
    }

    return Response.redirect(
      "/labels?tab=passwords&error=" + encodeURIComponent("Invalid action"),
      303
    );
  } catch (err) {
    logger.error("Error processing PC password action", err, { traceId, action });
    return Response.redirect(
      "/labels?tab=passwords&error=" +
        encodeURIComponent("An unexpected error occurred. Please try again."),
      303
    );
  }
}

async function pcPwGetRedirect(ctx: RequestContext): Promise<Response> {
  const { url } = ctx;
  const success = url.searchParams.get("success") || "";
  const error = url.searchParams.get("error") || "";
  let redirectUrl = "/labels?tab=passwords";
  if (success) redirectUrl += "&success=" + encodeURIComponent(success);
  if (error) redirectUrl += "&error=" + encodeURIComponent(error);
  return Response.redirect(redirectUrl, 302);
}

async function printerLabelsRedirect(ctx: RequestContext): Promise<Response> {
  const { url } = ctx;
  const success = url.searchParams.get("success") || "";
  const error = url.searchParams.get("error") || "";
  let redirectUrl = "/labels?tab=printer";
  if (success) redirectUrl += "&success=" + encodeURIComponent(success);
  if (error) redirectUrl += "&error=" + encodeURIComponent(error);
  return Response.redirect(redirectUrl, 302);
}

async function pcPwPrintPost(ctx: RequestContext): Promise<Response> {
  const { req, traceId, pool, currentUsername } = ctx;
  const username = currentUsername!;

  const hasView = await hasPcPwViewPermission(username, pool);
  if (!hasView) {
    return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { user, evocon, password, printer } = body;

    if (!user || !password || !printer) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user, password, printer" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const printResponse = await fetch("http://eeprt01/Integration/PcPwSticker/Execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user,
        evocon: evocon || "",
        password,
        printer,
      }),
    });

    const printResult = await printResponse.text();

    if (printResponse.ok) {
      logger.info("PC password print job sent", { traceId, user, printer });
      return new Response(
        JSON.stringify({ success: true, message: "Print job sent successfully", result: printResult }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    logger.error("PC password print job failed", {
      traceId,
      user,
      printer,
      status: printResponse.status,
    });
    return new Response(JSON.stringify({ error: "Print job failed", result: printResult }), {
      status: printResponse.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    logger.error("Error sending PC password print job", err, { traceId });
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred. Please try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
