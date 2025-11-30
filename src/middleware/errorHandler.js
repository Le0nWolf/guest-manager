/**
 * Global Error Handler Middleware
 */

import config from '../config/index.js';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';
  }
}

/**
 * Creates an ApiError for common scenarios
 */
export const createError = {
  badRequest: (message, details = null) => new ApiError(400, message, details),
  notFound: (message = 'Resource not found') => new ApiError(404, message),
  conflict: (message) => new ApiError(409, message),
  internal: (message = 'Internal server error') => new ApiError(500, message)
};

/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, _next) {
  // Log error
  console.error(`[ERROR] ${err.name}: ${err.message}`);
  if (config.isDevelopment && err.stack) {
    console.error(err.stack);
  }

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Build response
  const response = {
    success: false,
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  };

  // Add details if present
  if (err.details) {
    response.details = err.details;
  }

  // Add stack trace in development
  if (config.isDevelopment && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

export default errorHandler;
