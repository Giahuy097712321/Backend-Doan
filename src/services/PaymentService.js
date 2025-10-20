// src/services/PaymentService.js
require('dotenv').config(); // Load .env trước khi dùng

const Stripe = require('stripe');

// ⚠️ Kiểm tra biến môi trường
if (!process.env.STRIPE_SECRET_KEY) {
    console.error('❌ LỖI: Biến môi trường STRIPE_SECRET_KEY chưa được thiết lập!');
    console.error('Hãy thêm STRIPE_SECRET_KEY vào .env hoặc Environment Variables trên Render.');
    process.exit(1); // Dừng app để tránh chạy với undefined
}

// Khởi tạo Stripe với API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Tạo Payment Intent
 * @param {number} totalPrice Tổng tiền VNĐ
 * @returns {object} status, message, clientSecret
 */
const createPaymentIntent = async (totalPrice) => {
    try {
        // Quy đổi VNĐ sang USD (ví dụ tạm 1 USD = 25,000 VND)
        const amountInUSD = Math.round(totalPrice / 25000);

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
