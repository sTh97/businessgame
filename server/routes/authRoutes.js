const express = require('express');
const authController = require('../controllers/authController');
const { authRequired } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', authLimiter, authController.forgot);
router.post('/reset-password', authLimiter, authController.reset);
router.get('/me', authRequired, authController.me);
router.post('/heartbeat', authRequired, authController.heartbeat);

module.exports = router;
