-- Remove unused audit_period_id columns and references
-- Drops columns, constraints, and refreshes the stored procedure without audit_period_id

-- Drop foreign keys before dropping columns
ALTER TABLE it_equipment_log DROP FOREIGN KEY fk_log_audit_period;
ALTER TABLE it_equipment_audit DROP FOREIGN KEY fk_audit_audit_period;

-- Drop columns
ALTER TABLE it_equipment_log DROP COLUMN audit_period_id;
ALTER TABLE it_equipment_audit DROP COLUMN audit_period_id;

-- Refresh stored procedure without audit_period_id
DROP PROCEDURE IF EXISTS `sp_update_equipment_from_audit`;
DELIMITER $$
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

