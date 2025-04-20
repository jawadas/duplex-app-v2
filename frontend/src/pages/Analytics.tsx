import React, { useState, useEffect } from 'react';
import { DollarSign, Users, Building, ArrowUp, ArrowDown, Settings } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

export interface DuplexCosts {
  duplexNumber: number;
  laborCost: number;
  materialCost: number;
  total: number;
  lastUpdated: string;
}

export interface SummaryStats {
  totalSpending: number;
  laborCosts: number;
  materialCosts: number;
  monthlyChange: {
    totalSpending: number;
    laborCosts: number;
    materialCosts: number;
  };
}

const Analytics: React.FC = () => {
  const { isArabic } = useLanguage();
  const navigate = useNavigate();
  const [summaryStats, setSummaryStats] = useState<SummaryStats>({
    totalSpending: 0,
    laborCosts: 0,
    materialCosts: 0,
    monthlyChange: {
      totalSpending: 0,
      laborCosts: 0,
      materialCosts: 0
    }
  });
  const [duplexCosts, setDuplexCosts] = useState<DuplexCosts[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stats = await api.getAnalyticsSummary();
      setSummaryStats(stats);

      const costs = await api.getDuplexCosts();
      setDuplexCosts(costs);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${isArabic ? 'ريال' : 'SAR'}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      calendar: 'gregory'
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-16 ${isArabic ? 'rtl' : 'ltr'}`}>
        {/* Admin Link Button */}
        <div className="flex justify-end">
          <button
            onClick={() => navigate('/dashboard/admin')}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            <Settings className="w-4 h-4" />
            <span>{isArabic ? 'لوحة التحكم' : 'Admin Panel'}</span>
          </button>
        </div>

        {/* Top Summary Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 mb-8">
          {/* Total Spending Card */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow duration-300 h-40 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">{isArabic ? 'إجمالي المصروفات' : 'Total Spending'}</p>
                <h3 className="text-2xl font-bold mt-1">
                  {formatCurrency(summaryStats.totalSpending)}
                </h3>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              {summaryStats.monthlyChange.totalSpending >= 0 ? (
                <ArrowUp className="w-4 h-4 text-green-300 mr-1" />
              ) : (
                <ArrowDown className="w-4 h-4 text-red-300 mr-1" />
              )}
              <span className={summaryStats.monthlyChange.totalSpending >= 0 ? "text-green-300 mr-1" : "text-red-300 mr-1"}>
                {Math.abs(summaryStats.monthlyChange.totalSpending).toFixed(1)}%
              </span>
              <span className="text-blue-100 opacity-90">{isArabic ? 'من الشهر الماضي' : 'from last month'}</span>
            </div>
          </div>

          {/* Labor Costs Card */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow duration-300 h-40 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">{isArabic ? 'تكاليف العمالة' : 'Labor Costs'}</p>
                <h3 className="text-2xl font-bold mt-1">
                  {formatCurrency(summaryStats.laborCosts)}
                </h3>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              {summaryStats.monthlyChange.laborCosts >= 0 ? (
                <ArrowUp className="w-4 h-4 text-green-300 mr-1" />
              ) : (
                <ArrowDown className="w-4 h-4 text-red-300 mr-1" />
              )}
              <span className={summaryStats.monthlyChange.laborCosts >= 0 ? "text-green-300 mr-1" : "text-red-300 mr-1"}>
                {Math.abs(summaryStats.monthlyChange.laborCosts).toFixed(1)}%
              </span>
              <span className="text-green-100 opacity-90">{isArabic ? 'من الشهر الماضي' : 'from last month'}</span>
            </div>
          </div>

          {/* Material Costs Card */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow duration-300 h-40 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">{isArabic ? 'تكاليف المواد' : 'Material Costs'}</p>
                <h3 className="text-2xl font-bold mt-1">
                  {formatCurrency(summaryStats.materialCosts)}
                </h3>
              </div>
              <div className="bg-white/20 p-3 rounded-full">
                <Building className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              {summaryStats.monthlyChange.materialCosts >= 0 ? (
                <ArrowUp className="w-4 h-4 text-green-300 mr-1" />
              ) : (
                <ArrowDown className="w-4 h-4 text-red-300 mr-1" />
              )}
              <span className={summaryStats.monthlyChange.materialCosts >= 0 ? "text-green-300 mr-1" : "text-red-300 mr-1"}>
                {Math.abs(summaryStats.monthlyChange.materialCosts).toFixed(1)}%
              </span>
              <span className="text-purple-100 opacity-90">{isArabic ? 'من الشهر الماضي' : 'from last month'}</span>
            </div>
          </div>
        </div>

        {/* Duplex Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {duplexCosts
            .filter((cost) => cost.total > 0)
            .map((cost) => (
              <div key={cost.duplexNumber} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 shadow-md hover:shadow-xl transition-shadow duration-300 h-40 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      {isArabic ? `دوبلكس ${cost.duplexNumber}` : `Duplex ${cost.duplexNumber}`}
                    </p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(cost.total)}
                    </h3>
                  </div>
                  <div className="bg-white p-3 rounded-full shadow-sm">
                    <Building className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>{isArabic ? 'تكلفة العمالة' : 'Labor Cost'}</span>
                    <span className="font-medium">{formatCurrency(cost.laborCost)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{isArabic ? 'تكلفة المواد' : 'Material Cost'}</span>
                    <span className="font-medium">{formatCurrency(cost.materialCost)}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {isArabic ? 'آخر تحديث' : 'Last updated'}: {formatDate(cost.lastUpdated)}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Analytics;