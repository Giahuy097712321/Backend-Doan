const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

const createPaymentIntent = async (totalPrice) => {
    try {
        // ⚙️ Nếu bạn đang tính theo VNĐ, chuyển sang USD tạm thời để không quá giới hạn
        const amountInUSD = Math.round(totalPrice / 25000) // tạm quy đổi 25,000 VND = 1 USD

        console.log(`💵 Tổng tiền VNĐ: ${totalPrice} ~ USD: ${amountInUSD}`)

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInUSD * 100, // Stripe tính bằng cent
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
        })

        return {
            status: 'OK',
            message: 'Tạo payment intent thành công',
            clientSecret: paymentIntent.client_secret,
        }
    } catch (error) {
        console.error('❌ Lỗi tại PaymentService:', error)
        return {
            status: 'ERR',
            message: error.message || 'Không thể tạo payment intent',
        }
    }
}

module.exports = { createPaymentIntent }
