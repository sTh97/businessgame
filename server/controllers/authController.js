const AuthService = require('../services/AuthService');
const { parse, registerSchema, loginSchema, forgotSchema, resetSchema } = require('../validators');
const { ok, created } = require('../utils/http');

async function register(req, res, next) {
  try {
    const body = parse(registerSchema, req.body);
    const data = await AuthService.register(body);
    return created(res, data);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const body = parse(loginSchema, req.body);
    const data = await AuthService.login(body, res);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const data = await AuthService.refresh(req, res);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const data = await AuthService.logout(req, res);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function forgot(req, res, next) {
  try {
    const body = parse(forgotSchema, req.body);
    const data = await AuthService.forgotPassword(body.email);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function reset(req, res, next) {
  try {
    const body = parse(resetSchema, req.body);
    const data = await AuthService.resetPassword(body);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const data = await AuthService.me(req.userId);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, forgot, reset, me };
