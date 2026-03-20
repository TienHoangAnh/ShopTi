const express = require('express');
const { authenticate } = require('../middleware/authMongo');
const controller = require('../controllers-mongo/auth.controller');

const router = express.Router();

router.post('/register', controller.register);
router.post('/login', controller.login);
router.get('/me', authenticate, controller.me);
router.put('/profile', authenticate, controller.profile);

module.exports = router;

