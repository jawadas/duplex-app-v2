import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

const AdminDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();


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

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('admin.dashboard')}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link 
            to="/dashboard/admin/users" 
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{t('admin.userManagement')}</h2>
            <p className="text-gray-600">{t('admin.manageUsers')}</p>
          </Link>

          <Link 
            to="/dashboard/admin/login-activity" 
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
          >
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{t('admin.loginActivity.title')}</h2>
            <p className="text-gray-600">{t('admin.viewLoginLogs')}</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 