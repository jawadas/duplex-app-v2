import React, { useState, useEffect } from 'react';
import { Upload, Save, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { DUPLEX_NUMBERS } from '../constants/duplex';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../services/storage';

// Add interface for custom types
interface CustomPurchaseType {
  id: number;
  name: string;
  name_ar: string;
}

interface Purchase {
  name: string;
  duplex_number: number;
  type: string;
  purchase_date: string;
  price: string;
  notes: string;
  attachment_paths?: string[];
  created_by: string;
}

const NewEntryPage: React.FC = () => {
  const navigate = useNavigate();
  const { isArabic } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const [entry, setEntry] = useState<Purchase>({
    name: '',
    duplex_number: 0,
    type: '',
    purchase_date: new Date().toISOString().split('T')[0],
    price: '',
    notes: '',
    created_by: user?.email || ''
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: boolean}>({});
  
  // Add new state for custom types
  const [customTypes, setCustomTypes] = useState<CustomPurchaseType[]>([]);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [newType, setNewType] = useState({ name: '', name_ar: '' });
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin
  useEffect(() => {
    setIsAdmin(user?.role === 'admin');
    // Load custom types
    loadCustomTypes();
  }, [user]);

  // Function to load custom types
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

  // Function to add new type
  const handleAddType = async () => {
    if (!newType.name || !newType.name_ar) return;
    
    try {
      setIsLoading(true);
      const response = await api.purchaseTypes.create({
        name: newType.name,
        name_ar: newType.name_ar
      });
      
      if (response.success) {
        await loadCustomTypes();
        setNewType({ name: '', name_ar: '' });
      }
    } catch (error) {
      console.error('Error adding custom type:', error);
      alert(isArabic ? 'حدث خطأ أثناء إضافة النوع' : 'Error adding type');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to delete type
  const handleDeleteType = async (id: number) => {
    if (!confirm(isArabic ? 'هل أنت متأكد من حذف هذا النوع؟' : 'Are you sure you want to delete this type?')) return;
    
    try {
      setIsLoading(true);
      const response = await api.purchaseTypes.delete(id);
      
      if (response.success) {
        await loadCustomTypes();
      }
    } catch (error) {
      console.error('Error deleting custom type:', error);
      alert(isArabic ? 'حدث خطأ أثناء حذف النوع' : 'Error deleting type');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Special handling for price field
    if (name === 'price') {
      // Only allow positive numbers and empty string
      if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) {
        setEntry(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setEntry(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear validation error when field is edited
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: false }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setAttachments(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: boolean} = {};
    
    // Name validation
    if (!entry.name.trim()) {
      errors.name = true;
    }
    
    // Duplex number validation
    if (!entry.duplex_number || entry.duplex_number === 0) {
      errors.duplex_number = true;
    }
    
    // Type validation
    if (!entry.type) {
      errors.type = true;
    }
    
    // Price validation
    const price = parseFloat(entry.price.toString());
    if (!entry.price || isNaN(price) || price <= 0) {
      errors.price = true;
    }
    
    // Purchase date validation
    if (!entry.purchase_date) {
      errors.purchase_date = true;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        for (const file of attachments) {
          const filename = `${Date.now()}-${file.name}`;
          await storage.uploadFile(file, filename);
          const url = storage.getFileUrl(filename);
          if (url) {
            attachmentUrls.push(url);
          }
        }
      }
      
      // Get the selected type name from the customTypes array
      const selectedTypeId = parseInt(entry.type);
      const selectedType = customTypes.find(type => type.id === selectedTypeId);
      
      if (!selectedType) {
        throw new Error('Selected type not found');
      }
      
      const purchaseData = {
        name: entry.name,
        duplex_number: Number(entry.duplex_number),
        type: selectedType.name, // Use the actual type name
        purchase_date: entry.purchase_date,
        price: Number(entry.price),
        notes: entry.notes,
        created_by: user?.email,
        attachment_paths: attachmentUrls
      };

      await api.purchases.create(purchaseData);
      
      resetForm();
      navigate('/dashboard/purchases');
    } catch (err: any) {
      let errorMessage = isArabic ? 'حدث خطأ أثناء إنشاء المشتريات' : 'Error creating purchase';
      
      if (err.response?.data?.message) {
        if (typeof err.response.data.message === 'object') {
          errorMessage = isArabic ? err.response.data.message.ar : err.response.data.message.en;
        } else {
          errorMessage = err.response.data.message;
        }
      } else if (err.response?.data?.error) {
        if (typeof err.response.data.error === 'object') {
          errorMessage = isArabic ? err.response.data.error.ar : err.response.data.error.en;
        } else {
          errorMessage = err.response.data.error;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEntry({
      name: '',
      duplex_number: 0,
      type: '',
      purchase_date: new Date().toISOString().split('T')[0],
      price: '',
      notes: '',
      created_by: user?.email || ''
    });
    setAttachments([]);
  };

  return (
    <div className={`h-screen bg-gray-50 flex flex-col ${isArabic ? 'rtl' : 'ltr'}`}>
      {/* Main Content */}
      <div className="flex-1 px-4 md:max-w-2xl md:mx-auto md:w-full pt-2">
        <div className="bg-white rounded-lg shadow-sm">
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            {/* Name Field */}
            <div>
              <label 
                htmlFor="name-input"
                className={`block text-gray-700 text-sm font-medium mb-1 ${isArabic ? 'text-right' : 'text-left'}`}
              >
                {isArabic ? 'الاسم' : 'Name'} <span className="text-red-500">*</span>
              </label>
              <input
                id="name-input"
                type="text"
                name="name"
                value={entry.name}
                onChange={handleChange}
                className={`w-full py-1.5 px-3 border rounded-md bg-white text-black ${
                  validationErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                } ${isArabic ? 'text-right' : 'text-left'}`}
                placeholder={isArabic ? 'أدخل اسم العنصر' : 'Enter item name'}
                aria-label={isArabic ? 'الاسم' : 'Name'}
              />
              {validationErrors.name && (
                <p className="mt-1 text-sm text-red-500">
                  {isArabic ? 'هذا الحقل مطلوب' : 'This field is required'}
                </p>
              )}
            </div>

            {/* Duplex Number Field */}
            <div>
              <label 
                htmlFor="duplex-number-select"
                className={`block text-gray-700 text-sm font-medium mb-1 ${isArabic ? 'text-right' : 'text-left'}`}
              >
                {isArabic ? 'رقم الدوبلكس' : 'Duplex Number'} <span className="text-red-500">*</span>
              </label>
              <select
                id="duplex-number-select"
                name="duplex_number"
                value={entry.duplex_number}
                onChange={handleChange}
                required
                className={`w-full py-1.5 px-3 border rounded-md bg-white text-black appearance-none bg-no-repeat ${
                  validationErrors.duplex_number ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                } ${isArabic ? 'text-right pl-8' : 'text-left pr-8'}`}
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundPosition: isArabic ? '16px 50%' : 'calc(100% - 16px) 50%',
                  backgroundSize: '16px'
                }}
              >
                <option value="">{isArabic ? 'اختر رقم الدوبلكس' : 'Select Duplex Number'}</option>
                {DUPLEX_NUMBERS.map((number) => (
                  <option key={number} value={number}>
                    {number}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Field */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label 
                  htmlFor="type"
                  className={`block text-gray-700 text-sm font-medium ${isArabic ? 'text-right' : 'text-left'}`}
                >
                  {isArabic ? 'النوع' : 'Type'} <span className="text-red-500">*</span>
                </label>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowTypeModal(true)}
                    className="text-blue-600 hover:text-blue-800 text-xs flex items-center"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {isArabic ? 'إدارة الأنواع' : 'Manage Types'}
                  </button>
                )}
              </div>
              <select
                id="type"
                name="type"
                value={entry.type}
                onChange={handleChange}
                className={`w-full py-1.5 px-3 border rounded-md bg-white text-black ${
                  validationErrors.type ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                } ${isArabic ? 'text-right' : 'text-left'}`}
              >
                <option value="">{isArabic ? 'اختر النوع' : 'Select Type'}</option>
                {/* Only show database types */}
                {customTypes.map((type) => (
                  <option key={type.id} value={type.id.toString()}>
                    {isArabic ? type.name_ar : type.name}
                  </option>
                ))}
              </select>
              {validationErrors.type && (
                <p className="mt-1 text-sm text-red-500">
                  {isArabic ? 'يرجى اختيار نوع صحيح' : 'Please select a valid type'}
                </p>
              )}
            </div>

            {/* Date and Price in same row */}
            <div className="grid grid-cols-2 gap-3">
              {/* Date Field */}
              <div>
                <label 
                  htmlFor="purchaseDate-input"
                  className={`block text-gray-700 text-sm font-medium mb-1 ${isArabic ? 'text-right' : 'text-left'}`}
                >
                  {isArabic ? 'التاريخ' : 'Date'}
                </label>
                <input
                  id="purchaseDate-input"
                  type="date"
                  name="purchase_date"
                  value={entry.purchase_date}
                  onChange={handleChange}
                  className={`w-full py-1.5 px-3 border rounded-md bg-white text-black ${isArabic ? 'text-right' : 'text-left'}`}
                />
              </div>

              {/* Price Field */}
              <div>
                <label 
                  htmlFor="price"
                  className={`block text-gray-700 text-sm font-medium mb-1 ${isArabic ? 'text-right' : 'text-left'}`}
                >
                  {isArabic ? 'السعر' : 'Price'} <span className="text-red-500">*</span>
                </label>
                <input
                  id="price"
                  type="number"
                  name="price"
                  min="0"
                  step="0.01"
                  value={entry.price}
                  onChange={handleChange}
                  className={`w-full py-1.5 px-3 border rounded-md bg-white text-black ${
                    validationErrors.price ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                  } ${isArabic ? 'text-right' : 'text-left'}`}
                  placeholder={isArabic ? 'أدخل السعر' : 'Enter price'}
                />
                {validationErrors.price && (
                  <p className="mt-1 text-sm text-red-500">
                    {isArabic ? 'يرجى إدخال سعر صحيح أكبر من صفر' : 'Please enter a valid price greater than 0'}
                  </p>
                )}
              </div>
            </div>

            {/* Notes Field */}
            <div>
              <label 
                htmlFor="notes-input"
                className={`block text-gray-700 text-sm font-medium mb-1 ${isArabic ? 'text-right' : 'text-left'}`}
              >
                {isArabic ? 'ملاحظات' : 'Notes'}
              </label>
              <textarea
                id="notes-input"
                name="notes"
                value={entry.notes}
                onChange={handleChange}
                className={`w-full py-1.5 px-3 border rounded-md bg-white text-black ${isArabic ? 'text-right' : 'text-left'}`}
                placeholder={isArabic ? 'تفاصيل إضافية...' : 'Additional details...'}
                rows={2}
              />
            </div>

            {/* Attachment Field */}
            <div>
              <label 
                htmlFor="attachment-input"
                className={`block text-gray-700 text-sm font-medium mb-1 ${isArabic ? 'text-right' : 'text-left'}`}
              >
                {isArabic ? 'المرفقات' : 'Attachments'}
              </label>
              <div className={`flex flex-col space-y-2 ${isArabic ? 'text-right' : 'text-left'}`}>
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700 flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          {isArabic ? 'حذف' : 'Remove'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="bg-gray-100 text-gray-700 px-4 py-1.5 rounded cursor-pointer hover:bg-gray-200 flex items-center">
                  <Upload className="w-4 h-4 ml-2" />
                  {isArabic ? 'تحميل ملفات' : 'Upload Files'}
                  <input 
                    id="attachment-input"
                    name="attachment"
                    type="file" 
                    onChange={handleFileChange} 
                    className="hidden" 
                    multiple
                  />
                </label>
              </div>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-blue-600 text-white py-2 rounded-md font-medium hover:bg-blue-700 flex items-center justify-center ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading 
                ? (isArabic ? 'جاري الحفظ...' : 'Saving...') 
                : (isArabic ? 'حفظ الإدخال' : 'Save Entry')}
            </button>
          </form>
        </div>
      </div>

      {/* Add Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-3">
                {isArabic ? 'إدارة الأنواع' : 'Manage Types'}
              </h2>
              
              {/* New Type Form */}
              <div className="mb-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? 'اسم النوع (بالإنجليزية)' : 'Type Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={newType.name}
                    onChange={(e) => setNewType({...newType, name: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder={isArabic ? "أدخل الاسم بالإنجليزية" : "Enter name in English"}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isArabic ? 'اسم النوع (بالعربية)' : 'Type Name (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={newType.name_ar}
                    onChange={(e) => setNewType({...newType, name_ar: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-md"
                    placeholder={isArabic ? "أدخل الاسم بالعربية" : "Enter name in Arabic"}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddType}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  {isArabic ? 'إضافة نوع' : 'Add Type'}
                </button>
              </div>
              
              {/* List of Custom Types */}
              <div className="max-h-60 overflow-auto border rounded-md">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {isArabic ? 'اسم النوع (الإنجليزية)' : 'Type Name (English)'}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {isArabic ? 'اسم النوع (العربية)' : 'Type Name (Arabic)'}
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {isArabic ? 'الإجراءات' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customTypes.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-center text-sm text-gray-500">
                          {isArabic ? 'لا توجد أنواع مخصصة' : 'No custom types available'}
                        </td>
                      </tr>
                    ) : (
                      customTypes.map((type) => (
                        <tr key={type.id}>
                          <td className="px-4 py-2 text-sm">{type.name}</td>
                          <td className="px-4 py-2 text-sm">{type.name_ar}</td>
                          <td className="px-4 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteType(type.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={() => setShowTypeModal(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm"
                >
                  {isArabic ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewEntryPage;
