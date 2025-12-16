-- Migration: Add repair tracking fields to equipment table
-- Issue #28: Supplier repair tracking

USE it;

-- Add repair tracking columns to it_equipment table
ALTER TABLE `it_equipment`
  ADD COLUMN `repair_status` ENUM('needs_repair', 'at_supplier', 'returned', 'in_backup') NULL DEFAULT NULL COMMENT 'Repair status: needs_repair = registered for repair, at_supplier = sent to supplier, returned = returned from supplier, in_backup = marked as backup',
  ADD COLUMN `repair_note` TEXT NULL COMMENT 'Note describing the repair issue',
  ADD COLUMN `repair_physical_location` VARCHAR(255) NULL COMMENT 'Physical location of equipment (e.g., cupboard)',
  ADD COLUMN `repair_sent_date` DATE NULL COMMENT 'Date when equipment was sent to supplier',
  ADD COLUMN `repair_returned_date` DATE NULL COMMENT 'Date when equipment was returned from supplier',
  ADD COLUMN `repair_marked_backup_date` DATE NULL COMMENT 'Date when equipment was marked as in backup',
  ADD KEY `idx_equipment_repair_status` (`repair_status`),
  ADD KEY `idx_equipment_repair_sent_date` (`repair_sent_date`);

-- Create table for repair report schedule configuration
CREATE TABLE IF NOT EXISTS `it_repair_report_schedule` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `day_of_week` TINYINT NOT NULL COMMENT 'Day of week (0=Sunday, 1=Monday, etc.)',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_report_day` (`day_of_week`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create table for IT notification email configuration
CREATE TABLE IF NOT EXISTS `it_notification_config` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `config_key` VARCHAR(100) NOT NULL,
  `config_value` TEXT NOT NULL,
  `description` VARCHAR(255) NULL,
  `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default notification email (can be configured later)
INSERT INTO `it_notification_config` (`config_key`, `config_value`, `description`)
VALUES ('it_notification_email', 'it@example.com', 'Email address for IT notifications')
ON DUPLICATE KEY UPDATE `config_value` = VALUES(`config_value`);
