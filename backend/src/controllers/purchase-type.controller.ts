import { Request, Response } from 'express';
import pool from '../config/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { AuthenticatedRequest } from '../types/auth.types';

// Interface for purchase type
interface PurchaseType extends RowDataPacket {
  id: number;
  name: string;
  name_ar: string;
  created_at: Date;
}

/**
 * Get all purchase types
 */
export const getAllPurchaseTypes = async (req: Request, res: Response) => {
  try {
    // SQL query to get all purchase types
    const [rows] = await pool.query<PurchaseType[]>(`
      SELECT id, name, name_ar, created_at 
      FROM purchase_types 
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    console.error('Error fetching purchase types:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch purchase types',
      error: (error as Error).message
    });
  }
};

/**
 * Create a new purchase type
 */
export const createPurchaseType = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, name_ar } = req.body;

    // Validate required fields
    if (!name || !name_ar) {
      return res.status(400).json({
        success: false,
        message: 'Name and Arabic name are required'
      });
    }

    // Check if a type with this name already exists
    const [existingTypes] = await pool.query<PurchaseType[]>(`
      SELECT id FROM purchase_types WHERE name = ? OR name_ar = ?
    `, [name, name_ar]);

    if (existingTypes.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A purchase type with this name already exists'
      });
    }

    // SQL query to insert a new purchase type
    const [result] = await pool.query<ResultSetHeader>(`
      INSERT INTO purchase_types (name, name_ar, created_by) 
      VALUES (?, ?, ?)
    `, [name, name_ar, req.user?.email]);

    // Get the inserted type
    const [newType] = await pool.query<PurchaseType[]>(`
      SELECT id, name, name_ar, created_at 
      FROM purchase_types 
      WHERE id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Purchase type created successfully',
      data: newType[0]
    });
  } catch (error) {
    console.error('Error creating purchase type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create purchase type',
      error: (error as Error).message
    });
  }
};

/**
 * Delete a purchase type
 */
export const deletePurchaseType = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if the type exists
    const [existingType] = await pool.query<PurchaseType[]>(`
      SELECT id FROM purchase_types WHERE id = ?
    `, [id]);

    if (existingType.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Purchase type not found'
      });
    }

    // Check if the type is being used in any purchases
    const [usedInPurchases] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) as count 
      FROM purchases 
      WHERE type = ?
    `, [`custom-${id}`]);

    if (usedInPurchases[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a type that is being used in purchases'
      });
    }

    // SQL query to delete the purchase type
    await pool.query(`
      DELETE FROM purchase_types 
      WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Purchase type deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting purchase type:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete purchase type',
      error: (error as Error).message
    });
  }
}; 