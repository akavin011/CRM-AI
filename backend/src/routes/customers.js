import express from 'express';
import { CustomerService } from '../services/customerService.js';
import { validateCustomerData } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { dataStorageService } from '../services/dataStorageService.js';

const router = express.Router();

// Get all customers with insights
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, segment, sortBy = 'engagement_score', order = 'desc' } = req.query;
    
    const customers = await CustomerService.getAllCustomersWithInsights(req.user.userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      segment,
      sortBy,
      order
    });
    
    res.json({
      success: true,
      data: customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: customers.total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
  try {
    const customer = await CustomerService.getCustomerById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found'
      });
    }
    
    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get customer segments
router.get('/analytics/segments', authenticateToken, async (req, res) => {
  try {
    const segments = await CustomerService.getCustomerSegments(req.user.userId);
    
    res.json({
      success: true,
      data: segments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get churn predictions
router.get('/analytics/churn', authenticateToken, async (req, res) => {
  try {
    const predictions = await CustomerService.getChurnPredictions(req.user.userId);
    
    res.json({
      success: true,
      data: predictions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get upsell opportunities
router.get('/analytics/upsell', authenticateToken, async (req, res) => {
  try {
    const opportunities = await CustomerService.getUpsellOpportunities(req.user.userId);
    
    res.json({
      success: true,
      data: opportunities
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get high-value customers
router.get('/analytics/high-value', authenticateToken, async (req, res) => {
  try {
    const customers = await CustomerService.getHighValueCustomers(req.user.userId);
    
    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get at-risk customers
router.get('/analytics/at-risk', authenticateToken, async (req, res) => {
  try {
    const customers = await CustomerService.getAtRiskCustomers(req.user.userId);
    
    res.json({
      success: true,
      data: customers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update customer
router.put('/:id', validateCustomerData, async (req, res) => {
  try {
    const customer = await CustomerService.updateCustomer(req.params.id, req.body);
    
    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Delete customer
router.delete('/:id', async (req, res) => {
  try {
    await CustomerService.deleteCustomer(req.params.id);
    
    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get customer segments
router.get('/analytics/segments', authenticateToken, async (req, res) => {
  try {
    const segments = await dataStorageService.getCustomerSegments(req.user.userId);
    
    console.log('Segments API called for user:', req.user.userId);
    console.log('Segments returned:', segments);
    
    res.json({
      success: true,
      data: segments
    });
  } catch (error) {
    console.error('Error getting customer segments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get customer segments'
    });
  }
});

// Get churn predictions
router.get('/analytics/churn', authenticateToken, async (req, res) => {
  try {
    const atRiskCustomers = await dataStorageService.getAtRiskCustomers(req.user.userId);
    
    console.log('Churn API called for user:', req.user.userId);
    console.log('At-risk customers returned:', atRiskCustomers.length);
    
    res.json({
      success: true,
      data: atRiskCustomers
    });
  } catch (error) {
    console.error('Error getting churn predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get churn predictions'
    });
  }
});

// Get upsell opportunities
router.get('/analytics/upsell', authenticateToken, async (req, res) => {
  try {
    const upsellOpportunities = await dataStorageService.getUpsellOpportunities(req.user.userId);
    
    console.log('Upsell API called for user:', req.user.userId);
    console.log('Upsell opportunities returned:', upsellOpportunities.length);
    
    res.json({
      success: true,
      data: upsellOpportunities
    });
  } catch (error) {
    console.error('Error getting upsell opportunities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get upsell opportunities'
    });
  }
});

// Get high-value customers
router.get('/analytics/high-value', authenticateToken, async (req, res) => {
  try {
    const highValueCustomers = await dataStorageService.getHighValueCustomers(req.user.userId);
    
    res.json({
      success: true,
      data: highValueCustomers
    });
  } catch (error) {
    console.error('Error getting high-value customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get high-value customers'
    });
  }
});

// Get at-risk customers
router.get('/analytics/at-risk', authenticateToken, async (req, res) => {
  try {
    const atRiskCustomers = await dataStorageService.getAtRiskCustomers(req.user.userId);
    
    res.json({
      success: true,
      data: atRiskCustomers
    });
  } catch (error) {
    console.error('Error getting at-risk customers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get at-risk customers'
    });
  }
});

export default router;

