const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { fail } = require('../utils/http');
const logger = require('../utils/logger');

function authRequired(req, res, next) {
  const header = req.get('authorization') || '';
  const [, token] = header.split(' ');
  if (!token) {
    logger.warn('auth_missing', { path: req.path, requestId: req.requestId });
    return fail(res, 'UNAUTHORIZED', 'Authentication required', {}, 401);
  }
  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);
    if (payload.typ !== 'access') {
      return fail(res, 'UNAUTHORIZED', 'Invalid token type', {}, 401);
    }
    req.userId = payload.sub;
    next();
  } catch {
    return fail(res, 'UNAUTHORIZED', 'Invalid or expired token', {}, 401);
  }
}

module.exports = { authRequired };
