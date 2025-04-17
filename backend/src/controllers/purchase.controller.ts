import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/auth.types';
import pool from '../config/database';
import { Purchase } from '../types/purchase.types';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import path from 'path';
import fs from 'fs';

const STORAGE_URL = 'https://objectstorage.me-jeddah-1.oraclecloud.com/p/cUidJvzOJnXy4fGP3_aYtqNVg4uvAFCJAXpKw6UGnqEcIaI0qCutoWEls5g1qNOV/n/ax4vx38nepo3/b/private-bucket/o/';

export const getPurchases = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, duplexNumber, type } = req.query;
    
    // Log queries and purchases before filtering
    console.log('Debug - Request query parameters:', req.query);
    
    let query = `
      SELECT 
        p.*,
        GROUP_CONCAT(pa.attachment_path) as attachment_paths
      FROM purchases p
      LEFT JOIN purchases_attachments pa ON p.id = pa.purchase_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (startDate && endDate) {
      // Check if the dates are in simple YYYY-MM-DD format (no time component)
      const isSimpleDateFormat = typeof startDate === 'string' && 
                                 startDate.length === 10 && 
                                 startDate.includes('-');
      
      if (isSimpleDateFormat) {
        // For same day queries, use created_at directly with date comparison
        if (startDate === endDate) {
          query += ' AND DATE(p.created_at) = ?';
          params.push(startDate);
        } else {
          // For date ranges in simple format
          query += ' AND DATE(p.created_at) BETWEEN ? AND ?';
          params.push(startDate, endDate);
        }
      } else {
        // For ISO strings with time component, use BETWEEN with timezone conversion
        query += ' AND DATE(CONVERT_TZ(p.created_at, \'UTC\', \'Asia/Riyadh\')) BETWEEN DATE(?) AND DATE(?)';
        params.push(startDate, endDate);
      }
      console.log('Date filter added:', { startDate, endDate, isSimpleDateFormat, filterType: startDate === endDate ? 'exact-day' : 'date-range' });
    }

    if (duplexNumber) {
      query += ' AND p.duplex_number = ?';
      params.push(duplexNumber);
    }

    if (type) {
      query += ' AND p.type = ?';
      params.push(type);
    }

    query += ' GROUP BY p.id ORDER BY p.created_at DESC';

    console.log('Executing query:', query);
    console.log('With parameters:', params);

    const [results] = await pool.query(query, params);
    
    // Process the results to format attachment paths and numbers
    const formattedResults = (results as any[]).map(row => ({
      ...row,
      price: Number(row.price),
      duplex_number: Number(row.duplex_number),
      attachment_paths: row.attachment_paths ? row.attachment_paths.split(',') : []
    }));

    res.json({
      success: true,
      data: formattedResults
    });
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching purchases'
    });
  }
};

export const createPurchase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized - User not authenticated' });
      return;
    }

    const { name, duplex_number, type, purchase_date, price, notes, attachment_paths } = req.body;
    
    // Validate required fields
    if (!name || !duplex_number || !type || !purchase_date || !price) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Check for duplicate entry
    const connection = await pool.getConnection();
    const [existingPurchases] = await connection.execute<RowDataPacket[]>(`
      SELECT id FROM purchases 
      WHERE name = ? 
      AND duplex_number = ? 
      AND type = ? 
      AND DATE(purchase_date) = DATE(?)
    `, [name, duplex_number, type, purchase_date]);

    if (existingPurchases.length > 0) {
      res.status(400).json({ 
        error: 'A purchase with the same name, duplex number, type, and date already exists' 
      });
      return;
    }

    // Start a transaction
    await connection.beginTransaction();

    try {
      // Insert the purchase
      console.log('[Backend] Inserting purchase for user:', req.user?.full_name);
      const [result] = await connection.execute<ResultSetHeader>(`
        INSERT INTO purchases (
          name, 
          duplex_number, 
          type, 
          purchase_date, 
          price, 
          notes,
          created_by,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `, [name, duplex_number, type, purchase_date, price, notes || null, req.user.full_name]);

      const purchaseId = result.insertId;
      console.log(`[Backend] Purchase inserted with ID: ${purchaseId}`);

      // Insert attachments if they exist
      if (attachment_paths && attachment_paths.length > 0) {
        console.log(`[Backend] Received ${attachment_paths.length} attachment paths to insert for purchase ID ${purchaseId}:`, attachment_paths);
        const attachmentValues = attachment_paths.map((path: string) => [purchaseId, path]);
        console.log(`[Backend] Mapped attachment values for insertion:`, attachmentValues);
        
        try {
          await connection.query(
            'INSERT INTO purchases_attachments (purchase_id, attachment_path) VALUES ?',
            [attachmentValues]
          );
          console.log(`[Backend] Successfully inserted attachments for purchase ID ${purchaseId}`);
        } catch (attachError) {
          console.error(`[Backend] Error inserting attachments for purchase ID ${purchaseId}:`, attachError);
          await connection.rollback(); // Rollback on attachment error
          throw attachError; // Re-throw to be caught by outer catch
        }
      }

      await connection.commit();
      console.log(`[Backend] Transaction committed for purchase ID ${purchaseId}`);

      // Fetch the newly created purchase with attachments
      const [newPurchase] = await connection.execute<RowDataPacket[]>(`
        SELECT 
          p.*,
          GROUP_CONCAT(pa.attachment_path) as attachment_paths
        FROM purchases p
        LEFT JOIN purchases_attachments pa ON p.id = pa.purchase_id
        WHERE p.id = ?
        GROUP BY p.id
      `, [purchaseId]);

      const purchase = newPurchase[0];
      if (purchase.attachment_paths) {
        purchase.attachment_paths = purchase.attachment_paths.split(',');
      }

      res.status(201).json({
        success: true,
        message: 'Purchase created successfully',
        data: {
          ...purchase,
          price: Number(purchase.price),
          duplex_number: Number(purchase.duplex_number)
        }
      });
    } catch (error) {
      console.error(`[Backend] Error during purchase creation transaction:`, error);
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating purchase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deletePurchase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized - User not authenticated' });
      return;
    }

    const { id } = req.params;

    // Check if purchase exists
    const [existingPurchase] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM purchases WHERE id = ?',
      [id]
    );

    if (!existingPurchase[0]) {
      res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
      return;
    }

    // Delete the purchase (attachments will be deleted via CASCADE)
    await pool.execute(
      'DELETE FROM purchases WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Purchase deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting purchase'
    });
  }
};

export const updatePurchase = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized - User not authenticated' });
      return;
    }

    const { id } = req.params;
    const { name, duplex_number, type, purchase_date, price, notes, attachment_paths } = req.body;

    // Start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // First, verify the purchase exists
      const [existingPurchase] = await connection.query<RowDataPacket[]>(
        'SELECT id FROM purchases WHERE id = ?',
        [id]
      );

      if (!existingPurchase[0]) {
        await connection.rollback();
        res.status(404).json({ error: 'Purchase not found' });
        return;
      }

      // Update the purchase
      console.log(`[Backend] Updating purchase ID: ${id}`);
      await connection.execute(`
        UPDATE purchases 
        SET name = ?, 
            duplex_number = ?, 
            type = ?, 
            purchase_date = ?, 
            price = ?, 
            notes = ?
        WHERE id = ?
      `, [name, duplex_number, type, purchase_date, price, notes || null, id]);
      console.log(`[Backend] Purchase details updated for ID: ${id}`);

      // Get existing attachments
      const [existingAttachments] = await connection.query<RowDataPacket[]>(
        'SELECT attachment_path FROM purchases_attachments WHERE purchase_id = ?',
        [id]
      );
      const existingPaths = existingAttachments.map((att: RowDataPacket) => att.attachment_path);
      console.log(`[Backend] Existing attachment paths for purchase ID ${id}:`, existingPaths);

      // Find attachments to delete
      const attachmentsToDelete = existingPaths.filter((path: string) => !attachment_paths.includes(path));
      if (attachmentsToDelete.length > 0) {
        console.log(`[Backend] Deleting attachments for purchase ID ${id}:`, attachmentsToDelete);
        try {
          // Delete attachments one by one to avoid any issues with the IN clause
          for (const path of attachmentsToDelete) {
            await connection.query(
              'DELETE FROM purchases_attachments WHERE purchase_id = ? AND attachment_path = ?',
              [id, path]
            );
            console.log(`[Backend] Deleted attachment: ${path} for purchase ID ${id}`);
          }
          console.log(`[Backend] Successfully deleted attachments for purchase ID ${id}`);
        } catch (deleteError) {
          console.error(`[Backend] Error deleting attachments for purchase ID ${id}:`, deleteError);
          await connection.rollback();
          throw deleteError;
        }
      }

      // Find new attachments to add
      const newAttachments = attachment_paths.filter((path: string) => !existingPaths.includes(path));
      if (newAttachments.length > 0) {
        console.log(`[Backend] Adding new attachments for purchase ID ${id}:`, newAttachments);
        const attachmentValues = newAttachments.map((path: string) => [id, path]);
        console.log(`[Backend] Mapped new attachment values for insertion:`, attachmentValues);
        try {
          await connection.query(
            'INSERT INTO purchases_attachments (purchase_id, attachment_path) VALUES ?',
            [attachmentValues]
          );
          console.log(`[Backend] Successfully inserted new attachments for purchase ID ${id}`);
        } catch (insertError) {
          console.error(`[Backend] Error inserting new attachments for purchase ID ${id}:`, insertError);
          await connection.rollback();
          throw insertError;
        }
      }

      await connection.commit();
      console.log(`[Backend] Transaction committed for updating purchase ID ${id}`);

      // Fetch the updated purchase with attachments
      const [updatedPurchase] = await connection.execute<RowDataPacket[]>(`
        SELECT 
          p.*,
          GROUP_CONCAT(pa.attachment_path) as attachment_paths
        FROM purchases p
        LEFT JOIN purchases_attachments pa ON p.id = pa.purchase_id
        WHERE p.id = ?
        GROUP BY p.id
      `, [id]);

      const purchase = updatedPurchase[0];
      if (purchase.attachment_paths) {
        purchase.attachment_paths = purchase.attachment_paths.split(',');
      }

      res.json({
        success: true,
        data: {
          ...purchase,
          price: Number(purchase.price),
          duplex_number: Number(purchase.duplex_number)
        }
      });
    } catch (error) {
      console.error(`[Backend] Error during purchase update transaction for purchase ID ${id}:`, error);
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating purchase:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
