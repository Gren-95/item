-- Add users and user_permissions tables
-- These tables manage user accounts and permissions for the IT Equipment Management system
-- The users table stores user account information
-- The user_permissions table stores permission grants linked to users
-- These tables are created in the 'core' database

-- Create core database if it doesn't exist
CREATE DATABASE IF NOT EXISTS `core` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create users table in core database
CREATE TABLE IF NOT EXISTS `core`.`users` (
    `id` INT NOT NULL PRIMARY KEY,
    `employee_no` VARCHAR(4) NULL,
    `user` VARCHAR(32) NOT NULL,
    `name` TEXT NOT NULL,
    `mail` VARCHAR(255) NOT NULL,
    `active` TINYINT(1) NOT NULL DEFAULT 1,
    `reset_pass` TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY `uk_user` (`user`),
    KEY `idx_employee_no` (`employee_no`),
    KEY `idx_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_permissions table in core database
CREATE TABLE IF NOT EXISTS `core`.`user_permissions` (
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `access_key` VARCHAR(64) NOT NULL,
    `value` VARCHAR(32) NOT NULL,
    `comment` VARCHAR(64) NOT NULL,
    `start_date` DATE NOT NULL DEFAULT '1970-01-01',
    `end_date` DATE NOT NULL DEFAULT '2099-12-31',
    `created` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_user_id` (`user_id`),
    KEY `idx_access_key` (`access_key`),
    FOREIGN KEY (`user_id`) REFERENCES `core`.`users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert initial user (Efe Marko Güldere) into core database
INSERT INTO `core`.`users` (
    `id`,
    `employee_no`,
    `user`,
    `name`,
    `mail`,
    `active`,
    `reset_pass`
) VALUES (
    293,
    '9421',
    '438928',
    'Efe Marko Güldere',
    'eguldere@jeldwen.com',
    1,
    0
) ON DUPLICATE KEY UPDATE
    `employee_no` = VALUES(`employee_no`),
    `name` = VALUES(`name`),
    `mail` = VALUES(`mail`),
    `active` = VALUES(`active`),
    `reset_pass` = VALUES(`reset_pass`);

