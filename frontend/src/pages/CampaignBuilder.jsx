import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from 'react-query';
import { 
  Mail, 
  Users, 
  Target, 
  Send, 
  Download, 
  Plus, 
  Trash2, 
  Edit3,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calendar,
  Filter,
  Search
} from 'lucide-react';
import { api } from '../utils/api.js';
import { useUser } from '../contexts/UserContext.jsx';

const CampaignBuilder = () => {
  const { user, loading: userLoading } = useUser();
  const [campaign, setCampaign] = useState({
    name: '',
    subject: '',
    template: 'churn_prevention',
    audience: 'at_risk',
    scheduledDate: '',
    status: 'draft'
  });

  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3000);
  };

  // Fetch real customer data
  const { data: customerData, isLoading: customersLoading } = useQuery(
    ['campaign-customers', user?.id],
    () => api.getProcessedData({ limit: 1000 }),
    { 
      enabled: !!user && !userLoading,
      refetchInterval: 300000,
      staleTime: 0
    }
  );

  // Fetch customer segments for targeting
  const { data: segments } = useQuery(
    ['campaign-segments', user?.id],
    () => api.getCustomerSegments(),
    { 
      enabled: !!user && !userLoading,
      refetchInterval: 300000,
      staleTime: 0
    }
  );

  // Fetch churn predictions for targeting
  const { data: churnData } = useQuery(
    ['campaign-churn', user?.id],
    () => api.getChurnPredictions(),
    { 
      enabled: !!user && !userLoading,
      refetchInterval: 300000,
      staleTime: 0
    }
  );

  // Fetch upsell opportunities for targeting
  const { data: upsellData } = useQuery(
    ['campaign-upsell', user?.id],
    () => api.getUpsellOpportunities(),
    { 
      enabled: !!user && !userLoading,
      refetchInterval: 300000,
      staleTime: 0
    }
  );

  const templates = [
    {
      id: 'churn_prevention',
      name: 'Churn Prevention',
      subject: 'We miss you! Let\'s reconnect',
      content: `Hi {{company_name}},

We noticed you haven't been as active lately, and we wanted to reach out personally.

Your success is important to us, and we'd love to understand how we can better serve your needs.

Would you be available for a quick 15-minute call this week to discuss your current challenges and how we can help?

Best regards,
Your Account Team`
    },
    {
      id: 'upsell_opportunity',
      name: 'Upsell Opportunity',
      subject: 'Exclusive upgrade offer for {{company_name}}',
      content: `Hi {{company_name}},

Based on your usage patterns, we believe you could benefit from our {{recommended_product}}.

This upgrade would give you:
• {{benefit_1}}
• {{benefit_2}}
• {{benefit_3}}

We're offering a special 20% discount for the first 3 months.

Interested? Let's schedule a demo.

Best regards,
Your Success Team`
    },
    {
      id: 're_engagement',
      name: 'Re-engagement',
      subject: 'New features you\'ll love',
      content: `Hi {{company_name}},

We've been working hard to improve our platform, and we think you'll love these new features:

• {{new_feature_1}}
• {{new_feature_2}}
• {{new_feature_3}}

Ready to explore? Log in to your dashboard to get started.

Questions? We're here to help!

Best regards,
Your Product Team`
    }
  ];

  // Process real customer data for campaign targeting
  const customers = React.useMemo(() => {
    if (!customerData?.data?.processedData || customerData.data.processedData.length === 0) {
      return [];
    }

    return customerData.data.processedData.map(customer => ({
      id: customer.id,
      company_name: customer.company_name,
      industry: customer.industry,
      segment: customer.segment,
      churn_risk: customer.churn_probability > 0.5 ? 'High' : customer.churn_probability > 0.3 ? 'Medium' : 'Low',
      engagement_score: customer.engagement_score,
      total_spent: customer.total_spent,
      location: customer.location,
      last_interaction: customer.last_interaction_date
    }));
  }, [customerData]);

  // Dynamic audience options based on real data
  const audienceSegments = React.useMemo(() => {
    const atRiskCount = customers.filter(c => c.churn_risk === 'High' || c.churn_risk === 'Medium').length;
    const highValueCount = customers.filter(c => c.segment === 'High Value').length;
    const upsellReadyCount = customers.filter(c => c.segment === 'High Value' && c.engagement_score > 80).length;
    const newCustomerCount = customers.filter(c => c.segment === 'New Customer').length;
    
    return [
      { id: 'at_risk', name: 'At Risk Customers', count: atRiskCount, color: 'red' },
      { id: 'high_value', name: 'High Value Customers', count: highValueCount, color: 'green' },
      { id: 'upsell_ready', name: 'Upsell Ready', count: upsellReadyCount, color: 'blue' },
      { id: 'new_customers', name: 'New Customers', count: newCustomerCount, color: 'purple' },
      { id: 'all', name: 'All Customers', count: customers.length, color: 'gray' }
    ];
  }, [customers]);

  // Debug logging
  React.useEffect(() => {
    console.log('=== CAMPAIGN BUILDER DEBUG ===');
    console.log('User:', user);
    console.log('User Loading:', userLoading);
    console.log('Customer Data:', customerData);
    console.log('Customers:', customers);
    console.log('Segments:', segments);
    console.log('Churn Data:', churnData);
    console.log('Upsell Data:', upsellData);
    console.log('Audience Segments:', audienceSegments);
    console.log('=============================');
  }, [user, userLoading, customerData, customers, segments, churnData, upsellData, audienceSegments]);

  // Get customers by audience type
  const getCustomersByAudience = (audience) => {
    switch (audience) {
      case 'at_risk':
        return customers.filter(c => c.churn_risk === 'High' || c.churn_risk === 'Medium');
      case 'high_value':
        return customers.filter(c => c.segment === 'High Value');
      case 'upsell_ready':
        return customers.filter(c => c.segment === 'High Value' && c.engagement_score > 80);
      case 'new_customers':
        return customers.filter(c => c.segment === 'New Customer');
      case 'all':
        return customers;
      default:
        return customers;
    }
  };

  const handleTemplateChange = (templateId) => {
    const template = templates.find(t => t.id === templateId);
    setCampaign({
      ...campaign,
      template: templateId,
      subject: template.subject,
      content: template.content
    });
  };

  const handleCustomerSelect = (customerId) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSendCampaign = () => {
    if (selectedCustomers.length === 0) {
      showNotification('Please select customers before sending campaign', 'error');
      return;
    }
    if (!campaign.name) {
      showNotification('Please enter a campaign name', 'error');
      return;
    }
    
    // Simulate sending campaign
    setCampaign({ ...campaign, status: 'sent' });
    showNotification(`Campaign sent to ${selectedCustomers.length} customers!`);
  };

  const handleExportList = () => {
    if (selectedCustomers.length === 0) {
      showNotification('No customers selected for export', 'error');
      return;
    }

    // Get selected customer data
    const selectedCustomerData = customers.filter(customer => 
      selectedCustomers.includes(customer.customer_id)
    );

    // Create export data
    const exportData = {
      campaign_name: campaign.name,
      template: campaign.template,
      audience: campaign.audience,
      export_date: new Date().toISOString(),
      total_recipients: selectedCustomers.length,
      customers: selectedCustomerData.map(customer => ({
        customer_id: customer.customer_id,
        company_name: customer.company_name,
        email: customer.email || 'No email available',
        industry: customer.industry,
        total_spent: customer.total_spent,
        engagement_score: customer.engagement_score
      }))
    };

    // Download as JSON
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `campaign-${campaign.name || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    showNotification(`Exported ${selectedCustomers.length} customers successfully!`);
  };

  const handleSchedule = () => {
    const scheduledDate = prompt('Enter scheduled date and time (YYYY-MM-DD HH:MM):');
    if (scheduledDate) {
      setCampaign({ ...campaign, scheduledDate, status: 'scheduled' });
      showNotification(`Campaign scheduled for ${scheduledDate}`);
    }
  };

  const selectedTemplate = templates.find(t => t.id === campaign.template);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Campaign Builder</h1>
          <p className="text-gray-600">Create and send targeted campaigns to your customers</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Campaign Configuration */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm border p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Mail className="w-5 h-5 mr-2 text-blue-600" />
                Campaign Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={campaign.name}
                    onChange={(e) => setCampaign({...campaign, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter campaign name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={campaign.subject}
                    onChange={(e) => setCampaign({...campaign, subject: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email subject"
                  />
                </div>
              </div>
            </motion.div>

            {/* Template Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow-sm border p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Edit3 className="w-5 h-5 mr-2 text-green-600" />
                Email Template
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateChange(template.id)}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      campaign.template === template.id
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900 mb-2">{template.name}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{template.subject}</p>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Audience Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow-sm border p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-purple-600" />
                Target Audience
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {audienceSegments.map((segment) => (
                  <button
                    key={segment.id}
                    onClick={() => setCampaign({...campaign, audience: segment.id})}
                    className={`p-4 rounded-lg border text-left transition-all ${
                      campaign.audience === segment.id
                        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{segment.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        segment.color === 'red' ? 'bg-red-100 text-red-800' :
                        segment.color === 'green' ? 'bg-green-100 text-green-800' :
                        segment.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {segment.count} customers
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Customer Selection */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow-sm border p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-indigo-600" />
                Select Customers
              </h2>
              
              <div className="space-y-2">
                {customersLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Loading customers...</p>
                  </div>
                ) : getCustomersByAudience(campaign.audience).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No customers found for this audience.</p>
                    <p className="text-sm">Upload customer data to see available customers.</p>
                  </div>
                ) : (
                  getCustomersByAudience(campaign.audience).map((customer) => (
                  <div
                    key={customer.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedCustomers.includes(customer.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleCustomerSelect(customer.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{customer.company_name}</h3>
                        <p className="text-sm text-gray-600">{customer.industry} • {customer.segment}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          customer.churn_risk === 'High' ? 'bg-red-100 text-red-800' :
                          customer.churn_risk === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {customer.churn_risk} Risk
                        </span>
                        {selectedCustomers.includes(customer.id) && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* Preview & Actions */}
          <div className="space-y-6">
            {/* Preview */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-lg shadow-sm border p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Search className="w-5 h-5 mr-2 text-orange-600" />
                Preview
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    {campaign.subject}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content Preview
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm max-h-40 overflow-y-auto">
                    {selectedTemplate?.content.split('\n').map((line, index) => (
                      <div key={index} className="mb-1">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span>Recipients: {selectedCustomers.length}</span>
                  <span>Template: {selectedTemplate?.name}</span>
                </div>
              </div>
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white rounded-lg shadow-sm border p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Send className="w-5 h-5 mr-2 text-green-600" />
                Actions
              </h2>
              
              <div className="space-y-3">
                <button
                  onClick={handleSendCampaign}
                  disabled={selectedCustomers.length === 0 || !campaign.name}
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Campaign
                </button>
                
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Full Preview
                </button>
                
                <button 
                  onClick={handleExportList}
                  className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export List
                </button>
                
                <button 
                  onClick={handleSchedule}
                  className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule
                </button>
              </div>
            </motion.div>

            {/* Campaign Status */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-lg shadow-sm border p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-purple-600" />
                Campaign Status
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    campaign.status === 'sent' ? 'bg-green-100 text-green-800' :
                    campaign.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Recipients</span>
                  <span className="text-sm font-medium">{selectedCustomers.length}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Template</span>
                  <span className="text-sm font-medium">{selectedTemplate?.name}</span>
                </div>
              </div>
            </motion.div>
          </div>
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
              <AlertCircle className="h-5 w-5 mr-2" />
            ) : (
              <CheckCircle className="h-5 w-5 mr-2" />
            )}
            {notification.message}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CampaignBuilder;
