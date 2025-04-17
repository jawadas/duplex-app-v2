import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import pool from '../config/database';
import { WorkProject, Payment } from '../types/labor.types';

export const createWorkProject = async (req: Request, res: Response) => {
  try {
    const { name, totalPrice, duration, startDate, notes, duplex_number, created_by } = req.body;
    
    console.log('Received project data:', {
      name,
      totalPrice,
      duration,
      startDate,
      notes,
      duplex_number,
      created_by
    });

    // Validate required fields
    if (!name || totalPrice === undefined || !startDate || !duplex_number) {
      return res.status(400).json({
        error: 'Required fields are missing. Please provide name, totalPrice, startDate, and duplex_number'
      });
    }

    // Ensure all numeric fields are valid numbers
    const validatedTotalPrice = Number(totalPrice);
    const validatedDuration = duration ? Number(duration) : 0;
    const validatedDuplexNumber = Number(duplex_number);

    if (isNaN(validatedTotalPrice) || isNaN(validatedDuplexNumber) || (duration !== undefined && isNaN(validatedDuration))) {
      return res.status(400).json({
        error: 'Invalid numeric values provided for totalPrice, duration, or duplex_number'
      });
    }

    // Use null for optional fields if they're undefined or empty
    const safeNotes = notes || null;
    const safeCreatedBy = created_by || null;

    // Format project name: "name - duplex(number)"
    const fullName = `${name} - duplex(${duplex_number})`;

    console.log('Executing SQL with values:', {
      fullName,
      validatedTotalPrice,
      validatedDuration,
      startDate,
      safeNotes,
      validatedDuplexNumber,
      safeCreatedBy
    });

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO work_projects (name, total_price, duration, start_date, notes, duplex_number, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [fullName, validatedTotalPrice, validatedDuration, startDate, safeNotes, validatedDuplexNumber, safeCreatedBy]
    );

    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM work_projects WHERE id = ?',
      [result.insertId]
    );

    console.log('Retrieved project from database:', rows[0]);

    // Format the response to match frontend expectations
    const newProject = {
      id: rows[0].id,
      name: rows[0].name,
      totalPrice: Number(rows[0].total_price),
      duration: Number(rows[0].duration),
      startDate: rows[0].start_date,
      notes: rows[0].notes,
      duplex_number: rows[0].duplex_number,
      created_by: rows[0].created_by
    };

    res.status(201).json(newProject);
  } catch (error) {
    console.error('Error creating work project:', error);
    res.status(500).json({ error: 'Failed to create work project' });
  }
};

export const getWorkProjectById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [project] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM work_projects WHERE id = ?',
      [id]
    );

    if (!project[0]) {
      return res.status(404).json({ error: 'Work project not found' });
    }

    res.json(project[0]);
  } catch (error) {
    console.error('Error getting work project:', error);
    res.status(500).json({ error: 'Failed to get work project' });
  }
};

export const getWorkProjectPayments = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    
    // First, let's debug the raw data
    const [rawAttachments] = await pool.execute<RowDataPacket[]>(
      `SELECT payment_id, attachment_path 
       FROM work_payment_attachments 
       WHERE payment_id IN (SELECT id FROM work_payments WHERE project_id = ?)`,
      [projectId]
    );
    console.log('Raw attachments data:', JSON.stringify(rawAttachments, null, 2));

    const [payments] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        wp.*,
        GROUP_CONCAT(DISTINCT wpa.attachment_path) as attachment_paths
      FROM work_payments wp 
      LEFT JOIN work_payment_attachments wpa ON wp.id = wpa.payment_id
      WHERE wp.project_id = ?
      GROUP BY wp.id
      ORDER BY wp.date DESC`,
      [projectId]
    );

    console.log('Payments with attachments:', JSON.stringify(payments, null, 2));

    const [project] = await pool.execute<RowDataPacket[]>(
      'SELECT *, (SELECT COALESCE(SUM(amount), 0) FROM work_payments WHERE project_id = ?) as total_paid FROM work_projects WHERE id = ?',
      [projectId, projectId]
    );

    // Process attachment paths
    const processedPayments = payments.map(payment => {
      const paths = payment.attachment_paths ? 
        payment.attachment_paths.split(',').filter(Boolean) : 
        [];
      console.log(`Processing payment ${payment.id} attachments:`, paths);
      return {
        ...payment,
        attachment_paths: paths
      };
    });

    console.log('Processed payments:', JSON.stringify(processedPayments, null, 2));

    res.status(200).json({
      project: project[0],
      payments: processedPayments
    });
  } catch (error) {
    console.error('Error fetching work project payments:', error);
    res.status(500).json({ error: 'Failed to fetch work project payments' });
  }
};

export const addWorkProjectPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log('Raw request data:', {
      body: req.body,
      params: req.params,
      headers: req.headers['content-type']
    });
    
    // Handle form data fields
    const amount = req.body.amount ? parseFloat(req.body.amount) : 0;
    const date = req.body.date || new Date().toISOString().split('T')[0];
    const notes = req.body.notes || null;
    const duplex_number = req.body.duplex_number ? parseInt(req.body.duplex_number) : null;
    const attachment_paths = Array.isArray(req.body.attachment_paths) ? req.body.attachment_paths : [];
    const created_by = req.body.created_by || null;
    
    console.log('Processed payment data:', { 
      amount, 
      date, 
      notes, 
      duplex_number, 
      attachment_paths,
      created_by
    });

    // Verify project exists
    const [project] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM work_projects WHERE id = ?',
      [id]
    );

    if (!project[0]) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    // Check for duplicate payment
    const [existingPayments] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM work_payments WHERE project_id = ? AND amount = ? AND date = ?',
      [id, amount, date]
    );

    if (existingPayments.length > 0) {
      return res.status(400).json({
        error: {
          en: 'Duplicate payment detected',
          ar: 'تم العثور على دفعة مكررة'
        },
        message: {
          en: 'A payment with the same amount and date already exists for this project',
          ar: 'تم العثور على دفعة بنفس المبلغ والتاريخ لهذا المشروع'
        },
        details: {
          project_id: id,
          amount,
          date
        }
      });
    }

    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Insert payment
      const [result] = await connection.execute<ResultSetHeader>(
        `INSERT INTO work_payments (
          project_id, 
          amount, 
          date, 
          notes, 
          duplex_number,
          created_by
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [id, amount, date, notes, duplex_number, created_by]
      );

      const paymentId = result.insertId;

      // Insert attachments if they exist
      if (attachment_paths.length > 0) {
        // Create an array of value arrays for each attachment
        const attachmentValues = attachment_paths.map((path: string) => [paymentId, path]);
        
        // Use multiple row insert
        await connection.query(
          'INSERT INTO work_payment_attachments (payment_id, attachment_path) VALUES ?',
          [attachmentValues]
        );
        
        console.log('Inserted attachments:', attachmentValues);
      }

      await connection.commit();

      // Fetch the newly created payment with project details and attachments
      const [newPayment] = await connection.execute<RowDataPacket[]>(
        `SELECT 
          wp.*,
          wpr.name as project_name,
          u.full_name as created_by_name,
          GROUP_CONCAT(wpa.attachment_path) as attachment_paths
        FROM work_payments wp 
        LEFT JOIN work_projects wpr ON wp.project_id = wpr.id 
        LEFT JOIN users u ON wp.created_by = u.email
        LEFT JOIN work_payment_attachments wpa ON wp.id = wpa.payment_id
        WHERE wp.id = ?
        GROUP BY wp.id`,
        [paymentId]
      );

      const payment = newPayment[0];
      if (payment.attachment_paths) {
        payment.attachment_paths = payment.attachment_paths.split(',');
      }

      res.status(201).json({
        success: true,
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
    console.error('Error adding work project payment:', error);
    res.status(500).json({
      error: 'Failed to add payment'
    });
  }
};

export const getAllWorkProjects = async (req: Request, res: Response) => {
  try {
    const [projects] = await pool.execute<RowDataPacket[]>(
      'SELECT id, name, total_price as totalPrice, duration, start_date as startDate, notes, duplex_number, created_at as createdAt, created_by FROM work_projects ORDER BY created_at DESC'
    );
    res.json(projects);
  } catch (error) {
    console.error('Error fetching work projects:', error);
    res.status(500).json({ error: 'Failed to fetch work projects' });
  }
};
