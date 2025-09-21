import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import Landing from './pages/Landing';
import Onboarding from './pages/Onboarding';
import DataUpload from './pages/DataUpload';
import CustomerProfile from './pages/CustomerProfile';
import CustomerDetail from './pages/CustomerDetail';
import AdminDashboard from './pages/AdminDashboard';
import CampaignBuilder from './pages/CampaignBuilder';
import Layout from './components/Layout';
import Redirect from './components/Redirect';
import { useLocation } from 'react-router-dom';
import { useUser } from './contexts/UserContext.jsx';
import { PerformanceService } from './utils/performance.js';
import { ErrorHandler } from './utils/errorHandler.js';
import ErrorBoundary from './components/ErrorBoundary.jsx';

function App() {
  const location = useLocation();
  const { user, loading } = useUser();

  // Setup performance monitoring and error handling
  React.useEffect(() => {
    // Initialize performance monitoring
    PerformanceService.startPerformanceMonitoring();
    
    // Setup global error handling
    ErrorHandler.setupGlobalErrorHandling();
    
    // Add resource hints for better performance
    PerformanceService.addResourceHints();
  }, []);
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const isLandingPage = location.pathname === '/landing' || location.pathname === '/';
  const isOnboardingPage = location.pathname === '/onboarding';
  const isDataUploadPage = location.pathname === '/data-upload';
  const isCustomerProfilePage = location.pathname.startsWith('/customer/');
  const isAdminPage = location.pathname === '/admin';
  const isMainAppPage = ['/dashboard', '/customers', '/analytics', '/campaigns', '/settings'].includes(location.pathname);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If not authenticated, redirect to landing page
  if (!user && !isLandingPage && !isAuthPage && !isOnboardingPage) {
    return <Redirect to="/landing" />;
  }

  // If authenticated and on auth pages, redirect to onboarding
  if (user && isAuthPage) {
    return <Redirect to="/onboarding" />;
  }

  // If authenticated and on landing page, redirect to onboarding
  if (user && isLandingPage) {
    return <Redirect to="/onboarding" />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {isLandingPage ? (
          <Landing />
        ) : isAuthPage ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        ) : isOnboardingPage ? (
          <Onboarding />
        ) : isDataUploadPage ? (
          <DataUpload />
        ) : isCustomerProfilePage ? (
          <CustomerProfile />
        ) : isAdminPage ? (
          <AdminDashboard />
        ) : (
          <Layout>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="flex-1"
              >
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/campaigns" element={<CampaignBuilder />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/customer/:id" element={<CustomerDetail />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </Layout>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;

