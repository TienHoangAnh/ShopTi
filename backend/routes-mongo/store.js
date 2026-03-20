const express = require('express');
const { authenticate } = require('../middleware/authMongo');
const controller = require('../controllers-mongo/store.controller');

const router = express.Router();
router.use(authenticate);

router.get('/me', controller.me);
router.post('/apply', controller.apply);
router.post('/register', controller.registerShop);

// Payment & OTP verification (mock)
router.get('/payment/:payment_code', controller.paymentGet);
router.post('/payment/simulate-success', controller.paymentSimulateSuccess);

module.exports = router;

