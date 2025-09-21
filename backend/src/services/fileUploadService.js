import multer from 'multer';
import path from 'path';
import fs from 'fs';
import csv from 'csv-parser';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import DataFile from '../models/DataFile.js';
import ProcessedData from '../models/ProcessedData.js';
import { chromaDBService } from './chromadbService.js';
import { dataStorageService } from './dataStorageService.js';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and JSON files are allowed'), false);
    }
  }
});

export class FileUploadService {
  // Call ML engine to process customer data
  static async callMLEngine(customers) {
    try {
      const mlEngineUrl = process.env.ML_ENGINE_URL || 'http://localhost:8000';
      const response = await axios.post(`${mlEngineUrl}/api/process-customers`, {
        user_id: 'system',
        customers: customers
      }, {
        timeout: 30000, // 30 second timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'ML processing failed');
      }
    } catch (error) {
      console.error('ML Engine Error:', error.message);
      // Fallback to rule-based processing
      return this.fallbackProcessing(customers);
    }
  }

  // Fallback processing when ML engine is unavailable
  static fallbackProcessing(customers) {
    console.log('Using fallback rule-based processing');
    return {
      segments: this.generateSegments(customers),
      churn_predictions: this.generateChurnPredictions(customers),
      upsell_opportunities: this.generateUpsellOpportunities(customers),
      insights: this.generateInsights(customers)
    };
  }

  // Helper method to calculate days since last purchase
  static calculateDaysSinceLastPurchase(row, columnMapping) {
    const lastInteraction = this.parseDate(row[columnMapping.last_interaction] || row.last_interaction);
    if (lastInteraction) {
      const now = new Date();
      const diffTime = Math.abs(now - lastInteraction);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 999; // Default to high value if no date
  }

  // Generate segments for fallback
  static generateSegments(customers) {
    const segments = {};
    customers.forEach(customer => {
      const segment = this.generateSegment(customer, {});
      if (!segments[segment]) {
        segments[segment] = {
          name: segment,
          count: 0,
          revenue: 0,
          avgEngagement: 0,
          customers: []
        };
      }
      segments[segment].count++;
      segments[segment].revenue += customer.total_spent;
      segments[segment].avgEngagement += customer.engagement_score;
      segments[segment].customers.push(customer.customer_id);
    });
    return Object.values(segments);
  }

  // Generate churn predictions for fallback
  static generateChurnPredictions(customers) {
    return customers.map(customer => ({
      customer_id: customer.customer_id,
      company_name: customer.company_name,
      churn_probability: this.calculateChurnProbability(customer, {}),
      risk_level: this.calculateRiskLevel(customer, {}),
      key_factors: this.getKeyFactors(customer),
      recommended_action: this.getChurnAction(customer)
    }));
  }

  // Generate upsell opportunities for fallback
  static generateUpsellOpportunities(customers) {
    return customers
      .filter(customer => this.calculateUpsellScore(customer, {}) > 0.5)
      .map(customer => ({
        customer_id: customer.customer_id,
        company_name: customer.company_name,
        upsell_score: this.calculateUpsellScore(customer, {}),
        current_value: customer.total_spent,
        potential_value: customer.total_spent * 1.5,
        recommended_products: this.getRecommendedProducts(customer),
        confidence: this.getUpsellConfidence(customer)
      }));
  }

  // Generate insights for fallback
  static generateInsights(customers) {
    const totalCustomers = customers.length;
    const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
    const avgEngagement = customers.reduce((sum, c) => sum + c.engagement_score, 0) / totalCustomers;
    
    return {
      summary: {
        total_customers: totalCustomers,
        total_revenue: totalRevenue,
        average_engagement: avgEngagement,
        churn_rate: 0,
        upsell_opportunities: 0
      },
      key_insights: [
        `${totalCustomers} customers processed`,
        `Total revenue: $${totalRevenue.toLocaleString()}`,
        `Average engagement: ${avgEngagement.toFixed(1)}%`
      ],
      recommendations: [
        'Focus on high-value customers',
        'Improve engagement scores',
        'Identify upsell opportunities'
      ]
    };
  }

  // Upload file and create database record
  static async uploadFile(userId, file) {
    try {
      const dataFile = await DataFile.create({
        user_id: userId,
        filename: file.filename,
        original_name: file.originalname,
        file_path: file.path,
        file_size: file.size,
        file_type: path.extname(file.originalname).toLowerCase(),
        status: 'uploaded'
      });

      return dataFile;
    } catch (error) {
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  // Process uploaded file and extract data
  static async processFile(dataFileId, userId) {
    try {
      const dataFile = await DataFile.findByPk(dataFileId);
      if (!dataFile) {
        throw new Error('File not found');
      }

      // Update status to processing
      await dataFile.update({ status: 'processing' });

      let processedData = [];
      const errors = [];

      if (dataFile.file_type === '.csv') {
        processedData = await this.processCSVFile(dataFile.file_path, errors);
      } else if (dataFile.file_type === '.json') {
        processedData = await this.processJSONFile(dataFile.file_path, errors);
      }

      // Auto-detect column mapping
      const columnMapping = this.detectColumnMapping(processedData[0] || {});

      // Update file with column mapping and row count
      await dataFile.update({
        column_mapping: columnMapping,
        row_count: processedData.length,
        processing_errors: errors,
        status: errors.length > 0 ? 'error' : 'processed',
        processed_at: new Date()
      });

      // Store processed data
      if (processedData.length > 0 && errors.length === 0) {
        await this.storeProcessedData(userId, dataFileId, processedData, columnMapping);
      }

      return {
        dataFile,
        processedCount: processedData.length,
        errors: errors
      };
    } catch (error) {
      throw new Error(`File processing failed: ${error.message}`);
    }
  }

  // Process CSV file
  static async processCSVFile(filePath, errors) {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          try {
            // Clean and validate data
            const cleanedData = this.cleanRowData(data);
            if (cleanedData) {
              results.push(cleanedData);
            }
          } catch (error) {
            errors.push({
              row: results.length + 1,
              error: error.message,
              data: data
            });
          }
        })
        .on('end', () => {
          resolve(results);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  // Process JSON file
  static async processJSONFile(filePath, errors) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const jsonData = JSON.parse(fileContent);
      
      if (!Array.isArray(jsonData)) {
        throw new Error('JSON file must contain an array of objects');
      }

      const results = [];
      jsonData.forEach((item, index) => {
        try {
          const cleanedData = this.cleanRowData(item);
          if (cleanedData) {
            results.push(cleanedData);
          }
        } catch (error) {
          errors.push({
            row: index + 1,
            error: error.message,
            data: item
          });
        }
      });

      return results;
    } catch (error) {
      throw new Error(`JSON processing failed: ${error.message}`);
    }
  }

  // Clean and validate row data
  static cleanRowData(row) {
    const cleaned = {};
    
    // Convert all keys to lowercase and clean values
    Object.keys(row).forEach(key => {
      const cleanKey = key.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');
      let value = row[key];
      
      if (value !== null && value !== undefined) {
        // Convert string numbers to numbers
        if (typeof value === 'string' && !isNaN(value) && !isNaN(parseFloat(value))) {
          value = parseFloat(value);
        }
        
        // Clean string values
        if (typeof value === 'string') {
          value = value.trim();
        }
        
        cleaned[cleanKey] = value;
      }
    });

    // Ensure we have at least a customer ID
    if (!cleaned.customer_id && !cleaned.id && !cleaned.customerid) {
      return null; // Skip rows without customer identifier
    }

    return cleaned;
  }

  // Auto-detect column mapping
  static detectColumnMapping(sampleRow) {
    const mapping = {};
    const keys = Object.keys(sampleRow);

    // Common field mappings
    const fieldMappings = {
      customer_id: ['customer_id', 'id', 'customerid', 'customer', 'client_id'],
      company_name: ['company_name', 'company', 'companyname', 'business_name', 'organization'],
      industry: ['industry', 'sector', 'business_type', 'category'],
      location: ['location', 'city', 'address', 'region', 'country'],
      total_spent: ['total_spent', 'total_spend', 'revenue', 'amount', 'value', 'lifetime_value'],
      engagement_score: ['engagement_score', 'engagement', 'score', 'activity_score'],
      last_interaction: ['last_interaction', 'last_interaction_date', 'last_contact', 'last_activity'],
      purchase_count: ['purchase_count', 'orders', 'transactions', 'purchases'],
      support_tickets: ['support_tickets', 'tickets', 'issues', 'complaints'],
      status: ['status', 'state', 'customer_status', 'account_status']
    };

    // Map detected fields
    Object.keys(fieldMappings).forEach(field => {
      const possibleKeys = fieldMappings[field];
      const foundKey = keys.find(key => 
        possibleKeys.some(possible => 
          key.toLowerCase().includes(possible.toLowerCase())
        )
      );
      
      if (foundKey) {
        mapping[field] = foundKey;
      }
    });

    return mapping;
  }

  // Store processed data with ML engine integration
  static async storeProcessedData(userId, dataFileId, processedData, columnMapping) {
    try {
      // Prepare data for ML engine
      const customersForML = processedData.map(row => ({
        customer_id: row[columnMapping.customer_id] || row.customer_id || row.id || `customer_${Date.now()}`,
        company_name: row[columnMapping.company_name] || row.company_name || 'Unknown Company',
        industry: row[columnMapping.industry] || row.industry || 'Unknown',
        total_spent: parseFloat(row[columnMapping.total_spent] || row.total_spent || 0),
        engagement_score: parseInt(row[columnMapping.engagement_score] || row.engagement_score || 50),
        last_interaction_date: this.parseDate(row[columnMapping.last_interaction] || row.last_interaction),
        purchase_frequency: parseInt(row[columnMapping.purchase_count] || row.purchase_count || 0),
        days_since_last_purchase: this.calculateDaysSinceLastPurchase(row, columnMapping)
      }));

      // Call ML engine for processing
      console.log(`🤖 Calling ML engine for ${customersForML.length} customers...`);
      const mlResults = await this.callMLEngine(customersForML);
      console.log('✅ ML processing completed');

      const dataToStore = [];

      for (let i = 0; i < processedData.length; i++) {
        const row = processedData[i];
        const mlCustomer = customersForML[i];
        
        // Find ML results for this customer
        const churnPrediction = mlResults.churn_predictions?.find(c => c.customer_id === mlCustomer.customer_id);
        const upsellOpportunity = mlResults.upsell_opportunities?.find(u => u.customer_id === mlCustomer.customer_id);
        const segment = mlResults.segments?.find(s => s.customers?.includes(mlCustomer.customer_id));

        const mappedData = {
          user_id: userId,
          data_file_id: dataFileId,
          customer_id: mlCustomer.customer_id,
          company_name: mlCustomer.company_name,
          industry: mlCustomer.industry,
          location: row[columnMapping.location] || row.location || 'Unknown',
          total_spent: mlCustomer.total_spent,
          engagement_score: mlCustomer.engagement_score,
          last_interaction_date: mlCustomer.last_interaction_date,
          purchase_count: mlCustomer.purchase_frequency,
          support_tickets: parseInt(row[columnMapping.support_tickets] || row.support_tickets || 0),
          status: row[columnMapping.status] || row.status || 'Active',
          // ML-generated fields from engine
          segment: segment?.name || 'Unknown',
          churn_probability: churnPrediction?.churn_probability || 0.1,
          upsell_score: upsellOpportunity?.upsell_score || 0.1,
          risk_level: churnPrediction?.risk_level || 'Low',
          raw_data: row
        };

        dataToStore.push(mappedData);
      }

      // Store in data storage service (JSON file)
      try {
        await dataStorageService.storeCustomerData(userId, dataFileId, dataToStore);
        console.log(`Successfully stored ${dataToStore.length} records in data storage`);
      } catch (error) {
        console.error('Data storage failed:', error.message);
        throw error;
      }
    } catch (error) {
      console.error('Error processing data:', error);
      throw error;
    }
  }

  // Generate customer segment based on data
  static generateSegment(row, columnMapping) {
    const totalSpent = parseFloat(row[columnMapping.total_spent] || row.total_spent || 0);
    const engagementScore = parseInt(row[columnMapping.engagement_score] || row.engagement_score || 50);
    
    if (totalSpent > 50000 && engagementScore > 80) return 'High Value';
    if (totalSpent > 20000 && engagementScore > 60) return 'Medium Value';
    if (totalSpent > 5000) return 'Low Value';
    if (engagementScore < 30) return 'At Risk';
    return 'Standard';
  }

  // Calculate churn probability
  static calculateChurnProbability(row, columnMapping) {
    const engagementScore = parseInt(row[columnMapping.engagement_score] || row.engagement_score || 50);
    const supportTickets = parseInt(row[columnMapping.support_tickets] || row.support_tickets || 0);
    const lastInteraction = this.parseDate(row[columnMapping.last_interaction] || row.last_interaction);
    
    let probability = 0.1; // Base probability
    
    // Lower engagement = higher churn risk
    if (engagementScore < 30) probability += 0.4;
    else if (engagementScore < 50) probability += 0.2;
    
    // More support tickets = higher churn risk
    if (supportTickets > 5) probability += 0.2;
    else if (supportTickets > 2) probability += 0.1;
    
    // No recent interaction = higher churn risk
    if (lastInteraction) {
      const daysSinceInteraction = (new Date() - lastInteraction) / (1000 * 60 * 60 * 24);
      if (daysSinceInteraction > 90) probability += 0.3;
      else if (daysSinceInteraction > 30) probability += 0.1;
    }
    
    return Math.min(probability, 0.95); // Cap at 95%
  }

  // Calculate upsell score
  static calculateUpsellScore(row, columnMapping) {
    const totalSpent = parseFloat(row[columnMapping.total_spent] || row.total_spent || 0);
    const engagementScore = parseInt(row[columnMapping.engagement_score] || row.engagement_score || 50);
    const purchaseCount = parseInt(row[columnMapping.purchase_count] || row.purchase_count || 0);
    
    let score = 0.1; // Base score
    
    // Higher spending = higher upsell potential
    if (totalSpent > 10000) score += 0.3;
    else if (totalSpent > 5000) score += 0.2;
    
    // Higher engagement = higher upsell potential
    if (engagementScore > 70) score += 0.3;
    else if (engagementScore > 50) score += 0.2;
    
    // More purchases = higher upsell potential
    if (purchaseCount > 5) score += 0.2;
    else if (purchaseCount > 2) score += 0.1;
    
    return Math.min(score, 0.95); // Cap at 95%
  }

  // Calculate risk level
  static calculateRiskLevel(row, columnMapping) {
    const churnProb = this.calculateChurnProbability(row, columnMapping);
    const engagementScore = parseInt(row[columnMapping.engagement_score] || row.engagement_score || 50);
    
    if (churnProb > 0.7 || engagementScore < 20) return 'Critical';
    if (churnProb > 0.5 || engagementScore < 40) return 'High';
    if (churnProb > 0.3 || engagementScore < 60) return 'Medium';
    return 'Low';
  }

  // Get key factors influencing churn
  static getKeyFactors(customer) {
    const factors = [];
    
    if (customer.engagement_score < 30) {
      factors.push('Low engagement score');
    }
    if (customer.support_tickets > 5) {
      factors.push('High support ticket count');
    }
    if (customer.days_since_last_purchase > 90) {
      factors.push('Long time since last purchase');
    }
    if (customer.total_spent < 1000) {
      factors.push('Low spending history');
    }
    
    return factors.length > 0 ? factors : ['No significant risk factors'];
  }

  // Get recommended action for churn prevention
  static getChurnAction(customer) {
    const churnProb = this.calculateChurnProbability(customer, {});
    
    if (churnProb > 0.7) {
      return 'Immediate intervention required - schedule call with customer success team';
    } else if (churnProb > 0.5) {
      return 'High priority - send personalized re-engagement campaign';
    } else if (churnProb > 0.3) {
      return 'Medium priority - monitor closely and send targeted offers';
    } else {
      return 'Low risk - maintain regular communication';
    }
  }

  // Get recommended products for upsell
  static getRecommendedProducts(customer) {
    const products = [];
    
    if (customer.total_spent > 50000) {
      products.push('Enterprise Plan', 'Premium Support', 'Advanced Analytics');
    } else if (customer.total_spent > 20000) {
      products.push('Professional Plan', 'Priority Support', 'Custom Integrations');
    } else if (customer.total_spent > 5000) {
      products.push('Standard Plan', 'Basic Support', 'Standard Features');
    } else {
      products.push('Starter Plan', 'Email Support', 'Core Features');
    }
    
    return products;
  }

  // Get upsell confidence level
  static getUpsellConfidence(customer) {
    const upsellScore = this.calculateUpsellScore(customer, {});
    
    if (upsellScore > 0.8) return 'Very High';
    if (upsellScore > 0.6) return 'High';
    if (upsellScore > 0.4) return 'Medium';
    return 'Low';
  }

  // Parse date from various formats
  static parseDate(dateString) {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  // Get user's uploaded files
  static async getUserFiles(userId) {
    return await DataFile.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });
  }

  // Get processed data for user from data storage
  static async getUserProcessedData(userId, options = {}) {
    try {
      const result = await dataStorageService.getCustomerData(userId, options.limit || 50, options.offset || 0);
      
      return {
        rows: result.data,
        count: result.total
      };
    } catch (error) {
      console.error('Error getting processed data:', error);
      return {
        rows: [],
        count: 0
      };
    }
  }
}

export default FileUploadService;
