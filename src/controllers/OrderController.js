const OrderService = require('../services/OrderService')
const Order = require('../models/OrderProduct')
const createOrder = async (req, res) => {
    console.log("🧾 Dữ liệu nhận từ frontend:", req.body)
    const {
        paymentMethod,
        itemsPrice,
        shippingPrice,
        totalPrice,
        delivery,
        orderItems,
        user,
        discount,
        taxPrice,
        fullName,
        address,
        city,
        phone,
        country,
        email
    } = req.body;

    if (
        !paymentMethod ||
        itemsPrice == null ||
        shippingPrice == null ||
        totalPrice == null ||
        !fullName ||
        !address ||
        !city ||
        !phone ||
        !delivery
    ) {
        return res.status(400).json({
            status: "ERR",
            message: "The input is required",
        });
    }

    try {
        const response = await OrderService.createOrder({
            paymentMethod,
            itemsPrice,
            shippingPrice,
            totalPrice,
            delivery,
            orderItems,
            user,
            discount,
            taxPrice,
            fullName,
            address,
            city,
            phone,
            country,
            email,
        });

        return res.status(200).json(response);
    } catch (e) {
        console.error("❌ Lỗi createOrder:", e);
        return res.status(500).json({ message: e.message });
    }
};


const getAllOrderDetails = async (req, res) => {
    try {
        const userId = req.params.id;
        if (!userId) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Thiếu userId',
            });
        }

        const response = await OrderService.getAllOrderDetails(userId);
        return res.status(200).json(response);
    } catch (e) {
        console.error('Error in getAllOrderDetails:', e);
        return res.status(500).json({
            status: 'ERR',
            message: e.message || 'Internal Server Error',
        });
    }
};
const getDetailsOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        if (!orderId) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Thiếu userId',
            });
        }

        const response = await OrderService.getDetailsOrder(orderId);
        return res.status(200).json(response);
    } catch (e) {
        console.error('Error in getAllOrderDetails:', e);
        return res.status(500).json({
            status: 'ERR',
            message: e.message || 'Internal Server Error',
        });
    }
};
const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const data = req.body;
        if (!orderId) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Thiếu ID đơn hàng',
            });
        }

        const response = await OrderService.cancelOrder(orderId, data);
        return res.status(200).json(response);
    } catch (e) {
        console.error('Error in cancelOrder:', e);
        return res.status(500).json({
            status: 'ERR',
            message: e.message || 'Internal Server Error',
        });
    }
};
const payOrder = async (req, res) => {
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order không tồn tại' });
        }

        order.isPaid = true;
        order.paidAt = Date.now(); // thời gian thanh toán

        await order.save();

        res.json({ status: 'OK', data: order });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server', error: err.message });
    }
};
const getAllOrder = async (req, res) => {
    try {
        const data = await OrderService.getAllOrder()
        return res.status(200).json(data);
    } catch (e) {

        return res.status(500).json({
            status: 'ERR',
            message: e.message || 'Internal Server Error',
        });
    }
};
const updateOrder = async (req, res) => {
    try {
        const orderId = req.params.id; // Lấy ID từ URL
        const data = req.body; // Dữ liệu gửi lên từ frontend

        if (!orderId) {
            return res.status(400).json({
                status: 'ERR',
                message: 'Thiếu ID đơn hàng',
            });
        }

        const response = await OrderService.updateOrder(orderId, data);

        return res.status(200).json(response);
    } catch (e) {
        console.error('Error in updateOrder:', e);
        return res.status(500).json({
            status: 'ERR',
            message: e.message || 'Internal Server Error',
        });
    }
};

module.exports = {
    createOrder, getAllOrderDetails,
    getDetailsOrder, cancelOrder, payOrder, getAllOrder, updateOrder
}