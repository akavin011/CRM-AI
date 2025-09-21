import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  Loader2,
  Sparkles,
  Zap,
  Brain
} from 'lucide-react';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';
import { api } from '../utils/api.js';

const LlamaChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      type: 'bot', 
      text: 'Hello! I\'m your AI-powered CRM assistant. I can help you analyze customer data, predict churn, identify opportunities, and provide strategic insights. What would you like to know about your customers?',
      timestamp: new Date(),
      context: null,
      suggestions: [
        'Show me high-value customers',
        'Which customers are at risk?',
        'What\'s our total revenue?',
        'Analyze customer segments'
      ]
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const userId = 'user_' + Math.random().toString(36).substr(2, 9);

  const { data: healthStatus } = useQuery(
    'chatbot-health',
    () => api.getChatbotHealth(),
    { refetchInterval: 30000 }
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = { 
      type: 'user', 
      text: inputText, 
      timestamp: new Date() 
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const data = await api.sendChatMessage(inputText);
      
      if (data.success) {
        const botMessage = { 
          type: 'bot', 
          text: data.response,
          timestamp: new Date(),
          context: data.context,
          suggestions: data.suggestions || []
        };
        setMessages(prev => [...prev, botMessage]);
        setSuggestions(data.suggestions || []);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      
      // Generate intelligent fallback response based on user input
      const fallbackResponse = generateFallbackResponse(inputText);
      
      const errorMessage = { 
        type: 'bot', 
        text: fallbackResponse,
        timestamp: new Date(),
        suggestions: [
          'Show me customer data',
          'What are our key metrics?',
          'Analyze customer segments',
          'Find at-risk customers'
        ]
      };
      setMessages(prev => [...prev, errorMessage]);
      setSuggestions(errorMessage.suggestions);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputText(suggestion);
    handleSendMessage();
  };

  // Generate intelligent fallback responses
  const generateFallbackResponse = (userInput) => {
    const input = userInput.toLowerCase();
    
    if (input.includes('customer') || input.includes('client')) {
      return "I'd be happy to help you with customer information! While I'm experiencing some technical difficulties, you can view your customer data in the Dashboard or Analytics sections. Would you like me to suggest some specific customer insights you can explore?";
    }
    
    if (input.includes('revenue') || input.includes('sales') || input.includes('money')) {
      return "I can help you understand your revenue data! Check out the Revenue Trends chart in the Dashboard for detailed financial insights. You can also export your data for further analysis.";
    }
    
    if (input.includes('churn') || input.includes('risk') || input.includes('at risk')) {
      return "For churn analysis and risk assessment, visit the Analytics page where you'll find detailed customer segmentation and churn predictions based on your uploaded data.";
    }
    
    if (input.includes('segment') || input.includes('group') || input.includes('category')) {
      return "Customer segmentation analysis is available in the Analytics section. You can see how your customers are grouped by value, engagement, and other key metrics.";
    }
    
    if (input.includes('upload') || input.includes('data') || input.includes('file')) {
      return "To upload new data, go to the Data Upload page where you can drag and drop CSV or JSON files. I can help you understand your data once it's uploaded!";
    }
    
    return "I'm here to help you with your CRM data analysis! While I'm experiencing some technical difficulties, you can explore your data through the Dashboard and Analytics sections. What specific insights are you looking for?";
  };

  const quickActions = [
    "Show me customers at risk of churning",
    "Who are my high-value customers?",
    "Find upsell opportunities",
    "Analyze customer segments",
    "What's my customer health score?",
    "Generate sales insights"
  ];

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* AI Status Indicator */}
        <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-xs font-bold text-white shadow-lg">
          <Brain className="h-3 w-3" />
        </div>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 z-40 w-96 h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">AI Assistant</h3>
                  <p className="text-blue-100 text-xs">AI-Powered CRM Insights</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="p-3 bg-gray-50 border-b">
              <div className="text-xs text-gray-600 mb-2 font-medium">Quick Actions:</div>
              <div className="flex flex-wrap gap-2">
                {quickActions.slice(0, 3).map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(action)}
                    className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-200 transition-colors font-medium"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {messages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-xs ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2`}>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      message.type === 'user' 
                        ? 'bg-blue-600' 
                        : 'bg-gradient-to-r from-blue-500 to-purple-500'
                    }`}>
                      {message.type === 'user' ? (
                        <User className="h-4 w-4 text-white" />
                      ) : (
                        <Bot className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <div className={`px-4 py-2 rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    }`}>
                      <div className="text-sm whitespace-pre-wrap">{message.text}</div>
                      <div className={`text-xs mt-1 ${
                        message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex items-start space-x-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-2xl rounded-bl-md">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="p-3 bg-gray-50 border-t">
                <div className="text-xs text-gray-600 mb-2 font-medium">Suggestions:</div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-200 transition-colors font-medium"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t bg-white">
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me about your customers..."
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isLoading}
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Sparkles className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputText.trim()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2.5 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500 text-center">
                Powered by AI • Press Enter to send
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default LlamaChatbot;

