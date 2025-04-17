import pool from '../database';

async function addAttachmentPathColumn() {
  try {
    // Check if column exists
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'work_payments' 
      AND COLUMN_NAME = 'attachment_path'
    `);

    if (Array.isArray(columns) && columns.length === 0) {
      // Add attachment_path column if it doesn't exist
      await pool.execute(`
        ALTER TABLE work_payments
        ADD COLUMN attachment_path VARCHAR(255)
      `);
      console.log('Successfully added attachment_path column to work_payments table');
    } else {
      console.log('attachment_path column already exists');
    }

  } catch (error) {
    console.error('Error adding attachment_path column:', error);
    throw error;
  }
}

// Run the migration
addAttachmentPathColumn()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
