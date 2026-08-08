/**
 * Async error handler wrapper to eliminate try/catch boilerplate in controllers
 * Usage: router.get('/route', catchAsync(controller))
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;
