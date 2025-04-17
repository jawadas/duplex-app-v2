import pool from '../database';
import { RowDataPacket } from 'mysql2';

interface PaymentWithAttachment extends RowDataPacket {
  id: number;
  attachment_path: string;
}

async function migrateAttachments() {
  try {
    // Create the new attachments table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS work_payment_attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        payment_id INT NOT NULL,
        attachment_path VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (payment_id) REFERENCES work_payments(id) ON DELETE CASCADE
      )
    `);

    // Migrate existing attachments
    const [payments] = await pool.execute<PaymentWithAttachment[]>(`
      SELECT id, attachment_path 
      FROM work_payments 
      WHERE attachment_path IS NOT NULL
    `);

    for (const payment of payments) {
      if (payment.attachment_path) {
        await pool.execute(`
          INSERT INTO work_payment_attachments (payment_id, attachment_path)
          VALUES (?, ?)
        `, [payment.id, payment.attachment_path]);
      }
    }

    // Keep the original column for backward compatibility
    // We can remove it later once we're sure everything works
    console.log('Successfully migrated attachments to new table');
  } catch (error) {
    console.error('Error migrating attachments:', error);
    throw error;
  }
}

export default migrateAttachments; 