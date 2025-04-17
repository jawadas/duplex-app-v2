import pool from './database';

const migrateWorkTypes = async () => {
  try {
    // Drop existing tables if they exist
    await pool.execute('DROP TABLE IF EXISTS labor_payments');
    await pool.execute('DROP TABLE IF EXISTS work_types');

    // Create new tables
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS work_names (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS labor_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        worker_name VARCHAR(255) NOT NULL,
        duplex_number INT NOT NULL,
        work_name_id INT NOT NULL,
        FOREIGN KEY (work_name_id) REFERENCES work_names(id),
        payment_date DATE NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        notes TEXT,
        attachment VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateWorkTypes();
