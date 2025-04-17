import { Request, Response, NextFunction } from 'express';
import { AuthUser, AuthResponse } from '../types/auth.types';
import authService from '../services/auth.service';
import pool from '../config/database';
import { ResultSetHeader } from 'mysql2';

interface IAuthController {
  register(req: Request, res: Response): Promise<Response>;
  login(req: Request, res: Response): Promise<Response>;
  verify(req: Request, res: Response): Promise<Response>;
  logout(req: Request, res: Response, next: NextFunction): Promise<void>;
}

class AuthController implements IAuthController {
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password, fullName, role, registrationKey } = req.body;
      
      // Debug logging
      console.log('Environment variables:', {
        hasRegistrationKey: !!process.env.REGISTRATION_KEY,
        envKeys: Object.keys(process.env),
        providedKey: registrationKey
      });
      
      if (!email || !password || !fullName || !registrationKey) {
        return res.status(400).json({ 
          success: false, 
          message: 'All fields are required, including registration key' 
        });
      }

      // Validate registration key
      const correctKey = process.env.REGISTRATION_KEY;
      console.log('Registration key check:', {
        correctKeyExists: !!correctKey,
        correctKey: correctKey,
        providedKey: registrationKey,
        matches: correctKey === registrationKey
      });

      if (!correctKey) {
        console.error('REGISTRATION_KEY not set in environment variables');
        return res.status(500).json({
          success: false,
          message: 'Server configuration error'
        });
      }

      if (registrationKey !== correctKey) {
        console.log('Invalid registration key provided');
        return res.status(400).json({
          success: false,
          message: 'Invalid registration key'
        });
      }

      // Validate role
      if (!role || !['admin', 'user'].includes(role)) {
        console.log('Invalid role:', role);
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be either "admin" or "user"'
        });
      }

      // If we get here, the registration key and role are valid
      console.log('Registration key and role validated, proceeding with registration');
      
      const result = await authService.register(email, password, fullName, role);
      
      return res.json({ 
        success: true, 
        message: 'Registration successful',
        result 
      });
    } catch (error) {
      console.error('Register error:', error);
      const message = error instanceof Error ? error.message : 'Registration error';
      return res.status(500).json({ success: false, message });
    }
  }

  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing credentials' 
        });
      }

      const result = await authService.login(email, password);
      
      return res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Login error:', error);
      const message = error instanceof Error ? error.message : 'Login error';
      return res.status(401).json({ success: false, message });
    }
  }

  async verify(req: Request, res: Response): Promise<Response> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ 
          success: false, 
          message: 'No token provided' 
        });
      }

      const user = await authService.verifyToken(token);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Verify error:', error);
      const message = error instanceof Error ? error.message : 'Token verification failed';
      return res.status(401).json({ success: false, message });
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        console.error('Logout attempted without user ID');
        res.status(401).json({ success: false, message: 'User not authenticated' });
        return;
      }

      // Update all active sessions for this user with Saudi Arabia timezone
      const [result] = await pool.execute<ResultSetHeader>(
        `UPDATE login_activity 
         SET logout_time = CONVERT_TZ(NOW(), '+00:00', '+03:00') 
         WHERE user_id = ? AND logout_time IS NULL`,
        [userId]
      );

      if (result.affectedRows === 0) {
        console.warn(`No active sessions found for user ${userId} during logout`);
      } else {
        console.log(`Updated ${result.affectedRows} active sessions for user ${userId}`);
      }

      res.status(200).json({ 
        success: true, 
        message: 'Logged out successfully',
        sessionsClosed: result.affectedRows 
      });
    } catch (error) {
      console.error('Logout error:', error);
      next(error);
    }
  }
}

export default new AuthController();