// Centralized Error Handling Middleware for ExpenseFlow

module.exports = (err, req, res, next) => {
  // Log full error details securely on the server
  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.stack || err);

  // Default status code and message
  let statusCode = err.status || err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle MySQL Specific Errors without exposing internals
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'A record with these details already exists.';
  } else if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    statusCode = 400;
    message = 'Referenced resource does not exist.';
  } else if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    // In production, mask unhandled 500 error messages
    message = 'An unexpected internal server error occurred.';
  }

  res.status(statusCode).json({
    success: false,
    message
  });
};
