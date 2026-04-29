import type { Pool } from "mysql2/promise";

/**
 * Per-request state shared by all route handlers.
 *
 * Built by createInitialContext; auth fields are populated by
 * applyAuthPreamble for non-public routes and remain null/false
 * for public ones.
 */
export interface RequestContext {
  req: Request;
  url: URL;
  path: string;
  method: string;
  traceId: string;
  pool: Pool;
  currentUsername: string | null;
  isAdmin: boolean;
  hasPcPwView: boolean;
  hasAuditApprover: boolean;
}

export type RouteHandler = (ctx: RequestContext) => Promise<Response>;

export interface Route {
  method: string;
  pattern: string | RegExp;
  handler: RouteHandler;
  public?: boolean;
}
