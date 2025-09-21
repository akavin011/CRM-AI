import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle, 
  Upload, 
  Settings, 
  Target,
  Brain,
  Zap,
  Users,
  TrendingUp,
  Shield,
  Star
} from 'lucide-react';

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState({
    churnThreshold: 0.5,
    engagementThreshold: 40,
    demoScenario: 'enterprise'
  });
  const navigate = useNavigate();

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to AI CRM',
      subtitle: 'Your intelligent customer relationship management system',
      icon: Star,
      content: (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
            <Brain className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome to the Future of CRM</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Transform your customer data into actionable insights with our AI-powered platform. 
            Get ready to discover hidden opportunities and prevent churn before it happens.
          </p>
          <div className="grid grid-cols-3 gap-6 mt-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Target className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Smart Segmentation</h3>
              <p className="text-sm text-gray-600">AI-powered customer grouping</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Churn Prediction</h3>
              <p className="text-sm text-gray-600">Prevent customer loss</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Upsell Detection</h3>
              <p className="text-sm text-gray-600">Find growth opportunities</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'data-upload',
      title: 'Upload Your Data',
      subtitle: 'Connect your CRM data to get started',
      icon: Upload,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Upload className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Choose Your Data Source</h3>
            <p className="text-gray-600">Upload your customer data to get started</p>
          </div>
          
          <div className="flex justify-center">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer max-w-md w-full">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Upload CSV/JSON</h4>
              <p className="text-sm text-gray-600 mb-4">Upload your own customer data file</p>
              <button 
                onClick={() => navigate('/data-upload')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload File
              </button>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'configuration',
      title: 'Configure Settings',
      subtitle: 'Customize your AI analysis parameters',
      icon: Settings,
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Settings className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Configure AI Parameters</h3>
            <p className="text-gray-600">Set thresholds for churn detection and engagement analysis</p>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-lg border p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Churn Detection Threshold</h4>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">
                  Probability threshold for high-risk customers: {config.churnThreshold}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.1"
                  value={config.churnThreshold}
                  onChange={(e) => setConfig({...config, churnThreshold: parseFloat(e.target.value)})}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Conservative (0.1)</span>
                  <span>Balanced (0.5)</span>
                  <span>Aggressive (0.9)</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Engagement Threshold</h4>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">
                  Minimum engagement score: {config.engagementThreshold}
                </label>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="10"
                  value={config.engagementThreshold}
                  onChange={(e) => setConfig({...config, engagementThreshold: parseInt(e.target.value)})}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Low (10)</span>
                  <span>Medium (40)</span>
                  <span>High (80)</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Demo Scenario</h4>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'enterprise', name: 'Enterprise', desc: 'Large B2B companies' },
                  { id: 'smb', name: 'SMB', desc: 'Small & medium business' },
                  { id: 'custom', name: 'Custom', desc: 'Custom configuration' }
                ].map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => setConfig({...config, demoScenario: scenario.id})}
                    className={`p-4 rounded-lg border text-left transition-colors ${
                      config.demoScenario === scenario.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h5 className="font-semibold text-gray-900">{scenario.name}</h5>
                    <p className="text-sm text-gray-600">{scenario.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'complete',
      title: 'You\'re All Set!',
      subtitle: 'Ready to discover insights from your data',
      icon: CheckCircle,
      content: (
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Setup Complete!</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Your AI CRM system is ready to analyze your customer data and provide 
            intelligent insights. Let's start exploring your customer segments, 
            churn predictions, and upsell opportunities.
          </p>
          
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 mb-4">What's Next?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span>View customer segments</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span>Analyze churn risks</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-purple-600" />
                <span>Find upsell opportunities</span>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      navigate('/dashboard');
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">AI CRM Setup</h1>
          </div>
          <button
            onClick={skipOnboarding}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Skip Setup
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl shadow-xl p-8"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  {React.createElement(steps[currentStep].icon, { className: "w-8 h-8 text-white" })}
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {steps[currentStep].title}
                </h2>
                <p className="text-lg text-gray-600">
                  {steps[currentStep].subtitle}
                </p>
              </div>

              {steps[currentStep].content}

              {/* Navigation */}
              <div className="flex justify-between mt-12">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
                    currentStep === 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                <button
                  onClick={nextStep}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Next'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;