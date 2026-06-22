/**
 * Unified Response Handler for the application
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {boolean} success - true for success, false for error
 * @param {string} message - A descriptive message
 * @param {any} data - The payload or error detail
 */

export const sendResponse = (res, statusCode, success, message, data = null) => {
  res.status(statusCode).json({
    success,
    message,
    data
  });
};

// Agar tumhein abhi bhi alag functions hi chahiye, 
// toh tum ise aise bhi likh sakte ho:

export const successRes = (res, statusCode, message, data) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const errorRes = (res, statusCode, message, data = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    data
  });
};