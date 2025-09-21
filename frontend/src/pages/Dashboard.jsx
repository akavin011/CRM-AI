import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  Target,
  Zap,
  Brain,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Upload
} from 'lucide-react';
import { api } from '../utils/api.js';
import { useUser } from '../contexts/UserContext';
import MetricCard from '../components/MetricCard';
import CustomerSegments from '../components/CustomerSegments';
import ChurnPredictions from '../components/ChurnPredictions';
import UpsellOpportunities from '../components/UpsellOpportunities';
import RevenueChart from '../components/RevenueChart';
import EngagementChart from '../components/EngagementChart';
import AIInsights from '../components/AIInsights';

const Dashboard = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const { user, loading: userLoading } = useUser();

  // Handle Generate Report button
  const handleGenerateReport = () => {
    // Create a comprehensive report with current data
    const reportData = {
      timestamp: new Date().toISOString(),
      user: user?.email || 'Unknown',
      metrics: metrics?.data || {},
      segments: segments?.data || [],
      churnPredictions: churnPredictions?.data || [],
      upsellOpportunities: upsellOpportunities?.data || []
    };

    // Create and download the report as JSON
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `crm-report-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    // Show success message
    setToastMessage('Report generated and downloaded successfully!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };
  
  // Debug user loading
  React.useEffect(() => {
    console.log('User loading state:', userLoading);
    console.log('User object:', user);
    console.log('User ID from object:', user?.id);
  }, [user, userLoading]);

  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery(
    ['dashboard-metrics', user?.id],
    () => {
      console.log('🔄 Fetching metrics...');
      return api.getInsightsMetrics();
    },
    { 
      enabled: !!user && !userLoading, // Only run when user is authenticated and loaded
      refetchInterval: 30000,
      staleTime: 0, // Always consider data stale
      retry: 1, // Only retry once
      retryDelay: 1000, // Wait 1 second before retry
      onError: (error) => {
        console.error('Metrics API Error:', error);
      },
      onSuccess: (data) => {
        console.log('Metrics API Success:', data);
      }
    }
  );

  const { data: customers, isLoading: customersLoading } = useQuery(
    ['customers', user?.id],
    () => api.getCustomers({ limit: 10 }),
    { 
      enabled: !!user && !userLoading, // Only run when user is authenticated and loaded
      refetchInterval: 60000,
      staleTime: 0 // Always consider data stale
    }
  );

  const { data: segments, error: segmentsError, isLoading: segmentsLoading, refetch: refetchSegments } = useQuery(
    ['segments', user?.id], // Include user ID in query key
    () => {
      console.log('🔄 Fetching segments...');
      return api.getCustomerSegments();
    },
    {
      enabled: !!user && !userLoading, // Only run when user is authenticated and loaded
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 0, // Always consider data stale
      onError: (error) => {
        console.error('Segments API Error:', error);
      },
      onSuccess: (data) => {
        console.log('Segments API Success:', data);
      }
    }
  );

  const { data: churnPredictions, error: churnError, isLoading: churnLoading, refetch: refetchChurn } = useQuery(
    ['churn-predictions', user?.id], // Include user ID in query key
    () => {
      console.log('🔄 Fetching churn predictions...');
      return api.getChurnPredictions();
    },
    {
      enabled: !!user && !userLoading, // Only run when user is authenticated and loaded
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 0, // Always consider data stale
      onError: (error) => {
        console.error('Churn API Error:', error);
      },
      onSuccess: (data) => {
        console.log('Churn API Success:', data);
      }
    }
  );

  const { data: upsellOpportunities, error: upsellError, isLoading: upsellLoading, refetch: refetchUpsell } = useQuery(
    ['upsell-opportunities', user?.id], // Include user ID in query key
    () => {
      console.log('🔄 Fetching upsell opportunities...');
      return api.getUpsellOpportunities();
    },
    {
      enabled: !!user && !userLoading, // Only run when user is authenticated and loaded
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 0, // Always consider data stale
      onError: (error) => {
        console.error('Upsell API Error:', error);
      },
      onSuccess: (data) => {
        console.log('Upsell API Success:', data);
      }
    }
  );

  // Debug logging
  React.useEffect(() => {
    console.log('=== DASHBOARD DEBUG ===');
    console.log('User:', user);
    console.log('User ID:', user?.id);
    console.log('Token:', localStorage.getItem('token'));
    console.log('Segments:', segments);
    console.log('Segments Error:', segmentsError);
    console.log('Segments Data:', segments?.data);
    console.log('Segments Loading:', segmentsLoading);
    console.log('Churn Predictions:', churnPredictions);
    console.log('Churn Error:', churnError);
    console.log('Churn Data:', churnPredictions?.data);
    console.log('Upsell Opportunities:', upsellOpportunities);
    console.log('Upsell Error:', upsellError);
    console.log('Upsell Data:', upsellOpportunities?.data);
    console.log('========================');
    
    // Force refetch if no data
    if (!segments && !segmentsError && user) {
      console.log('🔄 Forcing segments refetch...');
      refetchSegments();
    }
    if (!churnPredictions && !churnError && user) {
      console.log('🔄 Forcing churn refetch...');
      refetchChurn();
    }
    if (!upsellOpportunities && !upsellError && user) {
      console.log('🔄 Forcing upsell refetch...');
      refetchUpsell();
    }
  }, [user, segments, segmentsError, churnPredictions, churnError, upsellOpportunities, upsellError, segmentsLoading, refetchSegments, refetchChurn, refetchUpsell]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger refetch of all queries
    await Promise.all([
      refetchSegments(),
      refetchChurn(),
      refetchUpsell()
    ]);
    setRefreshing(false);
  };

  // Debug data loading
  React.useEffect(() => {
    console.log('=== DASHBOARD DATA DEBUG ===');
    console.log('User:', user);
    console.log('User Loading:', userLoading);
    console.log('Metrics:', metrics);
    console.log('Customers:', customers);
    console.log('Segments:', segments);
    console.log('Churn Predictions:', churnPredictions);
    console.log('Upsell Opportunities:', upsellOpportunities);
    console.log('Metrics Loading:', metricsLoading);
    console.log('Customers Loading:', customersLoading);
    console.log('Segments Loading:', segmentsLoading);
    console.log('Churn Loading:', churnLoading);
    console.log('Upsell Loading:', upsellLoading);
    console.log('============================');
  }, [user, userLoading, metrics, customers, segments, churnPredictions, upsellOpportunities, metricsLoading, customersLoading, segmentsLoading, churnLoading, upsellLoading]);

  // Force refetch if user is loaded but no data
  React.useEffect(() => {
    if (user && !userLoading && !metrics && !metricsLoading) {
      console.log('🔄 Force refetching metrics...');
      refetchMetrics();
    }
  }, [user, userLoading, metrics, metricsLoading, refetchMetrics]);

  // Check if user has uploaded data
  const hasData = (metrics?.data?.total_customers > 0) || 
                  (segments?.data && segments.data.length > 0) || 
                  (churnPredictions?.data && churnPredictions.data.length > 0) || 
                  (upsellOpportunities?.data && upsellOpportunities.data.length > 0) ||
                  (customers?.data?.processedData && customers.data.processedData.length > 0);

  const metricCards = [
    {
      title: 'Total Customers',
      value: metrics?.data?.total_customers || 0,
      change: hasData ? 'Real data' : 'No data',
      changeType: hasData ? 'neutral' : 'neutral',
      icon: Users,
      color: 'blue',
      description: 'Active customers'
    },
    {
      title: 'Total Revenue',
      value: hasData ? `$${(metrics?.data?.total_revenue || 0).toLocaleString()}` : '$0',
      change: hasData ? 'Real data' : 'No data',
      changeType: hasData ? 'neutral' : 'neutral',
      icon: DollarSign,
      color: 'green',
      description: 'This month'
    },
    {
      title: 'Engagement Score',
      value: hasData ? `${metrics?.data?.average_engagement || 0}%` : '0%',
      change: hasData ? 'Real data' : 'No data',
      changeType: hasData ? 'neutral' : 'neutral',
      icon: Target,
      color: 'purple',
      description: 'Average across all customers'
    },
    {
      title: 'Churn Rate',
      value: hasData ? `${metrics?.data?.churn_rate || 0}%` : '0%',
      change: hasData ? 'Real data' : 'No data',
      changeType: hasData ? 'neutral' : 'neutral',
      icon: AlertTriangle,
      color: 'red',
      description: 'Monthly churn rate'
    }
  ];

  if (metricsLoading || customersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-lg font-medium text-gray-600">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  // Show loading state while data is being fetched
  if (metricsLoading || customersLoading || segmentsLoading || churnLoading || upsellLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI-Powered Insights</h1>
            <p className="text-gray-600">Intelligent analysis powered by AI</p>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading your data...</p>
            <p className="text-sm text-gray-500">This may take a moment</p>
            
            {/* Debug Info */}
            <div className="mt-6 p-4 bg-gray-100 rounded-lg text-left max-w-md mx-auto">
              <h4 className="font-semibold text-gray-900 mb-2">Debug Info:</h4>
              <p className="text-sm text-gray-600">User: {user ? 'Loaded' : 'Not loaded'}</p>
              <p className="text-sm text-gray-600">User Loading: {userLoading ? 'Yes' : 'No'}</p>
              <p className="text-sm text-gray-600">Metrics Loading: {metricsLoading ? 'Yes' : 'No'}</p>
              <p className="text-sm text-gray-600">User ID: {user?.id || 'None'}</p>
            </div>
            
            <button
              onClick={() => {
                console.log('🔄 Manual refresh triggered from loading state');
                refetchMetrics();
                refetchSegments();
                refetchChurn();
                refetchUpsell();
              }}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Force Refresh</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show data upload prompt if no data and not loading
  if (!hasData) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Welcome back! Upload your customer data to get started.
            </p>
          </div>
        </div>

        {/* Data Upload Prompt */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Upload your customer data to start generating AI-powered insights, churn predictions, and upsell opportunities.
            </p>
            <Link
              to="/data-upload"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload Your Data
            </Link>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-green-100">
                  <span className="text-green-600 font-semibold">1</span>
                </div>
              </div>
              <h4 className="ml-3 text-lg font-medium text-gray-900">Upload Data</h4>
            </div>
            <p className="text-gray-600">Upload your customer CSV or JSON file with customer information.</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-blue-100">
                  <span className="text-blue-600 font-semibold">2</span>
                </div>
              </div>
              <h4 className="ml-3 text-lg font-medium text-gray-900">AI Processing</h4>
            </div>
            <p className="text-gray-600">Our AI automatically processes and analyzes your customer data.</p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-md bg-purple-100">
                  <span className="text-purple-600 font-semibold">3</span>
                </div>
              </div>
              <h4 className="ml-3 text-lg font-medium text-gray-900">Get Insights</h4>
            </div>
            <p className="text-gray-600">View insights, predictions, and recommendations for your customers.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back! Here's what's happening with your customers today.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* AI Status Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Brain className="h-6 w-6" />
            <div>
              <h3 className="text-lg font-semibold">AI-Powered Insights</h3>
              <p className="text-blue-100">Your CRM is enhanced with AI for intelligent customer analysis</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-medium">AI Active</span>
          </div>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <MetricCard {...card} />
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <RevenueChart />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <EngagementChart />
        </motion.div>
      </div>

      {/* AI Insights */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <AIInsights />
      </motion.div>

      {/* Customer Analysis Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <CustomerSegments data={segments?.data} isLoading={segmentsLoading} />
          {/* Debug info */}
          <div style={{display: 'none'}}>
            <p>Segments: {JSON.stringify(segments)}</p>
            <p>Segments Data: {JSON.stringify(segments?.data)}</p>
            <p>Loading: {segmentsLoading ? 'true' : 'false'}</p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <ChurnPredictions data={churnPredictions?.data} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <UpsellOpportunities data={upsellOpportunities?.data} />
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="rounded-lg bg-white p-6 shadow-sm border border-gray-200"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link 
            to="/customers"
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <Users className="h-5 w-5 mr-2" />
            View All Customers
          </Link>
          <Link 
            to="/analytics"
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <AlertTriangle className="h-5 w-5 mr-2" />
            Churn Prevention
          </Link>
          <Link 
            to="/campaigns"
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <Target className="h-5 w-5 mr-2" />
            Upsell Campaign
          </Link>
          <button 
            onClick={() => handleGenerateReport()}
            className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <TrendingUp className="h-5 w-5 mr-2" />
            Generate Report
          </button>
        </div>
      </motion.div>

      {/* Toast Notification */}
      {showToast && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50"
        >
          <div className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            {toastMessage}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;

