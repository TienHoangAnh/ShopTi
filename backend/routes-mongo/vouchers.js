const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/authMongo');
const ctrl = require('../controllers-mongo/vouchers.controller');

const router = express.Router();

// Public list (no auth)
router.get('/', ctrl.listPublic);

// User vault
router.get('/my', authenticate, ctrl.my);
router.post('/claim', authenticate, ctrl.claim);

// Admin manage vouchers
router.get('/admin', authenticate, requireAdmin, ctrl.adminList);
router.post('/admin', authenticate, requireAdmin, ctrl.adminCreate);

module.exports = router;

