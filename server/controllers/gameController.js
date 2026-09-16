const GameService = require('../services/GameService');
const IndustryConfigService = require('../services/IndustryConfigService');
const { parse, createGameSchema, previewSchema, decisionSchema } = require('../validators');
const { ok, created } = require('../utils/http');

async function list(req, res, next) {
  try {
    const data = await GameService.listGames(req.userId, req.query.status);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function industries(req, res, next) {
  try {
    const rows = await IndustryConfigService.listIndustries();
    return ok(res, {
      industries: rows.map((r) => ({
        id: r._id,
        name: r.name,
        tagline: r.tagline,
        description: r.description,
        locked: r.locked,
        release: r.release,
        coreBottleneck: r.industryConfig?.coreBottleneck,
        primaryRevenueDriver: r.industryConfig?.primaryRevenueDriver,
        signatureRisk: r.industryConfig?.signatureRisk
      }))
    });
  } catch (err) {
    next(err);
  }
}

async function preview(req, res, next) {
  try {
    const body = parse(previewSchema, {
      industry: req.query.industry || req.body.industry,
      difficulty: req.query.difficulty || req.body.difficulty
    });
    const data = await GameService.preview(body.industry, body.difficulty);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const body = parse(createGameSchema, req.body);
    const data = await GameService.createGame(req.userId, body);
    return created(res, data);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const data = await GameService.getGame(req.userId, req.params.gameId);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function dashboard(req, res, next) {
  try {
    const data = await GameService.dashboard(req.userId, req.params.gameId);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function currentEvent(req, res, next) {
  try {
    const data = await GameService.currentEvent(req.userId, req.params.gameId);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function decide(req, res, next) {
  try {
    const body = parse(decisionSchema, req.body);
    const data = await GameService.submitDecision(req.userId, req.params.gameId, body);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function history(req, res, next) {
  try {
    const data = await GameService.history(req.userId, req.params.gameId, req.query.page, req.query.limit);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function financials(req, res, next) {
  try {
    const data = await GameService.financials(req.userId, req.params.gameId, req.query.limit);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function projects(req, res, next) {
  try {
    const data = await GameService.listProjects(req.userId, req.params.gameId);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function employees(req, res, next) {
  try {
    const data = await GameService.listEmployees(req.userId, req.params.gameId);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function achievements(req, res, next) {
  try {
    const data = await GameService.listAchievements(req.userId, req.params.gameId);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function market(req, res, next) {
  try {
    const data = await GameService.market(req.userId, req.params.gameId);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function restart(req, res, next) {
  try {
    const data = await GameService.restart(req.userId, req.params.gameId);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

async function report(req, res, next) {
  try {
    const data = await GameService.founderReport(req.userId, req.params.gameId);
    return ok(res, data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  industries,
  preview,
  create,
  getOne,
  dashboard,
  currentEvent,
  decide,
  history,
  financials,
  projects,
  employees,
  achievements,
  market,
  restart,
  report
};
