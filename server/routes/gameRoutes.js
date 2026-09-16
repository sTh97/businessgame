const express = require('express');
const gameController = require('../controllers/gameController');
const { authRequired } = require('../middleware/auth');
const { decisionLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.use(authRequired);

router.get('/industries', gameController.industries);
router.get('/preview', gameController.preview);
router.get('/', gameController.list);
router.post('/', gameController.create);
router.get('/:gameId', gameController.getOne);
router.get('/:gameId/dashboard', gameController.dashboard);
router.get('/:gameId/current-event', gameController.currentEvent);
router.post('/:gameId/decisions', decisionLimiter, gameController.decide);
router.get('/:gameId/history', gameController.history);
router.get('/:gameId/financials', gameController.financials);
router.get('/:gameId/projects', gameController.projects);
router.get('/:gameId/employees', gameController.employees);
router.get('/:gameId/people', gameController.people);
router.get('/:gameId/workplace', gameController.workplace);
router.get('/:gameId/competitors', gameController.competitors);
router.post('/:gameId/actions', decisionLimiter, gameController.act);
router.get('/:gameId/achievements', gameController.achievements);
router.get('/:gameId/market', gameController.market);
router.post('/:gameId/restart', gameController.restart);
router.get('/:gameId/report', gameController.report);

module.exports = router;
