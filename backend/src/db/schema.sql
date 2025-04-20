-- Create purchase_types table if it doesn't exist
CREATE TABLE IF NOT EXISTS purchase_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_name (name),
  UNIQUE KEY unique_name_ar (name_ar)
); 