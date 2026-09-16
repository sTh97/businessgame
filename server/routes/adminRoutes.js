const express = require('express');
const adminController = require('../controllers/adminController');
const { adminRequired } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/login', authLimiter, adminController.login);
router.get('/me', adminRequired, adminController.me);
router.get('/', adminRequired, adminController.overview);

module.exports = router;
