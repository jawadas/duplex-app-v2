import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../config/database';
import { OAuth2Client } from 'google-auth-library';
import { LoginResponse, GoogleAuthResponse, AuthUser } from '../types/auth.types';
import { UserRow } from '../types/user.types';

// Interfaces
interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
}


class AuthService {
  private googleClient: OAuth2Client;
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly SALT_ROUNDS = 10;

  constructor() {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async register(email: string, password: string, fullName: string, role: 'admin' | 'user' = 'user') {
    console.log('Auth service register called with:', {
      email,
      fullName,
      role
    });

    const [existingUsers] = await pool.query<UserRow[]>(
      'SELECT email FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers && existingUsers.length > 0) {
      throw new Error('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
    
    const insertQuery = 'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)';
    const insertParams = [email, hashedPassword, fullName, role];
    
    console.log('Executing insert query:', {
      query: insertQuery,
      params: insertParams
    });

    const [result] = await pool.query(insertQuery, insertParams);

    console.log('Insert result:', result);
    return result;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const [users] = await pool.query<UserRow[]>(
      'SELECT id, email, password_hash, full_name, role FROM users WHERE email = ?',
      [email]
    );

    if (!users || users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];
    
    if (!user.password_hash) {
      throw new Error('User does not have a password set.');
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      { email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '1h' }
    );

    // Record login activity
    await pool.query(
      `INSERT INTO login_activity (user_id, login_time, ip_address) 
       VALUES (?, CONVERT_TZ(NOW(), '+00:00', '+03:00'), ?)`,
      [user.id, '127.0.0.1'] // In production, you should get the real IP from the request
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      },
      token
    };
  }

  async googleAuth(token: string): Promise<LoginResponse> {
    try {
      // Verify Google token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error('Invalid token');
      }

      const { email, name, sub: googleId } = payload;

      // Check if user exists
      const [users] = await pool.query<UserRow[]>(
        'SELECT * FROM users WHERE email = ? OR google_id = ?',
        [email, googleId]
      );

      let user = users[0];

      if (!user) {
        // Create new user if doesn't exist
        const [result] = await pool.query<ResultSetHeader>(
          'INSERT INTO users (email, full_name, google_id) VALUES (?, ?, ?)',
          [email, name, googleId]
        );
        
        const userId = result.insertId;
        user = {
          id: userId,
          email: email!,
          full_name: name || '',
          role: 'user'
        } as UserRow;
      }

      // Generate token
      const jwtToken = this.generateToken(user.id);

      return {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role
        },
        token: jwtToken
      };
    } catch (error) {
      throw error;
    }
  }

  async verifyToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { email: string };
      
      if (!decoded.email) {
        return null;
      }
  
      const [users] = await pool.query<UserRow[]>(
        'SELECT id, email, full_name, role FROM users WHERE email = ?',
        [decoded.email]
      );
  
      if (!users || users.length === 0) {
        return null;
      }
  
      return users[0];
    } catch (error) {
      console.error('Token verification error:', error);
      return null;
    }
  }

  private generateToken(userId: number): string {
    return jwt.sign({ userId }, this.JWT_SECRET, { expiresIn: '24h' });
  }
}

export default new AuthService();