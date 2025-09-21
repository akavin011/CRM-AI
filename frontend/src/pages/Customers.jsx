import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Download, 
  Plus, 
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Users
} from 'lucide-react';
import { api } from '../utils/api.js';
import { useUser } from '../contexts/UserContext.jsx';

const Customers = () => {
  const { user, loading: userLoading } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [sortBy, setSortBy] = useState('engagement_score');
  const [sortOrder, setSortOrder] = useState('desc');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  // Export customers data
  const handleExportCustomers = () => {
    try {
      if (!customers || customers.length === 0) {
        showNotification('No customer data to export', 'error');
        return;
      }

      // Create export data with filtered customers
      const exportData = {
        export_date: new Date().toISOString(),
        user: user?.email || 'Unknown',
        total_customers: customers.length,
        filters: {
          search_term: searchTerm,
          selected_segment: selectedSegment,
          sort_by: sortBy,
          sort_order: sortOrder
        },
        customers: customers.map(customer => ({
          customer_id: customer.customer_id,
          company_name: customer.company_name,
          industry: customer.industry,
          location: customer.location,
          total_spent: customer.total_spent,
          engagement_score: customer.engagement_score,
          last_interaction_date: customer.last_interaction_date,
          purchase_frequency: customer.purchase_frequency,
          segment: customer.segment,
          churn_probability: customer.churn_probability,
          risk_level: customer.risk_level,
          status: customer.status
        }))
      };

      // Download as JSON
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `customers-export-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showNotification(`Exported ${customers.length} customers successfully!`);
    } catch (error) {
      console.error('Export error:', error);
      showNotification('Failed to export customers. Please try again.', 'error');
    }
  };

  // Fetch real customer data
  const { data: customerData, isLoading: customersLoading, error: customersError } = useQuery(
    ['customers-data', user?.id],
    () => api.getProcessedData({ limit: 1000 }),
    { 
      enabled: !!user && !userLoading,
      refetchInterval: 300000,
      staleTime: 0,
      onSuccess: (data) => {
        console.log('Customers query success:', data);
      },
      onError: (error) => {
        console.error('Customers query error:', error);
      }
    }
  );

  // Fetch customer segments for filtering
  const { data: segmentsData, error: segmentsError } = useQuery(
    ['customers-segments', user?.id],
    () => api.getCustomerSegments(),
    { 
      enabled: !!user && !userLoading,
      refetchInterval: 300000,
      staleTime: 0,
      onSuccess: (data) => {
        console.log('Segments query success:', data);
      },
      onError: (error) => {
        console.error('Segments query error:', error);
      }
    }
  );

  // Process real customer data
  const customers = React.useMemo(() => {
    console.log('Customer data structure:', customerData);
    console.log('Customer data processedData:', customerData?.data?.processedData);
    
    if (!customerData?.data?.processedData || customerData.data.processedData.length === 0) {
      console.log('No processed data found, returning empty array');
      return [];
    }

    let filteredCustomers = customerData.data.processedData;

    // Apply search filter
    if (searchTerm) {
      filteredCustomers = filteredCustomers.filter(customer =>
        customer.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.industry?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply segment filter
    if (selectedSegment !== 'all') {
      filteredCustomers = filteredCustomers.filter(customer => 
        customer.segment === selectedSegment
      );
    }

    // Apply sorting
    filteredCustomers.sort((a, b) => {
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filteredCustomers;
  }, [customerData, searchTerm, selectedSegment, sortBy, sortOrder]);

  // Dynamic segments based on real data
  const segments = React.useMemo(() => {
    if (!customerData?.data?.processedData || customerData.data.processedData.length === 0) {
      return [{ value: 'all', label: 'All Customers', count: 0 }];
    }

    const allCustomers = customerData.data.processedData;
    const segmentCounts = {};

    allCustomers.forEach(customer => {
      const segment = customer.segment || 'Unknown';
      segmentCounts[segment] = (segmentCounts[segment] || 0) + 1;
    });

    const segmentOptions = Object.entries(segmentCounts).map(([segment, count]) => ({
      value: segment,
      label: segment,
      count: count
    }));

    return [
      { value: 'all', label: 'All Customers', count: allCustomers.length },
      ...segmentOptions
    ];
  }, [customerData]);

  const isLoading = customersLoading || userLoading;

  // Debug logging
  React.useEffect(() => {
    console.log('=== CUSTOMERS DEBUG ===');
    console.log('User:', user);
    console.log('User Loading:', userLoading);
    console.log('Customer Data:', customerData);
    console.log('Customers Loading:', customersLoading);
    console.log('Customers Error:', customersError);
    console.log('Customers:', customers);
    console.log('Segments:', segments);
    console.log('Segments Error:', segmentsError);
    console.log('Search Term:', searchTerm);
    console.log('Selected Segment:', selectedSegment);
    console.log('========================');
  }, [user, userLoading, customerData, customers, segments, searchTerm, selectedSegment]);

  const getRiskBadge = (churnProbability) => {
    if (churnProbability > 0.7) return { color: 'bg-red-100 text-red-800', text: 'High Risk' };
    if (churnProbability > 0.3) return { color: 'bg-yellow-100 text-yellow-800', text: 'Medium Risk' };
    return { color: 'bg-green-100 text-green-800', text: 'Low Risk' };
  };

  const getSegmentBadge = (segment) => {
    const colors = {
      'High-Value Customers': 'bg-green-100 text-green-800',
      'At-Risk Customers': 'bg-red-100 text-red-800',
      'Regular Customers': 'bg-blue-100 text-blue-800',
      'New/Low-Engagement Customers': 'bg-yellow-100 text-yellow-800'
    };
    return colors[segment] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-lg font-medium text-gray-600">Loading customers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and analyze your customer relationships
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleExportCustomers}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Segment Filter */}
          <select
            value={selectedSegment}
            onChange={(e) => setSelectedSegment(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {segments.map(segment => (
              <option key={segment.value} value={segment.value}>
                {segment.label} ({segment.count})
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="engagement_score">Engagement Score</option>
            <option value="total_spent">Total Spent</option>
            <option value="company_name">Company Name</option>
            <option value="last_interaction">Last Interaction</option>
          </select>

          {/* Sort Order */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Segment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Engagement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Interaction
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                      <p className="text-lg font-medium">Loading customers...</p>
                      <p className="text-sm">Please wait while we fetch your customer data.</p>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Users className="h-12 w-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium">No customers found</p>
                      <p className="text-sm mb-4">Upload customer data to see your customers here.</p>
                      <button
                        onClick={() => window.location.href = '/upload'}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Upload Data
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer, index) => {
                const riskBadge = getRiskBadge(customer.churn_probability || 0);
                const segmentBadge = getSegmentBadge(customer.segment);
                
                return (
                  <motion.tr
                    key={customer.customer_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {customer.company_name.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {customer.company_name}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {customer.location || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${segmentBadge}`}>
                        {customer.segment}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${customer.engagement_score || 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900">
                          {customer.engagement_score || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        ${(customer.total_spent || 0).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${riskBadge.color}`}>
                        {riskBadge.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {customer.last_interaction ? new Date(customer.last_interaction).toLocaleDateString() : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button className="text-blue-600 hover:text-blue-900 p-1 rounded">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900 p-1 rounded">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900 p-1 rounded">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing {customers.length} of {customerData?.data?.total || customers.length} customers
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Previous
          </button>
          <button className="px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700">
            1
          </button>
          <button className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            2
          </button>
          <button className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Next
          </button>
        </div>
      </div>

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

export default Customers;

