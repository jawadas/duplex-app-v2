import pool from '../database';

async function createPurchasesAttachmentsTable() {
  try {
    // Create the purchases_attachments table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS purchases_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        purchase_id INT NOT NULL,
        attachment_path VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
      )
    `);

    console.log('Successfully created purchases_attachments table');
  } catch (error) {
    console.error('Error creating purchases_attachments table:', error);
    throw error;
  }
}

// Run if this file is executed directly
if (require.main === module) {
  createPurchasesAttachmentsTable()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default createPurchasesAttachmentsTable; 