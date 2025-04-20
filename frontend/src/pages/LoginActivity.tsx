import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

interface LoginActivity {
  id: number;
  user_id: number;
  login_time: string;
  logout_time: string | null;
  ip_address: string;
  email: string;
  full_name: string;
}

const LoginActivity: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activities, setActivities] = useState<LoginActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      // Parse the UTC date string
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original string if parsing fails
      }
      
      // Get the local timezone offset in minutes
      const timezoneOffset = new Date().getTimezoneOffset();
      
      // Convert UTC to local time by adding the offset
      const localDate = new Date(date.getTime() - timezoneOffset * 60000);
      
      // Always use en-US locale to ensure Gregorian calendar is used
      return localDate.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        calendar: 'gregory' // Explicitly set Gregorian calendar
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString; // Return original string if formatting fails
    }
  };

  useEffect(() => {
    const fetchLoginActivity = async () => {
      try {
        const response = await api.admin.getLoginActivity() as LoginActivity[];
        setActivities(response);
        setError(null);
      } catch (err) {
        setError(t('admin.loginActivity.error'));
      } finally {
        setLoading(false);
      }
    };

    fetchLoginActivity();
  }, [t]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">{t('admin.accessDenied')}</h1>
          <p className="text-gray-600">{t('admin.accessDeniedMessage')}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">{error}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('admin.loginActivity.title')}</h1>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.loginActivity.email')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.loginActivity.loginTime')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.loginActivity.logoutTime')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('admin.loginActivity.ipAddress')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activities.map((activity) => (
                <tr key={activity.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {activity.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(activity.login_time)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(activity.logout_time)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {activity.ip_address}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LoginActivity; 