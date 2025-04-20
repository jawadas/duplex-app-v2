export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  role: 'user' | 'admin';
  registrationKey: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
}

export interface AuthResponse {
  user: User;
  token: string;
}