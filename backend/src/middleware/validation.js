export const validateCustomerData = (req, res, next) => {
  const { company_name, industry, engagement_score, total_spent } = req.body;
  
  const errors = [];
  
  if (!company_name || company_name.trim().length === 0) {
    errors.push('Company name is required');
  }
  
  if (industry && !['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing'].includes(industry)) {
    errors.push('Invalid industry');
  }
  
  if (engagement_score !== undefined && (isNaN(engagement_score) || engagement_score < 0 || engagement_score > 100)) {
    errors.push('Engagement score must be between 0 and 100');
  }
  
  if (total_spent !== undefined && (isNaN(total_spent) || total_spent < 0)) {
    errors.push('Total spent must be a positive number');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }
  
  next();
};

