const express = require('express')
const router = express.Router()
const PaymentController = require('../controllers/paymentController')
const { authUserMiddleWare } = require('../middleware/authMiddleware')
const OrderController = require('../controllers/OrderController');
// Tạo payment intent
router.post('/create-payment-intent', authUserMiddleWare, PaymentController.createPaymentIntent)
router.post('/:id/pay', authUserMiddleWare, OrderController.payOrder);
module.exports = router
//hihi