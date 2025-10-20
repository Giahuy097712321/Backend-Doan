// src/services/PaymentService.js
require('dotenv').config(); // Load .env nếu có
const Stripe = require('stripe');

if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('⚠️ PaymentService: STRIPE_SECRET_KEY chưa được thiết lập! Các request Stripe sẽ thất bại nếu gọi.');
}

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const createPaymentIntent = async (totalPrice) => {
    if (!stripe) {
        return {
            status: 'ERR',
            message: 'STRIPE_SECRET_KEY chưa được thiết lập. Không thể tạo payment intent.'
        };
    }

    try {
        const amountInUSD = Math.round(totalPrice / 25000); // VND -> USD
        console.log(`💵 Tổng tiền VNĐ: ${totalPrice} ~ USD: ${amountInUSD}`);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInUSD * 100, // Stripe tính bằng cent
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
        });

        return {
            status: 'OK',
            message: 'Tạo payment intent thành công',
            clientSecret: paymentIntent.client_secret,
        };
    } catch (error) {
        console.error('❌ Lỗi tại PaymentService:', error);
        return {
            status: 'ERR',
            message: error.message || 'Không thể tạo payment intent',
        };
    }
};

module.exports = { createPaymentIntent };
