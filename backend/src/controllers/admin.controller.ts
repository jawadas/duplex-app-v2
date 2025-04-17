import { Request, Response, RequestHandler } from 'express';
import { RowDataPacket } from 'mysql2';
import pool from '../config/database';
import { AuthenticatedRequest } from '../types/auth.types';

const handleError = (res: Response, error: any, message: string) => {
  console.error(message, error);
  res.status(500).json({ error: message });
};

export const getUserActivity: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized - User not authenticated' });
      return;
    }

    const [activities] = await pool.execute<RowDataPacket[]>(`
      (SELECT 
        'purchase' as type,
        p.id,
        u.email,
        u.full_name as username,
        'Created Purchase' as action,
        CONCAT('Duplex: ', p.duplex_number, ', Amount: ', p.price) as details,
        p.created_at as timestamp,
        p.created_by as ip_address
      FROM purchases p
      JOIN users u ON p.created_by = u.email)
      UNION ALL
      (SELECT 
        'work_payment' as type,
        wp.id,
        u.email,
        u.full_name as username,
        'Created Work Payment' as action,
        CONCAT('Duplex: ', wp.duplex_number, ', Amount: ', wp.amount) as details,
        wp.created_at as timestamp,
        wp.created_by as ip_address
      FROM work_payments wp
      JOIN users u ON wp.created_by = u.email)
      ORDER BY timestamp DESC
    `);

    res.json(activities);
  } catch (error) {
    handleError(res, error, 'Error getting user activity');
  }
};

export const getLoginActivity: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const [activities] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        la.id,
        u.email,
        u.full_name,
        la.login_time,
        la.logout_time,
        la.ip_address
      FROM login_activity la
      JOIN users u ON la.user_id = u.id
      ORDER BY la.login_time DESC
      LIMIT 100
    `);
    
    res.json(activities);
  } catch (error) {
    console.error('Error getting login activity:', error);
    res.status(500).json({ error: 'Error getting login activity' });
  }
};

export const getUserDetailedActivity: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized - User not authenticated' });
      return;
    }

    const [users] = await pool.execute<RowDataPacket[]>(`
      SELECT 
        u.email,
        u.full_name,
        u.role
      FROM users u
    `);

    const userActivities = await Promise.all(users.map(async (user) => {
      const [purchases] = await pool.execute<RowDataPacket[]>(`
        SELECT 
          id,
          'purchase' as type,
          created_at,
          duplex_number,
          price as amount,
          notes
        FROM purchases 
        WHERE created_by = ?
        ORDER BY created_at DESC
      `, [user.email]);

      const [workPayments] = await pool.execute<RowDataPacket[]>(`
        SELECT 
          id,
          'work_payment' as type,
          created_at,
          duplex_number,
          amount,
          notes
        FROM work_payments 
        WHERE created_by = ?
        ORDER BY created_at DESC
      `, [user.email]);

      return {
        ...user,
        entries: [...purchases, ...workPayments].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      };
    }));

    res.json(userActivities);
  } catch (error) {
    handleError(res, error, 'Error getting user detailed activity');
  }
};

export const getUserActionHistory: RequestHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized - User not authenticated' });
      return;
    }

    const { userId } = req.params;

    const [history] = await pool.execute<RowDataPacket[]>(`
      (SELECT 
        'purchase' as type,
        id,
        created_at,
        duplex_number,
        price as amount,
        notes
      FROM purchases 
      WHERE created_by = ?)
      UNION ALL
      (SELECT 
        'work_payment' as type,
        id,
        created_at,
        duplex_number,
        amount,
        notes
      FROM work_payments 
      WHERE created_by = ?)
      ORDER BY created_at DESC
    `, [userId, userId]);

    res.json(history);
  } catch (error) {
    handleError(res, error, 'Error getting user action history');
  }
};

export const updateUserRole: RequestHandler = (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!role || !['user', 'admin'].includes(role)) {
    res.status(400).json({ error: 'Invalid role specified' });
    return;
  }

  pool.execute<RowDataPacket[]>(
    'UPDATE users SET role = ? WHERE email = ?',
    [role, userId]
  )
    .then(() => {
      res.json({ message: 'User role updated successfully' });
    })
    .catch(error => {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'Error updating user role' });
    });
};

export const getUsers: RequestHandler = (req: AuthenticatedRequest, res: Response) => {
  pool.execute<RowDataPacket[]>(
    'SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at DESC'
  )
    .then(([users]) => {
      res.json(users);
    })
    .catch(error => {
      console.error('Error getting users:', error);
      res.status(500).json({ error: 'Error getting users' });
    });
}; 