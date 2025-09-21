import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Target,
  Users,
  Building,
  Activity,
  MessageSquare,
  FileText,
  Download,
  Edit,
  MoreVertical,
  Star,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { api } from '../utils/api.js';
import { ExportService } from '../utils/exportService.js';
import toast from 'react-hot-toast';

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch customer data
  const { data: customerData, isLoading } = useQuery(
    ['customer', id],
    () => api.getProcessedData({ limit: 1000 }),
    { refetchInterval: 300000 }
  );

  // Find specific customer
  const customer = customerData?.data?.rows?.find(c => c.customer_id === id || c.id === id);

  // Mock interaction history (in real app, this would come from API)
  const interactionHistory = [
    {
      id: 1,
      type: 'call',
      title: 'Product Demo Call',
      description: 'Discussed new features and pricing options',
      date: '2024-01-15',
      time: '10:30 AM',
      duration: '45 minutes',
      outcome: 'positive',
      notes: 'Customer showed strong interest in premium plan'
    },
    {
      id: 2,
      type: 'email',
      title: 'Follow-up Email',
      description: 'Sent proposal and contract details',
      date: '2024-01-16',
      time: '2:15 PM',
      outcome: 'neutral',
      notes: 'Awaiting response on pricing proposal'
    },
    {
      id: 3,
      type: 'meeting',
      title: 'Contract Negotiation',
      description: 'Finalized terms and signed agreement',
      date: '2024-01-18',
      time: '3:00 PM',
      duration: '1 hour',
      outcome: 'positive',
      notes: 'Successfully closed deal for $150,000 annual contract'
    },
    {
      id: 4,
      type: 'support',
      title: 'Technical Support',
      description: 'Resolved integration issues',
      date: '2024-01-20',
      time: '11:00 AM',
      duration: '30 minutes',
      outcome: 'positive',
      notes: 'Issue resolved, customer satisfied'
    }
  ];

  const getInteractionIcon = (type) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'meeting': return <Users className="h-4 w-4" />;
      case 'support': return <MessageSquare className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getOutcomeColor = (outcome) => {
    switch (outcome) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getOutcomeIcon = (outcome) => {
    switch (outcome) {
      case 'positive': return <CheckCircle className="h-4 w-4" />;
      case 'negative': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading customer details...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Not Found</h3>
          <p className="text-gray-500 mb-4">The customer you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/customers')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Target },
    { id: 'interactions', name: 'Interactions', icon: MessageSquare },
    { id: 'analytics', name: 'Analytics', icon: TrendingUp },
    { id: 'documents', name: 'Documents', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/customers')}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{customer.company_name}</h1>
                  <p className="text-sm text-gray-500">{customer.industry} • {customer.location}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    ExportService.exportCustomerData([customer], 'csv');
                    toast.success('Customer data exported successfully!');
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </button>
                <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center mb-6">
                <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Building className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{customer.company_name}</h3>
                <p className="text-sm text-gray-500">{customer.industry}</p>
              </div>

              {/* Key Metrics */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total Spent</span>
                  <span className="text-sm font-semibold text-gray-900">
                    ${customer.total_spent?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Engagement</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {customer.engagement_score || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    customer.status === 'Active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {customer.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Churn Risk</span>
                  <span className={`text-sm font-semibold ${
                    (customer.churn_probability || 0) > 0.7 ? 'text-red-600' :
                    (customer.churn_probability || 0) > 0.4 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {((customer.churn_probability || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Contact Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Mail className="h-4 w-4 mr-2" />
                    {customer.email || 'N/A'}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Phone className="h-4 w-4 mr-2" />
                    {customer.phone || 'N/A'}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPin className="h-4 w-4 mr-2" />
                    {customer.location || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <tab.icon className="h-4 w-4" />
                      <span>{tab.name}</span>
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Customer Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Customer ID</span>
                            <span className="text-sm font-medium">{customer.customer_id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Segment</span>
                            <span className="text-sm font-medium">{customer.segment || 'Standard'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Last Interaction</span>
                            <span className="text-sm font-medium">
                              {customer.last_interaction_date ? 
                                new Date(customer.last_interaction_date).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Business Metrics</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Purchase Count</span>
                            <span className="text-sm font-medium">{customer.purchase_count || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Support Tickets</span>
                            <span className="text-sm font-medium">{customer.support_tickets || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-500">Upsell Score</span>
                            <span className="text-sm font-medium">
                              {((customer.upsell_score || 0) * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Notes</h4>
                      <p className="text-sm text-gray-600">
                        {customer.notes || 'No additional notes available for this customer.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Interactions Tab */}
                {activeTab === 'interactions' && (
                  <div className="space-y-4">
                    {interactionHistory.map((interaction) => (
                      <div key={interaction.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                {getInteractionIcon(interaction.type)}
                              </div>
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-medium text-gray-900">{interaction.title}</h4>
                              <p className="text-sm text-gray-500 mt-1">{interaction.description}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <span className="text-xs text-gray-400">
                                  {interaction.date} at {interaction.time}
                                </span>
                                {interaction.duration && (
                                  <span className="text-xs text-gray-400">
                                    Duration: {interaction.duration}
                                  </span>
                                )}
                              </div>
                              {interaction.notes && (
                                <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                                  {interaction.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getOutcomeColor(interaction.outcome)}`}>
                            {getOutcomeIcon(interaction.outcome)}
                            <span className="capitalize">{interaction.outcome}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <DollarSign className="h-8 w-8 text-blue-600" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-blue-900">Total Revenue</p>
                            <p className="text-2xl font-bold text-blue-600">
                              ${customer.total_spent?.toLocaleString() || 0}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-green-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <Target className="h-8 w-8 text-green-600" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-green-900">Engagement Score</p>
                            <p className="text-2xl font-bold text-green-600">
                              {customer.engagement_score || 0}%
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-red-50 rounded-lg p-4">
                        <div className="flex items-center">
                          <AlertTriangle className="h-8 w-8 text-red-600" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-red-900">Churn Risk</p>
                            <p className="text-2xl font-bold text-red-600">
                              {((customer.churn_probability || 0) * 100).toFixed(0)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Risk Assessment</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Engagement Level</span>
                          <span className={`font-medium ${
                            (customer.engagement_score || 0) > 80 ? 'text-green-600' :
                            (customer.engagement_score || 0) > 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {(customer.engagement_score || 0) > 80 ? 'High' :
                             (customer.engagement_score || 0) > 60 ? 'Medium' : 'Low'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Support Tickets</span>
                          <span className={`font-medium ${
                            (customer.support_tickets || 0) > 5 ? 'text-red-600' :
                            (customer.support_tickets || 0) > 2 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {(customer.support_tickets || 0) > 5 ? 'High' :
                             (customer.support_tickets || 0) > 2 ? 'Medium' : 'Low'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Upsell Potential</span>
                          <span className={`font-medium ${
                            (customer.upsell_score || 0) > 0.7 ? 'text-green-600' :
                            (customer.upsell_score || 0) > 0.4 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {(customer.upsell_score || 0) > 0.7 ? 'High' :
                             (customer.upsell_score || 0) > 0.4 ? 'Medium' : 'Low'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents Tab */}
                {activeTab === 'documents' && (
                  <div className="text-center py-12">
                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents</h3>
                    <p className="text-gray-500">No documents have been uploaded for this customer yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
