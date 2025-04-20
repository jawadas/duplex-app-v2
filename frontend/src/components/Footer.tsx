import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, FileText, Wallet, BarChart2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Footer: React.FC = () => {
  const navigate = useNavigate();
  const { isArabic } = useLanguage();

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t">
      <div className="flex justify-around py-3 md:max-w-2xl md:mx-auto">
        <button 
          onClick={() => handleNavigation("/dashboard")}
          className="flex flex-col items-center text-gray-500 hover:text-blue-900"
        >
          <Home className="w-6 h-6" />
          <span className="text-xs mt-1">{isArabic ? 'الرئيسية' : 'Home'}</span>
        </button>
        <button 
          onClick={() => handleNavigation("/dashboard/purchases")}
          className="flex flex-col items-center text-gray-500 hover:text-blue-900"
        >
          <FileText className="w-6 h-6" />
          <span className="text-xs mt-1">{isArabic ? 'الفواتير' : 'Invoices'}</span>
        </button>
        <button 
          onClick={() => handleNavigation("/dashboard/work-payment-entry")}
          className="flex flex-col items-center text-gray-500 hover:text-blue-900"
        >
          <Wallet className="w-6 h-6" />
          <span className="text-xs mt-1">{isArabic ? 'المدفوعات' : 'Payments'}</span>
        </button>
        <button 
          onClick={() => handleNavigation("/dashboard/analytics")}
          className="flex flex-col items-center text-gray-500 hover:text-blue-900"
        >
          <BarChart2 className="w-6 h-6" />
          <span className="text-xs mt-1">{isArabic ? 'التحليلات' : 'Analytics'}</span>
        </button>
      </div>
    </div>
  );
};

export default Footer; 