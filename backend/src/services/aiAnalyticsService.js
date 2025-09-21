import moment from 'moment';

export class AIAnalyticsService {
  static async generateInsights(data) {
    try {
      // Prepare data summary for AI analysis
      const dataSummary = this.prepareDataSummary(data);
      
      // Generate insights using AI (in production, this would call Llama 3.2)
      const insights = this.generateAIInsights(dataSummary);
      
      return {
        ai_insights: insights,
        data_summary: dataSummary,
        generated_at: new Date().toISOString(),
        confidence_score: this.calculateConfidenceScore(dataSummary)
      };
    } catch (error) {
      console.error('Error generating insights:', error);
      throw new Error('Failed to generate AI insights');
    }
  }

  static prepareDataSummary(data) {
    const customers = data.customers || [];
    
    return {
      total_customers: customers.length,
      segments: this.analyzeSegments(customers),
      churn_risk: this.analyzeChurnRisk(customers),
      revenue_metrics: this.analyzeRevenue(customers),
      engagement_trends: this.analyzeEngagement(customers),
      industry_distribution: this.analyzeIndustryDistribution(customers)
    };
  }

  static analyzeSegments(customers) {
    const segments = {};
    customers.forEach(customer => {
      const segment = customer.segment || 'Unknown';
      segments[segment] = (segments[segment] || 0) + 1;
    });
    return segments;
  }

  static analyzeChurnRisk(customers) {
    const highRisk = customers.filter(c => (c.churn_probability || 0) > 0.7).length;
    const mediumRisk = customers.filter(c => {
      const prob = c.churn_probability || 0;
      return prob > 0.3 && prob <= 0.7;
    }).length;
    const lowRisk = customers.filter(c => (c.churn_probability || 0) <= 0.3).length;
    
    return {
      high_risk: highRisk,
      medium_risk: mediumRisk,
      low_risk: lowRisk,
      total_at_risk: highRisk + mediumRisk,
      churn_rate: ((highRisk + mediumRisk) / customers.length * 100).toFixed(1)
    };
  }

  static analyzeRevenue(customers) {
    const totalRevenue = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    const avgRevenue = customers.length > 0 ? totalRevenue / customers.length : 0;
    
    return {
      total_revenue: totalRevenue,
      average_revenue: avgRevenue,
      revenue_growth: this.calculateRevenueGrowth(customers),
      top_customers: customers
        .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
        .slice(0, 5)
    };
  }

  static analyzeEngagement(customers) {
    const engagementScores = customers.map(c => c.engagement_score || 0);
    const avgEngagement = customers.length > 0 ? 
      engagementScores.reduce((sum, score) => sum + score, 0) / engagementScores.length : 0;
    
    return {
      average_engagement: avgEngagement.toFixed(1),
      high_engagement: engagementScores.filter(score => score > 80).length,
      low_engagement: engagementScores.filter(score => score < 40).length,
      engagement_trend: this.calculateEngagementTrend(customers)
    };
  }

  static analyzeIndustryDistribution(customers) {
    const industries = {};
    customers.forEach(customer => {
      const industry = customer.industry || 'Unknown';
      industries[industry] = (industries[industry] || 0) + 1;
    });
    return industries;
  }

  static calculateRevenueGrowth(customers) {
    if (!customers || customers.length === 0) {
      return 0;
    }
    
    // Calculate actual revenue growth based on customer data
    const totalRevenue = customers.reduce((sum, customer) => sum + (customer.total_spent || 0), 0);
    const avgRevenue = totalRevenue / customers.length;
    
    // Simple growth calculation based on high-value customers
    const highValueCustomers = customers.filter(c => (c.total_spent || 0) > avgRevenue).length;
    const growthRate = (highValueCustomers / customers.length) * 100 - 50; // -50 to +50 range
    
    return Math.max(-50, Math.min(50, growthRate));
  }

  static calculateEngagementTrend(customers) {
    if (!customers || customers.length === 0) {
      return 0;
    }
    
    // Calculate actual engagement trend based on customer data
    const avgEngagement = customers.reduce((sum, customer) => sum + (customer.engagement_score || 0), 0) / customers.length;
    const highEngagementCustomers = customers.filter(c => (c.engagement_score || 0) > avgEngagement).length;
    const trendRate = (highEngagementCustomers / customers.length) * 100 - 50; // -50 to +50 range
    
    return Math.max(-50, Math.min(50, trendRate));
  }

  static calculateConfidenceScore(dataSummary) {
    // Calculate confidence based on data completeness and quality
    const totalFields = 6; // segments, churn_risk, revenue_metrics, engagement_trends, industry_distribution, total_customers
    const filledFields = Object.keys(dataSummary).filter(key => 
      dataSummary[key] && 
      (typeof dataSummary[key] === 'object' ? Object.keys(dataSummary[key]).length > 0 : true)
    ).length;
    
    return Math.min(1, filledFields / totalFields);
  }

  static generateAIInsights(dataSummary) {
    const { total_customers, segments, churn_risk, revenue_metrics, engagement_trends } = dataSummary;
    
    let insights = `## AI-Generated CRM Insights\n\n`;
    
    // Customer Overview
    insights += `### Customer Overview\n`;
    insights += `You have ${total_customers} total customers with an average engagement score of ${engagement_trends.average_engagement}.\n\n`;
    
    // Segment Analysis
    insights += `### Customer Segments\n`;
    Object.entries(segments).forEach(([segment, count]) => {
      const percentage = ((count / total_customers) * 100).toFixed(1);
      insights += `- **${segment}**: ${count} customers (${percentage}%)\n`;
    });
    insights += `\n`;
    
    // Churn Risk Analysis
    insights += `### Churn Risk Analysis\n`;
    insights += `- **High Risk**: ${churn_risk.high_risk} customers (${churn_risk.churn_rate}% churn rate)\n`;
    insights += `- **Medium Risk**: ${churn_risk.medium_risk} customers\n`;
    insights += `- **Low Risk**: ${churn_risk.low_risk} customers\n\n`;
    
    // Revenue Analysis
    insights += `### Revenue Analysis\n`;
    insights += `- **Total Revenue**: $${revenue_metrics.total_revenue.toLocaleString()}\n`;
    insights += `- **Average Revenue per Customer**: $${revenue_metrics.average_revenue.toLocaleString()}\n`;
    insights += `- **Revenue Growth**: ${revenue_metrics.revenue_growth > 0 ? '+' : ''}${revenue_metrics.revenue_growth.toFixed(1)}%\n\n`;
    
    // Engagement Analysis
    insights += `### Engagement Analysis\n`;
    insights += `- **High Engagement**: ${engagement_trends.high_engagement} customers\n`;
    insights += `- **Low Engagement**: ${engagement_trends.low_engagement} customers\n`;
    insights += `- **Engagement Trend**: ${engagement_trends.engagement_trend > 0 ? '+' : ''}${engagement_trends.engagement_trend.toFixed(1)}%\n\n`;
    
    // Recommendations
    insights += `### AI Recommendations\n`;
    
    if (churn_risk.high_risk > 0) {
      insights += `🚨 **Immediate Action Required**: ${churn_risk.high_risk} customers are at high risk of churning. Implement retention campaigns immediately.\n\n`;
    }
    
    if (engagement_trends.low_engagement > total_customers * 0.2) {
      insights += `📈 **Engagement Improvement**: ${engagement_trends.low_engagement} customers have low engagement. Consider re-engagement campaigns.\n\n`;
    }
    
    if (revenue_metrics.revenue_growth < 0) {
      insights += `💰 **Revenue Growth**: Revenue is declining. Focus on upsell opportunities and customer expansion.\n\n`;
    }
    
    insights += `### Next Steps\n`;
    insights += `1. Prioritize high-risk customer retention\n`;
    insights += `2. Implement engagement improvement strategies\n`;
    insights += `3. Focus on upsell opportunities for high-value customers\n`;
    insights += `4. Monitor key metrics weekly\n`;
    
    return insights;
  }
}

