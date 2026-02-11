-- =====================================================
-- Migration 009: Add structured proposed location fields
-- Stores department_id, area_name, and sub_area_name
-- so approval can happen without a modal
-- =====================================================

USE it;

ALTER TABLE `it_equipment_audit`
  ADD COLUMN `proposed_department_id` INT NULL DEFAULT NULL
    COMMENT 'Department ID selected by auditor for the proposed location'
    AFTER `proposed_location_status`,
  ADD COLUMN `proposed_area_name` VARCHAR(255) NULL DEFAULT NULL
    COMMENT 'Area name entered/selected by auditor for proposed location'
    AFTER `proposed_department_id`,
  ADD COLUMN `proposed_sub_area_name` VARCHAR(255) NULL DEFAULT NULL
    COMMENT 'Sub-area name entered/selected by auditor for proposed location'
    AFTER `proposed_area_name`;
