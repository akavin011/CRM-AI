import express from 'express';
import { LlamaChatbotService } from '../services/llamaChatbotService.js';
import { AIAnalyticsService } from '../services/aiAnalyticsService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const chatbotService = new LlamaChatbotService();

// Main chatbot endpoint
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.userId;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    const response = await chatbotService.processMessage(userId || 'anonymous', message);
    
    res.json({
      success: true,
      ...response
    });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({
      success: false,
      error: 'AI service temporarily unavailable',
      response: 'I apologize, but I\'m experiencing technical difficulties. Please try again later.'
    });
  }
});

// Generate AI insights
router.post('/insights', authenticateToken, async (req, res) => {
  try {
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({
        success: false,
        error: 'Data is required for insights generation'
      });
    }
    
    const insights = await AIAnalyticsService.generateInsights(data);
    
    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Insights generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate insights'
    });
  }
});

// Health check for Llama service
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const isHealthy = await chatbotService.checkHealth();
    
    res.json({
      success: true,
      status: isHealthy ? 'healthy' : 'unhealthy',
      llama: isHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      llama: 'disconnected',
      error: error.message
    });
  }
});

// Get conversation history
router.get('/history/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await chatbotService.getConversationHistory(userId);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Clear conversation history
router.delete('/history/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    await chatbotService.clearConversationHistory(userId);
    
    res.json({
      success: true,
      message: 'Conversation history cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

