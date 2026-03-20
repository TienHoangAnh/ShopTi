const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/authMongo');
const controller = require('../controllers-mongo/products.controller');

const router = express.Router();

router.get('/', controller.list);
router.get('/filters', controller.filters);
router.get('/:id', controller.getOne);

// Admin CRUD
router.post('/', authenticate, requireAdmin, controller.create);
router.put('/:id', authenticate, requireAdmin, controller.update);
router.delete('/:id', authenticate, requireAdmin, controller.remove);

module.exports = router;

