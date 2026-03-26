-- =====================================================
-- Migration 010: Seed test equipment data for E2E tests
-- Creates minimal location hierarchy, type hierarchy,
-- vendor, equipment, and log entry for testing
-- =====================================================

-- Location hierarchy: Region → Country → Plant → Department → Area → Sub-Area
INSERT IGNORE INTO `it_equipment_region` (`id`, `name`, `status`) VALUES (1, 'Europe', 1);
INSERT IGNORE INTO `it_equipment_country` (`id`, `name`, `region_id`, `status`) VALUES (1, 'Estonia', 1, 1);
INSERT IGNORE INTO `it_equipment_plant` (`id`, `name`, `country_id`, `status`) VALUES (1, 'Tallinn', 1, 1);
INSERT IGNORE INTO `it_equipment_department` (`id`, `name`, `plant_id`, `status`) VALUES (1, 'IT', 1, 1);
INSERT IGNORE INTO `it_equipment_area` (`id`, `name`, `department_id`, `status`) VALUES (1, 'Office', 1, 1);
INSERT IGNORE INTO `it_equipment_sub_area` (`id`, `name`, `area_id`, `status`) VALUES (1, 'Room 101', 1, 1);

-- Type hierarchy: Type → Product Line → Model
INSERT IGNORE INTO `it_equipment_type` (`id`, `type_name`, `status`) VALUES (1, 'Laptop', 1);
INSERT IGNORE INTO `it_equipment_product_line` (`id`, `name`, `type_id`, `status`) VALUES (1, 'Latitude', 1, 1);
INSERT IGNORE INTO `it_equipment_model` (`id`, `name`, `product_line_id`, `status`) VALUES (1, 'Latitude 5540', 1, 1);

-- Vendor (no status column)
INSERT IGNORE INTO `it_equipment_vendor` (`id`, `name`) VALUES (1, 'Dell');

-- Write-off reason (uses 'reason' column, no status)
INSERT IGNORE INTO `it_equipment_write_off_reason` (`id`, `reason`) VALUES (1, 'End of life');

-- Equipment item (id=1 used by many E2E tests)
INSERT IGNORE INTO `it_equipment` (`id`, `service_tag`, `model_id`, `vendor_id`, `purchase_date`, `warranty_expiry_date`)
VALUES (1, 'TEST-SVC-001', 1, 1, '2024-01-15', '2027-01-15');

-- Log entry for the equipment (required by edit page)
INSERT IGNORE INTO `it_equipment_log` (`id`, `equipment_id`, `service_tag`, `assigned_to`, `equipment_sub_area_id`, `comment`)
VALUES (1, 1, 'TEST-SVC-001', 'EMP001', 1, 'Initial test equipment setup');

-- PC password entry (for pc-pw tests)
INSERT IGNORE INTO `it_pc_pw` (`id`, `user`, `evocon`, `pw`, `status`)
VALUES (1, 'testpc', 'EVOCON01', 'testpass123', 1);
