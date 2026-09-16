const AdminService = require('../services/AdminService');
const { parse, adminLoginSchema } = require('../validators');
const { ok } = require('../utils/http');

async function login(req, res, next) {
  try {
    const body = parse(adminLoginSchema, req.body);
    const data = await AdminService.login(body);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    return ok(res, AdminService.me(req.admin));
  } catch (err) {
    next(err);
  }
}

async function overview(req, res, next) {
  try {
    const data = await AdminService.overview();
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me, overview };
