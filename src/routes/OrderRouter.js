const express = require("express");
const router = express.Router()
const OrderController = require('../controllers/OrderController');
const { authUserMiddleWare, authMiddleWare } = require('../middleware/authMiddleware')
const { payOrder } = require('../controllers/OrderController');

router.post('/create', authUserMiddleWare, OrderController.createOrder)
router.get('/get-all-order/:id', authUserMiddleWare, OrderController.getAllOrderDetails)
router.get('/get-details-order/:id', authUserMiddleWare, OrderController.getDetailsOrder)
router.delete('/cancel-order/:id', authUserMiddleWare, OrderController.cancelOrder);
router.post('/:id/pay', authUserMiddleWare, OrderController.payOrder);
router.get('/get-all-order', authMiddleWare, OrderController.getAllOrder);
router.put('/update/:id', authMiddleWare, OrderController.updateOrder);
router.post('/reorder/:id', authUserMiddleWare, OrderController.reorder);
module.exports = router