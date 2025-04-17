import { Request, Response } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../config/database';

export const getAnalyticsSummary = async (_req: Request, res: Response) => {
  try {
    // Get current month's data
    const [currentMonth] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM duplex_db.work_payments) as total_labor_costs,
        (SELECT COALESCE(SUM(price), 0) FROM duplex_db.purchases) as total_material_costs,
        COALESCE(current_labor.amount, 0) as current_labor_costs,
        COALESCE(current_material.amount, 0) as current_material_costs
      FROM (
        SELECT SUM(amount) as amount
        FROM duplex_db.work_payments
        WHERE MONTH(date) = MONTH(CURRENT_DATE)
        AND YEAR(date) = YEAR(CURRENT_DATE)
      ) current_labor,
      (
        SELECT SUM(price) as amount
        FROM duplex_db.purchases
        WHERE MONTH(purchase_date) = MONTH(CURRENT_DATE)
        AND YEAR(purchase_date) = YEAR(CURRENT_DATE)
      ) current_material
    `);

    // Get last month's data
    const [lastMonth] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        COALESCE(labor.amount, 0) as labor_costs,
        COALESCE(material.amount, 0) as material_costs
      FROM (
        SELECT SUM(amount) as amount
        FROM duplex_db.work_payments
        WHERE MONTH(date) = MONTH(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH))
        AND YEAR(date) = YEAR(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH))
      ) labor,
      (
        SELECT SUM(price) as amount
        FROM duplex_db.purchases
        WHERE MONTH(purchase_date) = MONTH(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH))
        AND YEAR(purchase_date) = YEAR(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH))
      ) material
    `);

    const current = {
      laborCosts: Number(currentMonth[0].current_labor_costs) || 0,
      materialCosts: Number(currentMonth[0].current_material_costs) || 0,
      totalLaborCosts: Number(currentMonth[0].total_labor_costs) || 0,
      totalMaterialCosts: Number(currentMonth[0].total_material_costs) || 0
    };

    const last = {
      laborCosts: Number(lastMonth[0].labor_costs) || 0,
      materialCosts: Number(lastMonth[0].material_costs) || 0
    };

    const calculateChange = (current: number, last: number) => {
      if (last === 0) return 0;
      const change = ((current - last) / last) * 100;
      // Cap the change at ±100% to avoid extreme percentages
      return Math.max(Math.min(change, 100), -100);
    };

    const response = {
      totalSpending: current.totalLaborCosts + current.totalMaterialCosts,
      laborCosts: current.totalLaborCosts,
      materialCosts: current.totalMaterialCosts,
      monthlyChange: {
        totalSpending: calculateChange(
          current.laborCosts + current.materialCosts,
          last.laborCosts + last.materialCosts
        ),
        laborCosts: calculateChange(current.laborCosts, last.laborCosts),
        materialCosts: calculateChange(current.materialCosts, last.materialCosts)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    res.status(500).json({ error: 'Failed to get analytics summary' });
  }
};

export const getDuplexCosts = async (_req: Request, res: Response) => {
  try {
    // First, get all duplex numbers from 1 to 20 (instead of just 6)
    const [results] = await pool.execute<RowDataPacket[]>(`
      WITH RECURSIVE numbers AS (
        SELECT 1 as num
        UNION ALL
        SELECT num + 1
        FROM numbers
        WHERE num < 20
      ),
      labor_costs AS (
        SELECT 
          duplex_number,
          SUM(amount) as labor_cost,
          MAX(updated_at) as labor_last_updated
        FROM duplex_db.work_payments
        GROUP BY duplex_number
      ),
      material_costs AS (
        SELECT 
          duplex_number,
          SUM(price) as material_cost,
          MAX(created_at) as material_last_updated
        FROM duplex_db.purchases
        GROUP BY duplex_number
      )
      SELECT 
        n.num as duplex_number,
        COALESCE(lc.labor_cost, 0) as labor_cost,
        COALESCE(mc.material_cost, 0) as material_cost,
        GREATEST(
          COALESCE(lc.labor_last_updated, '1970-01-01'),
          COALESCE(mc.material_last_updated, '1970-01-01')
        ) as last_updated
      FROM numbers n
      LEFT JOIN labor_costs lc ON lc.duplex_number = n.num
      LEFT JOIN material_costs mc ON mc.duplex_number = n.num
      ORDER BY n.num
    `);

    const duplexCosts = results.map(row => ({
      duplexNumber: row.duplex_number,
      laborCost: Number(row.labor_cost) || 0,
      materialCost: Number(row.material_cost) || 0,
      total: (Number(row.labor_cost) || 0) + (Number(row.material_cost) || 0),
      lastUpdated: row.last_updated
    }));

    res.json(duplexCosts);
  } catch (error) {
    console.error('Error getting duplex costs:', error);
    res.status(500).json({ error: 'Failed to get duplex costs' });
  }
};

export function getSummary(arg0: string, getSummary: any) {
    throw new Error('Function not implemented.');
}
