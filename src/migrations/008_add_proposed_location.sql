-- =====================================================
-- Migration 008: Add proposed location fields to audit table
-- Allows auditors to enter free-text locations during audit
-- when the needed area/sub-area is not in the dropdown
-- =====================================================

USE it;

-- Add proposed_location (free-text name) and proposed_location_status columns
ALTER TABLE `it_equipment_audit`
  ADD COLUMN `proposed_location` VARCHAR(500) NULL DEFAULT NULL
    COMMENT 'Free-text location name entered by auditor when location not in dropdowns'
    AFTER `equipment_sub_area_id`,
  ADD COLUMN `proposed_location_status` ENUM('pending', 'approved', 'rejected') NULL DEFAULT NULL
    COMMENT 'Status of the proposed location: pending review, approved (created in hierarchy), or rejected'
    AFTER `proposed_location`;

-- Index for quickly finding audit entries with pending proposed locations
CREATE INDEX `idx_audit_proposed_status` ON `it_equipment_audit` (`proposed_location_status`);
