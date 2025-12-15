import type { RowDataPacket, ResultSetHeader } from "mysql2";

/**
 * Test utilities for mocking database responses
 */

export interface MockQueryResult<T = RowDataPacket> {
  rows: T[];
  insertId?: number;
  affectedRows?: number;
}

export class MockPool {
  private queries: Map<string, MockQueryResult[]> = new Map();
  private queryIndex: Map<string, number> = new Map();

  /**
   * Register a mock query result
   */
  mockQuery(sql: string, results: MockQueryResult[]): void {
    const key = sql.trim().toLowerCase();
    this.queries.set(key, results);
    this.queryIndex.set(key, 0);
  }

  /**
   * Reset all mocks
   */
  reset(): void {
    this.queries.clear();
    this.queryIndex.clear();
  }

  /**
   * Execute a mock query
   */
  async query<T = RowDataPacket>(
    sql: string,
    params?: unknown[]
  ): Promise<[T[], ResultSetHeader]> {
    const key = sql.trim().toLowerCase();
    const results = this.queries.get(key);
    
    if (!results) {
      throw new Error(`No mock registered for query: ${sql}`);
    }

    const index = this.queryIndex.get(key) || 0;
    const result = results[index] || results[0];
    
    // Increment index for next call
    this.queryIndex.set(key, index + 1);

    const rows = (result.rows || []) as T[];
    const header: ResultSetHeader = {
      insertId: result.insertId || 0,
      affectedRows: result.affectedRows || rows.length,
      changedRows: result.affectedRows || rows.length,
      fieldCount: 0,
      info: "",
      serverStatus: 0,
      warningStatus: 0,
    };

    return [rows, header];
  }
}

/**
 * Create a test request
 */
export function createTestRequest(
  path: string,
  options: {
    method?: string;
    body?: FormData | string;
    headers?: HeadersInit;
  } = {}
): Request {
  const url = `http://localhost:3000${path}`;
  const { method = "GET", body, headers } = options;

  // Don't set Content-Type for FormData - let the Request API handle it
  const requestHeaders: HeadersInit = body instanceof FormData 
    ? { ...headers } 
    : { 
        "Content-Type": "application/json",
        ...headers,
      };

  return new Request(url, {
    method,
    body,
    headers: requestHeaders,
  });
}

/**
 * Parse HTML response to check for content
 */
export async function parseHtmlResponse(response: Response): Promise<string> {
  return await response.text();
}

/**
 * Parse JSON response
 */
export async function parseJsonResponse<T = unknown>(response: Response): Promise<T> {
  return await response.json();
}
