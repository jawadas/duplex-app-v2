import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DUPLEX_NUMBERS } from '../constants/duplex';
import type { WorkProject } from '../types/labor.types';
import { useLanguage } from '../contexts/LanguageContext';
import { storage } from '../services/storage';
import { useAuth } from '../contexts/AuthContext';

interface EditFormData {
  amount: string;
  date: string;
  notes: string;
  attachments: File[];
}

interface WorkPayment {
  id: number;
  project_id: number;
  amount: number;
  date: string;
  notes?: string;
  duplex_number: string;
  attachment_paths?: string[];
  project_name?: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

const WorkPaymentPage: React.FC = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [projects, setProjects] = useState<WorkProject[]>([]);
  const [payments, setPayments] = useState<WorkPayment[]>([]);
  const [selectedProject, setSelectedProject] = useState<WorkProject | null>(null);
  const [selectedDuplex, setSelectedDuplex] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<WorkPayment | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    amount: '',
    date: '',
    notes: '',
    attachments: []
  });

  // Common styles for modal inputs to fix dark mode on iOS

  // Load projects on component mount and when duplex changes
  useEffect(() => {
    if (selectedDuplex) {
      loadProjects();
    }
  }, [selectedDuplex]);

  // Load payments when project or duplex changes
  useEffect(() => {
    const loadPaymentsForProject = async () => {
      console.log('loadPaymentsForProject called with:', {
        selectedProject,
        selectedDuplex,
        projects
      });
      
      // If we don't have projects loaded yet, wait for them
      if (projects.length === 0 && selectedDuplex) {
        console.log('Projects not loaded yet, loading them first');
        try {
          const projectsData = await api.workProjects.getAll();
          setProjects(projectsData);
        } catch (error) {
          console.error('Error loading projects:', error);
          return;
        }
      }
      
      if (selectedProject?.id) {
        console.log('Loading payments for project:', selectedProject.id);
        setIsLoading(true);
        try {
          const data = await api.getWorkProjectPayments(selectedProject.id);
          console.log('Loaded payments:', data);
          setPayments(data.map(payment => ({
            ...payment,
            duplex_number: String(payment.duplex_number),
            project_name: selectedProject.name
          })));
        } catch (error) {
          console.error('Error loading payments:', error);
          alert(isArabic ? 'حدث خطأ أثناء تحميل الدفعات' : 'Error loading payments');
          setPayments([]);
        } finally {
          setIsLoading(false);
        }
      } else if (selectedDuplex) {
        console.log('Loading all payments for duplex:', selectedDuplex);
        setIsLoading(true);
        try {
          await loadAllPaymentsForDuplex();
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log('No project or duplex selected, clearing payments');
        setPayments([]);
      }
    };

    loadPaymentsForProject();
  }, [selectedProject, selectedDuplex, projects]);

  const loadProjects = async () => {
    try {
      console.log('Loading all projects');
      const projectsData = await api.workProjects.getAll();
      console.log('Loaded projects:', projectsData);
      setProjects(projectsData);
      return projectsData;
    } catch (error) {
      console.error('Error loading projects:', error);
      throw error;
    }
  };

  const loadAllPaymentsForDuplex = async () => {
    if (!selectedDuplex) return;
    
    setIsLoading(true);
    try {
      const filteredProjects = getFilteredProjects().filter((project): project is WorkProject & { id: number } => 
        typeof project.id === 'number'
      );
      
      if (filteredProjects.length === 0) {
        setPayments([]);
        return;
      }

      const allPaymentsPromises = filteredProjects.map(project => 
        api.getWorkProjectPayments(project.id)
          .then(payments => payments.map(payment => ({
            ...payment,
            duplex_number: String(payment.duplex_number),
            project_name: project.name
          })))
          .catch(error => {
            console.error(`Error loading payments for project ${project.id}:`, error);
            return [];
          })
      );

      const allPayments = await Promise.all(allPaymentsPromises);
      const flattenedPayments = allPayments.flat().sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      setPayments(flattenedPayments);
    } catch (error) {
      console.error('Error loading all payments:', error);
      alert(isArabic ? 'حدث خطأ أثناء تحميل الدفعات' : 'Error loading payments');
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotal = () => {
    return payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  };

  const handleEdit = (payment: WorkPayment) => {
    console.log('Editing payment:', payment);
    setSelectedPayment(payment);
    
    // Find and set the corresponding project
    const paymentProject = projects.find(p => p.id === payment.project_id);
    if (paymentProject) {
      console.log('Setting project for payment:', paymentProject);
      setSelectedProject(paymentProject);
    } else {
      console.error('Project not found for payment:', payment);
    }
    
    // Format the date to YYYY-MM-DD for the date input
    const formattedDate = new Date(payment.date).toISOString().split('T')[0];
    setEditFormData({
      amount: String(payment.amount),
      date: formattedDate,
      notes: payment.notes || '',
      attachments: []
    });
    setShowEditModal(true);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, file]
      }));
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(isArabic ? 'هل أنت متأكد من حذف هذا السجل؟' : 'Are you sure you want to delete this record?')) {
      return;
    }

    try {
      setIsLoading(true);
      await api.workProjects.deletePayment(id);
      // Reload payments based on current selection
      if (selectedProject?.id) {
        const data = await api.getWorkProjectPayments(selectedProject.id);
        setPayments(data.map(payment => ({
          ...payment,
          duplex_number: String(payment.duplex_number),
          project_name: selectedProject.name
        })));
      } else if (selectedDuplex) {
        await loadAllPaymentsForDuplex();
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert(isArabic ? 'حدث خطأ أثناء حذف السجل' : 'Error deleting the record');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment?.id) {
      console.error('No payment selected for update:', selectedPayment);
      alert(isArabic ? 'الرجاء اختيار دفعة صالحة' : 'Please select a valid payment');
      return;
    }

    if (!selectedProject?.id) {
      console.error('No project selected for update:', selectedProject);
      alert(isArabic ? 'الرجاء اختيار مشروع صالح' : 'Please select a valid project');
      return;
    }

    if (!editFormData.amount || !editFormData.date) {
      alert(isArabic ? 'الرجاء إدخال المبلغ والتاريخ' : 'Please enter amount and date');
      return;
    }

    setIsLoading(true);
    try {
      let attachment_paths: string[] = [];
      
      // Upload new attachments to OCI if they exist
      if (editFormData.attachments.length > 0) {
        for (const file of editFormData.attachments) {
          const filename = `work-payments/${Date.now()}-${file.name}`;
          const path = await storage.uploadFile(file, filename);
          if (path) {
            attachment_paths.push(path);
          }
        }
      }

      // Add existing attachments that haven't been removed
      const existingAttachments = selectedPayment.attachment_paths || [];
      attachment_paths = [...attachment_paths, ...existingAttachments];

      const paymentData = {
        project_id: selectedProject.id,
        amount: parseFloat(String(editFormData.amount)),
        date: editFormData.date,
        notes: editFormData.notes || '',
        duplex_number: selectedProject.duplex_number,
        attachment_paths: attachment_paths,
        created_by: user?.email
      };

      await api.updateWorkProjectPayment(selectedPayment.id, paymentData);
      
      // Reload payments based on current selection
      if (selectedProject.id) {
        const data = await api.getWorkProjectPayments(selectedProject.id);
        setPayments(data.map(payment => ({
          ...payment,
          duplex_number: String(payment.duplex_number),
          project_name: selectedProject.name
        })));
      } else if (selectedDuplex) {
        await loadAllPaymentsForDuplex();
      }
      
      window.parent?.postMessage({ type: 'PAYMENT_UPDATE' }, '*');
      
      setShowEditModal(false);
      setSelectedPayment(null);
      setEditFormData({
        amount: '',
        date: '',
        notes: '',
        attachments: []
      });
    } catch (error) {
      console.error('Error updating payment:', error);
      alert(isArabic ? 'حدث خطأ أثناء تحديث الدفعة' : 'Error updating payment');
    } finally {
      setIsLoading(false);
    }
  };

  const removeExistingAttachment = (index: number) => {
    if (selectedPayment) {
      const updatedPaths = [...(selectedPayment.attachment_paths || [])];
      updatedPaths.splice(index, 1);
      setSelectedPayment({
        ...selectedPayment,
        attachment_paths: updatedPaths
      });
    }
  };

  // Get filtered projects based on selected duplex
  const getFilteredProjects = () => {
    if (!selectedDuplex) {
      console.log('No duplex selected for filtering');
      return [];
    }
    return projects.filter(project => project.duplex_number === Number(selectedDuplex));
  };

  const handleDuplexChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    console.log('Duplex changed to:', value);
    setSelectedDuplex(value);
    
    try {
      if (value) {
        console.log('Loading projects for duplex:', value);
        setIsLoading(true);
        
        // Load projects and update state
        const projectsData = await api.workProjects.getAll();
        console.log('Loaded projects:', projectsData);
        setProjects(projectsData);
        
        // For initial selection, ensure "All Projects" is selected
        if (!selectedProject) {
          console.log('Initial duplex selection, setting to All Projects');
          setSelectedProject(null); // This will trigger loading all payments for the duplex
        }
      } else {
        console.log('No duplex selected');
        setSelectedProject(null);
        setPayments([]);
      }
    } catch (error) {
      console.error('Error in handleDuplexChange:', error);
      setSelectedProject(null);
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProjectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'all') {
      setSelectedProject(null);
      await loadAllPaymentsForDuplex();
    } else {
      const project = projects.find(p => p.id === Number(value));
      setSelectedProject(project || null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-16">
      <div className="container mx-auto p-3 md:max-w-2xl">
        {/* Filters Section */}
        <div className="bg-white rounded-xl p-3 mb-3 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-base font-medium text-gray-700">
              {isArabic ? 'تفاصيل العمل' : 'Work Details'}
            </h2>
            <div className="text-gray-500 text-sm">&#9662;</div>
          </div>

          <div className="space-y-2">
            {/* Duplex Number Filter */}
            <div>
              <div className="text-xs text-gray-500 mb-1">
                {isArabic ? 'رقم الدوبلكس' : 'Duplex Number'}
              </div>
              <select
                className="w-full p-2 border rounded-md mb-2 text-center"
                value={selectedDuplex}
                onChange={handleDuplexChange}
                style={{
                  fontSize: '16px',
                  height: '50px',
                  textAlign: 'center'
                }}
              >
                <option value="">{isArabic ? 'اختر رقم الدوبلكس' : 'Select Duplex Number'}</option>
                {DUPLEX_NUMBERS.map((num) => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            {/* Project Selection */}
            {selectedDuplex && (
              <div>
                <div className="text-xs text-gray-500 mb-1">
                  {isArabic ? 'المشروع' : 'Project'}
                </div>
                <select
                  className="w-full p-2 border rounded-md mb-2 text-center"
                  value={selectedProject?.id || ''}
                  onChange={handleProjectChange}
                  style={{
                    fontSize: '16px',
                    height: '50px',
                    textAlign: 'center'
                  }}
                >
                  <option value="all">{isArabic ? 'جميع المشاريع' : 'All Projects'}</option>
                  {getFilteredProjects().map((project) => (
                    <option key={project.id} value={String(project.id)}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {selectedDuplex && (
          <>
            {/* Total Amount Card */}
            <div className="bg-[#eef3fd] rounded-xl p-3 mb-3">
              <h3 className="text-base font-medium text-gray-800 mb-2">
                {isArabic ? 'إجمالي المدفوعات' : 'Total Payments'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-gray-600">
                    {isArabic ? 'المجموع: ' : 'Total: '}
                    <span className="font-semibold text-blue-600">
                      {calculateTotal().toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'SAR'
                      })}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Payments Table */}
            <div className="bg-white rounded-xl overflow-hidden shadow-sm">
              <div className="p-2 flex justify-between items-center">
                <div>
                  <h2 className="text-base font-semibold text-gray-800">
                    {isArabic ? 'المدفوعات' : 'Payments'}
                  </h2>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="p-2 bg-[#f5f5f7] text-sm font-semibold text-gray-600 text-left">
                        {isArabic ? 'المشروع' : 'Project'}
                      </th>
                      <th className="p-2 bg-[#f5f5f7] text-sm font-semibold text-gray-600 text-left">
                        {isArabic ? 'المبلغ' : 'Amount'}
                      </th>
                      <th className="p-2 bg-[#f5f5f7] text-sm font-semibold text-gray-600 text-left">
                        {isArabic ? 'التاريخ' : 'Date'}
                      </th>
                      <th className="p-2 bg-[#f5f5f7] text-sm font-semibold text-gray-600 text-left">
                        {isArabic ? 'الملاحظات' : 'Notes'}
                      </th>
                      <th className="p-2 bg-[#f5f5f7] text-sm font-semibold text-gray-600 text-left">
                        {isArabic ? 'المرفقات' : 'Attachments'}
                      </th>
                      <th className="p-2 bg-[#f5f5f7] text-sm font-semibold text-gray-600 text-left">
                        {isArabic ? 'تم الإنشاء بواسطة' : 'Created By'}
                      </th>
                      <th className="p-2 bg-[#f5f5f7] text-sm font-semibold text-gray-600 text-left">
                        {isArabic ? 'الإجراءات' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="p-2 text-center text-gray-500">
                          {isArabic ? 'جاري التحميل...' : 'Loading...'}
                        </td>
                      </tr>
                    ) : payments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-2 text-center text-gray-500">
                          {isArabic ? 'لا توجد مدفوعات' : 'No payments found'}
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="p-2 text-sm text-gray-900">
                            {payment.project_name}
                          </td>
                          <td className="p-2 text-sm text-gray-900">
                            {payment.amount.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'SAR'
                            })}
                          </td>
                          <td className="p-2 text-sm text-gray-900">
                            {new Date(payment.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              calendar: 'gregory'
                            })}
                          </td>
                          <td className="p-2 text-sm text-gray-900">
                            {payment.notes || '-'}
                          </td>
                          <td className="p-2">
                            {payment.attachment_paths && payment.attachment_paths.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {payment.attachment_paths.map((path, index) => (
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
                          <td className="p-2 text-sm text-gray-900">
                            {payment.created_by || '-'}
                          </td>
                          <td className="p-2">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleEdit(payment)}
                                className="text-blue-600 hover:text-blue-900 text-sm"
                              >
                                {isArabic ? 'تعديل' : 'Edit'}
                              </button>
                              <button
                                onClick={() => payment.id && handleDelete(payment.id)}
                                className="text-red-600 hover:text-red-900 text-sm"
                              >
                                {isArabic ? 'حذف' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-auto">
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-3">
                  {isArabic ? 'تعديل المدفوعات' : 'Edit Payment'}
                </h2>
                <form onSubmit={handleUpdate} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'المبلغ' : 'Amount'}
                    </label>
                    <input
                      type="number"
                      value={editFormData.amount}
                      onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                      className="w-full p-2 border rounded-md text-sm"
                      required
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'التاريخ' : 'Date'}
                    </label>
                    <input
                      type="date"
                      value={editFormData.date}
                      onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                      className="w-full p-2 border rounded-md text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'الملاحظات' : 'Notes'}
                    </label>
                    <textarea
                      value={editFormData.notes}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      className="w-full p-2 border rounded-md text-sm"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'المرفقات' : 'Attachments'}
                    </label>
                    <div className="space-y-2">
                      {selectedPayment?.attachment_paths?.map((path, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <a
                            href={path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            {path.split('/').pop()}
                          </a>
                          <button
                            type="button"
                            onClick={() => removeExistingAttachment(index)}
                            className="text-red-500 hover:text-red-700 flex items-center text-sm"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {isArabic ? 'حذف' : 'Remove'}
                          </button>
                        </div>
                      ))}
                      <div className="mt-2">
                        <input
                          type="file"
                          onChange={handleEditFileChange}
                          className="hidden"
                          id="edit-file-upload"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        />
                        <label
                          htmlFor="edit-file-upload"
                          className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {isArabic ? 'إضافة مرفق' : 'Add Attachment'}
                        </label>
                        <span className="ml-2 text-xs text-gray-500">
                          {isArabic ? 'يمكنك إضافة المزيد من المرفقات' : 'You can add more attachments'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setSelectedPayment(null);
                        setEditFormData({
                          amount: '',
                          date: '',
                          notes: '',
                          attachments: []
                        });
                      }}
                      className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md text-sm hover:bg-gray-300"
                    >
                      {isArabic ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                      disabled={isLoading}
                    >
                      {isLoading ? (isArabic ? 'جاري الحفظ...' : 'Saving...') : (isArabic ? 'حفظ' : 'Save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkPaymentPage;