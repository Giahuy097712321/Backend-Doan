const SibApiV3Sdk = require('@sendinblue/client');
const dotenv = require("dotenv");
dotenv.config();

const sendEmailCreateOrder = async (email, orderItems, orderInfo) => {
  try {
    // ✅ THÊM VALIDATION CHẶT CHẼ
    if (!orderInfo) {
      console.error("❌ sendEmailCreateOrder: orderInfo is undefined");
      console.error("📧 Email:", email);
      console.error("🛒 Order items:", orderItems);
      return { success: false, error: "orderInfo is undefined" };
    }

    // ✅ Kiểm tra các trường bắt buộc
    const orderCode = orderInfo.orderCode || `DH${Date.now()}`;
    const totalAmount = orderInfo.totalPrice || 0;
    const fullName = orderInfo.fullName || 'Khách hàng';

    console.log("📧 Sending email with orderInfo:", { orderCode, totalAmount, fullName });

    const client = new SibApiV3Sdk.TransactionalEmailsApi();
    client.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

    // ✅ Tạo HTML content an toàn
    const itemsHtml = Array.isArray(orderItems)
      ? orderItems.map(item => `
          <li>${item.name || item.productName || 'Sản phẩm'} - SL: ${item.amount || 1}</li>
        `).join("")
      : '<li>Không có sản phẩm</li>';

    const htmlContent = `
      <h2>Đơn hàng ${orderCode} của bạn đã được tạo!</h2>
      <p>Xin chào <strong>${fullName}</strong>,</p>
      <p>Tổng tiền: <strong>${totalAmount.toLocaleString('vi-VN')}₫</strong></p>
      <p>Phương thức thanh toán: <strong>${orderInfo.paymentMethod || 'Chưa xác định'}</strong></p>
      <p>Địa chỉ giao hàng: <strong>${orderInfo.address || ''}, ${orderInfo.city || ''}, ${orderInfo.country || ''}</strong></p>
      <p><strong>Sản phẩm:</strong></p>
      <ul>${itemsHtml}</ul>
      <p>Cảm ơn bạn đã mua sắm tại GH Electric.</p>
    `;

    const response = await client.sendTransacEmail({
      sender: { email: 'trangiahuy04092018@gmail.com', name: 'GH Electric' },
      to: [{ email }],
      subject: `Xác nhận đơn hàng ${orderCode}`,
      htmlContent: htmlContent,
    });

    console.log("✅ Mail sent successfully:", response);
    return { success: true, messageId: response.messageId };

  } catch (error) {
    console.error("❌ Lỗi gửi mail:", error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmailCreateOrder };