import { Request } from 'express';
import { Multer } from 'multer';

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: 'admin' | 'user';
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

export interface GoogleAuthResponse extends LoginResponse {}

export interface AuthResponse {
  success: boolean;
  user?: AuthUser;
  token?: string;
  message?: string;
}

// Extending Request with both user and file properties
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  file?: Express.Multer.File;  // Using Express namespace for Multer types
}