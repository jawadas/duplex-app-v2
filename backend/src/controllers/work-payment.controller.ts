import { Request, Response, RequestHandler } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '../config/database';
import { AuthenticatedRequest } from '../types/auth.types';

const STORAGE_URL = 'https://objectstorage.me-jeddah-1.oraclecloud.com/p/cUidJvzOJnXy4fGP3_aYtqNVg4uvAFCJAXpKw6UGnqEcIaI0qCutoWEls5g1qNOV/n/ax4vx38nepo3/b/private-bucket/o/';

interface CreatePaymentBody {
  projectId: number;
  amount: number;
  date: string;
  notes?: string;
  duplex_number: string;
  attachment_path?: string;
  created_by?: string;
}

export const createWorkPayment: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized - User not authenticated' });
      return;
    }

    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    const { projectId, amount, date, notes, duplex_number, attachment_paths, created_by } = req.body;
    
    console.log('Extracted values:', {
      projectId,
      amount,
      date,
      duplex_number,
      notes,
      attachment_paths,
      created_by,
      userFromReq: req.user
    });

    if (!projectId || isNaN(projectId) || !amount || isNaN(amount) || !date || !duplex_number) {
      console.log('Validation failed:', {
        hasProjectId: !!projectId,
        isProjectIdValid: !isNaN(projectId),
        hasAmount: !!amount,
        isAmountValid: !isNaN(amount),
        hasDate: !!date,
        hasDuplexNumber: !!duplex_number,
        hasCreatedBy: !!created_by
      });
      
      res.status(400).json({
        error: 'Required fields are missing or invalid. Please provide projectId, amount, date, and duplex_number',
        receivedValues: {
          projectId,
          amount,
          date,
          duplex_number
        }
      });
      return;
    }

    // Verify that the project exists
    const [projects] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM work_projects WHERE id = ?',
      [projectId]
    );

    if (!projects || projects.length === 0) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert the payment
      const [result] = await connection.execute<ResultSetHeader>(`
        INSERT INTO work_payments (
          project_id, 
          amount, 
          date, 
          notes, 
          duplex_number, 
          created_by,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [projectId, amount, date, notes || null, duplex_number, created_by]);

      const paymentId = result.insertId;

      // Insert attachments if they exist
      if (attachment_paths && attachment_paths.length > 0) {
        for (const path of attachment_paths) {
          await connection.execute(`
            INSERT INTO work_payment_attachments (payment_id, attachment_path)
            VALUES (?, ?)
          `, [paymentId, path]);
        }
      }

      await connection.commit();

      // Fetch the newly created payment with project details and attachments
      const [newPayment] = await pool.execute<RowDataPacket[]>(`
        SELECT 
          wp.*, 
          wpr.name as project_name,
          u.full_name as created_by_name,
          GROUP_CONCAT(wpa.attachment_path) as attachment_paths
        FROM work_payments wp 
        LEFT JOIN work_projects wpr ON wp.project_id = wpr.id 
        LEFT JOIN users u ON wp.created_by = u.email
        LEFT JOIN work_payment_attachments wpa ON wp.id = wpa.payment_id
        WHERE wp.id = ?
        GROUP BY wp.id
      `, [paymentId]);

      const payment = newPayment[0];
      if (payment.attachment_paths) {
        payment.attachment_paths = payment.attachment_paths.split(',');
      }

      res.status(201).json({
        success: true,
        message: 'Work payment created successfully',
        data: {
          ...payment,
          amount: Number(payment.amount),
          created_by_name: payment.created_by_name || payment.created_by
        }
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating work payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

interface GetPaymentsQuery {
  projectId?: string;
  duplexNumber?: string;
  [key: string]: string | undefined;
}

export const getAllWorkPayments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { projectId, duplexNumber } = req.query;
    
    let query = `
      SELECT wp.*, wpr.name as project_name
      FROM work_payments wp 
      LEFT JOIN work_projects wpr ON wp.project_id = wpr.id 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (projectId) {
      query += ' AND wp.project_id = ?';
      params.push(projectId);
    }

    if (duplexNumber) {
      query += ' AND wp.duplex_number = ?';
      params.push(duplexNumber);
    }

    query += ' ORDER BY wp.date DESC';

    const [payments] = await pool.execute<RowDataPacket[]>(query, params);
    res.json(payments);
  } catch (error) {
    console.error('Error getting work payments:', error);
    res.status(500).json({ error: 'Error getting work payments' });
  }
};

export const updateWorkPayment: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized - User not authenticated' });
      return;
    }

    const { id } = req.params;
    const { project_id, amount, date, notes, duplex_number, attachment_paths, created_by } = req.body;

    console.log('Update payment request:', {
      id,
      body: req.body,
      user: req.user
    });

    if (!id || !project_id || isNaN(project_id) || !amount || isNaN(amount) || !date || !duplex_number) {
      console.log('Validation failed:', {
        id: { value: id, valid: !!id },
        project_id: { value: project_id, valid: !isNaN(project_id) },
        amount: { value: amount, valid: !isNaN(amount) },
        date: { value: date, valid: !!date },
        duplex_number: { value: duplex_number, valid: !!duplex_number }
      });
      
      res.status(400).json({
        error: 'Required fields are missing or invalid',
        receivedValues: {
          id,
          project_id,
          amount,
          date,
          duplex_number
        }
      });
      return;
    }

    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Update the payment
      await connection.execute(`
        UPDATE work_payments 
        SET 
          project_id = ?, 
          amount = ?, 
          date = ?, 
          notes = ?, 
          duplex_number = ?,
          created_by = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [project_id, amount, date, notes || null, duplex_number, created_by, id]);

      // Get existing attachments
      const [existingAttachments] = await connection.query<RowDataPacket[]>(
        'SELECT attachment_path FROM work_payment_attachments WHERE payment_id = ?',
        [id]
      );

      // Convert existing attachments to array of paths
      const existingPaths = existingAttachments.map((att: RowDataPacket) => att.attachment_path);

      // Find attachments to delete (those that exist in DB but not in the new list)
      const attachmentsToDelete = existingPaths.filter((path: string) => !attachment_paths.includes(path));

      // Delete removed attachments
      if (attachmentsToDelete.length > 0) {
        await connection.query(
          'DELETE FROM work_payment_attachments WHERE payment_id = ? AND attachment_path IN (?)',
          [id, attachmentsToDelete]
        );
      }

      // Find new attachments to add (those that don't exist in DB)
      const newAttachments = attachment_paths.filter((path: string) => !existingPaths.includes(path));

      // Insert new attachments
      if (newAttachments.length > 0) {
        const attachmentValues = newAttachments.map((path: string) => [id, path]);
        await connection.query(
          'INSERT INTO work_payment_attachments (payment_id, attachment_path) VALUES ?',
          [attachmentValues]
        );
      }

      await connection.commit();

      // Fetch the updated payment with project details and attachments
      const [updatedPayment] = await pool.execute<RowDataPacket[]>(`
        SELECT 
          wp.*,
          wpr.name as project_name,
          GROUP_CONCAT(wpa.attachment_path) as attachment_paths
        FROM work_payments wp
        LEFT JOIN work_projects wpr ON wp.project_id = wpr.id
        LEFT JOIN work_payment_attachments wpa ON wp.id = wpa.payment_id
        WHERE wp.id = ?
        GROUP BY wp.id
      `, [id]);

      const payment = updatedPayment[0];
      if (payment.attachment_paths) {
        payment.attachment_paths = payment.attachment_paths.split(',');
      }

      res.json({
        success: true,
        data: payment
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating work payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteWorkPayment: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized - User not authenticated' });
      return;
    }

    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'Payment ID is required' });
      return;
    }

    // Verify that the payment exists and get attachment info
    const [existingPayment] = await pool.query<RowDataPacket[]>(
      'SELECT attachment_path FROM work_payments WHERE id = ?',
      [id]
    );

    if (!existingPayment || existingPayment.length === 0) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    // Delete the payment
    await pool.execute<ResultSetHeader>(
      'DELETE FROM work_payments WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting work payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
