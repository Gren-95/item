import type { Route, RouteHandler, RequestContext } from "./types";

type Method = "GET" | "POST" | "PUT" | "DELETE";

interface RegisterOptions {
  public?: boolean;
}

/**
 * Method+pattern → handler registry.
 *
 * Phase 2+ migrates handlers off the if/else chain in server.ts into
 * resource-grouped modules that register themselves on this router.
 */
export class Router {
  private routes: Route[] = [];

  private add(
    method: Method,
    pattern: string | RegExp,
    handler: RouteHandler,
    opts: RegisterOptions
  ): this {
    this.routes.push({ method, pattern, handler, public: opts.public });
    return this;
  }

  get(pattern: string | RegExp, handler: RouteHandler, opts: RegisterOptions = {}): this {
    return this.add("GET", pattern, handler, opts);
  }

  post(pattern: string | RegExp, handler: RouteHandler, opts: RegisterOptions = {}): this {
    return this.add("POST", pattern, handler, opts);
  }

  put(pattern: string | RegExp, handler: RouteHandler, opts: RegisterOptions = {}): this {
    return this.add("PUT", pattern, handler, opts);
  }

  delete(pattern: string | RegExp, handler: RouteHandler, opts: RegisterOptions = {}): this {
    return this.add("DELETE", pattern, handler, opts);
  }

  match(method: string, path: string): Route | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;
      if (typeof route.pattern === "string") {
        if (route.pattern === path) return route;
      } else if (route.pattern.test(path)) {
        return route;
      }
    }
    return null;
  }

  async dispatch(ctx: RequestContext): Promise<Response | null> {
    const route = this.match(ctx.method, ctx.path);
    if (!route) return null;
    return route.handler(ctx);
  }
}
