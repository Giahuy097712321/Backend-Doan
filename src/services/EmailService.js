const SibApiV3Sdk = require('@sendinblue/client');
const dotenv = require("dotenv");
dotenv.config();

const sendEmailCreateOrder = async (email, orderItems, orderInfo) => {
  const client = new SibApiV3Sdk.TransactionalEmailsApi();
  client.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

  const orderCode = orderInfo.orderCode || `DH${Date.now()}`;
  const totalAmount = orderInfo.totalPrice || 0;

  const htmlContent = `
    <h2>Đơn hàng ${orderCode} của bạn đã được tạo!</h2>
    <p>Tổng tiền: <strong>${totalAmount.toLocaleString('vi-VN')}₫</strong></p>
    <p>Cảm ơn bạn đã mua sắm tại GH Electric.</p>
  `;

  try {
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
//hahaha

module.exports = { sendEmailCreateOrder };
