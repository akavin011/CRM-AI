// Comprehensive error handling system
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export class ErrorHandler {
  static errorTypes = {
    NETWORK_ERROR: 'NETWORK_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
    SERVER_ERROR: 'SERVER_ERROR',
    CLIENT_ERROR: 'CLIENT_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
  };

  static errorSeverity = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
  };

  // Main error handler
  static handleError(error, context = {}) {
    const errorInfo = this.analyzeError(error);
    const userMessage = this.getUserMessage(errorInfo);
    const shouldLog = this.shouldLogError(errorInfo);
    
    if (shouldLog) {
      this.logError(errorInfo, context);
    }

    return {
      ...errorInfo,
      userMessage,
      context,
      timestamp: new Date().toISOString()
    };
  }

  // Analyze error and determine type and severity
  static analyzeError(error) {
    let type = this.errorTypes.UNKNOWN_ERROR;
    let severity = this.errorSeverity.MEDIUM;
    let code = null;
    let details = {};

    if (error.name === 'ValidationError') {
      type = this.errorTypes.VALIDATION_ERROR;
      severity = this.errorSeverity.LOW;
      details = { fields: error.fields || [] };
    } else if (error.name === 'NetworkError' || !navigator.onLine) {
      type = this.errorTypes.NETWORK_ERROR;
      severity = this.errorSeverity.HIGH;
    } else if (error.response) {
      // HTTP response error
      const status = error.response.status;
      code = status;
      
      switch (status) {
        case 401:
          type = this.errorTypes.AUTHENTICATION_ERROR;
          severity = this.errorSeverity.HIGH;
          break;
        case 403:
          type = this.errorTypes.AUTHORIZATION_ERROR;
          severity = this.errorSeverity.HIGH;
          break;
        case 404:
          type = this.errorTypes.NOT_FOUND_ERROR;
          severity = this.errorSeverity.MEDIUM;
          break;
        case 400:
          type = this.errorTypes.VALIDATION_ERROR;
          severity = this.errorSeverity.LOW;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          type = this.errorTypes.SERVER_ERROR;
          severity = this.errorSeverity.CRITICAL;
          break;
        default:
          type = this.errorTypes.SERVER_ERROR;
          severity = this.errorSeverity.HIGH;
      }
      
      details = {
        status,
        statusText: error.response.statusText,
        data: error.response.data
      };
    } else if (error.request) {
      type = this.errorTypes.NETWORK_ERROR;
      severity = this.errorSeverity.HIGH;
    } else {
      type = this.errorTypes.CLIENT_ERROR;
      severity = this.errorSeverity.MEDIUM;
    }

    return {
      type,
      severity,
      code,
      message: error.message || 'An unknown error occurred',
      originalError: error,
      details
    };
  }

  // Get user-friendly error message
  static getUserMessage(errorInfo) {
    const { type, code, message, details } = errorInfo;

    switch (type) {
      case this.errorTypes.NETWORK_ERROR:
        return 'Unable to connect to the server. Please check your internet connection and try again.';
      
      case this.errorTypes.AUTHENTICATION_ERROR:
        return 'Your session has expired. Please log in again.';
      
      case this.errorTypes.AUTHORIZATION_ERROR:
        return 'You do not have permission to perform this action.';
      
      case this.errorTypes.NOT_FOUND_ERROR:
        return 'The requested resource was not found.';
      
      case this.errorTypes.VALIDATION_ERROR:
        if (details.fields && details.fields.length > 0) {
          return `Please check the following fields: ${details.fields.join(', ')}`;
        }
        return 'Please check your input and try again.';
      
      case this.errorTypes.SERVER_ERROR:
        if (code >= 500) {
          return 'The server is experiencing issues. Please try again later.';
        }
        return 'An error occurred while processing your request.';
      
      case this.errorTypes.CLIENT_ERROR:
        return 'An error occurred in the application. Please refresh the page and try again.';
      
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  // Determine if error should be logged
  static shouldLogError(errorInfo) {
    const { severity, type } = errorInfo;
    
    // Always log critical and high severity errors
    if (severity === this.errorSeverity.CRITICAL || severity === this.errorSeverity.HIGH) {
      return true;
    }
    
    // Log server errors
    if (type === this.errorTypes.SERVER_ERROR) {
      return true;
    }
    
    // Log authentication/authorization errors
    if (type === this.errorTypes.AUTHENTICATION_ERROR || type === this.errorTypes.AUTHORIZATION_ERROR) {
      return true;
    }
    
    return false;
  }

  // Log error to console and/or external service
  static logError(errorInfo, context) {
    const logData = {
      ...errorInfo,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Console logging
    console.error('Error Handler:', logData);

    // In production, you would send this to an error tracking service
    // like Sentry, LogRocket, or Bugsnag
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorService(logData);
    }
  }

  // Send error to external service (placeholder)
  static sendToErrorService(logData) {
    // This would integrate with your error tracking service
    // Example: Sentry.captureException(logData.originalError, { extra: logData });
    console.log('Would send to error service:', logData);
  }

  // Create error boundary component
  static createErrorBoundary() {
    // This method is deprecated - use the ErrorBoundary component instead
    console.warn('createErrorBoundary is deprecated. Use the ErrorBoundary component instead.');
    return null;
  }

  // Retry mechanism for failed requests
  static async retryRequest(requestFn, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain error types
        const errorInfo = this.analyzeError(error);
        if (errorInfo.type === this.errorTypes.AUTHENTICATION_ERROR || 
            errorInfo.type === this.errorTypes.AUTHORIZATION_ERROR ||
            errorInfo.type === this.errorTypes.VALIDATION_ERROR) {
          throw error;
        }
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }
    
    throw lastError;
  }

  // Handle API errors with retry
  static async handleAPIError(apiCall, context = {}) {
    try {
      return await this.retryRequest(apiCall);
    } catch (error) {
      const errorInfo = this.handleError(error, context);
      
      // Show user notification
      if (window.toast) {
        window.toast.error(errorInfo.userMessage);
      }
      
      throw errorInfo;
    }
  }

  // Global error handler for unhandled errors
  static setupGlobalErrorHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      const errorInfo = this.handleError(error, { type: 'unhandledrejection' });
      console.error('Unhandled Promise Rejection:', errorInfo);
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      const error = event.error;
      const errorInfo = this.handleError(error, { type: 'uncaught' });
      console.error('Uncaught Error:', errorInfo);
    });
  }

  // Error recovery strategies
  static getRecoveryStrategy(errorInfo) {
    const { type, severity } = errorInfo;

    switch (type) {
      case this.errorTypes.NETWORK_ERROR:
        return {
          action: 'retry',
          message: 'Retry the operation',
          autoRetry: true
        };
      
      case this.errorTypes.AUTHENTICATION_ERROR:
        return {
          action: 'redirect',
          message: 'Redirect to login',
          redirectTo: '/login'
        };
      
      case this.errorTypes.AUTHORIZATION_ERROR:
        return {
          action: 'show_message',
          message: 'Contact administrator for access'
        };
      
      case this.errorTypes.VALIDATION_ERROR:
        return {
          action: 'show_form_errors',
          message: 'Please fix the highlighted fields'
        };
      
      case this.errorTypes.SERVER_ERROR:
        if (severity === this.errorSeverity.CRITICAL) {
          return {
            action: 'show_maintenance',
            message: 'System is under maintenance'
          };
        }
        return {
          action: 'retry_later',
          message: 'Try again in a few minutes'
        };
      
      default:
        return {
          action: 'refresh',
          message: 'Refresh the page'
        };
    }
  }
}

// React hook for error handling
export const useErrorHandler = () => {
  const handleError = (error, context = {}) => {
    return ErrorHandler.handleError(error, context);
  };

  const handleAPIError = async (apiCall, context = {}) => {
    return ErrorHandler.handleAPIError(apiCall, context);
  };

  return { handleError, handleAPIError };
};

export default ErrorHandler;
