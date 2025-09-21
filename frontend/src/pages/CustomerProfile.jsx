import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  TrendingUp, 
  AlertTriangle,
  Target,
  Calendar,
  MessageSquare,
  Download,
  Edit,
  Star
} from 'lucide-react';
import { api } from '../utils/api.js';

const CustomerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      // Fetch customer data from API
      const response = await api.getProcessedData({ limit: 1000 });
      
      if (response?.data?.rows) {
        const foundCustomer = response.data.rows.find(c => c.customer_id === id || c.id === id);
        if (foundCustomer) {
          setCustomer({
            id: foundCustomer.customer_id || foundCustomer.id,
            company_name: foundCustomer.company_name || 'Unknown Company',
            industry: foundCustomer.industry || 'Unknown',
            email: 'contact@company.com', // Default since we don't have email in processed data
            phone: '+1-555-0000', // Default since we don't have phone in processed data
            location: foundCustomer.location || 'Unknown',
            total_spent: foundCustomer.total_spent || 0,
            order_count: 1, // Default since we don't have order count
            last_interaction_date: foundCustomer.last_interaction_date || new Date().toISOString(),
            engagement_score: foundCustomer.engagement_score || 0,
            churn_probability: foundCustomer.churn_probability || 0,
            segment: foundCustomer.segment || 'Unknown',
            status: foundCustomer.status || 'Active',
            interactions: [], // Empty since we don't have interaction data
            recommended_actions: [] // Empty since we don't have recommended actions
          });
        } else {
          setCustomer(null);
        }
      } else {
        setCustomer(null);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching customer:', error);
      setCustomer(null);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Customer Not Found</h2>
          <button
            onClick={() => navigate('/customers')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Customers
          </button>
        </div>
      </div>
    );
  }

  const getChurnRiskColor = (probability) => {
    if (probability < 0.3) return 'text-green-600 bg-green-100';
    if (probability < 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getEngagementColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate('/customers')}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Customers
            </button>
            <div className="flex space-x-3">
              <button className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          <div className="flex items-start space-x-6">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {customer.company_name.charAt(0)}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {customer.company_name}
              </h1>
              <div className="flex items-center space-x-4 text-gray-600 mb-4">
                <div className="flex items-center">
                  <Building className="h-4 w-4 mr-1" />
                  {customer.industry}
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {customer.location}
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getEngagementColor(customer.engagement_score)}`}>
                  {customer.engagement_score}/100 Engagement
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  {customer.email}
                </div>
                <div className="flex items-center text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {customer.phone}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-xl mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: TrendingUp },
                { id: 'timeline', label: 'Timeline', icon: Calendar },
                { id: 'insights', label: 'AI Insights', icon: Target },
                { id: 'actions', label: 'Actions', icon: MessageSquare }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">Total Spent</h3>
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                      ${customer.total_spent.toLocaleString()}
                    </div>
                    <div className="text-sm text-green-700">
                      {customer.order_count} orders
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">Churn Risk</h3>
                      <AlertTriangle className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className={`text-3xl font-bold ${getChurnRiskColor(customer.churn_probability).split(' ')[0]}`}>
                      {(customer.churn_probability * 100).toFixed(0)}%
                    </div>
                    <div className="text-sm text-blue-700">
                      {customer.churn_probability < 0.3 ? 'Low Risk' : 
                       customer.churn_probability < 0.6 ? 'Medium Risk' : 'High Risk'}
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">Segment</h3>
                      <Star className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="text-3xl font-bold text-purple-600">
                      {customer.segment}
                    </div>
                    <div className="text-sm text-purple-700">
                      Customer tier
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-600">Last Interaction</div>
                      <div className="font-semibold text-gray-900">{customer.last_interaction_date}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Status</div>
                      <div className="font-semibold text-gray-900">{customer.status}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Engagement</div>
                      <div className="font-semibold text-gray-900">{customer.engagement_score}/100</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Orders</div>
                      <div className="font-semibold text-gray-900">{customer.order_count}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {customer.interactions.map((interaction, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-3 h-3 bg-blue-600 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-900">{interaction.type}</h4>
                        <span className="text-sm text-gray-500">{interaction.date}</span>
                      </div>
                      <p className="text-gray-600 mb-2">{interaction.description}</p>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        interaction.outcome === 'Positive' ? 'bg-green-100 text-green-800' :
                        interaction.outcome === 'Negative' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {interaction.outcome}
                      </span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* AI Insights Tab */}
            {activeTab === 'insights' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-blue-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Analysis</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Churn Prediction</h4>
                      <p className="text-gray-600">
                        Based on engagement patterns and purchase history, this customer has a {customer.churn_probability * 100}% 
                        probability of churning in the next 90 days.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Key Factors</h4>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        <li>High engagement score ({customer.engagement_score}/100)</li>
                        <li>Regular purchase pattern ({customer.order_count} orders)</li>
                        <li>Recent interaction ({customer.last_interaction_date})</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Actions Tab */}
            {activeTab === 'actions' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-green-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommended Actions</h3>
                  <div className="space-y-3">
                    {customer.recommended_actions.map((action, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-white rounded-lg">
                        <Target className="h-5 w-5 text-green-600" />
                        <span className="text-gray-900">{action}</span>
                        <button className="ml-auto px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors">
                          Schedule
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
