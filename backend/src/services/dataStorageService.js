import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

class DataStorageService {
  constructor() {
    this.dataFile = path.join(process.cwd(), 'data', 'customer_data.json');
    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(this.dataFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  // Store customer data
  async storeCustomerData(userId, fileId, customerData) {
    try {
      let allData = {};
      
      // Load existing data
      if (fs.existsSync(this.dataFile)) {
        const fileContent = fs.readFileSync(this.dataFile, 'utf8');
        allData = JSON.parse(fileContent);
      }

      // Store new data
      if (!allData[userId]) {
        allData[userId] = [];
      }

      // Add file ID to each record
      const dataWithFileId = customerData.map(record => ({
        ...record,
        id: uuidv4(),
        user_id: userId,
        file_id: fileId,
        created_at: new Date().toISOString()
      }));

      allData[userId].push(...dataWithFileId);

      // Save to file
      fs.writeFileSync(this.dataFile, JSON.stringify(allData, null, 2));

      console.log(`Successfully stored ${customerData.length} customer records`);
      return { success: true, count: customerData.length };
    } catch (error) {
      console.error('Error storing customer data:', error);
      throw error;
    }
  }

  // Get customer data for a user
  async getCustomerData(userId, limit = 100, offset = 0) {
    try {
      if (!fs.existsSync(this.dataFile)) {
        return { data: [], total: 0 };
      }

      const fileContent = fs.readFileSync(this.dataFile, 'utf8');
      const allData = JSON.parse(fileContent);
      const userData = allData[userId] || [];

      const paginatedData = userData.slice(offset, offset + limit);

      return {
        data: paginatedData,
        total: userData.length
      };
    } catch (error) {
      console.error('Error getting customer data:', error);
      return { data: [], total: 0 };
    }
  }

  // Get analytics data
  async getAnalyticsData(userId) {
    try {
      const { data } = await this.getCustomerData(userId, 1000, 0);
      
      if (data.length === 0) {
        return {
          total_customers: 0,
          total_revenue: 0,
          average_engagement: 0,
          churn_rate: 0
        };
      }

      const totalCustomers = data.length;
      const totalRevenue = data.reduce((sum, customer) => sum + (customer.total_spent || 0), 0);
      const averageEngagement = data.reduce((sum, customer) => sum + (customer.engagement_score || 0), 0) / totalCustomers;
      const churnRate = data.filter(customer => (customer.churn_probability || 0) > 0.5).length / totalCustomers * 100;

      return {
        total_customers: totalCustomers,
        total_revenue: totalRevenue,
        average_engagement: Math.round(averageEngagement),
        churn_rate: Math.round(churnRate)
      };
    } catch (error) {
      console.error('Error getting analytics data:', error);
      return {
        total_customers: 0,
        total_revenue: 0,
        average_engagement: 0,
        churn_rate: 0
      };
    }
  }

  // Get customer segments
  async getCustomerSegments(userId) {
    try {
      const { data } = await this.getCustomerData(userId, 1000, 0);
      
      const segments = {};
      data.forEach(customer => {
        const segment = customer.segment || 'Unknown';
        if (!segments[segment]) {
          segments[segment] = {
            name: segment,
            count: 0,
            revenue: 0,
            avgEngagement: 0
          };
        }
        segments[segment].count += 1;
        segments[segment].revenue += customer.total_spent || 0;
        segments[segment].avgEngagement += customer.engagement_score || 0;
      });

      // Calculate averages
      Object.values(segments).forEach(segment => {
        segment.avgEngagement = Math.round(segment.avgEngagement / segment.count);
      });

      return Object.values(segments);
    } catch (error) {
      console.error('Error getting customer segments:', error);
      return [];
    }
  }

  // Get at-risk customers
  async getAtRiskCustomers(userId, limit = 10) {
    try {
      const { data } = await this.getCustomerData(userId, 1000, 0);
      
      return data
        .filter(customer => (customer.churn_probability || 0) > 0.05) // Lower threshold to show some results
        .sort((a, b) => (b.churn_probability || 0) - (a.churn_probability || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting at-risk customers:', error);
      return [];
    }
  }

  // Get high-value customers
  async getHighValueCustomers(userId, limit = 10) {
    try {
      const { data } = await this.getCustomerData(userId, 1000, 0);
      
      return data
        .filter(customer => (customer.total_spent || 0) > 100000)
        .sort((a, b) => (b.total_spent || 0) - (a.total_spent || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting high-value customers:', error);
      return [];
    }
  }

  // Get upsell opportunities
  async getUpsellOpportunities(userId, limit = 10) {
    try {
      const { data } = await this.getCustomerData(userId, 1000, 0);
      
      return data
        .filter(customer => (customer.upsell_score || 0) > 0.5) // Lower threshold to show more results
        .sort((a, b) => (b.upsell_score || 0) - (a.upsell_score || 0))
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting upsell opportunities:', error);
      return [];
    }
  }

  // Delete user data
  async deleteUserData(userId) {
    try {
      if (!fs.existsSync(this.dataFile)) {
        return { success: true };
      }

      const fileContent = fs.readFileSync(this.dataFile, 'utf8');
      const allData = JSON.parse(fileContent);
      
      delete allData[userId];
      
      fs.writeFileSync(this.dataFile, JSON.stringify(allData, null, 2));
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }
}

export const dataStorageService = new DataStorageService();
