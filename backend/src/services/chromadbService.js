import { ChromaClient } from 'chromadb';
import { v4 as uuidv4 } from 'uuid';

export class ChromaDBService {
  constructor() {
    this.client = new ChromaClient({
      path: "http://localhost:8000"
    });
    this.collectionName = 'crm_customer_data';
    this.collection = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      return true;
    }

    try {
      // Check if collection exists, if not create it
      const collections = await this.client.listCollections();
      const existingCollection = collections.find(col => col.name === this.collectionName);
      
      if (existingCollection) {
        this.collection = await this.client.getCollection({
          name: this.collectionName
        });
        // If collection exists but has no embedding function, we need to recreate it
        try {
          await this.collection.add({
            documents: ["test"],
            metadatas: [{ test: "value" }],
            ids: ["test"]
          });
        } catch (error) {
          if (error.message.includes('Embedding function')) {
            console.log('Collection exists but has no embedding function, recreating...');
            await this.client.deleteCollection({ name: this.collectionName });
            existingCollection = null;
          } else {
            throw error;
          }
        }
      }
      
      if (!existingCollection) {
        // Create collection with a simple embedding function
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          metadata: {
            description: "CRM Customer Data Collection"
          },
          embeddingFunction: {
            generate: async (texts) => {
              // Simple hash-based embedding for demo purposes
              return texts.map(text => {
                const hash = text.split('').reduce((a, b) => {
                  a = ((a << 5) - a) + b.charCodeAt(0);
                  return a & a;
                }, 0);
                // Convert to a simple vector (normalize to 0-1 range)
                return [Math.abs(hash) % 1000 / 1000, Math.abs(hash >> 8) % 1000 / 1000, Math.abs(hash >> 16) % 1000 / 1000];
              });
            }
          }
        });
      }
      
      this.isInitialized = true;
      console.log('ChromaDB initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing ChromaDB:', error);
      console.log('Note: Make sure ChromaDB server is running on http://localhost:8000');
      console.log('Start it with: chroma run --host localhost --port 8000');
      return false;
    }
  }

  // Store uploaded customer data in ChromaDB
  async storeCustomerData(userId, fileId, customerData) {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('ChromaDB not available');
        }
      }

      const documents = [];
      const metadatas = [];
      const ids = [];

      customerData.forEach((record, index) => {
        const id = uuidv4();
        const document = this.createDocumentFromRecord(record);
        // Filter metadata to only include valid ChromaDB types (string, number, boolean, null)
        const metadata = {
          user_id: userId,
          file_id: fileId,
          customer_id: String(record.customer_id || record.id || `customer_${index}`),
          company_name: String(record.company_name || record.company || ''),
          industry: String(record.industry || ''),
          total_spent: Number(record.total_spent || record.revenue || 0),
          engagement_score: Number(record.engagement_score || 50),
          status: String(record.status || 'Active'),
          segment: String(record.segment || 'Standard'),
          churn_probability: Number(record.churn_probability || 0.1),
          upsell_score: Number(record.upsell_score || 0.1),
          created_at: new Date().toISOString()
        };

        // Add additional valid fields from record
        Object.keys(record).forEach(key => {
          const value = record[key];
          if (value !== null && value !== undefined) {
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              metadata[key] = value;
            } else if (typeof value === 'object' && !Array.isArray(value)) {
              // Convert objects to strings
              metadata[key] = JSON.stringify(value);
            } else if (Array.isArray(value)) {
              // Convert arrays to strings
              metadata[key] = JSON.stringify(value);
            }
          }
        });

        documents.push(document);
        metadatas.push(metadata);
        ids.push(id);
      });

      await this.collection.add({
        documents: documents,
        metadatas: metadatas,
        ids: ids
      });

      console.log(`Stored ${customerData.length} customer records in ChromaDB`);
      return { success: true, count: customerData.length };
    } catch (error) {
      console.error('Error storing customer data in ChromaDB:', error);
      throw error;
    }
  }

  // Create a searchable document from customer record
  createDocumentFromRecord(record) {
    const fields = [
      record.company_name || record.company || '',
      record.industry || '',
      record.status || '',
      record.segment || '',
      record.location || '',
      record.contact_person || record.contact_name || '',
      record.email || '',
      record.phone || ''
    ].filter(field => field && field.toString().trim() !== '');

    return fields.join(' ').toLowerCase();
  }

  // Get all customer data for a user
  async getCustomerData(userId, limit = 100, offset = 0) {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return { data: [], total: 0 };
        }
      }

      // Debug logging
      console.log('ChromaDB getCustomerData called with userId:', userId, 'limit:', limit, 'offset:', offset);

      // If no userId provided, get all data (for debugging)
      const queryOptions = userId ? 
        { where: { user_id: userId }, limit: limit, offset: offset } :
        { limit: limit, offset: offset };

      console.log('ChromaDB query options:', queryOptions);

      const result = await this.collection.get(queryOptions);

      console.log('ChromaDB result:', {
        ids: result.ids?.length || 0,
        metadatas: result.metadatas?.length || 0
      });

      return {
        data: result.metadatas.map((metadata, index) => ({
          id: result.ids[index],
          ...metadata
        })),
        total: result.metadatas.length
      };
    } catch (error) {
      console.error('Error fetching customer data from ChromaDB:', error);
      return { data: [], total: 0 };
    }
  }

  // Get high-value customers
  async getHighValueCustomers(userId, minSpent = 10000, limit = 10) {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return { data: [], total: 0 };
        }
      }

      const result = await this.collection.get({
        where: { 
          user_id: userId,
          total_spent: { $gte: minSpent }
        },
        limit: limit
      });

      return {
        data: result.metadatas.map((metadata, index) => ({
          id: result.ids[index],
          ...metadata
        })),
        total: result.metadatas.length
      };
    } catch (error) {
      console.error('Error fetching high-value customers from ChromaDB:', error);
      return { data: [], total: 0 };
    }
  }

  // Get at-risk customers
  async getAtRiskCustomers(userId, minChurnProb = 0.5, limit = 10) {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return { data: [], total: 0 };
        }
      }

      const result = await this.collection.get({
        where: { 
          user_id: userId,
          churn_probability: { $gte: minChurnProb }
        },
        limit: limit
      });

      return {
        data: result.metadatas.map((metadata, index) => ({
          id: result.ids[index],
          ...metadata
        })),
        total: result.metadatas.length
      };
    } catch (error) {
      console.error('Error fetching at-risk customers from ChromaDB:', error);
      return { data: [], total: 0 };
    }
  }

  // Get upsell opportunities
  async getUpsellOpportunities(userId, minUpsellScore = 0.6, limit = 10) {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return { data: [], total: 0 };
        }
      }

      const result = await this.collection.get({
        where: { 
          user_id: userId,
          upsell_score: { $gte: minUpsellScore }
        },
        limit: limit
      });

      return {
        data: result.metadatas.map((metadata, index) => ({
          id: result.ids[index],
          ...metadata
        })),
        total: result.metadatas.length
      };
    } catch (error) {
      console.error('Error fetching upsell opportunities from ChromaDB:', error);
      return { data: [], total: 0 };
    }
  }

  // Get customer segments
  async getCustomerSegments(userId) {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {};
        }
      }

      const result = await this.collection.get({
        where: { user_id: userId }
      });

      const segments = {};
      result.metadatas.forEach((metadata, index) => {
        const segment = metadata.segment || 'Unknown';
        if (!segments[segment]) {
          segments[segment] = {
            count: 0,
            total_revenue: 0,
            avg_engagement: 0,
            customers: []
          };
        }
        
        segments[segment].count++;
        segments[segment].total_revenue += parseFloat(metadata.total_spent || 0);
        segments[segment].avg_engagement += parseFloat(metadata.engagement_score || 0);
        segments[segment].customers.push({
          id: result.ids[index],
          ...metadata
        });
      });

      // Calculate averages
      Object.keys(segments).forEach(segment => {
        if (segments[segment].count > 0) {
          segments[segment].avg_engagement = segments[segment].avg_engagement / segments[segment].count;
        }
      });

      return segments;
    } catch (error) {
      console.error('Error fetching customer segments from ChromaDB:', error);
      return {};
    }
  }

  // Get analytics data
  async getAnalyticsData(userId) {
    try {
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            total_customers: 0,
            total_revenue: 0,
            average_engagement: 0,
            churn_rate: 0,
            active_customers: 0,
            new_customers_this_month: 0
          };
        }
      }

      const result = await this.collection.get({
        where: { user_id: userId }
      });

      const data = result.metadatas.map((metadata, index) => ({
        id: result.ids[index],
        ...metadata
      }));

      const totalCustomers = data.length;
      const totalRevenue = data.reduce((sum, customer) => sum + parseFloat(customer.total_spent || 0), 0);
      const avgEngagement = totalCustomers > 0 ? data.reduce((sum, customer) => sum + parseFloat(customer.engagement_score || 0), 0) / totalCustomers : 0;
      const churnRate = totalCustomers > 0 ? data.filter(customer => parseFloat(customer.churn_probability || 0) > 0.5).length / totalCustomers : 0;
      const activeCustomers = data.filter(customer => customer.status === 'Active').length;

      return {
        total_customers: totalCustomers,
        total_revenue: totalRevenue,
        average_engagement: avgEngagement,
        churn_rate: churnRate,
        active_customers: activeCustomers,
        new_customers_this_month: data.filter(customer => {
          const createdDate = new Date(customer.created_at);
          const now = new Date();
          return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
        }).length
      };
    } catch (error) {
      console.error('Error fetching analytics data from ChromaDB:', error);
      return {
        total_customers: 0,
        total_revenue: 0,
        average_engagement: 0,
        churn_rate: 0,
        active_customers: 0,
        new_customers_this_month: 0
      };
    }
  }
}

// Export singleton instance
export const chromaDBService = new ChromaDBService();