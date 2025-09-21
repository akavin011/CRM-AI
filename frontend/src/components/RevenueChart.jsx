import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, DollarSign } from 'lucide-react';
import { useQuery } from 'react-query';
import { api } from '../utils/api.js';

const RevenueChart = () => {
  // Get revenue data from API
  const { data: revenueData, isLoading } = useQuery(
    'revenue-data',
    () => api.getProcessedData({ limit: 1000 }),
    { refetchInterval: 60000 }
  );

  // Process data for chart
  const data = React.useMemo(() => {
    if (!revenueData?.data?.processedData || revenueData.data.processedData.length === 0) {
      return [];
    }

    // Group by month and calculate revenue
    const monthlyData = {};
    revenueData.data.processedData.forEach(customer => {
      const date = new Date(customer.created_at);
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      
      if (!monthlyData[month]) {
        monthlyData[month] = { month, revenue: 0, target: 0, count: 0 };
      }
      
      monthlyData[month].revenue += customer.total_spent || 0;
      monthlyData[month].count += 1;
    });

    // Calculate targets (20% higher than average)
    const totalRevenue = Object.values(monthlyData).reduce((sum, month) => sum + month.revenue, 0);
    const avgRevenue = totalRevenue / Object.keys(monthlyData).length;
    const targetRevenue = avgRevenue * 1.2;

    return Object.values(monthlyData).map(month => ({
      ...month,
      target: targetRevenue
    })).sort((a, b) => new Date(a.month + ' 1, 2024') - new Date(b.month + ' 1, 2024'));
  }, [revenueData]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-green-500" />
              Revenue Trends
            </h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500">Loading</span>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center h-80">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading revenue data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-green-500" />
              Revenue Trends
            </h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-sm text-gray-500">No Data</span>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <DollarSign className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Revenue Data</h3>
            <p className="text-gray-500 mb-4">Upload customer data to see revenue trends and analytics</p>
          </div>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-gray-600">Revenue: ${payload[0].value.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <span className="text-sm text-gray-600">Target: ${payload[1].value.toLocaleString()}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate growth percentage
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const avgRevenue = totalRevenue / data.length;
  const growthPercentage = data.length > 1 ? 
    ((data[data.length - 1].revenue - data[0].revenue) / data[0].revenue * 100) : 0;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-green-500" />
              Revenue Trends
            </h3>
            <p className="text-sm text-gray-500 mt-1">Monthly revenue vs targets</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-lg font-semibold text-gray-900">${totalRevenue.toLocaleString()}</p>
            </div>
            <div className="flex items-center space-x-2 text-green-600">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">+{growthPercentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6b7280" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6b7280" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="month" 
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${(value / 1000)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#revenueGradient)"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="target"
                stroke="#6b7280"
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="url(#targetGradient)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              ${(data.reduce((sum, month) => sum + month.revenue, 0) / 1000000).toFixed(1)}M
            </div>
            <div className="text-sm text-gray-500">Total Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {data.length > 1 ? 
                `+${(((data[data.length - 1].revenue - data[0].revenue) / data[0].revenue) * 100).toFixed(1)}%` : 
                'N/A'
              }
            </div>
            <div className="text-sm text-gray-500">Growth Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {data.length > 0 ? 
                `${((data.reduce((sum, month) => sum + month.revenue, 0) / data.reduce((sum, month) => sum + month.target, 0)) * 100).toFixed(0)}%` : 
                'N/A'
              }
            </div>
            <div className="text-sm text-gray-500">Target Achievement</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;

