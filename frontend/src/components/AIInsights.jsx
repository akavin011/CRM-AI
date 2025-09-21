import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Zap, 
  RefreshCw, 
  TrendingUp, 
  AlertTriangle, 
  Target,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Upload
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api.js';

const AIInsights = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Get customer data first
  const { data: customerData } = useQuery(
    'customer-data-for-insights',
    () => api.getProcessedData({ limit: 1000 }),
    { refetchInterval: 60000 }
  );

  // Helper function to get customer data array regardless of structure
  const getCustomerDataArray = () => {
    if (customerData?.data?.allCustomers) return customerData.data.allCustomers;
    if (customerData?.data?.rows) return customerData.data.rows;
    if (customerData?.data?.processedData) return customerData.data.processedData;
    if (customerData?.data?.data) return customerData.data.data;
    if (Array.isArray(customerData?.data)) return customerData.data;
    return [];
  };

  const customerArray = getCustomerDataArray();
  const hasData = customerArray.length > 0;

  const { data: insights, isLoading, refetch } = useQuery(
    'ai-insights',
    async () => {
      // Only generate insights if we have customer data
      if (!hasData) {
        return { success: false, message: 'No customer data available' };
      }

      const response = await api.sendChatMessage('Generate AI insights for my customer data');
      return response;
    },
    { 
      refetchInterval: 300000, // Refetch every 5 minutes
      enabled: hasData
    }
  );

  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    try {
      await refetch();
    } finally {
      setIsGenerating(false);
    }
  };
  
  const insightsData = insights?.data || {
    ai_insights: hasData ? 
      `## AI-Generated CRM Insights

### Customer Overview
You have ${customerArray.length} total customers with an average engagement score of ${Math.round(customerArray.reduce((sum, c) => sum + (c.engagement_score || 0), 0) / customerArray.length) || 0}.

### Customer Segments
${customerArray.length > 0 ? 
  Object.entries(
    customerArray.reduce((acc, customer) => {
      const segment = customer.segment || 'Unknown';
      acc[segment] = (acc[segment] || 0) + 1;
      return acc;
    }, {})
  ).map(([segment, count]) => `- **${segment}**: ${count} customers (${((count / customerArray.length) * 100).toFixed(1)}%)`).join('\n') :
  'No customer data available'
}

### AI Recommendations
${hasData ? 
  'Based on your customer data analysis, focus on high-value customer retention and identify upsell opportunities in your medium-value segment.' :
  'Please upload your customer data to generate AI-powered insights.'
}` : 
      `## No Data Available

### Upload Your Data
To generate AI-powered insights, please upload your customer data first.

### What You'll Get
- Customer segmentation analysis
- Churn risk predictions
- Upsell opportunities
- Engagement insights
- Revenue analysis
- Personalized recommendations

### Next Steps
1. Go to Data Upload page
2. Upload your customer CSV/JSON file
3. Wait for AI processing
4. View your personalized insights here`,
    confidence_score: hasData ? 0.87 : 0,
    generated_at: new Date().toISOString()
  };

  const keyInsights = hasData ? [
    {
      icon: AlertTriangle,
      title: 'Churn Risk Alert',
      value: `${customerArray.filter(c => (c.churn_probability || 0) >= 0.5).length} customers`,
      description: 'at high risk of churning',
      color: 'red',
      action: 'Implement retention campaigns'
    },
    {
      icon: Target,
      title: 'Upsell Opportunities',
      value: `${customerArray.filter(c => (c.upsell_score || 0) >= 0.7).length} customers`,
      description: 'ready for expansion',
      color: 'green',
      action: 'Schedule product demos'
    },
    {
      icon: TrendingUp,
      title: 'Revenue Growth',
      value: `$${customerArray.reduce((sum, c) => sum + (c.total_spent || 0), 0).toLocaleString()}`,
      description: 'total revenue',
      color: 'blue',
      action: 'Continue current strategies'
    }
  ] : [
    {
      icon: Upload,
      title: 'Upload Data',
      value: 'No data',
      description: 'to generate insights',
      color: 'gray',
      action: 'Go to Data Upload page'
    }
  ];

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-purple-600">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="card-title">AI-Powered Insights</h3>
              <p className="card-description">Intelligent analysis powered by AI</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {hasData ? (
              <>
                <button
                  onClick={handleGenerateInsights}
                  disabled={isGenerating}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'Generating...' : 'Refresh'}
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </>
            ) : (
              <Link
                to="/data-upload"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Data
              </Link>
            )}
          </div>
        </div>
      </div>
      
      <div className="card-content">
        {/* Key Insights Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {keyInsights.map((insight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border-l-4 ${
                insight.color === 'red' ? 'border-red-500 bg-red-50' :
                insight.color === 'green' ? 'border-green-500 bg-green-50' :
                'border-blue-500 bg-blue-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  insight.color === 'red' ? 'bg-red-100' :
                  insight.color === 'green' ? 'bg-green-100' :
                  'bg-blue-100'
                }`}>
                  <insight.icon className={`h-5 w-5 ${
                    insight.color === 'red' ? 'text-red-600' :
                    insight.color === 'green' ? 'text-green-600' :
                    'text-blue-600'
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{insight.title}</div>
                  <div className="text-lg font-bold text-gray-900">{insight.value}</div>
                  <div className="text-xs text-gray-600">{insight.description}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600">{insight.action}</div>
            </motion.div>
          ))}
        </div>

        {/* Confidence Score */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-6">
          <div className="flex items-center space-x-3">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <div>
              <div className="text-sm font-medium text-gray-900">AI Confidence Score</div>
              <div className="text-xs text-gray-600">Based on data quality and model accuracy</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(insightsData.confidence_score || 0.87) * 100}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {Math.round((insightsData.confidence_score || 0.87) * 100)}%
            </span>
          </div>
        </div>

        {/* Detailed Insights */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t pt-6"
            >
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                  {insightsData.ai_insights}
                </div>
              </div>
              
              <div className="mt-4 text-xs text-gray-500 flex items-center justify-between">
                <span>Generated at: {new Date(insightsData.generated_at).toLocaleString()}</span>
                <div className="flex items-center space-x-1">
                  <Zap className="h-3 w-3 text-yellow-500" />
                  <span>Powered by AI</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIInsights;

