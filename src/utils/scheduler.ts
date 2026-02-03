import { sendPendingApprovalReminders } from "./email";
import pool from "../db";

/**
 * Start background job scheduler for email notifications
 * Checks for pending approvals every hour
 */
export function startScheduler(): void {
  const INTERVAL_HOURS = 1;
  const INTERVAL_MS = INTERVAL_HOURS * 60 * 60 * 1000;

  // Run immediately on startup (after a short delay)
  setTimeout(() => {
    console.log("Running initial pending approval check...");
    sendPendingApprovalReminders(pool).catch((err) =>
      console.error("Failed to send pending approval reminders:", err)
    );
  }, 5000); // 5 second delay to allow server to fully start

  // Then run every hour
  setInterval(() => {
    console.log("Running scheduled pending approval check...");
    sendPendingApprovalReminders(pool).catch((err) =>
      console.error("Failed to send pending approval reminders:", err)
    );
  }, INTERVAL_MS);

  console.log(`✅ Email notification scheduler started (checking every ${INTERVAL_HOURS} hour${INTERVAL_HOURS > 1 ? 's' : ''})`);
}
