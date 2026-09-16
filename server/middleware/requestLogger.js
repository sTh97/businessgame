const logger = require('../utils/logger');

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('http_request', {
      requestId: req.requestId,
      userId: req.userId || null,
      method: req.method,
      route: req.originalUrl,
      status: res.statusCode,
      latencyMs: Date.now() - start
    });
  });
  next();
}

module.exports = { requestLogger };
