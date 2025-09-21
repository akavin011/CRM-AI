// API utility functions for authenticated requests
const API_BASE_URL = 'http://localhost:5000/api';

// Get auth token from localStorage
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Create authenticated fetch function
export const authenticatedFetch = async (url, options = {}) => {
  const token = getAuthToken();
  
  console.log(`API Call: ${url}`);
  console.log(`Token: ${token ? 'Present' : 'Missing'}`);
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${url}`, config);
  
  console.log(`Response status: ${response.status}`);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`API Error: ${response.status} - ${errorText}`);
    if (response.status === 401) {
      // Token expired or invalid, redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Authentication required');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  console.log(`API Response:`, data);
  return data;
};

// API endpoints
export const api = {
  // Customer endpoints
  getCustomers: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return authenticatedFetch(`/customers${queryString ? `?${queryString}` : ''}`);
  },
  
  getCustomerSegments: () => authenticatedFetch('/customers/analytics/segments'),
  getChurnPredictions: () => authenticatedFetch('/customers/analytics/churn'),
  getUpsellOpportunities: () => authenticatedFetch('/customers/analytics/upsell'),
  getHighValueCustomers: () => authenticatedFetch('/customers/analytics/high-value'),
  getAtRiskCustomers: () => authenticatedFetch('/customers/analytics/at-risk'),
  
  // Insights endpoints
  getInsightsMetrics: () => authenticatedFetch('/insights/metrics'),
  
  // File upload endpoints
  uploadFile: (formData) => {
    const token = getAuthToken();
    return fetch(`${API_BASE_URL}/upload/upload`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    }).then(res => {
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          throw new Error('Authentication required');
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    });
  },
  
  processFile: (fileId) => authenticatedFetch(`/upload/${fileId}/process`, { method: 'POST' }),
  getUserFiles: () => authenticatedFetch('/upload/files'),
  getProcessedData: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return authenticatedFetch(`/upload/data${queryString ? `?${queryString}` : ''}`);
  },
  
  // Chatbot endpoints
  getChatbotHealth: () => authenticatedFetch('/chatbot/health'),
  sendChatMessage: (message) => authenticatedFetch('/chatbot/chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),
};
