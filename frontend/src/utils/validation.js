// Comprehensive data validation utilities
export class ValidationService {
  // Email validation
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      isValid: emailRegex.test(email),
      message: emailRegex.test(email) ? 'Valid email' : 'Please enter a valid email address'
    };
  }

  // Password validation
  static validatePassword(password) {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors,
      message: errors.length === 0 ? 'Strong password' : errors.join(', ')
    };
  }

  // Name validation
  static validateName(name, fieldName = 'Name') {
    if (!name || name.trim().length === 0) {
      return {
        isValid: false,
        message: `${fieldName} is required`
      };
    }
    
    if (name.trim().length < 2) {
      return {
        isValid: false,
        message: `${fieldName} must be at least 2 characters long`
      };
    }
    
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      return {
        isValid: false,
        message: `${fieldName} can only contain letters and spaces`
      };
    }

    return {
      isValid: true,
      message: 'Valid name'
    };
  }

  // Phone number validation
  static validatePhone(phone) {
    if (!phone) {
      return {
        isValid: true,
        message: 'Phone number is optional'
      };
    }
    
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    return {
      isValid: phoneRegex.test(cleanPhone),
      message: phoneRegex.test(cleanPhone) ? 'Valid phone number' : 'Please enter a valid phone number'
    };
  }

  // File validation
  static validateFile(file, options = {}) {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['text/csv', 'application/json'],
      allowedExtensions = ['.csv', '.json']
    } = options;

    const errors = [];

    // Check file size
    if (file.size > maxSize) {
      errors.push(`File size must be less than ${(maxSize / (1024 * 1024)).toFixed(1)}MB`);
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      errors.push(`File type must be one of: ${allowedTypes.join(', ')}`);
    }

    // Check file extension
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      errors.push(`File extension must be one of: ${allowedExtensions.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      message: errors.length === 0 ? 'Valid file' : errors.join(', ')
    };
  }

  // CSV data validation
  static validateCSVData(data, requiredColumns = []) {
    const errors = [];
    const warnings = [];

    if (!data || data.length === 0) {
      errors.push('CSV file is empty');
      return { isValid: false, errors, warnings };
    }

    // Check for required columns
    const headers = Object.keys(data[0]);
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Check for empty rows
    const emptyRows = data.filter(row => 
      Object.values(row).every(value => !value || value.toString().trim() === '')
    );
    
    if (emptyRows.length > 0) {
      warnings.push(`${emptyRows.length} empty rows found and will be skipped`);
    }

    // Check for duplicate customer IDs
    const customerIds = data.map(row => row.customer_id).filter(id => id);
    const duplicateIds = customerIds.filter((id, index) => customerIds.indexOf(id) !== index);
    
    if (duplicateIds.length > 0) {
      warnings.push(`Duplicate customer IDs found: ${[...new Set(duplicateIds)].join(', ')}`);
    }

    // Validate numeric fields
    const numericFields = ['total_spent', 'engagement_score', 'purchase_count', 'support_tickets'];
    data.forEach((row, index) => {
      numericFields.forEach(field => {
        if (row[field] && isNaN(parseFloat(row[field]))) {
          errors.push(`Row ${index + 1}: ${field} must be a number`);
        }
      });
    });

    // Validate email fields
    data.forEach((row, index) => {
      if (row.email && !this.validateEmail(row.email).isValid) {
        errors.push(`Row ${index + 1}: Invalid email format`);
      }
    });

    // Validate date fields
    data.forEach((row, index) => {
      if (row.last_interaction_date && isNaN(Date.parse(row.last_interaction_date))) {
        errors.push(`Row ${index + 1}: Invalid date format for last_interaction_date`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      message: errors.length === 0 ? 'CSV data is valid' : errors.join(', ')
    };
  }

  // Form validation
  static validateForm(formData, rules) {
    const errors = {};
    const isValid = true;

    Object.keys(rules).forEach(field => {
      const value = formData[field];
      const rule = rules[field];
      
      if (rule.required && (!value || value.toString().trim() === '')) {
        errors[field] = `${rule.label || field} is required`;
        return;
      }

      if (value && rule.type) {
        let validation;
        
        switch (rule.type) {
          case 'email':
            validation = this.validateEmail(value);
            break;
          case 'password':
            validation = this.validatePassword(value);
            break;
          case 'name':
            validation = this.validateName(value, rule.label);
            break;
          case 'phone':
            validation = this.validatePhone(value);
            break;
          default:
            validation = { isValid: true, message: 'Valid' };
        }

        if (!validation.isValid) {
          errors[field] = validation.message;
        }
      }

      if (value && rule.minLength && value.length < rule.minLength) {
        errors[field] = `${rule.label || field} must be at least ${rule.minLength} characters long`;
      }

      if (value && rule.maxLength && value.length > rule.maxLength) {
        errors[field] = `${rule.label || field} must be no more than ${rule.maxLength} characters long`;
      }

      if (value && rule.pattern && !rule.pattern.test(value)) {
        errors[field] = rule.message || `${rule.label || field} format is invalid`;
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      message: Object.keys(errors).length === 0 ? 'Form is valid' : 'Please fix the errors below'
    };
  }

  // API response validation
  static validateAPIResponse(response, expectedStructure) {
    const errors = [];

    if (!response) {
      errors.push('No response received');
      return { isValid: false, errors };
    }

    if (expectedStructure) {
      Object.keys(expectedStructure).forEach(key => {
        if (!(key in response)) {
          errors.push(`Missing required field: ${key}`);
        } else if (expectedStructure[key] && typeof response[key] !== expectedStructure[key]) {
          errors.push(`Field ${key} should be of type ${expectedStructure[key]}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      message: errors.length === 0 ? 'API response is valid' : errors.join(', ')
    };
  }

  // Data sanitization
  static sanitizeData(data) {
    if (typeof data === 'string') {
      return data.trim().replace(/[<>]/g, '');
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized = {};
      Object.keys(data).forEach(key => {
        sanitized[key] = this.sanitizeData(data[key]);
      });
      return sanitized;
    }
    
    return data;
  }

  // Real-time validation for form fields
  static createFieldValidator(field, rules) {
    return (value) => {
      const validation = this.validateForm({ [field]: value }, { [field]: rules });
      return {
        isValid: validation.isValid,
        message: validation.errors[field] || 'Valid'
      };
    };
  }

  // Batch validation for multiple items
  static validateBatch(items, validator) {
    const results = items.map((item, index) => {
      const validation = validator(item);
      return {
        index,
        item,
        isValid: validation.isValid,
        errors: validation.errors || [],
        message: validation.message
      };
    });

    return {
      results,
      validCount: results.filter(r => r.isValid).length,
      invalidCount: results.filter(r => !r.isValid).length,
      isValid: results.every(r => r.isValid)
    };
  }
}

// Common validation rules
export const ValidationRules = {
  email: {
    type: 'email',
    required: true,
    label: 'Email'
  },
  password: {
    type: 'password',
    required: true,
    label: 'Password'
  },
  firstName: {
    type: 'name',
    required: true,
    label: 'First Name',
    minLength: 2
  },
  lastName: {
    type: 'name',
    required: true,
    label: 'Last Name',
    minLength: 2
  },
  phone: {
    type: 'phone',
    required: false,
    label: 'Phone Number'
  },
  organization: {
    required: true,
    label: 'Organization',
    minLength: 2
  }
};

// CSV column validation rules
export const CSVValidationRules = {
  customer_id: { required: true, type: 'string' },
  company_name: { required: true, type: 'string' },
  industry: { required: false, type: 'string' },
  total_spent: { required: false, type: 'number' },
  engagement_score: { required: false, type: 'number', min: 0, max: 100 },
  status: { required: false, type: 'string', values: ['Active', 'Inactive', 'Prospect'] },
  last_interaction_date: { required: false, type: 'date' }
};

export default ValidationService;
