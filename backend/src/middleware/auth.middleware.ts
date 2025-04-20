import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/database'; // Changed from import { pool }
import { AuthUser, AuthenticatedRequest } from '../types/auth.types';
import { RowDataPacket } from 'mysql2';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Extend the AuthUser interface to include RowDataPacket
interface UserRow extends AuthUser, RowDataPacket {}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => { // Removed Promise<void> return type
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log('No token provided in headers:', req.headers);
      res.status(401).json({ message: 'No token provided' });
      return;
    }

    try {
      // Add more detailed error handling for token verification
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { email: string };
      console.log('Token verification successful. Decoded:', decoded);

      if (!decoded.email) {
        console.log('Token missing email field');
        res.status(401).json({ message: 'Invalid token format' });
        return;
      }

      // Query user with better error handling
      const [users] = await pool.query<UserRow[]>(
        'SELECT id, email, role, full_name FROM users WHERE email = ?',
        [decoded.email]
      );

      console.log('Database query result:', users);

      if (!users || users.length === 0) {
        console.log('No user found for email:', decoded.email);
        res.status(401).json({ message: 'User not found' });
        return;
      }

      const user = users[0];
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name
      };

      console.log('Authentication successful for user:', user.email);
      next();
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      res.status(401).json({ 
        message: 'Invalid token',
        error: jwtError instanceof Error ? jwtError.message : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const authorizeRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user;
      if (!user || !allowedRoles.includes(user.role)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }
      next();
    } catch (error) {
      res.status(403).json({
        success: false,
        message: 'Authorization failed'
      });
      return;
    }
  };
};

// Add isAdmin middleware function
export const isAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied: Admin role required' });
  }
};

// Vite configuration has been moved to vite.config.ts to avoid module conflicts in the backend

// filepath: /c:/Users/aaljawad/Desktop/VSCode/duplex-tracker-app/frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      util: 'rollup-plugin-node-polyfills/polyfills/util'
    }
  },
  server: {
    port: 5173,
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis'
      }
    }
  }
});