/**
 * Request Logger Middleware
 */

import config from '../config/index.js';

/**
 * Logs incoming HTTP requests
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  // Log request
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.url;

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // Color code status
    let statusColor = '';
    let resetColor = '';

    if (config.isDevelopment) {
      if (statusCode >= 500) {
        statusColor = '\x1b[31m'; // Red
      } else if (statusCode >= 400) {
        statusColor = '\x1b[33m'; // Yellow
      } else if (statusCode >= 300) {
        statusColor = '\x1b[36m'; // Cyan
      } else {
        statusColor = '\x1b[32m'; // Green
      }
      resetColor = '\x1b[0m';
    }

    console.log(
      `[${timestamp}] ${method} ${url} ${statusColor}${statusCode}${resetColor} - ${duration}ms`
    );
  });

  next();
}

export default requestLogger;
