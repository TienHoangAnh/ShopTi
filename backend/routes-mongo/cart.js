const express = require('express');
const { authenticate } = require('../middleware/authMongo');
const controller = require('../controllers-mongo/cart.controller');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.list);
router.post('/', controller.add);
router.put('/:id', controller.updateQty);
router.delete('/:id', controller.remove);

module.exports = router;

