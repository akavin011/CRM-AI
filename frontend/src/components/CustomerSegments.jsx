import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Users, TrendingUp, DollarSign } from 'lucide-react';

const CustomerSegments = ({ data, isLoading = false }) => {
  console.log('CustomerSegments received data:', data);
  console.log('CustomerSegments data type:', typeof data);
  console.log('CustomerSegments data is array:', Array.isArray(data));
  console.log('CustomerSegments data length:', data?.length);
  
  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-600" />
            Customer Segments
          </h3>
        </div>
        <div className="card-content">
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading segments...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <Users className="h-5 w-5 mr-2 text-blue-600" />
            Customer Segments
          </h3>
        </div>
        <div className="card-content">
          <div className="flex items-center justify-center h-48">
            <div className="text-gray-500">No segment data available</div>
          </div>
        </div>
      </div>
    );
  }

  // Transform data for pie chart
  const pieData = data.map(segment => ({
    name: segment.name || 'Unknown',
    value: segment.count || 0,
    percentage: (((segment.count || 0) / data.reduce((sum, s) => sum + (s.count || 0), 0)) * 100).toFixed(1),
    color: getSegmentColor(segment.name),
    revenue: segment.totalRevenue || 0,
    avgRevenue: segment.avgRevenue || 0
  }));

  const COLORS = pieData.map(item => item.color);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <div className="space-y-1">
            <div className="text-sm text-gray-600">Customers: {data.value}</div>
            <div className="text-sm text-gray-600">Percentage: {data.percentage}%</div>
            <div className="text-sm text-gray-600">Revenue: ${(data.revenue || 0).toLocaleString()}</div>
            <div className="text-sm text-gray-600">Avg Revenue: ${(data.avgRevenue || 0).toLocaleString()}</div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title flex items-center">
          <Users className="h-5 w-5 mr-2 text-blue-600" />
          Customer Segments
        </h3>
        <p className="card-description">Distribution of customers by value</p>
      </div>
      <div className="card-content">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percentage }) => `${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Segment Details */}
        <div className="mt-6 space-y-3">
          {data.map((segment, index) => (
            <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: getSegmentColor(segment.name) }}
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">{segment.name || 'Unknown'}</div>
                  <div className="text-xs text-gray-500">{segment.count || 0} customers</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  ${(segment.avgRevenue || 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">avg revenue</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function getSegmentColor(segmentName) {
  const colors = {
    'High-Value Customers': '#10b981',
    'At-Risk Customers': '#ef4444',
    'Regular Customers': '#3b82f6',
    'New/Low-Engagement Customers': '#f59e0b'
  };
  return colors[segmentName] || '#6b7280';
}

export default CustomerSegments;

