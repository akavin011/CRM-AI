export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, status: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = { message: 'Invalid token', status: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    error = { message: 'Token expired', status: 401 };
  }

  // Rate limit error
  if (err.status === 429) {
    error = { message: 'Too many requests', status: 429 };
  }

  res.status(error.status).json({
    success: false,
    error: error.message,
    ...(error.stack && { stack: error.stack }),
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
};

