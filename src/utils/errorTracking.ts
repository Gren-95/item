import { logger } from "./logger";

/**
 * Error tracking utility
 * 
 * This module provides a structure for error tracking integration.
 * To enable Sentry or similar service, uncomment and configure below.
 */

interface ErrorContext {
  [key: string]: unknown;
}

class ErrorTracker {
  /**
   * Capture and report an error
   * Currently logs to console, but can be extended to send to Sentry/Rollbar
   */
  captureException(error: Error | unknown, context?: ErrorContext): void {
    // Log locally
    logger.error("Exception captured", error, context);

    // TODO: Uncomment when Sentry is configured
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureException(error, { extra: context });
    // }
  }

  /**
   * Capture a message
   */
  captureMessage(message: string, level: "info" | "warning" | "error" = "error", context?: ErrorContext): void {
    logger[level](message, context);

    // TODO: Uncomment when Sentry is configured
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureMessage(message, { level, extra: context });
    // }
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: { id?: string; email?: string; username?: string }): void {
    // TODO: Uncomment when Sentry is configured
    // if (process.env.SENTRY_DSN) {
    //   Sentry.setUser(user);
    // }
    logger.info("User context set", { user });
  }
}

export const errorTracker = new ErrorTracker();
