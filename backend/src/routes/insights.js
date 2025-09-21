import express from 'express';
import { InsightsService } from '../services/insightsService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get comprehensive insights
router.get('/', authenticateToken, async (req, res) => {
  try {
    const insights = await InsightsService.getComprehensiveInsights(req.user.userId);
    
    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get key metrics
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const metrics = await InsightsService.getKeyMetrics(req.user.userId);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get trend analysis
router.get('/trends', authenticateToken, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const trends = await InsightsService.getTrendAnalysis(period, req.user.userId);
    
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get performance summary
router.get('/performance', authenticateToken, async (req, res) => {
  try {
    const performance = await InsightsService.getPerformanceSummary(req.user.userId);
    
    res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

