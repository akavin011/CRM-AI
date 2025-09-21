import React from 'react';
import { AlertTriangle, TrendingDown, Users, Clock } from 'lucide-react';

const ChurnPredictions = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="card-title flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
            Churn Predictions
          </h3>
        </div>
        <div className="card-content">
          <div className="flex items-center justify-center h-48">
            <div className="text-gray-500">No churn data available</div>
          </div>
        </div>
      </div>
    );
  }

  // Get top 5 at-risk customers
  const topAtRisk = data
    .filter(customer => (customer.churn_probability || 0) > 0.7)
    .slice(0, 5);

  const riskLevels = {
    Critical: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
    High: { color: 'bg-orange-100 text-orange-800', icon: TrendingDown },
    Medium: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    Low: { color: 'bg-green-100 text-green-800', icon: Users }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
          Churn Predictions
        </h3>
        <p className="card-description">Customers at risk of churning</p>
      </div>
      <div className="card-content">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {data.filter(c => c.churn_probability > 0.7).length}
            </div>
            <div className="text-sm text-red-600">High Risk</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {data.filter(c => c.churn_probability > 0.3 && c.churn_probability <= 0.7).length}
            </div>
            <div className="text-sm text-yellow-600">Medium Risk</div>
          </div>
        </div>

        {/* At-Risk Customers List */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Top At-Risk Customers</h4>
          {topAtRisk.length > 0 ? (
            topAtRisk.map((customer, index) => {
              const riskLevel = customer.risk_level || 'High';
              const RiskIcon = riskLevels[riskLevel]?.icon || AlertTriangle;
              
              return (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-orange-500 flex items-center justify-center">
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
                        {customer.industry || 'Unknown'} • {customer.location || 'Unknown'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-red-600">
                        {((customer.churn_probability || 0) * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-500">churn risk</div>
                    </div>
                    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${riskLevels[riskLevel]?.color || 'bg-gray-100 text-gray-800'}`}>
                      <RiskIcon className="h-3 w-3 mr-1" />
                      {riskLevel}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No high-risk customers found</p>
            </div>
          )}
        </div>

        {/* Recommended Actions */}
        {topAtRisk.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Recommended Actions</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Schedule immediate follow-up calls with high-risk customers</li>
              <li>• Offer retention discounts and special incentives</li>
              <li>• Assign dedicated account managers to critical accounts</li>
              <li>• Implement proactive customer success outreach</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChurnPredictions;

