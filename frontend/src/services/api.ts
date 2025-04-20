import axios from 'axios';
import { RegisterFormData } from '../types/auth.types';
import { APIResponse, CreatePurchaseDTO } from '../types/purchase.types';
import { WorkName, CreateWorkNameDTO, WorkProject, Payment } from '../types/labor.types';
import { SummaryStats, DuplexCosts } from '../pages/Analytics';

// API base URL from environment variable
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Ensure headers object exists
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle auth errors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      url: error.config?.url
    });

    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  auth: {
    register: async (data: Omit<RegisterFormData, 'confirmPassword'>) => {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
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

    verify: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`${API_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!response.ok) {
        throw new Error('Token verification failed');
      }
      
      return response.json();
    },

    logout: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No token found');
      }

      const response = await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      
      return response.json();
    }
  },

  workNames: {
    getAll: async (): Promise<WorkName[]> => {
      const response = await axiosInstance.get<WorkName[]>('/work-names');
      return response.data;
    },
    create: async (workNameData: CreateWorkNameDTO): Promise<WorkName> => {
      const response = await axiosInstance.post<WorkName>('/work-names', workNameData);
      return response.data;
    },
    update: async (id: number, name: string): Promise<WorkName> => {
      const response = await axiosInstance.put<WorkName>(`/work-names/${id}`, { name });
      return response.data;
    },
    delete: async (id: number): Promise<void> => {
      await axiosInstance.delete(`/work-names/${id}`);
    }
  },

  workProjects: {
    getAll: async (): Promise<WorkProject[]> => {
      const response = await axiosInstance.get<WorkProject[]>('/work-projects');
      return response.data;
    },
    create: async (project: WorkProject): Promise<WorkProject> => {
      const formattedProject = {
        name: project.name,
        total_price: Number(project.totalPrice),
        duration: Number(project.duration),
        start_date: project.startDate,
        notes: project.notes,
        duplex_number: Number(project.duplex_number)
      };
      const response = await axiosInstance.post<WorkProject>('/work-projects', formattedProject);
      return response.data;
    },
    getPayments: async (projectId: number): Promise<Payment[]> => {
      const response = await axiosInstance.get<{project: WorkProject, payments: Payment[]}>(`/work-projects/${projectId}/payments`);
      return Array.isArray(response.data) ? response.data : response.data.payments;
    },
    addPayment: async (projectId: number, paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> => {
      const response = await axiosInstance.post<Payment>(`/work-projects/${projectId}/payments`, paymentData);
      return response.data;
    },
    updatePayment: async (id: number, paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> => {
      try {
        console.log('Updating payment with ID:', id, 'Data:', paymentData);
        const response = await axiosInstance.put<{success: boolean; data: Payment}>(`/work-payments/${id}`, paymentData);
        return response.data.data;
      } catch (error) {
        console.error('Error updating work payment:', error);
        throw error;
      }
    },
    deletePayment: async (id: number): Promise<void> => {
      try {
        await axiosInstance.delete(`/work-payments/${id}`);
      } catch (error) {
        console.error('Error deleting work payment:', error);
        throw error;
      }
    }
  },

  purchases: {
    getAll: async (filters: Record<string, string | number | undefined>) => {
      try {
        const params = new URLSearchParams();
        
        // Add each filter to the params if it exists
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            if (key === 'startDate') {
              params.append('startDate', value.toString());
            } else if (key === 'endDate') {
              params.append('endDate', value.toString());
            } else {
              params.append(key, value.toString());
            }
          }
        });
        
        const response = await axiosInstance.get<APIResponse>(`/purchases?${params.toString()}`);
        
        return response.data;
      } catch (error) {
        console.error('Error fetching purchases:', error);
        return { success: false, error: 'Failed to fetch purchases' };
      }
    },
    create: async (purchaseData: CreatePurchaseDTO): Promise<APIResponse> => {
      try {
        console.log('API Service - creating purchase with data:', purchaseData);
        
        // Create the purchase with the attachment paths
        // No need to handle attachment uploads here as it's done in the component
        const response = await axiosInstance.post<APIResponse>('/purchases', purchaseData);
        
        console.log('API Service - create purchase response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error creating purchase:', error);
        throw error;
      }
    },
    getBill: async (purchaseId: number): Promise<Blob> => {
      try {
        const response = await axiosInstance.get<Blob>(`/purchases/${purchaseId}/bill`, {
          responseType: 'blob'
        });
        return new Blob([response.data], { type: response.headers['content-type'] });
      } catch (error) {
        console.error('Error fetching bill:', error);
        throw error;
      }
    },

    viewBill: async (purchaseId: number): Promise<void> => {
      try {
        const blob = await api.purchases.getBill(purchaseId);
        const url = window.URL.createObjectURL(blob);

        const newWindow = window.open(url, '_blank');
        
        if (!newWindow) {
          throw new Error('Popup blocked. Please allow popups for this site.');
        }
        
        // Clean up the URL after opening
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      } catch (error) {
        console.error('Error viewing bill:', error);
        throw error;
      }
    },
    update: async (id: number, purchaseData: CreatePurchaseDTO): Promise<APIResponse> => {
      try {
        console.log('API Service - updating purchase with data:', purchaseData);
        const response = await axiosInstance.put<APIResponse>(`/purchases/${id}`, purchaseData);
        console.log('API Service - update purchase response:', response.data);
        return response.data;
      } catch (error) {
        console.error('Error updating purchase:', error);
        throw error;
      }
    },
    delete: async (id: number): Promise<APIResponse> => {
      try {
        const response = await axiosInstance.delete<APIResponse>(`/purchases/${id}`);
        return response.data;
      } catch (error) {
        console.error('Error deleting purchase:', error);
        throw error;
      }
    }
  },

  analytics: {
    getSummary: async (): Promise<SummaryStats> => {
      const response = await axiosInstance.get<SummaryStats>('/analytics/summary');
      return response.data;
    },
    getDuplexCosts: async (): Promise<DuplexCosts[]> => {
      const response = await axiosInstance.get<DuplexCosts[]>('/analytics/duplex-costs');
      return response.data;
    }
  },

  getAllWorkProjects: async (): Promise<WorkProject[]> => {
    try {
      const response = await axiosInstance.get<WorkProject[]>('/work-projects');
      return response.data;
    } catch (error) {
      console.error('Error fetching work projects:', error);
      throw error;
    }
  },

  createWorkProject: async (project: WorkProject): Promise<WorkProject> => {
    const formattedProject = {
      name: project.name,
      totalPrice: Number(project.totalPrice),
      duration: Number(project.duration),
      startDate: project.startDate,
      notes: project.notes || '',
      duplex_number: project.duplex_number
    };
    
    try {
      const response = await axiosInstance.post<WorkProject>('/work-projects', formattedProject);
      return response.data;
    } catch (error) {
      console.error('Error creating work project:', error);
      throw error;
    }
  },

  getWorkProjectPayments: async (projectId: number): Promise<Payment[]> => {
    try {
      const response = await axiosInstance.get<{project: WorkProject, payments: Payment[]}>(`/work-projects/${projectId}/payments`);
      
      // Handle both possible response formats
      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else if (response.data && Array.isArray(response.data.payments)) {
        return response.data.payments;
      }
      
      console.error('Unexpected response format:', response.data);
      return [];
    } catch (error) {
      console.error('Error fetching project payments:', error);
      return []; 
    }
  },

  addWorkProjectPayment: async (projectId: number, paymentData: Omit<Payment, 'id' | 'projectId' | 'created_at' | 'updated_at'>): Promise<Payment> => {
    try {
      if (!projectId || !paymentData.amount || !paymentData.date) {
        throw new Error('Missing required payment data');
      }
      const response = await axiosInstance.post<Payment>(`/work-projects/${projectId}/payments`, paymentData);
      if (!response.data) {
        throw new Error('No data received from server');
      }
      return response.data;
    } catch (error) {
      console.error('Error adding project payment:', error);
      throw error; 
    }
  },

  deleteWorkProjectPayment: async (id: number): Promise<void> => {
    try {
      await axiosInstance.delete(`/work-payments/${id}`);
    } catch (error) {
      console.error('Error deleting work payment:', error);
      throw error;
    }
  },

  updateWorkProjectPayment: async (id: number, paymentData: Omit<Payment, 'id' | 'created_at' | 'updated_at'>): Promise<Payment> => {
    try {
      const response = await axiosInstance.put<{success: boolean; data: Payment}>(`/work-payments/${id}`, paymentData);
      return response.data.data;
    } catch (error) {
      console.error('Error updating work payment:', error);
      throw error;
    }
  },

  createWorkPayment: async (formData: FormData): Promise<Payment> => {
    try {
      // Log the FormData contents
      console.log('FormData contents:');
      for (const [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

      const response = await axiosInstance.post<Payment>(`/work-payments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error creating work payment:', error);
      throw error;
    }
  },

    
  getFilteredPayments: async (projectId?: string | number, duplexNumber?: string): Promise<Payment[]> => {
    try {
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId.toString());
      if (duplexNumber) params.append('duplexNumber', duplexNumber);
      
      const response = await axiosInstance.get<Payment[]>('/work-payments', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching filtered payments:', error);
      throw error;
    }
  },

  getAnalyticsSummary: async (): Promise<SummaryStats> => {
    try {
      const response = await axiosInstance.get<SummaryStats>('/analytics/summary');
      return response.data;
    } catch (error) {
      console.error('Error fetching analytics summary:', error);
      throw error;
    }
  },

  getDuplexCosts: async (): Promise<DuplexCosts[]> => {
    try {
      const response = await axiosInstance.get<DuplexCosts[]>('/analytics/duplex-costs');
      return response.data;
    } catch (error) {
      console.error('Error fetching duplex costs:', error);
      throw error;
    }
  },

  payments: {
    getFiltered: async (projectId?: string | number, duplexNumber?: string): Promise<Payment[]> => {
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId.toString());
      if (duplexNumber) params.append('duplexNumber', duplexNumber);
      const response = await axiosInstance.get<Payment[]>('/work-payments', { params });
      return response.data;
    },
    create: async (formData: FormData): Promise<Payment> => {
      const response = await axiosInstance.post<Payment>('/work-payments', formData);
      return response.data;
    }
  },

  admin: {
    getUsers: async () => {
      const response = await axiosInstance.get('/admin/users');
      return response.data;
    },
    updateUserRole: async (userId: string, role: 'user' | 'admin') => {
      const response = await axiosInstance.put(`/admin/users/${userId}/role`, { role });
      return response.data;
    },
    getLoginActivity: async () => {
      try {
        const response = await axiosInstance.get('/admin/login-activity');
        if (response.data && Array.isArray(response.data)) {
          return response.data;
        }
        console.error('Unexpected response format:', response.data);
        return [];
      } catch (error) {
        console.error('Error fetching login activity:', error);
        return [];
      }
    }
  }
};

export default axiosInstance;