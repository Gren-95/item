-- Add sample employees to it_employees_list
-- This migration inserts sample employee data for testing and development

INSERT INTO `it_employees_list` (
    `employee_no`,
    `user_id`,
    `first_name`,
    `last_name`,
    `name`,
    `email`,
    `mobile_phone`,
    `department`,
    `location`,
    `region`,
    `employee_type`,
    `status`
) VALUES
    ('EMP001', 'jsmith', 'John', 'Smith', 'John Smith', 'john.smith@example.com', '+1-555-0101', 'IT', 'New York', 'North America', 'Full-time', 1),
    ('EMP002', 'mjohnson', 'Mary', 'Johnson', 'Mary Johnson', 'mary.johnson@example.com', '+1-555-0102', 'IT', 'New York', 'North America', 'Full-time', 1),
    ('EMP003', 'dwilliams', 'David', 'Williams', 'David Williams', 'david.williams@example.com', '+1-555-0103', 'IT', 'Chicago', 'North America', 'Full-time', 1),
    ('EMP004', 'sbrown', 'Sarah', 'Brown', 'Sarah Brown', 'sarah.brown@example.com', '+1-555-0104', 'IT', 'Chicago', 'North America', 'Full-time', 1),
    ('EMP005', 'mjones', 'Michael', 'Jones', 'Michael Jones', 'michael.jones@example.com', '+1-555-0105', 'IT', 'Los Angeles', 'North America', 'Full-time', 1),
    ('EMP006', 'lgarcia', 'Lisa', 'Garcia', 'Lisa Garcia', 'lisa.garcia@example.com', '+1-555-0106', 'IT', 'Los Angeles', 'North America', 'Full-time', 1),
    ('EMP007', 'rmiller', 'Robert', 'Miller', 'Robert Miller', 'robert.miller@example.com', '+1-555-0107', 'IT', 'Boston', 'North America', 'Full-time', 1),
    ('EMP008', 'jdavis', 'Jennifer', 'Davis', 'Jennifer Davis', 'jennifer.davis@example.com', '+1-555-0108', 'IT', 'Boston', 'North America', 'Full-time', 1),
    ('EMP009', 'wrodriguez', 'William', 'Rodriguez', 'William Rodriguez', 'william.rodriguez@example.com', '+1-555-0109', 'IT', 'Seattle', 'North America', 'Full-time', 1),
    ('EMP010', 'amartinez', 'Amanda', 'Martinez', 'Amanda Martinez', 'amanda.martinez@example.com', '+1-555-0110', 'IT', 'Seattle', 'North America', 'Full-time', 1)
ON DUPLICATE KEY UPDATE
    `user_id` = VALUES(`user_id`),
    `first_name` = VALUES(`first_name`),
    `last_name` = VALUES(`last_name`),
    `name` = VALUES(`name`),
    `email` = VALUES(`email`),
    `mobile_phone` = VALUES(`mobile_phone`),
    `department` = VALUES(`department`),
    `location` = VALUES(`location`),
    `region` = VALUES(`region`),
    `employee_type` = VALUES(`employee_type`),
    `status` = VALUES(`status`);

