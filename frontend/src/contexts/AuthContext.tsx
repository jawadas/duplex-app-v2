import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  verifyAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SessionTimeoutPopup: React.FC<{ 
  secondsLeft: number;
  onExtendSession: () => void;
}> = ({ secondsLeft, onExtendSession }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full mx-4">
      <h3 className="text-xl font-bold text-red-600 mb-4">Session Timeout Warning</h3>
      <p className="text-gray-700 mb-4">
        Your session will expire in {secondsLeft} seconds. Would you like to continue working?
      </p>
      <div className="flex justify-end">
        <button
          onClick={onExtendSession}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Continue Working
        </button>
      </div>
    </div>
  </div>
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60); // 1 minute warning
  const [loginTime, setLoginTime] = useState<number | null>(null);

  const verifyAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const response = await api.auth.verify() as { user: User };
      setUser(response.user);
      setIsAuthenticated(true);
      return true;
    } catch (error) {
      console.error('Auth verification error:', error);
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
      window.location.href = '/login';
      return false;
    }
  };

  const extendSession = async () => {
    try {
      const isValid = await verifyAuth();
      if (isValid) {
        setLoginTime(Date.now());
        setShowWarning(false);
        setSecondsLeft(60);
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
      logout();
    }
  };

  // Initial auth check
  useEffect(() => {
    const checkAuth = async () => {
      await verifyAuth();
      setIsLoading(false);
      setLoginTime(Date.now());
    };

    checkAuth();
  }, []);

  // Regular auth check every 5 minutes
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkInterval = setInterval(verifyAuth, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(checkInterval);
  }, [isAuthenticated]);

  // Session timeout handling
  useEffect(() => {
    if (!loginTime || !isAuthenticated) return;

    // Show warning 1 minute before timeout
    const warningTimeout = setTimeout(() => {
      setShowWarning(true);
      const countdownInterval = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            logout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }, 59 * 60 * 1000); // 59 minutes (1 minute before 1 hour timeout)

    // Logout after 1 hour if no extension
    const logoutTimeout = setTimeout(() => {
      logout();
    }, 60 * 60 * 1000); // 1 hour

    return () => {
      clearTimeout(warningTimeout);
      clearTimeout(logoutTimeout);
    };
  }, [loginTime, isAuthenticated]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.auth.login(email, password) as { user: User, token: string };
      localStorage.setItem('token', response.token);
      setUser(response.user);
      setIsAuthenticated(true);
      setLoginTime(Date.now());
      setSecondsLeft(60);
      setShowWarning(false);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call the backend logout endpoint first
      await api.auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API call success
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
      setShowWarning(false);
      setLoginTime(null);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, verifyAuth }}>
      {showWarning && <SessionTimeoutPopup secondsLeft={secondsLeft} onExtendSession={extendSession} />}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};