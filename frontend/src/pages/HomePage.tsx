import React, { useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { Receipt, FileText, Wallet, FileSpreadsheet } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { BarChart2 } from 'lucide-react';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        await api.auth.verify();
      } catch (error) {
        console.error('Authentication error:', error);
        navigate('/login');
      }
    };
    
    if (!isAuthenticated) {
      verifyAuth();
    }
  }, [isAuthenticated, navigate]);

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      {/* Menu Sections */}
      <div className="flex-1 px-4 space-y-3 pt-2 md:max-w-2xl md:mx-auto md:w-full">
        {/* Invoices Section */}
        <div>
          <h2 className="text-lg font-semibold mb-2">
            {isArabic ? 'الفواتير والمشتريات' : 'Invoices & Purchases'}
          </h2>
          <div className="space-y-2">
            <button
              onClick={() => handleNavigation("/dashboard/new-entry")}
              className="w-full bg-white rounded-xl p-4 flex items-center border-r-4 border-blue-600 shadow-sm"
            >
              <div className="p-3 md:p-2 rounded-lg text-blue-600">
                <Receipt className="w-7 h-7 md:w-5 md:h-5" />
              </div>
              <div className={`ml-4 ${isArabic ? 'text-right' : 'text-left'} flex-1`}>
                <div className="font-semibold text-blue-600">
                  {isArabic ? 'فاتورة جديدة' : 'New Invoice'}
                </div>
                <div className="text-sm text-gray-500">
                  {isArabic ? 'تسجيل عملية شراء جديدة' : 'Record a new purchase'}
                </div>
              </div>
            </button>

            <button
              onClick={() => handleNavigation("/dashboard/purchases")}
              className="w-full bg-white rounded-xl p-4 flex items-center border-r-4 border-blue-600 shadow-sm"
            >
              <div className="p-3 md:p-2 rounded-lg text-blue-600">
                <FileText className="w-7 h-7 md:w-5 md:h-5" />
              </div>
              <div className={`ml-4 ${isArabic ? 'text-right' : 'text-left'} flex-1`}>
                <div className="font-semibold text-blue-600">
                  {isArabic ? 'عرض الفواتير' : 'View Invoices'}
                </div>
                <div className="text-sm text-gray-500">
                  {isArabic ? 'عرض جميع الفواتير' : 'View all invoices'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Work Payments Section */}
        <div>
          <h2 className="text-lg font-semibold mb-2">
            {isArabic ? 'مدفوعات العمل' : 'Work Payments'}
          </h2>
          <div className="space-y-2">
            <button
              onClick={() => handleNavigation("/dashboard/work-payment-entry")}
              className="w-full bg-white rounded-xl p-4 flex items-center border-r-4 border-amber-800 shadow-sm"
            >
              <div className="p-3 md:p-2 rounded-lg text-amber-800">
                <Wallet className="w-7 h-7 md:w-5 md:h-5" />
              </div>
              <div className={`ml-4 ${isArabic ? 'text-right' : 'text-left'} flex-1`}>
                <div className="font-semibold text-amber-800">
                  {isArabic ? 'دفعة عمل جديدة' : 'New Work Payment'}
                </div>
                <div className="text-sm text-gray-500">
                  {isArabic ? 'تسجيل مدفوعات عمل' : 'Record work payments'}
                </div>
              </div>
            </button>

            <button
              onClick={() => handleNavigation("/dashboard/labor-payments")}
              className="w-full bg-white rounded-xl p-4 flex items-center border-r-4 border-amber-800 shadow-sm"
            >
              <div className="p-3 md:p-2 rounded-lg text-amber-800">
                <FileSpreadsheet className="w-7 h-7 md:w-5 md:h-5" />
              </div>
              <div className={`ml-4 ${isArabic ? 'text-right' : 'text-left'} flex-1`}>
                <div className="font-semibold text-amber-800">
                  {isArabic ? 'عرض مدفوعات العمل' : 'View Work Payments'}
                </div>
                <div className="text-sm text-gray-500">
                  {isArabic ? 'عرض جميع مدفوعات العمل' : 'View all work payments'}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Analytics Section */}
        <div>
          <h2 className="text-lg font-semibold mb-2">
            {isArabic ? 'التحليلات' : 'Analytics'}
          </h2>
          <div className="space-y-2">
            <button
              onClick={() => handleNavigation("/dashboard/analytics")}
              className="w-full bg-white rounded-xl p-4 flex items-center border-r-4 border-green-600 shadow-sm"
            >
              <div className="p-3 md:p-2 rounded-lg text-green-600">
                <BarChart2 className="w-7 h-7 md:w-5 md:h-5" />
              </div>
              <div className={`ml-4 ${isArabic ? 'text-right' : 'text-left'} flex-1`}>
                <div className="font-semibold text-green-600">
                  {isArabic ? 'عرض التحليلات' : 'View Analytics'}
                </div>
                <div className="text-sm text-gray-500">
                  {isArabic ? 'عرض التحليلات والإحصائيات' : 'View analytics and statistics'}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
