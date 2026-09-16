const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const logger = require('../utils/logger');
const { AppError } = require('../utils/http');
const { users, refreshTokens, passwordResets } = require('../repositories');

const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function validateEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(e) || e.length > 254) {
    throw new AppError('VALIDATION_ERROR', 'Enter a valid email address', 400);
  }
  return e;
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    throw new AppError('VALIDATION_ERROR', 'Password must be at least 8 characters', 400);
  }
  return password;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccess(userId) {
  return jwt.sign({ sub: String(userId), typ: 'access' }, env.jwtAccessSecret, { expiresIn: '15m' });
}

function signRefresh(userId, jti) {
  return jwt.sign({ sub: String(userId), jti, typ: 'refresh' }, env.jwtRefreshSecret, { expiresIn: '7d' });
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.isProd,
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, cookieOptions());
  const csrf = crypto.randomBytes(24).toString('hex');
  res.cookie('csrfToken', csrf, {
    httpOnly: false,
    sameSite: 'strict',
    secure: env.isProd,
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearAuthCookies(res) {
  res.clearCookie('refreshToken', { ...cookieOptions(), maxAge: 0 });
  res.clearCookie('csrfToken', { httpOnly: false, sameSite: 'strict', secure: env.isProd, path: '/api/auth', maxAge: 0 });
}

async function issueRefresh(userId) {
  const jti = crypto.randomUUID();
  const token = signRefresh(userId, jti);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await refreshTokens.create({
    userId,
    jti,
    tokenHash: hashToken(token),
    expiresAt
  });
  return token;
}

async function register({ email, password }) {
  const e = validateEmail(email);
  validatePassword(password);
  const existing = await users.findOne({ email: e });
  if (existing) {
    throw new AppError('VALIDATION_ERROR', 'An account with this email already exists', 400);
  }
  const passwordHash = await bcrypt.hash(password, env.bcryptCost);
  const user = await users.create({ email: e, passwordHash });
  logger.info('auth_register', { userId: String(user._id) });
  return { userId: String(user._id), email: user.email };
}

async function login({ email, password }, res) {
  const e = validateEmail(email);
  const user = await users.findOne({ email: e });
  if (!user) throw new AppError('UNAUTHORIZED', 'Invalid email or password', 401);
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AppError('UNAUTHORIZED', 'Invalid email or password', 401);
  user.lastLoginAt = new Date();
  await user.save();
  const accessToken = signAccess(user._id);
  const refresh = await issueRefresh(user._id);
  setRefreshCookie(res, refresh);
  logger.info('auth_login', { userId: String(user._id) });
  return { accessToken, user: { userId: String(user._id), email: user.email } };
}

async function refresh(req, res) {
  const token = req.cookies?.refreshToken;
  if (!token) throw new AppError('UNAUTHORIZED', 'No refresh token', 401);
  if (req.cookies?.csrfToken && req.get('x-csrf-token') && req.cookies.csrfToken !== req.get('x-csrf-token')) {
    throw new AppError('UNAUTHORIZED', 'CSRF mismatch', 401);
  }
  let payload;
  try {
    payload = jwt.verify(token, env.jwtRefreshSecret);
  } catch {
    throw new AppError('UNAUTHORIZED', 'Invalid refresh token', 401);
  }
  const stored = await refreshTokens.findOne({
    jti: payload.jti,
    userId: payload.sub,
    revokedAt: { $exists: false }
  });
  if (!stored || stored.tokenHash !== hashToken(token) || stored.expiresAt < new Date()) {
    throw new AppError('UNAUTHORIZED', 'Refresh token revoked', 401);
  }
  stored.revokedAt = new Date();
  await stored.save();
  const accessToken = signAccess(payload.sub);
  const next = await issueRefresh(payload.sub);
  setRefreshCookie(res, next);
  return { accessToken };
}

async function logout(req, res) {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const payload = jwt.verify(token, env.jwtRefreshSecret);
      await refreshTokens.updateMany({ userId: payload.sub, jti: payload.jti }, { $set: { revokedAt: new Date() } });
    } catch {
      /* ignore */
    }
  }
  clearAuthCookies(res);
  logger.info('auth_logout', { userId: req.userId || null });
  return { message: 'Logged out' };
}

async function forgotPassword(email) {
  const e = validateEmail(email);
  const user = await users.findOne({ email: e });
  if (user) {
    const raw = crypto.randomBytes(32).toString('hex');
    await passwordResets.create({
      userId: user._id,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    });
    const link = `${env.publicAppUrl}/#/reset-password?token=${raw}`;
    if (env.smtp.host) {
      logger.info('password_reset_email_queued', { userId: String(user._id) });
    } else {
      logger.info('password_reset_link', { userId: String(user._id), link });
    }
  }
  return { message: 'If that email exists, a reset link has been issued.' };
}

async function resetPassword({ token, newPassword }) {
  validatePassword(newPassword);
  if (!token) throw new AppError('VALIDATION_ERROR', 'Reset token required', 400);
  const tokenHash = hashToken(token);
  const doc = await passwordResets.findOneAndUpdate(
    { tokenHash, usedAt: { $exists: false }, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { new: true }
  );
  if (!doc) throw new AppError('VALIDATION_ERROR', 'Reset token is invalid or expired', 400);
  const passwordHash = await bcrypt.hash(newPassword, env.bcryptCost);
  await users.updateOne({ _id: doc.userId }, { $set: { passwordHash } });
  await refreshTokens.updateMany({ userId: doc.userId }, { $set: { revokedAt: new Date() } });
  logger.info('auth_password_reset', { userId: String(doc.userId) });
  return { message: 'Password updated. Please log in.' };
}

async function me(userId) {
  const user = await users.findById(userId).lean();
  if (!user) throw new AppError('UNAUTHORIZED', 'User not found', 401);
  return { userId: String(user._id), email: user.email };
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  me,
  signAccess,
  validateEmail
};
