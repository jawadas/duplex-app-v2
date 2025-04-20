import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { WorkProject, Payment } from '../types/labor.types';
import { api } from '../services/api';
import { storage } from '../services/storage';
import { DUPLEX_NUMBERS } from '../constants/duplex';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const NewWorkPaymentEntry: React.FC = () => {
  const { isArabic } = useLanguage();
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDuplex, setSelectedDuplex] = useState<string>('');
  const [projectDetails, setProjectDetails] = useState<WorkProject>({
    name: '',
    totalPrice: 0,
    duration: 0,
    startDate: new Date().toISOString().split('T')[0],
    notes: '',
    duplex_number: 0
  });
  const [newPayment, setNewPayment] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    attachments: [] as File[]
  });
  const [projects, setProjects] = useState<WorkProject[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<WorkProject | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [editFormData, setEditFormData] = useState<{
    amount: string;
    date: string;
    notes: string;
    attachments: File[];
  }>({
    amount: '',
    date: '',
    notes: '',
    attachments: []
  });
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDuplex, setNewProjectDuplex] = useState('');
  const [showNewPaymentModal, setShowNewPaymentModal] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState('');
  const [newPaymentNotes, setNewPaymentNotes] = useState('');
  const [validationErrors, setValidationErrors] = useState<{[key: string]: boolean}>({});
  const [selectedNotes, setSelectedNotes] = useState<string | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);

  // Memoize the modal input style to prevent recalculation on each render
  const modalInputStyle = useMemo(() => ({
    fontSize: '16px',
    height: '50px',
    textAlign: 'center' as 'center',
    backgroundColor: '#ffffff',
    color: '#000000'
  }), []);

  // Style for modal input fields to fix dark mode issues on iPhone
  const inputFixStyle = {
    backgroundColor: '#ffffff',
    height: '44px',
    width: '100%',
    padding: '10px',
    fontSize: '16px', // iOS ideal size to prevent zoom
    boxSizing: 'border-box' as 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: '#000000'
  };

  // Style for textareas in popups
  const textareaFixStyle = {
    backgroundColor: '#ffffff',
    width: '100%',
    padding: '10px',
    fontSize: '16px',
    minHeight: '80px',
    boxSizing: 'border-box' as 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: '#000000'
  };
  
  // Style for file inputs
  const fileInputFixStyle = {
    backgroundColor: '#ffffff',
    padding: '8px',
    fontSize: '14px',
    width: '100%',
    height: 'auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: '#000000'
  };
  
  // Style for select dropdowns
  const selectFixStyle = {
    backgroundColor: '#ffffff',
    height: '44px',
    width: '100%',
    padding: '0 10px',
    fontSize: '16px',
    appearance: 'menulist' as 'menulist',
    boxSizing: 'border-box' as 'border-box',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    color: '#000000'
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // Remove debugging effect
  useEffect(() => {
    // Removed console.log statements for performance
  }, [selectedDuplex, projects]);

  // Optimize loadProjects with useCallback
  const loadProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const fetchedProjects = await api.getAllWorkProjects();
      
      if (!fetchedProjects || fetchedProjects.length === 0) {
        // Removed console.log statement
        setProjects([]);
        return;
      }

      // Map the database fields to our WorkProject interface
      const mappedProjects = fetchedProjects.map(project => ({
        id: project.id,
        name: project.name,
        totalPrice: Number(project.totalPrice || 0),
        duration: Number(project.duration || 0),
        startDate: project.startDate || new Date().toISOString().split('T')[0],
        notes: project.notes || '',
        duplex_number: Number(project.duplex_number) || 0
      }));

      setProjects(mappedProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Optimize loadProjectPayments with useCallback
  const loadProjectPayments = useCallback(async (projectId: number) => {
    setIsLoading(true);
    try {
      const projectPayments = await api.getWorkProjectPayments(projectId);
      
      const validPayments = projectPayments.map((payment: any) => ({
        ...payment,
        id: Number(payment.id),
        project_id: Number(payment.project_id),
        amount: Number(payment.amount),
        duplex_number: Number(payment.duplex_number),
        attachment_paths: Array.isArray(payment.attachment_paths) ? payment.attachment_paths : [],
        date: payment.date
      })).filter(payment => !isNaN(payment.amount));
      
      setPayments(validPayments);
    } catch (error) {
      console.error('Error loading payments:', error);
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Optimize handleChange with useCallback
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Special handling for totalPrice field
    if (name === 'totalPrice') {
      // Only allow positive numbers
      const numberValue = parseFloat(value);
      if (value === '' || (!isNaN(numberValue) && numberValue >= 0)) {
        setProjectDetails(prev => ({
          ...prev,
          [name]: value === '' ? 0 : numberValue
        }));
      }
    } else if (name === 'duplex_number') {
      setProjectDetails(prev => ({
        ...prev,
        [name]: value === '' ? 0 : parseInt(value)
      }));
    } else {
      setProjectDetails(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear validation error when field is edited
    if (validationErrors[name]) {
      setValidationErrors(prev => ({ ...prev, [name]: false }));
    }
  }, [validationErrors]);

  // Optimize validateForm with useCallback
  const validateForm = useCallback((): boolean => {
    const errors: {[key: string]: boolean} = {};
    
    // Project name validation
    if (!projectDetails.name.trim()) {
      errors.name = true;
    }
    
    // Duplex number validation
    if (!projectDetails.duplex_number || projectDetails.duplex_number === 0) {
      errors.duplex_number = true;
    }
    
    // Total price validation
    const totalPrice = parseFloat(String(projectDetails.totalPrice));
    if (!projectDetails.totalPrice || isNaN(totalPrice) || totalPrice <= 0) {
      errors.totalPrice = true;
    }
    
    // Start date validation
    if (!projectDetails.startDate) {
      errors.startDate = true;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [projectDetails]);

  // Optimize handleCreateProject with useCallback
  const handleCreateProject = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      // Validate form data
      if (!projectDetails.name || !projectDetails.totalPrice || !projectDetails.startDate || 
          !projectDetails.duplex_number) {
        alert(isArabic ? 'جميع الحقول مطلوبة باستثناء المدة والملاحظات' : 'All fields are required except duration and notes');
        return;
      }

      // Ensure numbers are valid
      const totalPrice = Number(projectDetails.totalPrice);
      const duration = projectDetails.duration ? Number(projectDetails.duration) : 0;
      const duplex_number = projectDetails.duplex_number;
      
      if (isNaN(totalPrice) || (duration !== 0 && isNaN(duration))) {
        alert(isArabic ? 'الرجاء إدخال أرقام صحيحة' : 'Please enter valid numbers');
        return;
      }

      const formattedProject = {
        name: projectDetails.name,
        totalPrice: totalPrice,
        duration: duration,
        startDate: projectDetails.startDate,
        notes: projectDetails.notes || '',
        duplex_number: duplex_number,
        created_by: user?.email
      };

      const response = await api.createWorkProject(formattedProject);

      if (!response || !response.id) {
        throw new Error('Invalid response from server');
      }

      // Map the response to match our WorkProject interface
      const newProject: WorkProject = {
        id: response.id,
        name: response.name,
        totalPrice: totalPrice,
        duration: duration,
        startDate: response.startDate,
        notes: response.notes || '',
        duplex_number: response.duplex_number
      };

      // Update projects list
      setProjects(prevProjects => [...prevProjects, newProject]);
      
      // Select the new project
      setSelectedProject(newProject);
      
      // Close modal and reset form
      setShowProjectModal(false);
      setProjectDetails({
        name: '',
        totalPrice: 0,
        duration: 0,
        startDate: new Date().toISOString().split('T')[0],
        notes: '',
        duplex_number: 0
      });

      // Clear payments for the new project
      setPayments([]);
      
      // Reset payment form
      setNewPayment({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        attachments: []
      });
      setShowAddForm(false);

    } catch (error) {
      console.error('Error creating project:', error);
      alert(isArabic ? 'حدث خطأ أثناء إنشاء المشروع' : 'Error occurred while creating the project');
    }
  }, [projectDetails, validateForm, isArabic, user?.email]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewPayment(prev => ({
        ...prev,
        attachments: [...prev.attachments, file]
      }));
      // Reset the input so the same file can be selected again
      e.target.value = '';
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setEditFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...Array.from(e.target.files || [])]
      }));
    }
  };

  // Optimize handleSubmit with useCallback (for adding new payment)
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !selectedProject.id) {
      alert(isArabic ? 'الرجاء اختيار مشروع صالح' : 'Please select a valid project');
      return;
    }

    if (!user) {
      alert(isArabic ? 'يجب تسجيل الدخول' : 'You must be logged in');
      return;
    }

    if (!newPayment.amount || !newPayment.date) {
      alert(isArabic ? 'الرجاء إدخال المبلغ والتاريخ' : 'Please enter amount and date');
      return;
    }

    setIsLoading(true);
    try {
      let attachment_paths: string[] = [];
      
      // Upload attachments to OCI if they exist
      if (newPayment.attachments.length > 0) {
        for (const file of newPayment.attachments) {
          const filename = `work-payments/${Date.now()}-${file.name}`;
          const path = await storage.uploadFile(file, filename);
          if (path) {
            attachment_paths.push(path);
          }
        }
      }

      const paymentData = {
        project_id: selectedProject.id,
        amount: parseFloat(String(newPayment.amount ?? '0')),
        date: newPayment.date,
        notes: newPayment.notes || '',
        duplex_number: selectedProject.duplex_number,
        attachment_paths: attachment_paths,
        created_by: user.email
      };

      await api.addWorkProjectPayment(selectedProject.id, paymentData);
      
      if (selectedProject.id) {
        await loadProjectPayments(selectedProject.id);
      }
      
      window.parent?.postMessage({ type: 'PAYMENT_UPDATE' }, '*');
      
      setNewPayment({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        attachments: []
      });
      setShowAddForm(false);
    } catch (error: any) {
      console.error('Error creating payment:', error);
      let errorMessage = isArabic ? 'حدث خطأ أثناء إنشاء الدفعة' : 'Error creating payment';
      
      if (error.response?.data?.message) {
        if (typeof error.response.data.message === 'object') {
          errorMessage = isArabic ? error.response.data.message.ar : error.response.data.message.en;
        } else {
          errorMessage = error.response.data.message;
        }
      } else if (error.response?.data?.error) {
        if (typeof error.response.data.error === 'object') {
          errorMessage = isArabic ? error.response.data.error.ar : error.response.data.error.en;
        } else {
          errorMessage = error.response.data.error;
        }
      }
      
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isArabic, loadProjectPayments, newPayment, selectedProject, user]);

  useEffect(() => {
    if (selectedProject?.id) {
      loadProjectPayments(selectedProject.id);
    } else {
      setPayments([]);
    }
  }, [selectedProject?.id]);

  const handleEdit = (payment: Payment) => {
    setSelectedPayment(payment);
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

  const handleDelete = async (paymentId: number) => {
    if (!window.confirm(isArabic ? 'هل أنت متأكد من حذف هذه الدفعة؟' : 'Are you sure you want to delete this payment?')) {
      return;
    }

    try {
      setIsLoading(true);
      await api.deleteWorkProjectPayment(paymentId);
      if (selectedProject?.id) {
        await loadProjectPayments(selectedProject.id);
      }
      window.parent?.postMessage({ type: 'PAYMENT_UPDATE' }, '*');
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert(isArabic ? 'حدث خطأ أثناء حذف الدفعة' : 'Error deleting payment');
    } finally {
      setIsLoading(false);
    }
  };

  // Optimize handleUpdate with useCallback
  const handleUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment?.id || !selectedProject?.id) {
      alert(isArabic ? 'الرجاء اختيار دفعة صالحة' : 'Please select a valid payment');
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

      // Add existing attachments from the selectedPayment (which have already been filtered by the delete button)
      attachment_paths = [...attachment_paths, ...(selectedPayment.attachment_paths || [])];

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
      
      if (selectedProject.id) {
        await loadProjectPayments(selectedProject.id);
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
  }, [editFormData, isArabic, loadProjectPayments, selectedPayment, selectedProject, user?.email]);

  const removeEditAttachment = (index: number) => {
    setEditFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const handleNewProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    // Reset form
    setNewProjectName('');
    setNewProjectDuplex('');
    setShowNewProjectModal(false);
  };

  const handleNewPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    // Reset form
    setNewPaymentAmount('');
    setNewPaymentDate('');
    setNewPaymentNotes('');
    setShowNewPaymentModal(false);
  };

  // Memoize filtered projects for project selection dropdown
  const filteredProjects = useMemo(() => {
    return projects.filter(project => project.duplex_number === Number(selectedDuplex));
  }, [projects, selectedDuplex]);

  // Memoize payment calculations to avoid recalculating on every render
  const totalPaymentAmount = useMemo(() => {
    return payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  }, [payments]);

  const remainingAmount = useMemo(() => {
    if (!selectedProject) return 0;
    return selectedProject.totalPrice - totalPaymentAmount;
  }, [selectedProject, totalPaymentAmount]);

  const handleNotesClick = (notes: string) => {
    setSelectedNotes(notes);
    setShowNotesModal(true);
  };

  const closeNotesModal = () => {
    setShowNotesModal(false);
    setSelectedNotes(null);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-20">
      <div className="container mx-auto p-4 md:max-w-2xl">
        {/* Filters Section */}
        <div className="bg-white rounded-xl p-3 mb-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-base font-medium text-gray-700">
              {isArabic ? 'تفاصيل العمل' : 'Work Details'}
            </h2>
            <div className="text-gray-500 text-sm">&#9662;</div>
          </div>

          <div className="space-y-2">
            {/* Add Project Button */}
            <button
              type="button"
              onClick={() => {
                setProjectDetails(prev => ({
                  ...prev,
                  duplex_number: Number(selectedDuplex)
                }));
                setShowProjectModal(true);
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>{isArabic ? 'إضافة مشروع' : 'Add Project'}</span>
            </button>

            {/* Duplex Number Filter */}
            <div>
              <div className="text-xs text-gray-500 mb-1">
                {isArabic ? 'رقم الدوبلكس' : 'Duplex Number'}
              </div>
              <select
                name="duplex_number"
                className="w-full p-2 border rounded-md"
                value={selectedDuplex}
                onChange={(e) => setSelectedDuplex(e.target.value)}
                style={modalInputStyle}
              >
                <option value="">{isArabic ? 'اختر رقم الدوبلكس' : 'Select Duplex Number'}</option>
                {DUPLEX_NUMBERS.map((num) => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            {/* Project Selection */}
            <div>
              <div className="text-xs text-gray-500 mb-1">
                {isArabic ? 'المشروع' : 'Project'}
              </div>
              <select
                name="projectId"
                className="w-full p-2 border rounded-md"
                value={selectedProject?.id || ''}
                onChange={(e) => {
                  const project = projects.find(p => p.id === parseInt(e.target.value));
                  setSelectedProject(project || null);
                }}
                style={modalInputStyle}
              >
                <option value="" style={modalInputStyle}>
                  {isArabic ? 'اختر المشروع' : 'Select Project'}
                </option>
                {filteredProjects.map((project) => (
                  <option key={project.id} value={project.id} style={modalInputStyle}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selectedProject && (
          <>
            {/* Project Details Card */}
            <div className="bg-[#eef3fd] rounded-xl p-3 mb-4">
              <h3 className="text-base font-medium text-gray-800 mb-2">
                {isArabic ? 'تفاصيل المشروع' : 'Project Details'}
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-600">
                    {isArabic ? 'السعر الكلي: ' : 'Total Price: '}
                    <span className="font-semibold text-blue-600">
                      {selectedProject.totalPrice.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'SAR'
                      })}
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">
                    {isArabic ? 'المدفوع: ' : 'Total Paid: '}
                    <span className="font-semibold text-blue-600">
                      {totalPaymentAmount.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'SAR'
                      })}
                    </span>
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600">
                    {isArabic ? 'المتبقي: ' : 'Remaining: '}
                    <span className={`font-semibold ${
                      remainingAmount < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {(remainingAmount).toLocaleString('en-US', {
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
              <div className="p-4 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800">
                    {isArabic ? 'المدفوعات' : 'Payments'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {isArabic ? 'إجمالي المدفوعات: ' : 'Total Payments: '}
                    <span className="font-semibold text-blue-600">
                      {totalPaymentAmount.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'SAR'
                      })}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-sm text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isArabic ? 'إضافة دفعة' : 'Add Payment'}</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="p-4 bg-[#f5f5f7] text-sm font-semibold text-gray-600 text-left">
                        {isArabic ? 'التاريخ' : 'Date'}
                      </th>
                      <th className="p-4 bg-[#f5f5f7] text-sm font-semibold text-gray-600 text-left">
                        {isArabic ? 'المبلغ' : 'Amount'}
                      </th>
                      <th className="p-4 bg-[#f5f5f7] text-sm font-semibold text-gray-600 text-left">
                        {isArabic ? 'ملاحظات' : 'Notes'}
                      </th>
                      <th className="p-4 bg-[#f5f5f7] text-sm font-semibold text-gray-600 text-left">
                        {isArabic ? 'المرفقات' : 'Attachments'}
                      </th>
                      <th className="p-4 bg-[#f5f5f7] text-sm font-semibold text-gray-600 text-left">
                        {isArabic ? 'تم الإنشاء بواسطة' : 'Created By'}
                      </th>
                      <th className="p-4 bg-[#f5f5f7] text-sm font-semibold text-gray-600 text-left">
                        {isArabic ? 'الإجراءات' : 'Actions'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-gray-500">
                          {isArabic ? 'جاري التحميل...' : 'Loading...'}
                        </td>
                      </tr>
                    ) : payments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-gray-500">
                          {isArabic ? 'لا توجد مدفوعات' : 'No payments found'}
                        </td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="p-4 text-sm text-gray-900">
                            {new Date(payment.date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              calendar: 'gregory'
                            })}
                          </td>
                          <td className="p-4 text-sm text-gray-900">
                            {payment.amount.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'SAR'
                            })}
                          </td>
                          <td className="p-4 text-sm text-gray-900">
                            {payment.notes ? (
                              <div className="max-w-xs">
                                <div className="truncate" title={payment.notes}>
                                  {payment.notes}
                                </div>
                                {payment.notes.length > 50 && (
                                  <button
                                    onClick={() => handleNotesClick(payment.notes || '')}
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
                          <td className="p-4">
                            {payment.attachment_paths && payment.attachment_paths.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {payment.attachment_paths.map((path, index) => (
                                  <a
                                    key={index}
                                    href={path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center px-2 py-1 bg-gray-100 rounded text-sm text-blue-600 hover:bg-gray-200"
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
                          <td className="p-4 text-sm text-gray-900">
                            {payment.created_by || '-'}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleEdit(payment)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                {isArabic ? 'تعديل' : 'Edit'}
                              </button>
                              <button
                                onClick={() => handleDelete(payment.id)}
                                className="text-red-600 hover:text-red-900"
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

        {/* Project Modal */}
        {showProjectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-2">
                  {isArabic ? 'إضافة مشروع جديد' : 'Add New Project'}
                </h2>
                <form onSubmit={handleCreateProject} className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-0.5">
                      {isArabic ? 'اسم المشروع' : 'Project Name'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="w-full p-1.5 border rounded-md"
                      value={projectDetails.name}
                      onChange={handleChange}
                      style={modalInputStyle}
                    />
                    {validationErrors.name && (
                      <p className="mt-0.5 text-xs text-red-500">
                        {isArabic ? 'اسم المشروع مطلوب' : 'Project name is required'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-0.5">
                      {isArabic ? 'رقم الدوبلكس' : 'Duplex Number'} <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="duplex_number"
                      className="w-full p-1.5 border rounded-md"
                      value={projectDetails.duplex_number}
                      onChange={handleChange}
                      style={modalInputStyle}
                    >
                      <option value="">{isArabic ? 'اختر رقم الدوبلكس' : 'Select Duplex Number'}</option>
                      {DUPLEX_NUMBERS.map((num) => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                    {validationErrors.duplex_number && (
                      <p className="mt-0.5 text-xs text-red-500">
                        {isArabic ? 'رقم الدوبلكس مطلوب' : 'Duplex number is required'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-0.5">
                      {isArabic ? 'السعر الإجمالي' : 'Total Price'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="totalPrice"
                      className="w-full p-1.5 border rounded-md"
                      value={projectDetails.totalPrice || ''}
                      onChange={handleChange}
                      style={modalInputStyle}
                    />
                    {validationErrors.totalPrice && (
                      <p className="mt-0.5 text-xs text-red-500">
                        {isArabic ? 'يرجى إدخال سعر صحيح أكبر من صفر' : 'Please enter a valid price greater than 0'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-0.5">
                      {isArabic ? 'تاريخ البدء' : 'Start Date'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      className="w-full p-1.5 border rounded-md"
                      value={projectDetails.startDate}
                      onChange={handleChange}
                      style={modalInputStyle}
                    />
                    {validationErrors.startDate && (
                      <p className="mt-0.5 text-xs text-red-500">
                        {isArabic ? 'تاريخ البدء مطلوب' : 'Start date is required'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-0.5">
                      {isArabic ? 'المدة (بالأيام)' : 'Duration (days)'}
                    </label>
                    <input
                      type="number"
                      name="duration"
                      className="w-full p-1.5 border rounded-md"
                      value={projectDetails.duration || ''}
                      onChange={handleChange}
                      style={modalInputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-0.5">
                      {isArabic ? 'ملاحظات' : 'Notes'}
                    </label>
                    <textarea
                      name="notes"
                      value={projectDetails.notes}
                      onChange={handleChange}
                      className="w-full p-1.5 border rounded-md border-gray-300"
                      rows={2}
                      style={textareaFixStyle}
                    />
                  </div>
                  <div className="flex justify-end space-x-2 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowProjectModal(false)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 text-sm"
                    >
                      {isArabic ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      {isArabic ? 'إضافة' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Add Payment Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-auto" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-3">
                  {isArabic ? 'إضافة دفعة جديدة' : 'Add New Payment'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'المشروع' : 'Project'}
                    </label>
                    <select
                      value={selectedProject?.id || ''}
                      onChange={(e) => {
                        const project = projects.find(p => p.id === parseInt(e.target.value));
                        setSelectedProject(project || null);
                      }}
                      className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      required
                      style={selectFixStyle}
                    >
                      <option value="">
                        {isArabic ? 'اختر المشروع' : 'Select Project'}
                      </option>
                      {filteredProjects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'المبلغ' : 'Amount'}
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      name="amount"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                      required
                      style={inputFixStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'التاريخ' : 'Date'}
                    </label>
                    <input
                      type="date"
                      name="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={newPayment.date}
                      onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                      required
                      style={inputFixStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'الملاحظات' : 'Notes'}
                    </label>
                    <textarea
                      value={newPayment.notes}
                      onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      rows={2}
                      style={textareaFixStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'المرفقات' : 'Attachments'}
                    </label>
                    <div className="space-y-2">
                      {newPayment.attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span className="text-sm text-gray-600">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNewPayment(prev => ({
                                ...prev,
                                attachments: prev.attachments.filter((_, i) => i !== index)
                              }));
                            }}
                            className="text-red-500 hover:text-red-700 flex items-center"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {isArabic ? 'حذف' : 'Remove'}
                          </button>
                        </div>
                      ))}
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="w-full p-1 border border-gray-300 rounded-md text-sm"
                        multiple
                        style={fileInputFixStyle}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-800 rounded-md text-sm hover:bg-gray-300"
                    >
                      {isArabic ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                    >
                      {isArabic ? 'إضافة' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-auto" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-3">
                  {isArabic ? 'تعديل السجل' : 'Edit Record'}
                </h2>
                <form onSubmit={handleUpdate} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'المبلغ' : 'Amount'}
                    </label>
                    <input
                      type="number"
                      name="amount"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={editFormData.amount}
                      onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                      required
                      step="0.01"
                      style={inputFixStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'التاريخ' : 'Date'}
                    </label>
                    <input
                      type="date"
                      name="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      value={editFormData.date}
                      onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                      required
                      style={inputFixStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'الملاحظات' : 'Notes'}
                    </label>
                    <textarea
                      value={editFormData.notes}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      rows={2}
                      style={textareaFixStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'المرفقات' : 'Attachments'}
                    </label>
                    <div className="space-y-2">
                      {selectedPayment?.attachment_paths?.map((path: string, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <a
                            href={path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 flex items-center text-sm"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                            {path.split('/').pop()}
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              // Update the selectedPayment object by removing the attachment at this index
                              if (selectedPayment) {
                                const updatedAttachmentPaths = [...(selectedPayment.attachment_paths || [])];
                                updatedAttachmentPaths.splice(index, 1);
                                setSelectedPayment({
                                  ...selectedPayment,
                                  attachment_paths: updatedAttachmentPaths
                                });
                              }
                            }}
                            className="text-red-500 hover:text-red-700 flex items-center text-sm"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {isArabic ? 'حذف' : 'Remove'}
                          </button>
                        </div>
                      ))}
                      {editFormData.attachments.map((file: File, index: number) => (
                        <div key={`new-${index}`} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span className="text-sm text-gray-600">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEditAttachment(index)}
                            className="text-red-500 hover:text-red-700 flex items-center text-sm"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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
                          style={fileInputFixStyle}
                        />
                        <label
                          htmlFor="edit-file-upload"
                          className="cursor-pointer inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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

        {/* New Project Modal */}
        {showNewProjectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">
                  {isArabic ? 'إضافة مشروع جديد' : 'Add New Project'}
                </h2>
                <form onSubmit={handleNewProjectSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'اسم المشروع' : 'Project Name'}
                    </label>
                    <input
                      type="text"
                      className="w-full p-2 border rounded-md mb-4"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder={isArabic ? "اسم المشروع" : "Project Name"}
                      style={modalInputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'رقم الدوبلكس' : 'Duplex Number'}
                    </label>
                    <select
                      className="w-full p-2 border rounded-md mb-4"
                      value={newProjectDuplex}
                      onChange={(e) => setNewProjectDuplex(e.target.value)}
                      style={modalInputStyle}
                    >
                      <option value="">{isArabic ? 'اختر رقم الدوبلكس' : 'Select Duplex Number'}</option>
                      {DUPLEX_NUMBERS.map((num) => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowNewProjectModal(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    >
                      {isArabic ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {isArabic ? 'إضافة' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* New Payment Modal */}
        {showNewPaymentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-auto">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">
                  {isArabic ? 'إضافة دفعة جديدة' : 'Add New Payment'}
                </h2>
                <form onSubmit={handleNewPaymentSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'المبلغ' : 'Amount'}
                    </label>
                    <input
                      type="number"
                      className="w-full p-2 border rounded-md mb-4"
                      value={newPaymentAmount}
                      onChange={(e) => setNewPaymentAmount(e.target.value)}
                      placeholder={isArabic ? "المبلغ" : "Amount"}
                      style={modalInputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'التاريخ' : 'Date'}
                    </label>
                    <input
                      type="date"
                      className="w-full p-2 border rounded-md mb-4"
                      value={newPaymentDate}
                      onChange={(e) => setNewPaymentDate(e.target.value)}
                      style={modalInputStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'الملاحظات' : 'Notes'}
                    </label>
                    <textarea
                      value={newPaymentNotes}
                      onChange={(e) => setNewPaymentNotes(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      rows={3}
                      style={{
                        backgroundColor: '#ffffff',
                        color: '#000000'
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {isArabic ? 'المرفقات' : 'Attachments'}
                    </label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="w-full p-2 border rounded-md"
                      multiple
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowNewPaymentModal(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                    >
                      {isArabic ? 'إلغاء' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {isArabic ? 'إضافة' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

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

        <div className="text-sm text-gray-500 mt-2">
        </div>
      </div>
    </div>
  );
};

export default React.memo(NewWorkPaymentEntry);
