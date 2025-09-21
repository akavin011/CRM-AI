import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { TrendingUp, Calendar, Target, AlertCircle } from 'lucide-react';
import { useQuery } from 'react-query';
import { api } from '../utils/api.js';
import { useUser } from '../contexts/UserContext.jsx';

const ForecastingChart = () => {
  const { user, loading: userLoading } = useUser();
  
  // Get revenue data for forecasting
  const { data: revenueData, isLoading } = useQuery(
    ['forecasting-data', user?.id],
    () => api.getProcessedData({ limit: 1000 }),
    { 
      enabled: !!user && !userLoading,
      refetchInterval: 300000,
      staleTime: 0
    }
  );

  // Process data for forecasting
  const data = React.useMemo(() => {
    if (!revenueData?.data?.processedData || revenueData.data.processedData.length === 0) {
      return [];
    }

    // Group by month and calculate revenue
    const monthlyData = {};
    revenueData.data.processedData.forEach(customer => {
      const date = new Date(customer.created_at || customer.last_interaction_date);
      const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (!monthlyData[month]) {
        monthlyData[month] = { 
          month, 
          actual: 0, 
          forecast: 0, 
          confidence: 0,
          count: 0 
        };
      }
      
      monthlyData[month].actual += customer.total_spent || 0;
      monthlyData[month].count += 1;
    });

    // Simple forecasting algorithm (linear regression)
    const months = Object.keys(monthlyData).sort();
    const values = months.map(month => monthlyData[month].actual);
    
    if (values.length >= 2) {
      // Calculate linear regression
      const n = values.length;
      const sumX = months.reduce((sum, _, i) => sum + i, 0);
      const sumY = values.reduce((sum, val) => sum + val, 0);
      const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
      const sumXX = months.reduce((sum, _, i) => sum + (i * i), 0);
      
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      
      // Generate forecast for next 3 months
      months.forEach((month, index) => {
        monthlyData[month].forecast = Math.max(0, slope * index + intercept);
        monthlyData[month].confidence = Math.max(0.6, Math.min(0.95, 1 - (index * 0.1)));
      });
      
      // Add forecast months
      for (let i = 1; i <= 3; i++) {
        const futureIndex = months.length + i - 1;
        const futureMonth = new Date();
        futureMonth.setMonth(futureMonth.getMonth() + i);
        const futureMonthStr = futureMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        monthlyData[futureMonthStr] = {
          month: futureMonthStr,
          actual: 0,
          forecast: Math.max(0, slope * futureIndex + intercept),
          confidence: Math.max(0.5, 0.9 - (i * 0.15)),
          count: 0
        };
      }
    }

    return Object.values(monthlyData).sort((a, b) => 
      new Date(a.month + ' 1, 2024') - new Date(b.month + ' 1, 2024')
    );
  }, [revenueData]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
              Revenue Forecasting
            </h3>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500">Loading</span>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center h-80">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading forecasting data...</p>
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
              <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
              Revenue Forecasting
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
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Forecasting Data</h3>
            <p className="text-gray-500 mb-4">Upload more customer data to enable revenue forecasting</p>
          </div>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
          <div className="space-y-1">
            {data.actual > 0 && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Actual:</span> ${data.actual.toLocaleString()}
              </p>
            )}
            <p className="text-sm text-blue-600">
              <span className="font-medium">Forecast:</span> ${data.forecast.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500">
              <span className="font-medium">Confidence:</span> {(data.confidence * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate forecast accuracy and trends
  const actualData = data.filter(d => d.actual > 0);
  const forecastData = data.filter(d => d.forecast > 0);
  const currentMonth = data[data.length - 1];
  const nextMonth = data[data.length - 2];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
            Revenue Forecasting
          </h3>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-500">Next Month Forecast</p>
              <p className="text-lg font-semibold text-gray-900">
                ${nextMonth?.forecast?.toLocaleString() || 0}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-blue-600">
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">
                {(nextMonth?.confidence * 100)?.toFixed(0) || 0}% confidence
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
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
              <Legend />
              <ReferenceLine 
                y={data.reduce((sum, d) => sum + d.actual, 0) / data.filter(d => d.actual > 0).length} 
                stroke="#ef4444" 
                strokeDasharray="5 5"
                label="Average"
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                name="Actual Revenue"
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="forecast"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                name="Forecast"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Forecast Insights */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-900">Forecast Period</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">3 months</p>
            <p className="text-sm text-gray-500">Based on historical data</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-gray-900">Avg Confidence</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(forecastData.reduce((sum, d) => sum + d.confidence, 0) / forecastData.length * 100)}%
            </p>
            <p className="text-sm text-gray-500">Forecast accuracy</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-900">Growth Trend</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {data.length > 1 ? 
                ((data[data.length - 1].forecast - data[0].actual) / data[0].actual * 100).toFixed(1) : 0}%
            </p>
            <p className="text-sm text-gray-500">Projected growth</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForecastingChart;
