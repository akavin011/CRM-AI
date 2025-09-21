import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Target, TrendingUp } from 'lucide-react';
import { useQuery } from 'react-query';
import { api } from '../utils/api.js';

const EngagementChart = () => {
  // Helper function to get segment color
  const getSegmentColor = (segment) => {
    const colors = {
      'High Value': '#10b981',
      'Medium Value': '#3b82f6',
      'Low Value': '#f59e0b',
      'At Risk': '#ef4444',
      'Standard': '#6b7280',
      'Unknown': '#9ca3af'
    };
    return colors[segment] || '#9ca3af';
  };

  // Get engagement data from API
  const { data: engagementData, isLoading } = useQuery(
    'engagement-data',
    () => api.getProcessedData({ limit: 1000 }),
    { refetchInterval: 60000 }
  );

  // Process data for chart
  const data = React.useMemo(() => {
    if (!engagementData?.data?.processedData || engagementData.data.processedData.length === 0) {
      return [];
    }

    // Group by segment and calculate engagement
    const segmentData = {};
    engagementData.data.processedData.forEach(customer => {
      const segment = customer.segment || 'Unknown';
      
      if (!segmentData[segment]) {
        segmentData[segment] = { 
          segment, 
          engagement: 0, 
          customers: 0, 
          totalEngagement: 0,
          color: getSegmentColor(segment)
        };
      }
      
      segmentData[segment].customers += 1;
      segmentData[segment].totalEngagement += customer.engagement_score || 0;
    });

    // Calculate average engagement for each segment
    return Object.values(segmentData).map(segment => ({
      ...segment,
      engagement: segment.customers > 0 ? Math.round(segment.totalEngagement / segment.customers) : 0
    }));
  }, [engagementData]);

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <Target className="h-5 w-5 mr-2 text-purple-600" />
            Customer Engagement
          </h3>
          <p className="card-description">Loading engagement data...</p>
        </div>
        <div className="card-content">
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <Target className="h-5 w-5 mr-2 text-purple-600" />
            Customer Engagement
          </h3>
          <p className="card-description">No engagement data available</p>
        </div>
        <div className="card-content">
          <div className="h-80 flex items-center justify-center text-gray-500">
            Upload customer data to see engagement trends
          </div>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{label} Customers</p>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
              <span className="text-sm text-gray-600">Engagement: {data.engagement}%</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <span className="text-sm text-gray-600">Customers: {data.customers}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="card-title flex items-center">
              <Target className="h-5 w-5 mr-2 text-purple-600" />
              Customer Engagement
            </h3>
            <p className="card-description">Engagement scores by segment</p>
          </div>
          <div className="flex items-center space-x-2 text-purple-600">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">+5.1%</span>
          </div>
        </div>
      </div>
      <div className="card-content">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="segment" 
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
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="engagement" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Segment Details */}
        <div className="mt-6 space-y-3">
          {data.map((segment, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-sm font-medium text-gray-900">{segment.segment}</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{segment.engagement}%</div>
                  <div className="text-xs text-gray-500">engagement</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">{segment.customers}</div>
                  <div className="text-xs text-gray-500">customers</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EngagementChart;

