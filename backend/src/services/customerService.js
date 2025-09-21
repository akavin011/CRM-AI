import Customer from '../models/Customer.js';
import ProcessedData from '../models/ProcessedData.js';
import { Op } from 'sequelize';
import { chromaDBService } from './chromadbService.js';
import { dataStorageService } from './dataStorageService.js';

export class CustomerService {
  // Get all customers from ChromaDB
  static async getAllCustomersWithInsights(userId, options = {}) {
    try {
      const limit = options.limit || 50;
      const offset = options.offset || 0;

      // Get customers from data storage
      const result = await dataStorageService.getCustomerData(userId, limit, offset);

      return {
        customers: result.data,
        total: result.total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      console.error('Error fetching customers from ChromaDB:', error);
      throw new Error('Failed to fetch customers from ChromaDB');
    }
  }

  // Get customer segments from data storage
  static async getCustomerSegments(userId) {
    try {
      // Get segments from data storage
      const segments = await dataStorageService.getCustomerSegments(userId);
      
      return segments.map(segment => ({
        name: segment.name,
        count: segment.count,
        avgRevenue: segment.avgEngagement * 1000, // Convert engagement to revenue estimate
        totalRevenue: segment.revenue,
        color: this.getSegmentColor(segment.name)
      }));
    } catch (error) {
      console.error('Error fetching segments from data storage:', error);
      throw new Error('Failed to fetch customer segments from data storage');
    }
  }

  // Get churn predictions from data storage
  static async getChurnPredictions(userId) {
    try {
      // Get at-risk customers from data storage
      const atRiskCustomers = await dataStorageService.getAtRiskCustomers(userId);
      
      return atRiskCustomers.map(customer => ({
        id: customer.id,
        name: customer.company_name,
        company_name: customer.company_name,
        churn_probability: customer.churn_probability,
        risk_level: customer.churn_probability > 0.7 ? 'Critical' : (customer.churn_probability > 0.5 ? 'High' : 'Medium'),
        last_interaction: customer.last_interaction_date,
        industry: customer.industry,
        location: customer.location,
        engagement_score: customer.engagement_score
      }));
    } catch (error) {
      console.error('Error fetching churn predictions from data storage:', error);
      throw new Error('Failed to fetch churn predictions from data storage');
    }
  }

  // Get upsell opportunities from data storage
  static async getUpsellOpportunities(userId) {
    try {
      // Get upsell opportunities from data storage
      const upsellOpportunities = await dataStorageService.getUpsellOpportunities(userId);
      
      return upsellOpportunities.map(customer => ({
        id: customer.id,
        name: customer.company_name,
        company_name: customer.company_name,
        industry: customer.industry,
        total_spent: customer.total_spent,
        upsell_score: customer.upsell_score || customer.engagement_score,
        estimated_value: customer.total_spent * 0.2,
        recommended_products: customer.recommended_products || ['Premium Support', 'Advanced Analytics']
      }));
    } catch (error) {
      console.error('Error fetching upsell opportunities from data storage:', error);
      throw new Error('Failed to fetch upsell opportunities from data storage');
    }
  }

  // Get customer analytics from data storage
  static async getCustomerAnalytics(userId) {
    try {
      // Get analytics data from data storage
      const analyticsData = await dataStorageService.getAnalyticsData(userId);
      
      const totalCustomers = analyticsData.total_customers;
      const activeCustomers = analyticsData.active_customers;
      const totalRevenue = analyticsData.total_revenue;
      const avgRevenue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
      
      // Get high value customers
      const highValueCustomers = await dataStorageService.getHighValueCustomers(userId);
      const highValueCount = highValueCustomers.length;
      
      // Get at-risk customers
      const atRiskCustomers = await dataStorageService.getAtRiskCustomers(userId);
      const atRiskCount = atRiskCustomers.length;
      
      return {
        total_customers: totalCustomers,
        active_customers: activeCustomers,
        high_value_customers: highValueCount,
        at_risk_customers: atRiskCount,
        total_revenue: totalRevenue,
        average_revenue: avgRevenue
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw new Error('Failed to fetch customer analytics from data storage');
    }
  }

  // Get high value customers
  static async getHighValueCustomers(userId) {
    try {
      const customers = await ProcessedData.findAll({
        where: {
          user_id: userId,
          total_spent: {
            [Op.gte]: 10000
          },
          engagement_score: {
            [Op.gte]: 70
          }
        },
        order: [['total_spent', 'DESC']],
        limit: 10,
        attributes: ['company_name', 'total_spent', 'engagement_score', 'industry', 'segment']
      });

      return customers.map(customer => ({
        id: customer.customer_id,
        name: customer.company_name,
        company_name: customer.company_name,
        total_spent: customer.total_spent,
        engagement_score: customer.engagement_score,
        industry: customer.industry,
        segment: customer.segment
      }));
    } catch (error) {
      console.error('Error fetching high-value customers:', error);
      throw new Error('Failed to fetch high-value customers from database');
    }
  }

  // Get at-risk customers
  static async getAtRiskCustomers(userId) {
    try {
      const customers = await ProcessedData.findAll({
        where: {
          user_id: userId,
          churn_probability: {
            [Op.gte]: 0.5
          }
        },
        order: [['churn_probability', 'DESC']],
        limit: 10,
        attributes: ['company_name', 'churn_probability', 'engagement_score', 'industry', 'total_spent']
      });

      return customers.map(customer => ({
        id: customer.customer_id,
        name: customer.company_name,
        company_name: customer.company_name,
        churn_probability: customer.churn_probability,
        engagement_score: customer.engagement_score,
        industry: customer.industry,
        total_spent: customer.total_spent
      }));
    } catch (error) {
      console.error('Error fetching at-risk customers:', error);
      throw new Error('Failed to fetch at-risk customers from database');
    }
  }

  // Helper methods
  static getSegmentColor(segment) {
    const colors = {
      'High Value': '#10B981',
      'Medium Value': '#F59E0B',
      'Low Value': '#EF4444',
      'At Risk': '#8B5CF6',
      'Standard': '#6B7280'
    };
    return colors[segment] || '#6B7280';
  }

  static calculateUpsellPotential(customer) {
    const baseScore = customer.engagement_score / 100;
    const revenueFactor = Math.min(customer.total_spent / 50000, 1);
    return Math.round((baseScore + revenueFactor) * 50);
  }

}
