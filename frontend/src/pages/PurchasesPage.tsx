import React, { useState, useEffect } from 'react';
import { PurchaseType, PurchaseTypeTranslations } from '../types/purchase.types';
import { DUPLEX_NUMBERS } from '../constants/duplex';
import { useLanguage } from '../contexts/LanguageContext';
import { format, subDays, startOfMonth, endOfMonth, endOfDay, startOfDay} from 'date-fns';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface PurchaseResponse {
  id: number;
  name: string;
  duplex_number: number;
  type: string;
  purchase_date: string;
  price: number | string;
  notes?: string;
  attachment_paths?: string[];
  created_by: string;
  created_at: string;
}

interface NewPurchase {
  name: string;
  duplex_number: string;
  type: string;
  purchase_date: string;
  price: string;
  notes: string;
  attachments: File[];
}

interface PurchaseFilters {
  startDate?: string;
  endDate?: string;
  duplexNumber?: number;
  type?: PurchaseType;
}

// Add interface for custom types
interface CustomPurchaseType {
  id: number;
  name: string;
  name_ar: string;
  created_at: string;
}

const PurchasesPage: React.FC = () => {
  const { isArabic } = useLanguage();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<PurchaseResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filters, setFilters] = useState<PurchaseFilters>({
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    duplexNumber: undefined,
    type: undefined
  });
  const [selectedDateRange, setSelectedDateRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all'>('today');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<PurchaseResponse | null>(null);
  const [selectedNotes, setSelectedNotes] = useState<string | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<NewPurchase>({
    name: '',
    duplex_number: '',
    type: '',
    purchase_date: new Date().toISOString().split('T')[0],
    price: '',
    notes: '',
    attachments: []
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [customTypes, setCustomTypes] = useState<CustomPurchaseType[]>([]);

  useEffect(() => {
    const savedLang = localStorage.getItem('isArabic');
    if (savedLang !== null) {
      // Removed the setIsArabic call as it's now handled by the LanguageContext
    }
  }, []);

  useEffect(() => {
    // Load custom purchase types
    const loadCustomTypes = async () => {
      try {
        const response = await api.purchaseTypes.getAll();
        if (response.success && response.data) {
          setCustomTypes(response.data);
        }
      } catch (error) {
        console.error('Error loading custom types:', error);
      }
    };
    
    loadCustomTypes();
  }, []);

  const loadPurchases = async () => {
    try {
      setIsLoading(true);
      const apiFilters: Record<string, string | number | undefined> = {};
      
      if (filters.startDate && filters.endDate) {
        // For same-day queries, don't convert to ISO string to avoid timezone issues
        if (filters.startDate === filters.endDate) {
          apiFilters.startDate = filters.startDate;
          apiFilters.endDate = filters.endDate;
        } else {
          // For date ranges, use ISO strings with proper time boundaries
          const startDate = new Date(filters.startDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          
          apiFilters.startDate = startDate.toISOString();
          apiFilters.endDate = endDate.toISOString();
        }
        
        console.log('Date filters being sent:', {
          startDate: apiFilters.startDate,
          endDate: apiFilters.endDate,
          localStartDate: filters.startDate,
          localEndDate: filters.endDate
        });
      }

      if (filters.duplexNumber) {
        apiFilters.duplexNumber = filters.duplexNumber;
      }

      if (filters.type) {
        apiFilters.type = filters.type;
      }

      console.log('Making API request with filters:', apiFilters);
      console.log('Current filters state:', filters);

      // Get the auth token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        toast.error('Please log in again');
        return;
      }

      const response = await api.purchases.getAll(apiFilters);

      console.log('API response:', response);

      if (response.success && response.data) {
        console.log('Setting purchases with:', response.data.length, 'items');
        setPurchases(response.data);
      } else {
        console.error('API request was not successful:', response);
        toast.error(response.error || 'Failed to load purchases');
      }
    } catch (error) {
      console.error('Error loading purchases:', error);
      const axiosError = error as { response?: { status: number } };
      if (axiosError.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
      } else {
        toast.error('Failed to load purchases');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    console.log('Loading purchases with filters:', filters);
    loadPurchases();
  }, [filters]);

  const handleFilterChange = (key: keyof PurchaseFilters, value: string | number | undefined) => {
    console.log('Changing filter:', key, value);
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [key]: value
      };
      console.log('New filters:', newFilters);
      return newFilters;
    });
  };

  const resetFilters = () => {
    setFilters({
      startDate: format(startOfDay(new Date()), 'yyyy-MM-dd'),
      endDate: format(endOfDay(new Date()), 'yyyy-MM-dd'),
      duplexNumber: undefined
    });
    setSelectedDateRange('today');
  };

  const showAll = () => {
    setFilters(prev => ({
      ...prev,
      startDate: undefined,
      endDate: undefined
    }));
    setSelectedDateRange('all');
  };

  const applyFilters = (purchases: PurchaseResponse[]): PurchaseResponse[] => {
    console.log('Applying filters to purchases:', purchases.length);
    return purchases;  // Return all purchases since filtering is done on the server
  };

  const filteredPurchases = React.useMemo(() => {
    console.log('Filtering purchases:', {
      totalPurchases: purchases.length,
      filters
    });
    const filtered = applyFilters(purchases);
    console.log('Filtered result:', filtered.length);
    return filtered;
  }, [purchases, filters]);

  const calculateTotal = (purchases: PurchaseResponse[]): number => {
    console.log('Calculating total for purchases:', purchases.length);
    return purchases.reduce((sum, purchase) => {
      const price = typeof purchase.price === 'string' ? parseFloat(purchase.price) : purchase.price;
      return sum + (isNaN(price) ? 0 : price);
    }, 0);
  };

  const handleDateRangeSelect = (range: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    const now = new Date();
    
    switch (range) {
      case 'today':
        const today = format(now, 'yyyy-MM-dd');
        setFilters(prev => ({
          ...prev,
          startDate: today,
          endDate: today
        }));
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        setFilters(prev => ({
          ...prev,
          startDate: format(yesterday, 'yyyy-MM-dd'),
          endDate: format(yesterday, 'yyyy-MM-dd')
        }));
        break;
      case 'week':
        const weekStart = subDays(now, 7);
        setFilters(prev => ({
          ...prev,
          startDate: format(weekStart, 'yyyy-MM-dd'),
          endDate: format(now, 'yyyy-MM-dd')
        }));
        break;
      case 'month':
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        setFilters(prev => ({
          ...prev,
          startDate: format(monthStart, 'yyyy-MM-dd'),
          endDate: format(monthEnd, 'yyyy-MM-dd')
        }));
        break;
      case 'all':
        setFilters(prev => ({
          ...prev,
          startDate: undefined,
          endDate: undefined
        }));
        break;
    }
    setSelectedDateRange(range);
  };

  const handleDelete = (purchase: PurchaseResponse) => {
    setSelectedPurchase(purchase);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedPurchase) return;
    
    try {
      setIsLoading(true);
      const response = await api.purchases.delete(selectedPurchase.id);
      
      if (response) {
        setShowDeleteModal(false);
        loadPurchases(); // Refresh the list
      }
    } catch (error) {
      alert(isArabic ? 'حدث خطأ أثناء حذف المشتريات' : 'Error deleting purchase');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotesClick = (notes: string) => {
    setSelectedNotes(notes);
    setShowNotesModal(true);
  };

  const closeNotesModal = () => {
    setShowNotesModal(false);
    setSelectedNotes(null);
  };

  const handleEdit = (purchase: PurchaseResponse) => {
    setSelectedPurchase(purchase);
    setEditFormData({
      name: purchase.name,
      duplex_number: purchase.duplex_number.toString(),
      type: purchase.type,
      purchase_date: purchase.purchase_date.split('T')[0],
      price: typeof purchase.price === 'number' ? purchase.price.toString() : purchase.price,
      notes: purchase.notes || '',
      attachments: []
    });
    setShowEditModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedPurchase) return;
    
    try {
      setIsSubmitting(true);
      const attachment_paths: string[] = [];
      
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const filename = `purchases/${Date.now()}-${file.name}`;
          const path = await storage.uploadFile(file, filename);
          if (path) {
            attachment_paths.push(path);
          }
        }
      }

      const purchaseData = {
        name: editFormData.name,
        duplex_number: parseInt(editFormData.duplex_number),
        type: editFormData.type,
        purchase_date: editFormData.purchase_date,
        price: parseFloat(editFormData.price),
        notes: editFormData.notes,
        attachment_paths: [...(selectedPurchase.attachment_paths || []), ...attachment_paths]
      };

      const response = await api.purchases.update(selectedPurchase.id, purchaseData);
      
      if (response) {
        setShowEditModal(false);
        setSelectedFiles([]);
        loadPurchases(); // Refresh the list
      }
    } catch (error) {
      console.error('Error updating purchase:', error);
      alert(isArabic ? 'حدث خطأ أثناء تحديث المشتريات' : 'Error updating purchase');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeExistingAttachment = (index: number) => {
    if (!selectedPurchase) return;
    const updatedPaths = [...(selectedPurchase.attachment_paths || [])];
    updatedPaths.splice(index, 1);
    setSelectedPurchase({
      ...selectedPurchase,
      attachment_paths: updatedPaths
    });
  };

  // Helper function to get purchase type display name
  const getPurchaseTypeDisplayName = (type: string): string => {
    // Check if it's one of the enum types
    if (Object.values(PurchaseType).includes(type as PurchaseType)) {
      return isArabic 
        ? PurchaseTypeTranslations[type as PurchaseType].ar 
        : PurchaseTypeTranslations[type as PurchaseType].en;
    }
    
    // Otherwise, find the custom type by name
    const customType = customTypes.find(ct => ct.name === type);
    if (customType) {
      return isArabic ? customType.name_ar : customType.name;
    }
    
    // Fallback to just showing the type string
    return type;
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-20">
      <div className="container mx-auto p-4 md:max-w-2xl">
        {/* Filters Section */}
        <div className="bg-white rounded-xl p-3 mb-5 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-medium text-gray-700">
              {isArabic ? 'الفلاتر' : 'Filters'}
            </h2>
            <div className="text-gray-500 text-sm">&#9662;</div>
          </div>

          <div className="space-y-3">
            {/* Duplex Number Filter */}
            <div>
              <div className="text-xs text-gray-500 mb-1">
                {isArabic ? 'رقم الدوبلكس' : 'Duplex Number'}
              </div>
              <select
                className={`w-full p-2 border border-gray-300 rounded-md bg-white dark:bg-white dark:text-gray-900 text-base appearance-none bg-no-repeat ${
                  isArabic ? 'text-right pl-8' : 'text-left pr-8'
                }`}
                value={filters.duplexNumber || ''}
                onChange={(e) => handleFilterChange('duplexNumber', e.target.value ? Number(e.target.value) : undefined)}
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundPosition: isArabic ? '16px 50%' : 'calc(100% - 16px) 50%',
                  backgroundSize: '16px',
                  fontSize: '16px',
                  height: '44px',
                  textAlign: 'center',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
                }}
              >
                <option value="">
                  {isArabic ? 'جميع الدوبلكسات' : 'All Duplexes'}
                </option>
                {DUPLEX_NUMBERS.map((number) => (
                  <option key={number} value={number}>
                    {number}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div>
              <div className="text-xs text-gray-500 mb-1">
                {isArabic ? 'تاريخ الإنشاء من' : 'Created From'}
              </div>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-white dark:text-gray-900 mb-2 text-base"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                style={{
                  fontSize: '16px',
                  height: '44px',
                  textAlign: 'center',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
                }}
              />
              
              <div className="text-xs text-gray-500 mb-1">
                {isArabic ? 'تاريخ الإنشاء إلى' : 'Created To'}
              </div>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-white dark:text-gray-900 text-base"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                style={{
                  fontSize: '16px',
                  height: '44px',
                  textAlign: 'center',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
                }}
              />
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleDateRangeSelect('today')}
                className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-sm font-medium ${
                  selectedDateRange === 'today' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isArabic ? 'اليوم' : 'Today'}
              </button>
              <button
                onClick={() => handleDateRangeSelect('yesterday')}
                className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-sm font-medium ${
                  selectedDateRange === 'yesterday' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isArabic ? 'الأمس' : 'Yesterday'}
              </button>
              <button
                onClick={() => handleDateRangeSelect('week')}
                className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-sm font-medium ${
                  selectedDateRange === 'week' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isArabic ? 'آخر ٧ أيام' : 'Last 7 Days'}
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleDateRangeSelect('month')}
                className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-sm font-medium ${
                  selectedDateRange === 'month' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isArabic ? 'هذا الشهر' : 'This Month'}
              </button>
              <button
                onClick={showAll}
                className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-sm font-medium ${
                  !filters.startDate && !filters.endDate
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isArabic ? 'عرض الكل' : 'Show All'}
              </button>
            </div>

            {/* Reset Button */}
            <button
              onClick={resetFilters}
              className="w-full py-2 px-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
            >
              {isArabic ? 'إعادة تعيين الفلاتر' : 'Reset Filters'}
            </button>
          </div>
        </div>

        {/* Total Amount */}
        <div className="bg-[#eef3fd] rounded-xl p-5 mb-5 flex justify-between items-center">
          <div className="text-base font-medium text-gray-800">
            {isArabic ? 'إجمالي المشتريات:' : 'Total Purchases:'}
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {calculateTotal(filteredPurchases).toLocaleString('en-US', {
              style: 'currency',
              currency: 'SAR'
            })}
          </div>
        </div>

        {/* Purchases Table */}
        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="p-4 bg-[#f5f5f7] text-sm font-semibold text-gray-600">
                    {isArabic ? 'الرقم المرجعي' : 'ID'}
                  </th>
                  <th className="p-4 bg-[#f5f5f7] text-sm font-semibold text-gray-600">
                    {isArabic ? 'الاسم' : 'Name'}
                  </th>
                  <th className="p-4 bg-[#f5f5f7] text-sm font-semibold text-gray-600">
                    {isArabic ? 'رقم الدوبلكس' : 'Duplex Number'}
                  </th>
                  <th className="p-4 bg-[#f5f5f7] text-sm font-semibold text-gray-600">
                    {isArabic ? 'النوع' : 'Type'}
                  </th>
                  <th className="p-4 bg-[#f5f5f7] text-sm font-semibold text-gray-600">
                    {isArabic ? 'السعر' : 'Price'}
                  </th>
                  <th className="p-4 bg-[#f5f5f7] text-sm font-semibold text-gray-600">
                    {isArabic ? 'الملاحظات' : 'Notes'}
                  </th>
                  <th className="p-4 bg-[#f5f5f7] text-sm font-semibold text-gray-600">
                    {isArabic ? 'تاريخ الإنشاء' : 'Created At'}
                  </th>
                  <th className="p-4 bg-[#f5f5f7] text-sm font-semibold text-gray-600">
                    {isArabic ? 'المرفقات' : 'Attachments'}
                  </th>
                  <th className="p-4 bg-[#f5f5f7] text-sm font-semibold text-gray-600">
                    {isArabic ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-gray-500">
                      {isArabic ? 'جاري التحميل...' : 'Loading...'}
                    </td>
                  </tr>
                ) : filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-gray-500">
                      {isArabic ? 'لا توجد مشتريات' : 'No purchases found'}
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((purchase) => {
                    console.log('Rendering purchase:', purchase);
                    return (
                      <tr key={purchase.id} className="border-t border-gray-100">
                        <td className="p-4 text-gray-800">{purchase.id}</td>
                        <td className="p-4 text-gray-800">{purchase.name}</td>
                        <td className="p-4 text-gray-800">{purchase.duplex_number}</td>
                        <td className="p-4 text-gray-800">
                          {getPurchaseTypeDisplayName(purchase.type)}
                        </td>
                        <td className="p-4 text-gray-800">
                          {typeof purchase.price === 'number' ? 
                            purchase.price.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'SAR'
                            }) : '0 SAR'}
                        </td>
                        <td className="p-4 text-gray-800">
                          {purchase.notes ? (
                            <div className="max-w-xs">
                              <div className="truncate" title={purchase.notes}>
                                {purchase.notes}
                              </div>
                              {purchase.notes.length > 50 && (
                                <button
                                  onClick={() => handleNotesClick(purchase.notes || '')}
                                  className="text-blue-600 hover:text-blue-800 text-sm mt-1"
                                >
                                  {isArabic ? 'عرض المزيد' : 'Show more'}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="p-4 text-gray-800">
                          {new Date(purchase.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            calendar: 'gregory'
                          })}
                        </td>
                        <td className="p-4">
                          {purchase.attachment_paths && purchase.attachment_paths.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {purchase.attachment_paths.map((path, index) => (
                                <a
                                  key={index}
                                  href={path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-2 py-1 rounded text-sm text-blue-600 hover:text-blue-800"
                                >
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                  </svg>
                                  {path.split('/').pop()}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleEdit(purchase)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              {isArabic ? 'تعديل' : 'Edit'}
                            </button>
                            <button
                              onClick={() => handleDelete(purchase)}
                              className="text-red-600 hover:text-red-900"
                            >
                              {isArabic ? 'حذف' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add New Invoice Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => navigate('/dashboard/new-entry')}
            className="bg-blue-600 text-white rounded-xl py-4 px-6 flex items-center gap-3 hover:bg-blue-700 transition-colors shadow-sm w-full md:w-auto"
          >
            <Plus className="w-5 h-5" />
            <span className="text-base font-medium">{isArabic ? 'إضافة فاتورة' : 'Add Invoice'}</span>
          </button>
        </div>
      </div>

      {/* Notes Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`bg-white rounded-lg p-6 w-full max-w-md ${isArabic ? 'text-right' : 'text-left'}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {isArabic ? 'الملاحظات' : 'Notes'}
              </h3>
              <button
                onClick={closeNotesModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="whitespace-pre-wrap break-words">
              {selectedNotes || '-'}
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              {isArabic ? 'تأكيد الحذف' : 'Confirm Delete'}
            </h3>
            <p className="text-sm text-gray-500">
              {isArabic ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this record?'}
            </p>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                {isArabic ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {isArabic ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`bg-white rounded-lg p-6 w-full max-w-md ${isArabic ? 'text-right' : 'text-left'}`} style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
            <h2 className="text-xl font-bold mb-4">{isArabic ? 'تعديل المشتريات' : 'Edit Purchase'}</h2>
            <form onSubmit={handleEditSubmit} encType="multipart/form-data">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? 'اسم المشتريات' : 'Purchase Name'}
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-white dark:text-gray-900"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
                />
              </div>
              
              {/* Two fields in one row: Duplex Number and Purchase Type */}
              <div className="flex flex-row space-x-2 rtl:space-x-reverse">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? 'رقم الدوبلكس' : 'Duplex Number'}
                  </label>
                  <select
                    required
                    className={`w-full p-2 border rounded-md mb-4 bg-white dark:bg-white dark:text-gray-900 appearance-none bg-no-repeat custom-select ${
                      isArabic ? 'text-right pl-8' : 'text-left pr-8'
                    }`}
                    value={editFormData.duplex_number}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, duplex_number: e.target.value }))}
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
                  >
                    <option value="">{isArabic ? 'اختر رقم الدوبلكس' : 'Select Duplex Number'}</option>
                    {DUPLEX_NUMBERS.map((num) => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? 'نوع المشتريات' : 'Purchase Type'}
                  </label>
                  <select
                    required
                    className={`w-full p-2 border rounded-md mb-4 bg-white dark:bg-white dark:text-gray-900 appearance-none bg-no-repeat custom-select ${
                      isArabic ? 'text-right pl-8' : 'text-left pr-8'
                    }`}
                    value={editFormData.type}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, type: e.target.value }))}
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
                  >
                    <option value="">{isArabic ? 'اختر النوع' : 'Select Type'}</option>
                    {/* Show custom types from database */}
                    {customTypes.map((type) => (
                      <option key={type.id} value={type.name}>
                        {isArabic ? type.name_ar : type.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Two fields in one row: Price and Purchase Date */}
              <div className="flex flex-row space-x-2 rtl:space-x-reverse">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? 'السعر' : 'Price'}
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-white dark:text-gray-900"
                    value={editFormData.price}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, price: e.target.value }))}
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? 'تاريخ الشراء' : 'Purchase Date'}
                  </label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-white dark:text-gray-900"
                    value={editFormData.purchase_date}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
                    style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? 'ملاحظات' : 'Notes'}
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-white dark:text-gray-900"
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isArabic ? 'المرفقات' : 'Attachments'}
                </label>
                <div className="flex items-center">
                  <label className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {isArabic ? 'اختر ملفات' : 'Choose Files'}
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      multiple
                    />
                  </label>
                </div>
                {selectedPurchase?.attachment_paths && selectedPurchase.attachment_paths.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-700">
                      {isArabic ? 'المرفقات الحالية:' : 'Current attachments:'}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {selectedPurchase.attachment_paths.map((path, index) => (
                        <li key={index} className="flex items-center justify-between text-sm">
                          <a
                            href={path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center"
                          >
                            {path.split('/').pop()}
                          </a>
                          <button
                            type="button"
                            onClick={() => removeExistingAttachment(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            {isArabic ? 'حذف' : 'Remove'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedFiles.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-gray-700">
                      {isArabic ? 'الملفات الجديدة:' : 'New files:'}
                    </p>
                    <ul className="mt-1 space-y-1">
                      {selectedFiles.map((file, index) => (
                        <li key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            {isArabic ? 'حذف' : 'Remove'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedFiles([]);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  disabled={isSubmitting}
                >
                  {isArabic ? 'حفظ' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesPage;
