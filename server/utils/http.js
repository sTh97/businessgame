function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

function created(res, data) {
  return ok(res, data, 201);
}

function fail(res, code, message, extra = {}, status = 400) {
  return res.status(status).json({
    success: false,
    error: { code, message, ...extra }
  });
}

class AppError extends Error {
  constructor(code, message, status = 400, extra = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

module.exports = { ok, created, fail, AppError };
