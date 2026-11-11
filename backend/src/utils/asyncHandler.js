/**
 * Wraps an async route handler to catch and forward errors to Express error middleware
 * @param {Function} fn
 * @returns {Function} Express middleware handler
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

