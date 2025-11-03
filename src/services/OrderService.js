const Order = require("../models/OrderProduct");
const Product = require("../models/ProductModel");
const EmailService = require("./EmailService");

const createOrder = (newOrder) => {
    return new Promise(async (resolve, reject) => {
        try {
            console.log("🛒 Bắt đầu tạo đơn hàng với dữ liệu:", {
                email: newOrder.email,
                fullName: newOrder.fullName,
                orderItemsCount: newOrder.orderItems?.length
            });

            const {
                orderItems,
                paymentMethod,
                itemsPrice,
                shippingPrice,
                totalPrice,
                fullName,
                address,
                city,
                phone,
                user,
                delivery,
                discount = 0,
                country,
                taxPrice = 0,
                email
            } = newOrder;

            // ✅ VALIDATION DỮ LIỆU ĐẦU VÀO
            if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
                return resolve({
                    status: "ERR",
                    message: "Danh sách sản phẩm không hợp lệ",
                });
            }

            if (!email) {
                return resolve({
                    status: "ERR",
                    message: "Email là bắt buộc",
                });
            }

            // ✅ Bước 1: Kiểm tra tồn kho cho tất cả sản phẩm
            for (const item of orderItems) {
                const product = await Product.findById(item.product);
                if (!product || product.countInStock < item.amount) {
                    return resolve({
                        status: "ERR",
                        message: `Sản phẩm "${product?.name || item.product}" không đủ hàng trong kho`,
                    });
                }
            }

            // ✅ Bước 2: Giảm số lượng tồn kho & tăng selled cho từng sản phẩm
            for (const item of orderItems) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: {
                        countInStock: -item.amount,
                        selled: +item.amount,
                    },
                });
            }

            // ✅ Bước 3: Tạo 1 đơn hàng duy nhất
            const createdOrder = await Order.create({
                orderItems,
                shippingAddress: {
                    fullName,
                    address,
                    city,
                    country,
                    phone,
                },
                paymentMethod,
                delivery,
                itemsPrice,
                shippingPrice,
                taxPrice,
                totalPrice,
                user,
                discount,
            });

            if (!createdOrder) {
                return resolve({
                    status: "ERR",
                    message: "Không thể tạo đơn hàng",
                });
            }

            console.log("✅ Đơn hàng đã được tạo:", createdOrder._id);

            // ✅ Bước 4: Chuẩn bị dữ liệu email ĐẦY ĐỦ
            const orderInfo = {
                orderCode: createdOrder._id.toString(),
                fullName: fullName || 'Khách hàng',
                phone: phone || 'Chưa có',
                address: address || 'Chưa có',
                city: city || 'Chưa có',
                country: country || 'Chưa có',
                paymentMethod: paymentMethod || 'Chưa xác định',
                delivery: delivery || 'Chưa xác định',
                itemsPrice: itemsPrice || 0,
                shippingPrice: shippingPrice || 0,
                totalPrice: totalPrice || 0,
                taxPrice: taxPrice || 0,
                discount: discount || 0,
                email: email,
                isPaid: false
            };

            console.log("📧 Chuẩn bị gửi email với orderInfo:", orderInfo);

            // ✅ Bước 5: Gửi email với error handling
            if (email) {
                try {
                    const emailResult = await EmailService.sendEmailCreateOrder(
                        email,
                        orderItems,
                        orderInfo
                    );

                    if (emailResult.success) {
                        console.log("✅ Email đã được gửi thành công");
                    } else {
                        console.warn("⚠️ Gửi email thất bại:", emailResult.error);
                        // KHÔNG reject order vì lỗi email, chỉ log cảnh báo
                    }
                } catch (emailError) {
                    console.error("❌ Lỗi trong quá trình gửi email:", emailError);
                    // KHÔNG reject order vì lỗi email
                }
            }

            resolve({
                status: "OK",
                message: "Tạo đơn hàng thành công",
                data: createdOrder,
            });

        } catch (e) {
            console.error("❌ Lỗi khi tạo đơn hàng:", e);
            reject(e);
        }
    });
};

// ... các hàm khác giữ nguyên
const getAllOrderDetails = async (userId) => {
    try {
        if (!userId) {
            return {
                status: 'ERR',
                message: 'Thiếu userId',
            };
        }

        const orders = await Order.find({ user: userId })
            .populate({
                path: 'orderItems.product',
                select: 'name price discount image countInStock selled', // ✅ thêm discount & image
            })
            .sort({ createdAt: -1 }); // ✅ mới nhất lên đầu

        if (!orders || orders.length === 0) {
            return {
                status: 'ERR',
                message: 'Không có đơn hàng nào cho người dùng này',
            };
        }

        return {
            status: 'OK',
            message: 'Lấy chi tiết đơn hàng thành công',
            data: orders,
        };
    } catch (error) {
        return {
            status: 'ERR',
            message: error.message || 'Lỗi máy chủ',
        };
    }
};

const getDetailsOrder = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const order = await Order.findById(id).populate('orderItems.product')

            if (!order) {
                return resolve({
                    status: 'ERR',
                    message: 'Không tìm thấy đơn hàng này',
                });
            }

            resolve({
                status: 'OK',
                message: 'Lấy chi tiết đơn hàng thành công',
                data: order,
            });
        } catch (e) {
            reject(e);
        }
    });
};

const cancelOrder = (id, data) => {
    return new Promise(async (resolve, reject) => {
        try {
            // ✅ Trả lại hàng cho kho (tăng lại countInStock)
            for (const orderItem of data.orderItems) {
                await Product.findByIdAndUpdate(
                    orderItem.product,
                    {
                        $inc: {
                            countInStock: orderItem.amount, // tăng số lượng tồn
                            selled: -orderItem.amount,       // giảm số lượng đã bán
                        },
                    },
                    { new: true }
                );
            }

            // ✅ Xóa đơn hàng khỏi DB
            const deletedOrder = await Order.findByIdAndDelete(id);

            if (!deletedOrder) {
                return resolve({
                    status: 'ERR',
                    message: 'Order not found',
                });
            }

            resolve({
                status: 'OK',
                message: 'Order has been cancelled and deleted successfully',
            });
        } catch (error) {
            reject(error);
        }
    });
};

const getAllOrder = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const allOrder = await Order.find()
                .populate('user', 'fullName phone email'); // ✅ thêm dòng này

            resolve({
                status: 'OK',
                message: 'Success',
                data: allOrder
            });
        } catch (e) {
            reject(e);
        }
    });
};

const updateOrder = async (orderId, data) => {
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return {
                status: 'ERR',
                message: 'Không tìm thấy đơn hàng',
            };
        }

        // 🟢 Cập nhật trạng thái đơn hàng theo status gửi từ frontend
        if (data.status === 'Đã thanh toán') {
            order.isPaid = true;
            order.isDelivered = false;
            order.isCancelled = false;
            order.paidAt = Date.now();
        } else if (data.status === 'Đã giao hàng') {
            order.isDelivered = true;
            order.isPaid = true;
            order.isCancelled = false;
        } else if (data.status === 'Đã hủy') {
            order.isCancelled = true;
            order.isDelivered = false;
            order.isPaid = false;
        } else {
            // Đang xử lý
            order.isDelivered = false;
            order.isPaid = false;
            order.isCancelled = false;
        }

        // 🟢 Giữ nguyên thông tin khách hàng, phương thức thanh toán, tổng tiền, v.v.
        if (data.fullName) order.shippingAddress.fullName = data.fullName;
        if (data.phone) order.shippingAddress.phone = data.phone;
        if (data.address) order.shippingAddress.address = data.address;
        if (data.delivery) order.delivery = data.delivery;
        if (data.paymentMethod) order.paymentMethod = data.paymentMethod;
        if (data.totalPrice) order.totalPrice = data.totalPrice;

        const updatedOrder = await order.save();

        return {
            status: 'OK',
            message: 'Cập nhật đơn hàng thành công',
            data: updatedOrder,
        };
    } catch (e) {
        return {
            status: 'ERR',
            message: e.message || 'Lỗi khi cập nhật đơn hàng',
        };
    }
};

module.exports = {
    createOrder, getAllOrderDetails,
    getDetailsOrder, cancelOrder, getAllOrder, updateOrder
};