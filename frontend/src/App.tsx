import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import NewEntryPage from "./pages/NewEntryPage";
import PurchasesPage from "./pages/PurchasesPage";
import NotFoundPage from "./pages/NotFoundPage";
import NewWorkPaymentEntry from "./pages/NewWorkPaymentEntry";
import Analytics from "./pages/Analytics";
import WorkPaymentPage from "./pages/WorkPaymentPage";
import AdminPage from "./pages/AdminPage";
import Navigation from "./components/Navigation";
import Footer from "./components/Footer";
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Auth from "./pages/Auth";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AppContent() {
  const { isArabic } = useLanguage();
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const getHeaderTitle = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) return isArabic ? 'لوحة التحكم' : 'Dashboard';
    if (path.includes('/analytics')) return isArabic ? 'التحليلات' : 'Analytics';
    if (path.includes('/admin')) return isArabic ? 'عمليات الإدارة' : 'Admin Operations';
    return '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated && (
        <div className="bg-blue-900 px-6 py-2 flex flex-col gap-1 shadow-lg">
          <Navigation />
          <h1 className="text-white text-lg font-bold text-center">
            {getHeaderTitle()}
          </h1>
        </div>
      )}
      <div className="pb-20">
        <Routes>
          <Route path="/login" element={<Auth />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<RequireAuth><HomePage /></RequireAuth>} />
          <Route path="/dashboard/purchases" element={<RequireAuth><PurchasesPage /></RequireAuth>} />
          <Route path="/dashboard/new-entry" element={<RequireAuth><NewEntryPage /></RequireAuth>} />
          <Route path="/dashboard/work-payment-entry" element={<RequireAuth><NewWorkPaymentEntry /></RequireAuth>} />
          <Route path="/dashboard/labor-payments" element={<RequireAuth><WorkPaymentPage /></RequireAuth>} />
          <Route path="/dashboard/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
          <Route path="/dashboard/admin" element={<RequireAuth><AdminPage /></RequireAuth>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
      {isAuthenticated && <Footer />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <AppContent />
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
