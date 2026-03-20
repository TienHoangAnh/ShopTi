const express = require('express');
const { authenticate } = require('../middleware/authMongo');
const controller = require('../controllers-mongo/orders.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.list);
router.post('/quote', controller.quote);
router.post('/', controller.create);

// must be before /:id
router.put('/:id/cancel', controller.cancel);
router.get('/:id', controller.getOne);

module.exports = router;

