/**
 * Standardized API Response Helpers
 */

/**
 * Creates a successful response object
 * @param {*} data - Response data
 * @param {string} [message] - Optional success message
 * @returns {object} Standardized success response
 */
export function successResponse(data, message = null) {
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };

  if (message) {
    response.message = message;
  }

  return response;
}

/**
 * Creates an error response object
 * @param {string} error - Error message
 * @param {*} [details] - Optional error details
 * @returns {object} Standardized error response
 */
export function errorResponse(error, details = null) {
  const response = {
    success: false,
    error,
    timestamp: new Date().toISOString()
  };

  if (details) {
    response.details = details;
  }

  return response;
}

/**
 * Sends a successful JSON response
 * @param {Response} res - Express response object
 * @param {*} data - Response data
 * @param {object} options - Options
 * @param {number} [options.statusCode=200] - HTTP status code
 * @param {string} [options.message] - Success message
 */
export function sendSuccess(res, data, { statusCode = 200, message = null } = {}) {
  res.status(statusCode).json(successResponse(data, message));
}

/**
 * Sends an error JSON response
 * @param {Response} res - Express response object
 * @param {string} error - Error message
 * @param {object} options - Options
 * @param {number} [options.statusCode=400] - HTTP status code
 * @param {*} [options.details] - Error details
 */
export function sendError(res, error, { statusCode = 400, details = null } = {}) {
  res.status(statusCode).json(errorResponse(error, details));
}

export default {
  successResponse,
  errorResponse,
  sendSuccess,
  sendError
};
