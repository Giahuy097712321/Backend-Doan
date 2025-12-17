// services/OrderService.js
const Order = require("../models/OrderProduct");
const Product = require("../models/ProductModel");
const EmailService = require("./EmailService");

const createOrder = async (newOrder) => {
    try {
        console.log("🛒 Bắt đầu tạo đơn hàng với dữ liệu:", {
            email: newOrder.email,
            fullName: newOrder.fullName,
            orderItemsCount: newOrder.orderItems?.length,
            paymentMethod: newOrder.paymentMethod, // Log để debug
            isPaid: newOrder.isPaid // Log isPaid từ frontend
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
            email,
            isPaid // Lấy isPaid từ frontend
        } = newOrder;

        // ✅ VALIDATION DỮ LIỆU ĐẦU VÀO
        if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
            return {
                status: "ERR",
                message: "Danh sách sản phẩm không hợp lệ",
            };
        }

        if (!email) {
            return {
                status: "ERR",
                message: "Email là bắt buộc",
            };
        }

        console.log("💰 Phương thức thanh toán nhận từ frontend:", paymentMethod);
        console.log("💳 Trạng thái thanh toán nhận từ frontend (isPaid):", isPaid);

        // Xác định trạng thái thanh toán
        let paymentStatus;
        let finalIsPaid;
        let paidAt = null;

        // ƯU TIÊN: Dùng isPaid từ frontend nếu có
        if (isPaid !== undefined) {
            finalIsPaid = isPaid;
            paymentStatus = isPaid ? 'paid' : 'unpaid';
            if (isPaid) {
                paidAt = new Date();
            }
            console.log("✅ Sử dụng isPaid từ frontend:", { finalIsPaid, paymentStatus });
        }
        // FALLBACK: Logic tự động dựa trên paymentMethod
        else {
            // Kiểm tra paymentMethod để xác định trạng thái
            const paymentMethodLower = String(paymentMethod).toLowerCase();

            if (paymentMethodLower === 'cod' ||
                paymentMethod === 'Thanh toán khi nhận hàng' ||
                paymentMethod === 'Thanh toán tiền mặt khi nhận hàng') {
                paymentStatus = 'unpaid'; // COD luôn là chưa thanh toán
                finalIsPaid = false;
                console.log("✅ COD - Trạng thái thanh toán: Chưa thanh toán");
            } else if (paymentMethodLower === 'stripe' ||
                paymentMethodLower === 'online' ||
                paymentMethodLower === 'thẻ') {
                paymentStatus = 'paid'; // Thanh toán online là đã thanh toán
                finalIsPaid = true;
                paidAt = new Date();
                console.log("✅ Online - Trạng thái thanh toán: Đã thanh toán");
            } else {
                // Mặc định cho các phương thức khác
                paymentStatus = 'unpaid';
                finalIsPaid = false;
                console.log("⚠️ Phương thức không xác định, mặc định: Chưa thanh toán");
            }
        }

        // ✅ Bước 1: Kiểm tra tồn kho cho tất cả sản phẩm
        for (const item of orderItems) {
            const product = await Product.findById(item.product);
            if (!product || product.countInStock < item.amount) {
                return {
                    status: "ERR",
                    message: `Sản phẩm "${product?.name || item.product}" không đủ hàng trong kho`,
                };
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

        // ✅ Bước 3: Tạo đơn hàng với trạng thái thanh toán đúng
        const createdOrder = await Order.create({
            orderItems,
            shippingAddress: {
                fullName,
                address,
                city,
                country,
                phone,
            },
            paymentMethod, // Giữ nguyên giá trị từ frontend
            delivery,
            itemsPrice,
            shippingPrice,
            taxPrice,
            totalPrice,
            user,
            email,
            discount,
            // Trạng thái giao hàng
            deliveryStatus: 'pending', // Chờ xử lý
            // Trạng thái thanh toán (quan trọng)
            paymentStatus: paymentStatus,
            isPaid: finalIsPaid,
            paidAt: paidAt // Chỉ set paidAt nếu đã thanh toán
        });

        if (!createdOrder) {
            return {
                status: "ERR",
                message: "Không thể tạo đơn hàng",
            };
        }

        console.log("✅ Đơn hàng đã được tạo:", {
            id: createdOrder._id,
            paymentMethod: createdOrder.paymentMethod,
            paymentStatus: createdOrder.paymentStatus,
            isPaid: createdOrder.isPaid,
            paidAt: createdOrder.paidAt
        });

        // ✅ Bước 4: Chuẩn bị dữ liệu email
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
            deliveryStatus: 'Chờ xử lý',
            paymentStatus: paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'
        };

        // ✅ Bước 5: Gửi email
        if (email) {
            try {
                const emailResult = await EmailService.sendEmailCreateOrder(
                    email,
                    orderItems,
                    orderInfo
                );

                if (emailResult?.success) {
                    console.log("✅ Email đã được gửi thành công");
                } else {
                    console.warn("⚠️ Gửi email thất bại:", emailResult?.error);
                }
            } catch (emailError) {
                console.error("❌ Lỗi trong quá trình gửi email:", emailError);
            }
        }

        return {
            status: "OK",
            message: "Tạo đơn hàng thành công",
            data: createdOrder,
        };

    } catch (error) {
        console.error("❌ Lỗi khi tạo đơn hàng:", error);
        // Rollback: Trả lại hàng vào kho nếu có lỗi
        if (newOrder.orderItems) {
            for (const item of newOrder.orderItems) {
                await Product.findByIdAndUpdate(item.product, {
                    $inc: {
                        countInStock: item.amount,
                        selled: -item.amount,
                    },
                });
            }
        }
        return {
            status: "ERR",
            message: error.message || "Lỗi server khi tạo đơn hàng",
        };
    }
};

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
                select: 'name price discount image countInStock selled',
            })
            .sort({ createdAt: -1 });

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

const getDetailsOrder = async (id) => {
    try {
        const order = await Order.findById(id).populate('orderItems.product');

        if (!order) {
            return {
                status: 'ERR',
                message: 'Không tìm thấy đơn hàng này',
            };
        }

        return {
            status: 'OK',
            message: 'Lấy chi tiết đơn hàng thành công',
            data: order,
        };
    } catch (error) {
        return {
            status: 'ERR',
            message: error.message || 'Lỗi server',
        };
    }
};

// ✅ Hủy đơn hàng - FIX: không cần orderItems từ frontend
// ✅ Hủy đơn hàng - FIX: không cần orderItems từ frontend
const cancelOrder = async (id, token) => {
    try {
        // Populate orderItems để lấy thông tin sản phẩm
        const order = await Order.findById(id).populate('orderItems.product');

        if (!order) {
            return {
                status: 'ERR',
                message: 'Không tìm thấy đơn hàng',
            };
        }

        // ✅ Kiểm tra: Nếu đã giao hàng thì không thể hủy
        if (order.deliveryStatus === 'delivered') {
            return {
                status: 'ERR',
                message: 'Không thể hủy đơn hàng đã giao',
            };
        }

        // ✅ Kiểm tra: Nếu đã thanh toán (trừ COD) thì không thể hủy
        if (order.paymentStatus === 'paid' && order.paymentMethod !== 'COD') {
            return {
                status: 'ERR',
                message: 'Không thể hủy đơn hàng đã thanh toán online',
            };
        }

        // ✅ Kiểm tra: Nếu đã hủy rồi thì không hủy lại
        if (order.deliveryStatus === 'cancelled') {
            return {
                status: 'ERR',
                message: 'Đơn hàng này đã bị hủy',
            };
        }

        // ✅ Cập nhật trạng thái
        order.deliveryStatus = 'cancelled';
        order.isCancelled = true;
        order.cancelledAt = new Date();

        // Xử lý trạng thái thanh toán
        if (order.paymentStatus === 'paid' && order.paymentMethod !== 'COD') {
            order.paymentStatus = 'refunded';
            order.isPaid = false;
            order.paidAt = null;
        } else {
            order.paymentStatus = 'unpaid';
            order.isPaid = false;
            order.paidAt = null;
        }

        // ✅ Trả lại hàng cho kho
        if (order.orderItems && Array.isArray(order.orderItems)) {
            for (const orderItem of order.orderItems) {
                if (orderItem && orderItem.product) {
                    const productId = orderItem.product._id || orderItem.product;
                    const amount = orderItem.amount || 0;

                    if (productId && amount > 0) {
                        await Product.findByIdAndUpdate(
                            productId,
                            {
                                $inc: {
                                    countInStock: amount,
                                    selled: -amount,
                                },
                            }
                        );
                        console.log(`✅ Đã trả lại ${amount} sản phẩm cho kho: ${productId}`);
                    }
                }
            }
        }

        await order.save();

        return {
            status: 'OK',
            message: 'Hủy đơn hàng thành công',
        };
    } catch (error) {
        console.error('❌ Lỗi khi hủy đơn hàng:', error);
        return {
            status: 'ERR',
            message: error.message || 'Lỗi server',
        };
    }
};

// ✅ Mua lại đơn hàng - FIX: Đơn hàng đã hủy sẽ được kích hoạt lại thay vì tạo mới
const reorder = async (orderId, token) => {
    try {
        const order = await Order.findById(orderId).populate('orderItems.product');

        if (!order) {
            return {
                status: 'ERR',
                message: 'Không tìm thấy đơn hàng',
            };
        }

        // ✅ Kiểm tra: Chỉ cho mua lại đơn hàng đã hủy
        if (order.deliveryStatus !== 'cancelled') {
            return {
                status: 'ERR',
                message: 'Chỉ có thể mua lại đơn hàng đã hủy',
            };
        }

        // ✅ Kiểm tra tồn kho
        for (const item of order.orderItems) {
            const product = await Product.findById(item.product._id);
            if (!product || product.countInStock < item.amount) {
                return {
                    status: 'ERR',
                    message: `Sản phẩm "${item.name}" không đủ hàng trong kho`,
                };
            }
        }

        // ✅ Giảm số lượng tồn kho
        for (const item of order.orderItems) {
            await Product.findByIdAndUpdate(item.product._id, {
                $inc: {
                    countInStock: -item.amount,
                    selled: +item.amount,
                },
            });
        }

        // ✅ KÍCH HOẠT LẠI ĐƠN HÀNG ĐÃ HỦY (thay vì tạo mới)
        order.deliveryStatus = 'pending'; // Chuyển về chờ xử lý
        order.paymentStatus = order.paymentMethod === 'COD' ? 'unpaid' : 'paid';
        order.isPaid = order.paymentMethod !== 'COD';
        order.isDelivered = false;
        order.isCancelled = false;
        order.cancelledAt = null;
        order.deliveredAt = null;
        order.paidAt = order.paymentMethod !== 'COD' ? new Date() : null;
        order.updatedAt = new Date();

        await order.save();

        return {
            status: 'OK',
            message: 'Mua lại đơn hàng thành công',
            data: order, // Trả về đơn hàng đã được kích hoạt lại
        };
    } catch (error) {
        console.error('❌ Lỗi khi mua lại đơn hàng:', error);
        return {
            status: 'ERR',
            message: error.message || 'Lỗi khi mua lại đơn hàng',
        };
    }
};
const getAllOrder = async () => {
    try {
        const allOrder = await Order.find()
            .populate('user', 'fullName phone email')
            .sort({ createdAt: -1 });

        return {
            status: 'OK',
            message: 'Success',
            data: allOrder
        };
    } catch (error) {
        return {
            status: 'ERR',
            message: error.message || 'Lỗi server',
        };
    }
};

// ✅ Cập nhật đơn hàng với logic mới - FIX: đồng bộ paymentStatus
const updateOrder = async (orderId, data) => {
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return {
                status: 'ERR',
                message: 'Không tìm thấy đơn hàng',
            };
        }

        console.log('📝 Cập nhật đơn hàng:', {
            orderId,
            data,
            currentPaymentMethod: order.paymentMethod,
            currentDeliveryStatus: order.deliveryStatus,
            currentPaymentStatus: order.paymentStatus,
            currentIsPaid: order.isPaid
        });

        // 🔥 QUAN TRỌNG: Lưu lại trạng thái cũ để so sánh
        const oldDeliveryStatus = order.deliveryStatus;
        const oldPaymentStatus = order.paymentStatus;

        // ✅ Xử lý trạng thái giao hàng
        if (data.deliveryStatus) {
            order.deliveryStatus = data.deliveryStatus;

            // Cập nhật các trường tương thích
            switch (data.deliveryStatus) {
                case 'delivered':
                    order.isDelivered = true;
                    order.deliveredAt = new Date();

                    // ✅ COD: Khi đã giao hàng mới chuyển thành đã thanh toán
                    // ✅ Stripe: Đã thanh toán từ trước, giữ nguyên
                    if (order.paymentMethod === 'COD' && oldPaymentStatus === 'unpaid') {
                        order.paymentStatus = 'paid';
                        order.isPaid = true;
                        order.paidAt = new Date();
                        console.log('✅ COD chuyển sang đã thanh toán khi đã giao hàng');
                    }
                    // Stripe giữ nguyên paid
                    break;

                case 'cancelled':
                    order.isCancelled = true;
                    order.cancelledAt = new Date();
                    order.isDelivered = false;
                    order.deliveredAt = null;

                    // Xử lý hoàn tiền
                    if (order.paymentStatus === 'paid' && order.paymentMethod !== 'COD') {
                        order.paymentStatus = 'refunded';
                        order.isPaid = false;
                        order.paidAt = null;
                    } else {
                        order.paymentStatus = 'unpaid';
                        order.isPaid = false;
                        order.paidAt = null;
                    }

                    // Trả lại hàng vào kho
                    for (const orderItem of order.orderItems) {
                        await Product.findByIdAndUpdate(
                            orderItem.product,
                            {
                                $inc: {
                                    countInStock: orderItem.amount,
                                    selled: -orderItem.amount,
                                },
                            }
                        );
                    }
                    break;

                default:
                    order.isDelivered = false;
                    order.deliveredAt = null;
                    order.isCancelled = false;
                    order.cancelledAt = null;
                    // ⚠️ KHÔNG tự động thay đổi paymentStatus ở các trạng thái khác
                    break;
            }
        }

        // ✅ Xử lý TRẠNG THÁI THANH TOÁN từ frontend (QUAN TRỌNG)
        if (data.paymentStatus) {
            console.log('💰 Cập nhật paymentStatus từ admin:', {
                old: oldPaymentStatus,
                new: data.paymentStatus,
                paymentMethod: order.paymentMethod,
                deliveryStatus: order.deliveryStatus
            });

            // Kiểm tra logic
            // 1. Nếu đã giao hàng thì phải đã thanh toán
            if (order.deliveryStatus === 'delivered' && data.paymentStatus !== 'paid') {
                return {
                    status: 'ERR',
                    message: 'Đơn hàng đã giao phải ở trạng thái đã thanh toán',
                };
            }

            // 2. COD đang giao hàng có thể là "unpaid" hoặc "paid" (nếu admin set)
            // 3. Stripe luôn là "paid" hoặc "refunded"

            // 🔥 CẬP NHẬT TRẠNG THÁI THANH TOÁN
            order.paymentStatus = data.paymentStatus;
            order.isPaid = data.paymentStatus === 'paid';

            // Cập nhật thời gian thanh toán
            if (data.paymentStatus === 'paid' && !order.paidAt) {
                order.paidAt = new Date();
                console.log('✅ Đã cập nhật paidAt:', order.paidAt);
            } else if (data.paymentStatus !== 'paid') {
                order.paidAt = null;
            }

            console.log('✅ Đã cập nhật paymentStatus:', {
                paymentStatus: order.paymentStatus,
                isPaid: order.isPaid,
                paidAt: order.paidAt
            });
        }

        // ✅ Xử lý isPaid từ frontend (tương thích)
        if (data.isPaid !== undefined) {
            console.log('💰 Xử lý isPaid từ admin:', data.isPaid);

            order.isPaid = data.isPaid;
            order.paymentStatus = data.isPaid ? 'paid' : 'unpaid';

            if (data.isPaid && !order.paidAt) {
                order.paidAt = new Date();
            } else if (!data.isPaid) {
                order.paidAt = null;
            }
        }

        const updatedOrder = await order.save();

        console.log('✅ Đơn hàng đã cập nhật:', {
            orderId: updatedOrder._id,
            deliveryStatus: updatedOrder.deliveryStatus,
            paymentStatus: updatedOrder.paymentStatus,
            paymentMethod: updatedOrder.paymentMethod,
            isPaid: updatedOrder.isPaid,
            paidAt: updatedOrder.paidAt,
            isDelivered: updatedOrder.isDelivered
        });

        return {
            status: 'OK',
            message: 'Cập nhật đơn hàng thành công',
            data: updatedOrder,
        };
    } catch (error) {
        console.error('❌ Lỗi khi cập nhật đơn hàng:', error);
        return {
            status: 'ERR',
            message: error.message || 'Lỗi khi cập nhật đơn hàng',
        };
    }
};
// ✅ Mua lại đơn hàng đã hủy


module.exports = {
    createOrder,
    getAllOrderDetails,
    getDetailsOrder,
    cancelOrder,
    getAllOrder,
    updateOrder,
    reorder
};