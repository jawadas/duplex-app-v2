-- Migrate static purchase types to the database
-- Run this script to insert the default purchase types from the frontend enum

-- First, ensure the purchase_types table exists
CREATE TABLE IF NOT EXISTS purchase_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_name (name),
  UNIQUE KEY unique_name_ar (name_ar)
);

-- Insert Furniture type if it doesn't exist
INSERT IGNORE INTO purchase_types (name, name_ar, created_by) 
VALUES ('Furniture', 'أثاث', 'migration_script');

-- Insert Electronics type if it doesn't exist
INSERT IGNORE INTO purchase_types (name, name_ar, created_by) 
VALUES ('Electronics', 'إلكترونيات', 'migration_script');

-- Insert Construction type if it doesn't exist
INSERT IGNORE INTO purchase_types (name, name_ar, created_by) 
VALUES ('Construction', 'مواد البناء', 'migration_script');

-- Insert Miscellaneous type if it doesn't exist
INSERT IGNORE INTO purchase_types (name, name_ar, created_by) 
VALUES ('Miscellaneous', 'متنوع', 'migration_script');

-- Insert Cement type if it doesn't exist
INSERT IGNORE INTO purchase_types (name, name_ar, created_by) 
VALUES ('Cement', 'اسمنت', 'migration_script');

-- Insert Sand type if it doesn't exist
INSERT IGNORE INTO purchase_types (name, name_ar, created_by) 
VALUES ('Sand', 'رمل', 'migration_script');

-- Insert Water type if it doesn't exist
INSERT IGNORE INTO purchase_types (name, name_ar, created_by) 
VALUES ('Water', 'ماء', 'migration_script');

-- Insert Pulp type if it doesn't exist
INSERT IGNORE INTO purchase_types (name, name_ar, created_by) 
VALUES ('Pulp', 'لمبات', 'migration_script'); 