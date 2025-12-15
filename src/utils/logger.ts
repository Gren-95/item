import { randomUUID } from "crypto";

interface LogContext {
  traceId?: string;
  [key: string]: unknown;
}

class Logger {
  private generateTraceId(): string {
    return randomUUID();
  }

  private formatLog(level: string, message: string, context?: LogContext): string {
    const traceId = context?.traceId || this.generateTraceId();
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      traceId,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
    };
    return JSON.stringify(logEntry);
  }

  info(message: string, context?: LogContext): void {
    console.log(this.formatLog("INFO", message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatLog("WARN", message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : String(error),
    };
    console.error(this.formatLog("ERROR", message, errorContext));
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(this.formatLog("DEBUG", message, context));
    }
  }
}

export const logger = new Logger();
export type { LogContext };
