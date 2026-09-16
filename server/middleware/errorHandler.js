const logger = require('../utils/logger');
const { AppError } = require('../utils/http');

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error('app_error', { requestId: req.requestId, code: err.code, message: err.message });
    }
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.extra || {}) }
    });
  }

  if (err.name === 'CastError') {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Not found' }
    });
  }

  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.issues?.[0]?.message || 'Invalid request',
        details: err.issues
      }
    });
  }

  logger.error('internal_error', {
    requestId: req.requestId,
    message: err.message,
    stack: envSafeStack(err)
  });

  return res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' }
  });
}

function envSafeStack(err) {
  return process.env.NODE_ENV === 'production' ? undefined : err.stack;
}

module.exports = { errorHandler };
