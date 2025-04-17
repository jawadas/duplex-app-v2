import { RowDataPacket } from 'mysql2';
import { AuthUser } from './auth.types';

export interface UserRow extends AuthUser, RowDataPacket {
  password?: string;
  google_id?: string;
}
