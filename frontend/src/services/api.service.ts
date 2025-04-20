const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface RegisterFormData {
  email: string;
  password: string;
  fullName: string;
}

export const authApi = {
  register: async (data: RegisterFormData) => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Registration failed');
    }

    return result;
  },

  login: async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Login failed');
    }

    return result;
  },

  verifyToken: async (token: string) => {
    const response = await fetch(`${API_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Token verification failed');
    }
    
    return response.json();
  }
};