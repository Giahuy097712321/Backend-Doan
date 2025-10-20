

const PaymentService = require('../services/PaymentService')

const createPaymentIntent = async (req, res) => {
    try {
        const { totalPrice } = req.body

        if (!totalPrice || Number(totalPrice) <= 0) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Tổng tiền không hợp lệ',
            })
        }

        const response = await PaymentService.createPaymentIntent(Number(totalPrice))
        return res.status(200).json(response)
    } catch (error) {
        console.error('❌ Lỗi tại paymentController:', error)
        return res.status(500).json({
            status: 'ERR',
            message: error.message || 'Internal Server Error',
        })
    }
}


module.exports = { createPaymentIntent }
