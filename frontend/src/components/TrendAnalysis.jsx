import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle, Target, Calendar } from 'lucide-react';
import { useQuery } from 'react-query';
import { api } from '../utils/api.js';
import { useUser } from '../contexts/UserContext.jsx';

const TrendAnalysis = () => {
  const { user, loading: userLoading } = useUser();
  
  // Get comprehensive data for trend analysis
  const { data: customerData, isLoading: customersLoading } = useQuery(
    ['trend-customers', user?.id],
    () => api.getProcessedData({ limit: 1000 }),
    { 
      enabled: !!user && !userLoading,
      refetchInterval: 300000,
      staleTime: 0
    }
  );

  const { data: insights, isLoading: insightsLoading } = useQuery(
    ['trend-insights', user?.id],
    () => api.getInsightsMetrics(),
    { 
      enabled: !!user && !userLoading,
      refetchInterval: 300000,
      staleTime: 0
    }
  );

  const { data: segments } = useQuery(
    ['trend-segments', user?.id],
    () => api.getCustomerSegments(),
    { 
      enabled: !!user && !userLoading,
      refetchInterval: 300000,
      staleTime: 0
    }
  );

  const isLoading = customersLoading || insightsLoading;

  // Debug logging
  console.log('TrendAnalysis - customerData:', customerData);
  console.log('TrendAnalysis - insights:', insights);
  console.log('TrendAnalysis - segments:', segments);

  // Process data for trend analysis
  const trendData = React.useMemo(() => {
    if (!customerData?.data?.processedData || customerData.data.processedData.length === 0) {
      return {
        monthlyTrends: [],
        segmentDistribution: [],
        engagementTrends: [],
        churnTrends: [],
        revenueByIndustry: []
      };
    }

    const customers = customerData.data.processedData;
    
    // Monthly trends
    const monthlyTrends = {};
    customers.forEach(customer => {
      const date = new Date(customer.created_at || customer.last_interaction_date);
      const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (!monthlyTrends[month]) {
        monthlyTrends[month] = {
          month,
          newCustomers: 0,
          revenue: 0,
          engagement: 0,
          churnRisk: 0
        };
      }
      
      monthlyTrends[month].newCustomers += 1;
      monthlyTrends[month].revenue += customer.total_spent || 0;
      monthlyTrends[month].engagement += customer.engagement_score || 0;
      if (customer.churn_probability > 0.5) {
        monthlyTrends[month].churnRisk += 1;
      }
    });

    // Calculate averages
    Object.values(monthlyTrends).forEach(month => {
      month.engagement = month.engagement / month.newCustomers;
    });

    // Segment distribution
    const segmentDistribution = {};
    customers.forEach(customer => {
      const segment = customer.segment || 'Unknown';
      if (!segmentDistribution[segment]) {
        segmentDistribution[segment] = {
          name: segment,
          value: 0,
          revenue: 0,
          count: 0
        };
      }
      segmentDistribution[segment].value += 1;
      segmentDistribution[segment].revenue += customer.total_spent || 0;
      segmentDistribution[segment].count += 1;
    });

    // Engagement trends by segment
    const engagementTrends = Object.values(segmentDistribution).map(segment => ({
      segment: segment.name,
      engagement: customers
        .filter(c => (c.segment || 'Unknown') === segment.name)
        .reduce((sum, c) => sum + (c.engagement_score || 0), 0) / segment.count,
      customers: segment.count,
      revenue: segment.revenue
    }));

    // Churn trends
    const churnTrends = customers.map(customer => ({
      name: customer.company_name || 'Unknown',
      churnProbability: (customer.churn_probability || 0) * 100,
      engagement: customer.engagement_score || 0,
      revenue: customer.total_spent || 0
    })).sort((a, b) => b.churnProbability - a.churnProbability).slice(0, 10);

    // Revenue by industry
    const revenueByIndustry = {};
    customers.forEach(customer => {
      const industry = customer.industry || 'Unknown';
      if (!revenueByIndustry[industry]) {
        revenueByIndustry[industry] = {
          industry,
          revenue: 0,
          customers: 0
        };
      }
      revenueByIndustry[industry].revenue += customer.total_spent || 0;
      revenueByIndustry[industry].customers += 1;
    });

    return {
      monthlyTrends: Object.values(monthlyTrends).sort((a, b) => 
        new Date(a.month + ' 1, 2024') - new Date(b.month + ' 1, 2024')
      ),
      segmentDistribution: Object.values(segmentDistribution),
      engagementTrends,
      churnTrends,
      revenueByIndustry: Object.values(revenueByIndustry).sort((a, b) => b.revenue - a.revenue)
    };
  }, [customerData]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-purple-500" />
            Trend Analysis
          </h3>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading trend analysis...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!trendData.monthlyTrends.length && (!insights?.data || !segments?.data)) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-purple-500" />
            Trend Analysis
          </h3>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Trend Data</h3>
            <p className="text-gray-500">Upload customer data to see trend analysis</p>
          </div>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span> {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Monthly Trends */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-500" />
            Monthly Trends
          </h3>
        </div>
        <div className="p-6">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="newCustomers" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="New Customers"
                />
                <Line 
                  type="monotone" 
                  dataKey="engagement" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Avg Engagement"
                />
                <Line 
                  type="monotone" 
                  dataKey="churnRisk" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="At Risk"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Segment Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2 text-green-500" />
              Customer Segments
            </h3>
          </div>
          <div className="p-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={trendData.segmentDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {trendData.segmentDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Revenue by Industry */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-yellow-500" />
              Revenue by Industry
            </h3>
          </div>
          <div className="p-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData.revenueByIndustry.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="industry" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="#f59e0b" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Churn Risk Analysis */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
            Churn Risk Analysis
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {trendData.churnTrends.slice(0, 5).map((customer, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{customer.name}</p>
                  <p className="text-sm text-gray-500">
                    Engagement: {customer.engagement.toFixed(0)}% • Revenue: ${customer.revenue.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Churn Risk</p>
                    <p className="text-lg font-semibold text-red-600">
                      {customer.churnProbability.toFixed(0)}%
                    </p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    customer.churnProbability > 70 ? 'bg-red-500' :
                    customer.churnProbability > 40 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrendAnalysis;
