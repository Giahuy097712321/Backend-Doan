// models/OrderProduct.js
const mongoose = require("mongoose")

const orderSchema = new mongoose.Schema({
    orderItems: [
        {
            name: { type: String, required: true },
            amount: { type: Number, required: true },
            image: { type: String, required: true },
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product',
                required: true,
            },
            price: { type: Number, required: true },
            discount: { type: Number, default: 0 },
        },
    ],
    shippingAddress: {
        fullName: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        country: { type: String, required: true },
        phone: { type: Number, required: true },
    },
    paymentMethod: { type: String, required: true },
    delivery: { type: String, required: true },
    itemsPrice: { type: Number, required: true },
    shippingPrice: { type: Number, required: true },
    taxPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    discount: { type: Number, default: 0 },

    // Trạng thái giao hàng
    deliveryStatus: {
        type: String,
        enum: ['pending', 'processing', 'shipping', 'delivered', 'cancelled'],
        default: 'pending'
    },

    // Trạng thái thanh toán
    paymentStatus: {
        type: String,
        enum: ['unpaid', 'paid', 'partial', 'refunded'],
        default: 'unpaid'
    },

    // Các trường cũ (giữ để tương thích)
    isPaid: { type: Boolean, default: false },
    isDelivered: { type: Boolean, default: false },
    isCancelled: { type: Boolean, default: false },

    // Thời gian
    paidAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
},
    {
        timestamps: true,
    }
);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;