-- Migration: Add permission audit log table for tracking permission changes
-- This table stores a history of all permission changes (add, delete, modify)

CREATE TABLE IF NOT EXISTS it_permission_audit_log (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  action ENUM('add', 'delete', 'modify') NOT NULL,
  user_id VARCHAR(50) NOT NULL COMMENT 'The user whose permission was changed',
  plant_id INT UNSIGNED NOT NULL DEFAULT 0,
  permission VARCHAR(100) NOT NULL,
  role ENUM('user', 'admin') NULL COMMENT 'New role value (NULL for delete)',
  old_role ENUM('user', 'admin') NULL COMMENT 'Previous role value (NULL for add)',
  expiry_date DATE NULL COMMENT 'New expiry date',
  old_expiry_date DATE NULL COMMENT 'Previous expiry date',
  comment VARCHAR(255) NULL,
  changed_by VARCHAR(50) NOT NULL COMMENT 'Who made the change',
  change_reason VARCHAR(255) NULL COMMENT 'Reason for the change',
  ip_address VARCHAR(45) NULL COMMENT 'IP address of the user who made the change',
  created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_changed_by (changed_by),
  INDEX idx_created (created),
  INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
