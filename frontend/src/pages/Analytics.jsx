import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign,
  Target,
  AlertTriangle,
  Calendar,
  Download,
  RefreshCw,
  Upload
} from 'lucide-react';
import { Link } from 'react-router-dom';
import RevenueChart from '../components/RevenueChart';
import EngagementChart from '../components/EngagementChart';
import CustomerSegments from '../components/CustomerSegments';
import ForecastingChart from '../components/ForecastingChart';
import TrendAnalysis from '../components/TrendAnalysis';
import { api } from '../utils/api.js';
import { useUser } from '../contexts/UserContext.jsx';

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const { user, loading: userLoading } = useUser();

  // Notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  // Export analytics report
  const handleExportReport = () => {
    try {
      // Create comprehensive analytics report
      const reportData = {
        export_date: new Date().toISOString(),
        user: user?.email || 'Unknown',
        time_range: timeRange,
        metrics: metrics || {},
        insights: insights?.data || {},
        customer_data: customerData?.data || {},
        performance: performance?.data || {},
        segments: segments?.data || [],
        calculated_metrics: calculatedMetrics || {}
      };

      // Download as JSON
      const dataStr = JSON.stringify(reportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `analytics-report-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showNotification('Analytics report exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Failed to export report. Please try again.', 'error');
    }
  };

  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useQuery(
    ['analytics', timeRange, user?.id],
    () => api.getInsightsMetrics(),
    { 
      enabled: !!user && !userLoading,
      refetchInterval: 300000,
      staleTime: 0
    }
  );

  const { data: customerData, isLoading: customerLoading, refetch: refetchCustomerData } = useQuery(
    ['analytics-customers', user?.id],
    () => api.getProcessedData({ limit: 1000 }),
    { 
      enabled: !!user && !userLoading,
      refetchInterval: 300000,
      staleTime: 0
    }
  );

  const { data: performance, refetch: refetchPerformance } = useQuery(
    ['performance', user?.id],
    () => api.getInsightsMetrics(),
    { 
      enabled: !!user && !userLoading,
      refetchInterval: 300000,
      staleTime: 0
    }
  );

  const { data: segments, isLoading: segmentsLoading, refetch: refetchSegments } = useQuery(
    ['segments', user?.id],
    () => api.getCustomerSegments(),
    { 
      enabled: !!user && !userLoading,
      refetchInterval: 300000,
      staleTime: 0
    }
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    // Trigger refetch of all queries
    await Promise.all([
      refetchInsights(),
      refetchCustomerData(),
      refetchPerformance(),
      refetchSegments()
    ]);
    setRefreshing(false);
  };

  const timeRanges = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ];

  // Check if we have data - check both insights and customer data
  const hasInsightsData = insights?.data?.total_customers > 0;
  const hasCustomerData = customerData?.data?.processedData && customerData.data.processedData.length > 0;
  const hasData = hasInsightsData || hasCustomerData;
  
  // Debug logging
  React.useEffect(() => {
    console.log('=== ANALYTICS DEBUG ===');
    console.log('User:', user);
    console.log('User Loading:', userLoading);
    console.log('Insights:', insights);
    console.log('Customer Data:', customerData);
    console.log('Segments:', segments);
    console.log('Performance:', performance);
    console.log('Has Insights Data:', hasInsightsData);
    console.log('Has Customer Data:', hasCustomerData);
    console.log('Has Data:', hasData);
    console.log('========================');
  }, [user, userLoading, insights, customerData, segments, performance, hasInsightsData, hasCustomerData, hasData]);
  
  // Calculate metrics from customer data if insights are not available
  const calculatedMetrics = React.useMemo(() => {
    if (!customerData?.data?.processedData || customerData.data.processedData.length === 0) {
      return {
        total_customers: 0,
        total_revenue: 0,
        average_engagement: 0,
        churn_rate: 0
      };
    }

    const customers = customerData.data.processedData;
    const totalCustomers = customers.length;
    const totalRevenue = customers.reduce((sum, customer) => sum + (customer.total_spent || 0), 0);
    const averageEngagement = customers.reduce((sum, customer) => sum + (customer.engagement_score || 0), 0) / totalCustomers;
    const churnRate = customers.filter(customer => (customer.churn_probability || 0) > 0.5).length / totalCustomers * 100;

    return {
      total_customers: totalCustomers,
      total_revenue: totalRevenue,
      average_engagement: Math.round(averageEngagement),
      churn_rate: Math.round(churnRate)
    };
  }, [customerData]);

  // Use insights data if available, otherwise use calculated metrics
  const metrics = insights?.data || calculatedMetrics;

  const kpiCards = [
    {
      title: 'Total Revenue',
      value: hasData ? `$${(metrics?.total_revenue || 0).toLocaleString()}` : '$0',
      change: hasData ? 'Real data' : 'No data',
      changeType: hasData ? 'neutral' : 'neutral',
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Active Customers',
      value: hasData ? (metrics?.total_customers || 0).toString() : '0',
      change: hasData ? 'Real data' : 'No data',
      changeType: hasData ? 'neutral' : 'neutral',
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Churn Rate',
      value: hasData ? `${metrics?.churn_rate || 0}%` : '0%',
      change: hasData ? 'Real data' : 'No data',
      changeType: hasData ? 'neutral' : 'neutral',
      icon: AlertTriangle,
      color: 'red'
    },
    {
      title: 'Engagement Score',
      value: hasData ? `${metrics?.average_engagement || 0}%` : '0%',
      change: hasData ? 'Real data' : 'No data',
      changeType: hasData ? 'neutral' : 'neutral',
      icon: Target,
      color: 'purple'
    }
  ];

  if (insightsLoading || customerLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  // Log data for debugging (remove in production)
  if (customerData?.data?.rows) {
    console.log('Real Customer Data:', customerData.data.rows.length, 'records');
  }

  // Show empty state if no data
  if (!hasData) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="mt-1 text-sm text-gray-500">
              Deep insights into your customer data and business performance
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </button>
            <Link
              to="/data-upload"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Data
            </Link>
          </div>
        </div>

        {/* Data Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {customerData?.data?.rows?.length || 0}
              </div>
              <div className="text-sm text-gray-500">Customer Records</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {insights?.data ? 'Yes' : 'No'}
              </div>
              <div className="text-sm text-gray-500">Insights Available</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">
                {hasData ? 'Yes' : 'No'}
              </div>
              <div className="text-sm text-gray-500">Data Ready</div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 border border-blue-200">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Upload your customer data to see detailed analytics, trends, and performance insights.
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Deep insights into your customer data and business performance
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={handleExportReport}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-xl shadow-soft border border-gray-100 hover:shadow-medium transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mb-1">{card.value}</p>
                <div className="flex items-center">
                  {card.changeType === 'positive' ? (
                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${
                    card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {card.change}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">vs last period</span>
                </div>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                card.color === 'green' ? 'bg-green-100' :
                card.color === 'blue' ? 'bg-blue-100' :
                card.color === 'red' ? 'bg-red-100' :
                'bg-purple-100'
              }`}>
                <card.icon className={`h-6 w-6 ${
                  card.color === 'green' ? 'text-green-600' :
                  card.color === 'blue' ? 'text-blue-600' :
                  card.color === 'red' ? 'text-red-600' :
                  'text-purple-600'
                }`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

       {/* Performance Overview - Only show if we have data */}
       {hasData && performance?.data ? (
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
         >
           <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             <div className="text-center p-4 bg-blue-50 rounded-lg">
               <div className="text-2xl font-bold text-blue-600">{performance.data.total_customers}</div>
               <div className="text-sm text-blue-600">Total Customers</div>
             </div>
             <div className="text-center p-4 bg-green-50 rounded-lg">
               <div className="text-2xl font-bold text-green-600">${(performance.data.total_revenue / 1000000).toFixed(1)}M</div>
               <div className="text-sm text-green-600">Total Revenue</div>
             </div>
             <div className="text-center p-4 bg-purple-50 rounded-lg">
               <div className="text-2xl font-bold text-purple-600">{performance.data.average_engagement}%</div>
               <div className="text-sm text-purple-600">Avg Engagement</div>
             </div>
             <div className="text-center p-4 bg-red-50 rounded-lg">
               <div className="text-2xl font-bold text-red-600">{performance.data.churn_rate}%</div>
               <div className="text-sm text-red-600">Churn Rate</div>
             </div>
           </div>
         </motion.div>
       ) : (
         <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
         >
           <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
           <div className="text-center text-gray-500 py-8">
             <p>Performance metrics will be available once you upload customer data.</p>
           </div>
         </motion.div>
       )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <RevenueChart />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <EngagementChart />
        </motion.div>
      </div>

      {/* Customer Segments */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <CustomerSegments data={segments?.data} isLoading={segmentsLoading} />
      </motion.div>

      {/* Advanced Analytics - Only show if we have data */}
      {hasData && (
        <>
          {/* Revenue Forecasting */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <ForecastingChart />
          </motion.div>

          {/* Trend Analysis */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <TrendAnalysis />
          </motion.div>
        </>
      )}

      {/* Basic Trend Analysis for no data state */}
      {!hasData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trend Analysis</h3>
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Trend Data Available</h3>
            <p className="text-gray-500 mb-4">Upload customer data to see advanced trend analysis and forecasting</p>
            <Link
              to="/data-upload"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Data
            </Link>
          </div>
        </motion.div>
      )}

      {/* Notification Toast */}
      {notification.show && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
            notification.type === 'error' 
              ? 'bg-red-500 text-white' 
              : 'bg-green-500 text-white'
          }`}
        >
          <div className="flex items-center">
            {notification.type === 'error' ? (
              <AlertTriangle className="h-5 w-5 mr-2" />
            ) : (
              <Download className="h-5 w-5 mr-2" />
            )}
            {notification.message}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Analytics;

