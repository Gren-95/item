-- http://192.168.1.84:3000/-- =====================================================
-- IT Database Schema - Recreated from Scratch
-- All tables prefixed with it_
-- =====================================================

-- =====================================================
-- DATABASE: it
-- =====================================================

USE it;

-- Disable foreign key checks to allow dropping tables with dependencies
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- LOCATION HIERARCHY (Region -> Country -> Plant -> Department -> Area -> Sub_Area)
-- =====================================================

-- Regions (e.g., Europe, Asia, Americas)
DROP TABLE IF EXISTS `it_equipment_region`;
CREATE TABLE `it_equipment_region` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `code` VARCHAR(10) NULL,
    `status` BOOLEAN NOT NULL DEFAULT TRUE,
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_region_name` (`name`),
    KEY `idx_region_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Countries
DROP TABLE IF EXISTS `it_equipment_country`;
CREATE TABLE `it_equipment_country` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `region_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT TRUE,
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_country_name` (`name`),
    KEY `idx_country_region` (`region_id`),
    KEY `idx_country_status` (`status`),
    CONSTRAINT `fk_country_region` FOREIGN KEY (`region_id`) REFERENCES `it_equipment_region` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Plants
DROP TABLE IF EXISTS `it_equipment_plant`;
CREATE TABLE `it_equipment_plant` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `country_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT TRUE,
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_plant_country` (`country_id`),
    KEY `idx_plant_status` (`status`),
    CONSTRAINT `fk_plant_country` FOREIGN KEY (`country_id`) REFERENCES `it_equipment_country` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Departments
DROP TABLE IF EXISTS `it_equipment_department`;
CREATE TABLE `it_equipment_department` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `plant_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT TRUE,
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_dept_plant` (`plant_id`),
    KEY `idx_dept_status` (`status`),
    KEY `idx_dept_name` (`name`),
    CONSTRAINT `fk_dept_plant` FOREIGN KEY (`plant_id`) REFERENCES `it_equipment_plant` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Areas
DROP TABLE IF EXISTS `it_equipment_area`;
CREATE TABLE `it_equipment_area` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `department_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT TRUE,
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_area_dept` (`department_id`),
    KEY `idx_area_status` (`status`),
    CONSTRAINT `fk_area_dept` FOREIGN KEY (`department_id`) REFERENCES `it_equipment_department` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sub_Areas (with coordinates for mapping)
DROP TABLE IF EXISTS `it_equipment_sub_area`;
CREATE TABLE `it_equipment_sub_area` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `area_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `building` VARCHAR(255) NULL,
    `x` FLOAT NULL COMMENT 'X coordinate for mapping',
    `y` FLOAT NULL COMMENT 'Y coordinate for mapping',
    `status` BOOLEAN NOT NULL DEFAULT TRUE,
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_sub_area_area` (`area_id`),
    KEY `idx_sub_area_status` (`status`),
    KEY `idx_sub_area_coords` (`x`, `y`),
    CONSTRAINT `fk_sub_area_area` FOREIGN KEY (`area_id`) REFERENCES `it_equipment_area` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- REFERENCE TABLES
-- =====================================================

-- Equipment Types
DROP TABLE IF EXISTS `it_equipment_type`;
CREATE TABLE `it_equipment_type` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `type_name` VARCHAR(25) NOT NULL,
    `change_interval` TINYINT NULL COMMENT 'Maintenance interval in months',
    `expiry_interval` TINYINT NULL COMMENT 'Expiry interval in years',
    `status` BIT(1) NOT NULL DEFAULT 1 COMMENT '1=Active, 0=Inactive',
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_type_name` (`type_name`),
    KEY `idx_type_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Equipment Product Lines (goes between type and model)
DROP TABLE IF EXISTS `it_equipment_product_line`;
CREATE TABLE `it_equipment_product_line` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `type_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `status` BIT(1) NOT NULL DEFAULT 1 COMMENT '1=Active, 0=Inactive',
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_product_line_type` (`type_id`),
    KEY `idx_product_line_name` (`name`),
    KEY `idx_product_line_status` (`status`),
    CONSTRAINT `fk_product_line_type` FOREIGN KEY (`type_id`) REFERENCES `it_equipment_type` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vendors (e.g., Dell, HP, Lenovo - the manufacturer/brand)
DROP TABLE IF EXISTS `it_equipment_vendor`;
CREATE TABLE `it_equipment_vendor` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_vendor_name` (`name`),
    KEY `idx_vendor_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Suppliers (e.g., Company A, Company B - the purchasing company)
DROP TABLE IF EXISTS `it_equipment_supplier`;
CREATE TABLE `it_equipment_supplier` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NULL,
    `phone_number` VARCHAR(255) NULL,
    `address` VARCHAR(255) NULL,
    `representative_name` VARCHAR(255) NULL,
    `sap_vendor_no` INT NULL,
    `website` VARCHAR(255) NULL,
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_supplier_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Equipment Models
DROP TABLE IF EXISTS `it_equipment_model`;
CREATE TABLE `it_equipment_model` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_line_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `status` BIT(1) NOT NULL DEFAULT 1 COMMENT '1=Active, 0=Inactive',
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_model_product_line` (`product_line_id`),
    KEY `idx_model_name` (`name`),
    KEY `idx_model_status` (`status`),
    CONSTRAINT `fk_model_product_line` FOREIGN KEY (`product_line_id`) REFERENCES `it_equipment_product_line` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Write-off Reasons
DROP TABLE IF EXISTS `it_equipment_write_off_reason`;
CREATE TABLE `it_equipment_write_off_reason` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `reason` VARCHAR(255) NOT NULL,
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- EMPLOYEES
-- =====================================================

DROP TABLE IF EXISTS `it_employees_list`;
CREATE TABLE `it_employees_list` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `employee_no` VARCHAR(9) NOT NULL,
    `user_id` VARCHAR(25) NOT NULL,
    `first_name` VARCHAR(50) NOT NULL,
    `last_name` VARCHAR(50) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `email` VARCHAR(50) NULL,
    `mobile_phone` VARCHAR(255) NULL,
    `manufacturing_operations` VARCHAR(25) NULL,
    `department` VARCHAR(25) NULL,
    `ec_job_family` VARCHAR(25) NULL,
    `ec_job_function` VARCHAR(10) NULL,
    `ec_job_id` INT NULL,
    `ec_employee_type` VARCHAR(1) NULL,
    `language` VARCHAR(10) NULL,
    `location` VARCHAR(25) NULL,
    `region` VARCHAR(25) NULL,
    `employee_type` VARCHAR(25) NULL,
    `manager` VARCHAR(50) NULL,
    `status` INT NOT NULL DEFAULT 1,
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_employee_no` (`employee_no`),
    KEY `idx_employee_user_id` (`user_id`),
    KEY `idx_employee_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- EQUIPMENT BILLS TABLE
-- =====================================================

DROP TABLE IF EXISTS `it_equipment_bills`;
CREATE TABLE `it_equipment_bills` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cerf` BIGINT NOT NULL DEFAULT 0,
    `sap_order_no` VARCHAR(255) NULL,
    `supplier_order_no` VARCHAR(255) NULL,
    `cost` DECIMAL(10, 2) NULL,
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_bills_cerf` (`cerf`),
    KEY `idx_bills_sap_order` (`sap_order_no`),
    KEY `idx_bills_supplier_order` (`supplier_order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- EQUIPMENT COST VS DEPARTMENT TABLE
-- =====================================================

DROP TABLE IF EXISTS `it_equipment_cost_vs_dep`;
CREATE TABLE `it_equipment_cost_vs_dep` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `cost_no` BIGINT UNSIGNED NULL,
    `dep_id` INT UNSIGNED NULL,
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_cost_vs_dep_cost_no` (`cost_no`),
    KEY `idx_cost_vs_dep_dep_id` (`dep_id`),
    CONSTRAINT `fk_cost_vs_dep_department` FOREIGN KEY (`dep_id`) REFERENCES `it_equipment_department` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- MAIN EQUIPMENT TABLE (Dynamic/Flexible Design)
-- =====================================================

DROP TABLE IF EXISTS `it_equipment`;
CREATE TABLE `it_equipment` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `service_tag` VARCHAR(30) NOT NULL,
    `model_id` INT UNSIGNED NULL COMMENT 'Reference to equipment_model table',
    `vendor_id` INT UNSIGNED NULL COMMENT 'Reference to equipment_vendor table (manufacturer/brand)',
    `supplier_id` INT UNSIGNED NULL COMMENT 'Reference to equipment_supplier table (purchasing company)',
    `cerf` BIGINT NOT NULL DEFAULT 0,
    `device_no` BIGINT UNSIGNED NULL,
    `is_personal` BIT(1) NOT NULL DEFAULT b'0' COMMENT '0=Company, 1=Personal',
    `purchase_date` DATE NOT NULL,
    `warranty_expiry_date` DATE NOT NULL,
    `is_written_off` INT UNSIGNED NULL COMMENT 'NULL = not written off, otherwise references it_equipment_write_off_reason.id',
    `teamviewer` BIGINT NULL,
    `imei1` BIGINT NULL,
    `imei2` BIGINT NULL,
    `ip` VARCHAR(45) NULL COMMENT 'IP address for device',
    `mac_addresses` text NULL COMMENT 'MAC addresses for device (separated by comma)',
    `bill_id` BIGINT UNSIGNED NULL COMMENT 'Reference to bill table',
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_service_tag` (`service_tag`),
    KEY `idx_equipment_model` (`model_id`),
    KEY `idx_equipment_vendor` (`vendor_id`),
    KEY `idx_equipment_supplier` (`supplier_id`),
    KEY `idx_equipment_cerf` (`cerf`),
    KEY `idx_equipment_personal` (`is_personal`),
    KEY `idx_equipment_written_off` (`is_written_off`),
    KEY `idx_equipment_bill` (`bill_id`),
    CONSTRAINT `fk_equipment_model` FOREIGN KEY (`model_id`) REFERENCES `it_equipment_model` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_equipment_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `it_equipment_vendor` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_equipment_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `it_equipment_supplier` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_equipment_written_off` FOREIGN KEY (`is_written_off`) REFERENCES `it_equipment_write_off_reason` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_equipment_bill` FOREIGN KEY (`bill_id`) REFERENCES `it_equipment_bills` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- AUDIT PERIODS TABLE
-- =====================================================

DROP TABLE IF EXISTS `it_equipment_audit_periods`;
CREATE TABLE `it_equipment_audit_periods` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `auditors` VARCHAR(255) NULL,
    `comment` TEXT NULL,
    `start` DATE NOT NULL,
    `end` DATE NULL,
    PRIMARY KEY (`id`),
    KEY `idx_audit_periods_start` (`start`),
    KEY `idx_audit_periods_end` (`end`),
    KEY `idx_audit_periods_range` (`start`, `end`),
    CONSTRAINT `chk_audit_period_date_range` CHECK (`end` IS NULL OR `end` >= `start`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- INVENTORY PERIODS TABLE (Independent inventory cycles)
-- =====================================================

DROP TABLE IF EXISTS `it_inventory_period`;
CREATE TABLE `it_inventory_period` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `inventory_nr` VARCHAR(50) NOT NULL COMMENT 'Inventory number/identifier (e.g., "INV-2024-Q1")',
    `start_date` DATE NOT NULL COMMENT 'Start date of inventory period',
    `end_date` DATE NOT NULL COMMENT 'End date of inventory period',
    `comment` TEXT NULL COMMENT 'Optional description or notes about the inventory period',
    `confirmed_by` VARCHAR(9) NULL COMMENT 'Employee number - who confirmed this inventory period',
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_inventory_nr` (`inventory_nr`),
    KEY `idx_inventory_date_start` (`start_date`),
    KEY `idx_inventory_date_end` (`end_date`),
    KEY `idx_inventory_date_range` (`start_date`, `end_date`),
    KEY `idx_inventory_confirmed_by` (`confirmed_by`),
    CONSTRAINT `chk_inventory_date_range` CHECK (`end_date` >= `start_date`),
    CONSTRAINT `fk_inventory_confirmed_by` FOREIGN KEY (`confirmed_by`) REFERENCES `it_employees_list` (`employee_no`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- EQUIPMENT LOG TABLE
-- =====================================================

DROP TABLE IF EXISTS `it_equipment_log`;
CREATE TABLE `it_equipment_log` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `equipment_id` INT UNSIGNED NOT NULL,
    `service_tag` VARCHAR(30) NOT NULL,
    `is_written_off` INT UNSIGNED NULL COMMENT 'NULL = not written off, otherwise references it_equipment_write_off_reason.id',
    `assigned_to` VARCHAR(9) NULL COMMENT 'Employee number - assigned employee',
    `equipment_sub_area_id` INT UNSIGNED NULL COMMENT 'Current location - sub_area level (derived from sub_area, not denormalized)',
    `inventory_period_id` INT UNSIGNED NULL COMMENT 'Reference to current inventory period',
    `updated_by` VARCHAR(9) NULL COMMENT 'Employee number - who updated this log entry',
    `comment` TEXT NULL COMMENT 'General comments/notes about the equipment',
    `audit_period_id` INT UNSIGNED NULL COMMENT 'Reference to audit period',
    `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_log_equipment` (`equipment_id`),
    KEY `idx_log_service_tag` (`service_tag`),
    KEY `idx_log_assigned_to` (`assigned_to`),
    KEY `idx_log_sub_area` (`equipment_sub_area_id`),
    KEY `idx_log_inventory_period` (`inventory_period_id`),
    KEY `idx_log_created` (`created`),
    KEY `idx_log_audit_period` (`audit_period_id`),
    KEY `idx_log_updated` (`updated`),
    CONSTRAINT `fk_log_equipment` FOREIGN KEY (`equipment_id`) REFERENCES `it_equipment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_log_sub_area` FOREIGN KEY (`equipment_sub_area_id`) REFERENCES `it_equipment_sub_area` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_log_inventory_period` FOREIGN KEY (`inventory_period_id`) REFERENCES `it_inventory_period` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_log_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `it_employees_list` (`employee_no`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_log_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `it_employees_list` (`employee_no`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_log_audit_period` FOREIGN KEY (`audit_period_id`) REFERENCES `it_equipment_audit_periods` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- EQUIPMENT AUDIT TABLE (Combines equipment and log data for comparison)
-- =====================================================

DROP TABLE IF EXISTS `it_equipment_audit`;
CREATE TABLE `it_equipment_audit` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `equipment_id` INT UNSIGNED NOT NULL COMMENT 'Reference to equipment table',
    `audit_period_id` INT UNSIGNED NULL COMMENT 'Reference to audit period',
    `service_tag` VARCHAR(30) NOT NULL,
    `model_id` INT UNSIGNED NULL COMMENT 'Reference to equipment_model table',
    `vendor_id` INT UNSIGNED NULL COMMENT 'Reference to equipment_vendor table (manufacturer/brand)',
    `supplier_id` INT UNSIGNED NULL COMMENT 'Reference to equipment_supplier table (purchasing company)',
    `cerf` BIGINT NOT NULL DEFAULT 0,
    `device_no` BIGINT UNSIGNED NULL,
    `is_personal` BIT(1) NOT NULL DEFAULT b'0' COMMENT '0=Company, 1=Personal',
    `purchase_date` DATE NOT NULL,
    `warranty_expiry_date` DATE NOT NULL,
    `is_written_off` INT UNSIGNED NULL COMMENT 'NULL = not written off, otherwise references it_equipment_write_off_reason.id',
    `teamviewer` BIGINT NULL,
    `imei1` BIGINT NULL,
    `imei2` BIGINT NULL,
    `ip` VARCHAR(45) NULL COMMENT 'IP address for device',
    `mac_addresses` TEXT NULL COMMENT 'MAC addresses for device (separated by comma)',
    `assigned_to` VARCHAR(9) NULL COMMENT 'Employee number - who the equipment is assigned to',
    `equipment_sub_area_id` INT UNSIGNED NULL COMMENT 'Current location - sub_area level',
    `inventory_period_id` INT UNSIGNED NULL COMMENT 'Reference to current inventory period',
    `updated_by` VARCHAR(9) NULL COMMENT 'Employee number - who last updated the record',
    `comment` TEXT NULL COMMENT 'General comments/notes about the equipment',
    `bill_id` BIGINT UNSIGNED NULL COMMENT 'Reference to bill table',
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_audit_equipment` (`equipment_id`),
    KEY `idx_audit_period` (`audit_period_id`),
    KEY `idx_audit_service_tag` (`service_tag`),
    KEY `idx_audit_model` (`model_id`),
    KEY `idx_audit_vendor` (`vendor_id`),
    KEY `idx_audit_supplier` (`supplier_id`),
    KEY `idx_audit_cerf` (`cerf`),
    KEY `idx_audit_assigned_to` (`assigned_to`),
    KEY `idx_audit_sub_area` (`equipment_sub_area_id`),
    KEY `idx_audit_inventory_period` (`inventory_period_id`),
    KEY `idx_audit_created` (`created`),
    KEY `idx_audit_updated` (`updated`),
    CONSTRAINT `fk_audit_equipment` FOREIGN KEY (`equipment_id`) REFERENCES `it_equipment` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_audit_audit_period` FOREIGN KEY (`audit_period_id`) REFERENCES `it_equipment_audit_periods` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_audit_model` FOREIGN KEY (`model_id`) REFERENCES `it_equipment_model` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_audit_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `it_equipment_vendor` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_audit_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `it_equipment_supplier` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_audit_written_off` FOREIGN KEY (`is_written_off`) REFERENCES `it_equipment_write_off_reason` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_audit_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `it_employees_list` (`employee_no`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_audit_sub_area` FOREIGN KEY (`equipment_sub_area_id`) REFERENCES `it_equipment_sub_area` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_audit_inventory_period` FOREIGN KEY (`inventory_period_id`) REFERENCES `it_inventory_period` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_audit_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `it_employees_list` (`employee_no`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_audit_bill` FOREIGN KEY (`bill_id`) REFERENCES `it_equipment_bills` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


DROP TABLE IF EXISTS `it_request`;
CREATE TABLE `it_request` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `created_by` VARCHAR(9) NOT NULL COMMENT 'Employee number - who created the request',
    `permission_required` VARCHAR(255) NOT NULL,
    `action_type` VARCHAR(255) NOT NULL,
    `action_data` TEXT NOT NULL,
    `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    `ip` VARCHAR(45) NULL,
    `reviewed_by` VARCHAR(9) NULL COMMENT 'Employee number - who reviewed/rejected the request',
    `reviewed_at` TIMESTAMP NULL,
    `rejection_reason` TEXT NULL,
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_request_created_by` (`created_by`),
    KEY `idx_request_status` (`status`),
    KEY `idx_request_created` (`created`),
    KEY `idx_request_reviewed_by` (`reviewed_by`),
    CONSTRAINT `fk_request_created_by` FOREIGN KEY (`created_by`) REFERENCES `it_employees_list` (`employee_no`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_request_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `it_employees_list` (`employee_no`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================================================
-- MAP TABLES
-- =====================================================

-- Categories
DROP TABLE IF EXISTS `it_map_categories`;
CREATE TABLE `it_map_categories` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Types
DROP TABLE IF EXISTS `it_map_types`;
CREATE TABLE `it_map_types` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `action` ENUM('image', 'temp', 'info', 'file') NULL,
    `category` INT UNSIGNED NULL,
    PRIMARY KEY (`id`),
    KEY `idx_type_category` (`category`),
    CONSTRAINT `fk_map_type_category` FOREIGN KEY (`category`) REFERENCES `it_map_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Models
DROP TABLE IF EXISTS `it_map_models`;
CREATE TABLE `it_map_models` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `type_id` INT UNSIGNED NOT NULL,
    `path` VARCHAR(255) NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_model_type` (`type_id`),
    KEY `idx_model_path` (`path`),
    CONSTRAINT `fk_map_model_type` FOREIGN KEY (`type_id`) REFERENCES `it_map_types` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Devices
DROP TABLE IF EXISTS `it_map_devices`;
CREATE TABLE `it_map_devices` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `model_id` INT UNSIGNED NOT NULL,
    `category_id` INT UNSIGNED NULL,
    `building` VARCHAR(255) NULL,
    `ip` VARCHAR(255) NULL,
    `mac` CHAR(17) NULL,
    `x` FLOAT NOT NULL,
    `y` FLOAT NOT NULL,
    `degrees` INT NULL,
    `image_path` VARCHAR(255) NULL,
    `comment` VARCHAR(255) NULL,
    `date` DATE NULL,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_device_model` (`model_id`),
    KEY `idx_device_category` (`category_id`),
    KEY `idx_device_active` (`active`),
    CONSTRAINT `fk_map_device_model` FOREIGN KEY (`model_id`) REFERENCES `it_map_models` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_map_device_category` FOREIGN KEY (`category_id`) REFERENCES `it_map_categories` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PC PASSWORD TABLE
-- =====================================================

DROP TABLE IF EXISTS `it_pc_pw`;
CREATE TABLE `it_pc_pw` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user` VARCHAR(255) NOT NULL,
    `evocon` VARCHAR(255) NULL,
    `pw` VARCHAR(255) NOT NULL,
    `status` INT UNSIGNED NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    KEY `idx_pc_pw_user` (`user`),
    KEY `idx_pc_pw_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- STORED PROCEDURES
-- =====================================================

DELIMITER $$

-- Procedure: Update equipment with audit data
-- Requires inventory_period_id and confirmed_by (employee number)
DROP PROCEDURE IF EXISTS `sp_update_equipment_from_audit`$$
CREATE PROCEDURE `sp_update_equipment_from_audit`(
    IN p_inventory_period_id INT UNSIGNED,
    IN p_confirmed_by VARCHAR(9)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    -- Validate that inventory period exists
    IF NOT EXISTS (SELECT 1 FROM `it_inventory_period` WHERE `id` = p_inventory_period_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Inventory period does not exist';
    END IF;

    -- Validate that confirmed_by employee exists
    IF NOT EXISTS (SELECT 1 FROM `it_employees_list` WHERE `employee_no` = p_confirmed_by) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Employee does not exist';
    END IF;

    START TRANSACTION;

    -- Update equipment table with audit data for the specified inventory period
    UPDATE `it_equipment` e
    INNER JOIN `it_equipment_audit` a ON e.`id` = a.`equipment_id`
    SET
        e.`service_tag` = a.`service_tag`,
        e.`model_id` = a.`model_id`,
        e.`vendor_id` = a.`vendor_id`,
        e.`supplier_id` = a.`supplier_id`,
        e.`cerf` = a.`cerf`,
        e.`device_no` = a.`device_no`,
        e.`is_personal` = a.`is_personal`,
        e.`purchase_date` = a.`purchase_date`,
        e.`warranty_expiry_date` = a.`warranty_expiry_date`,
        e.`is_written_off` = a.`is_written_off`,
        e.`teamviewer` = a.`teamviewer`,
        e.`imei1` = a.`imei1`,
        e.`imei2` = a.`imei2`,
        e.`ip` = a.`ip`,
        e.`mac_addresses` = a.`mac_addresses`,
        e.`assigned_to` = a.`assigned_to`,
        e.`equipment_sub_area_id` = a.`equipment_sub_area_id`,
        e.`updated_by` = p_confirmed_by,
        e.`comment` = a.`comment`,
        e.`audit_period_id` = a.`audit_period_id`,
        e.`bill_id` = a.`bill_id`,
        e.`updated` = CURRENT_TIMESTAMP
    WHERE a.`inventory_period_id` = p_inventory_period_id;

    -- Insert log entries for all updated equipment records
    INSERT INTO `it_equipment_log` (
        `equipment_id`,
        `service_tag`,
        `is_written_off`,
        `assigned_to`,
        `equipment_sub_area_id`,
        `inventory_period_id`,
        `updated_by`,
        `comment`,
        `audit_period_id`,
        `created`,
        `updated`
    )
    SELECT
        a.`equipment_id`,
        a.`service_tag`,
        a.`is_written_off`,
        a.`assigned_to`,
        a.`equipment_sub_area_id`,
        a.`inventory_period_id`,
        p_confirmed_by,
        CONCAT(COALESCE(a.`comment`, ''), ' [Updated from audit - Inventory Period: ', p_inventory_period_id, ']') AS `comment`,
        a.`audit_period_id`,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    FROM `it_equipment_audit` a
    WHERE a.`inventory_period_id` = p_inventory_period_id;

    -- Update the inventory period with confirmed_by
    UPDATE `it_inventory_period`
    SET `confirmed_by` = p_confirmed_by,
        `updated` = CURRENT_TIMESTAMP
    WHERE `id` = p_inventory_period_id;

    COMMIT;
END$$

DELIMITER ;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
