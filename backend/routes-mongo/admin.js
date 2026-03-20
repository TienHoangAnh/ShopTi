const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/authMongo');
const controller = require('../controllers-mongo/admin.controller');
const productsCtrl = require('../controllers-mongo/products.controller');

const router = express.Router();
router.use(authenticate);
router.use(requireAdmin);

router.get('/dashboard', controller.dashboard);
router.get('/categories', controller.categories);

router.get('/products', productsCtrl.adminListAll);
router.post('/products', productsCtrl.create);
router.get('/products/:id', productsCtrl.getOne);
router.put('/products/:id', productsCtrl.update);
router.delete('/products/:id', productsCtrl.remove);

router.get('/users', controller.usersList);
router.get('/users/:id', controller.usersGet);
router.put('/users/:id', controller.usersUpdate);
router.delete('/users/:id', controller.usersDelete);

router.get('/orders', controller.ordersList);
router.get('/orders/:id', controller.ordersGet);
router.put('/orders/:id', controller.ordersUpdate);

// POST /api/admin/confirm-payment - manual payment confirmation (optional)
router.post('/confirm-payment', controller.confirmPayment);

module.exports = router;