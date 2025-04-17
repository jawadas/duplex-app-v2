import { Request, Response } from 'express';
import pool from '../config/database';
import { WorkName, CreateWorkNameDTO } from '../types/labor.types';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export const createWorkType = async (req: Request<{}, {}, CreateWorkNameDTO>, res: Response) => {
  try {
    const { name } = req.body;

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO work_types (name) VALUES (?)',
      [name]
    );

    const workType: any = {
      id: result.insertId,
      name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.status(201).json(workType);
  } catch (error) {
    console.error('Error creating work type:', error);
    res.status(500).json({ message: 'Error creating work type' });
  }
};

export const getAllWorkTypes = async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute<(any & RowDataPacket)[]>(
      'SELECT * FROM work_types ORDER BY name ASC'
    );

    res.json(rows);
  } catch (error) {
    console.error('Error fetching work types:', error);
    res.status(500).json({ message: 'Error fetching work types' });
  }
};

export const getWorkTypeById = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const [rows] = await pool.execute<(any & RowDataPacket)[]>(
      'SELECT * FROM work_types WHERE id = ?',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Work type not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching work type:', error);
    res.status(500).json({ message: 'Error fetching work type' });
  }
};

export const updateWorkType = async (req: Request<{ id: string }, {}, { name: string }>, res: Response) => {
  try {
    const { name } = req.body;
    const { id } = req.params;

    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE work_types SET name = ? WHERE id = ?',
      [name, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Work type not found' });
    }

    const [rows] = await pool.execute<(any & RowDataPacket)[]>(
      'SELECT * FROM work_types WHERE id = ?',
      [id]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating work type:', error);
    res.status(500).json({ message: 'Error updating work type' });
  }
};

export const deleteWorkType = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM work_types WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Work type not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting work type:', error);
    res.status(500).json({ message: 'Error deleting work type' });
  }
};
