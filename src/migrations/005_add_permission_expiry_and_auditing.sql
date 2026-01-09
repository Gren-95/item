-- Add expiry_date and added_by_user_id columns to it_user_permissions table
-- This migration adds auditing capabilities to track when permissions expire
-- and who added each permission

-- Add expiry_date column (nullable DATE)
ALTER TABLE it_user_permissions
ADD COLUMN expiry_date DATE NULL AFTER comment;

-- Add added_by_user_id column (nullable VARCHAR(50)) to track who added the permission
ALTER TABLE it_user_permissions
ADD COLUMN added_by_user_id VARCHAR(50) NULL AFTER expiry_date;

-- Add index on expiry_date for efficient queries
ALTER TABLE it_user_permissions
ADD INDEX idx_expiry_date (expiry_date);

-- Add index on added_by_user_id for auditing queries
ALTER TABLE it_user_permissions
ADD INDEX idx_added_by_user (added_by_user_id);
