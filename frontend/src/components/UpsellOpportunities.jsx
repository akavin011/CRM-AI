import React from 'react';
import { Target, TrendingUp, DollarSign, Star } from 'lucide-react';

const UpsellOpportunities = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <Target className="h-5 w-5 mr-2 text-green-600" />
            Upsell Opportunities
          </h3>
        </div>
        <div className="card-content">
          <div className="flex items-center justify-center h-48">
            <div className="text-gray-500">No upsell opportunities available</div>
          </div>
        </div>
      </div>
    );
  }

  // Get top 5 upsell opportunities
  const topOpportunities = data.slice(0, 5);

  const getUpsellScoreColor = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  const getUpsellScoreLabel = (score) => {
    if (score >= 80) return 'High';
    if (score >= 60) return 'Medium';
    return 'Low';
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title flex items-center">
          <Target className="h-5 w-5 mr-2 text-green-600" />
          Upsell Opportunities
        </h3>
        <p className="card-description">Customers ready for expansion</p>
      </div>
      <div className="card-content">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {data.length}
            </div>
            <div className="text-sm text-green-600">Opportunities</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              ${data.reduce((sum, c) => sum + (c.estimated_value || 0), 0).toLocaleString()}
            </div>
            <div className="text-sm text-blue-600">Potential Value</div>
          </div>
        </div>

        {/* Top Opportunities List */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Top Opportunities</h4>
          {topOpportunities.length > 0 ? (
            topOpportunities.map((customer, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-blue-500 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {(customer.company_name || 'U').charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {customer.company_name || 'Unknown Company'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {customer.industry || 'Unknown'} • Current: ${(customer.total_spent || 0).toLocaleString()}
                    </div>
                    {(customer.recommended_products || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(customer.recommended_products || []).slice(0, 2).map((product, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {product || 'Product'}
                          </span>
                        ))}
                        {(customer.recommended_products || []).length > 2 && (
                          <span className="text-xs text-gray-500">
                            +{(customer.recommended_products || []).length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-green-600">
                      ${(customer.estimated_value || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">potential value</div>
                  </div>
                  <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getUpsellScoreColor(customer.upsell_score || 0)}`}>
                    <Star className="h-3 w-3 mr-1" />
                    {getUpsellScoreLabel(customer.upsell_score || 0)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Target className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No upsell opportunities found</p>
            </div>
          )}
        </div>

        {/* Recommended Actions */}
        {topOpportunities.length > 0 && (
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <h4 className="text-sm font-semibold text-green-900 mb-2">Recommended Actions</h4>
            <ul className="space-y-1 text-sm text-green-800">
              <li>• Schedule product demos for high-potential customers</li>
              <li>• Create personalized upsell proposals</li>
              <li>• Offer limited-time upgrade incentives</li>
              <li>• Assign specialized sales representatives</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpsellOpportunities;

