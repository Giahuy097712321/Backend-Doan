const SibApiV3Sdk = require('@sendinblue/client');
const dotenv = require("dotenv");
dotenv.config();

const sendEmailCreateOrder = async (email, orderItems, orderInfo) => {
  try {
    if (!orderInfo) {
      console.error("❌ orderInfo is undefined");
      return { success: false, error: "orderInfo is undefined" };
    }

    orderItems = orderItems || [];
    const orderCode = orderInfo.orderCode || `DH${Date.now()}`;
    const totalAmount = Number(orderInfo.totalPrice) || 0;
    const fullName = orderInfo.fullName || 'Khách hàng';

    const client = new SibApiV3Sdk.TransactionalEmailsApi();
    client.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

    let subtotal = 0;
    let totalDiscount = 0;
    let htmlRows = "";
    let attachments = [];

    orderItems.forEach((item, index) => {
      const itemPrice = Number(item.price) || 0;
      const itemAmount = Number(item.amount) || 0;
      const itemDiscount = Number(item.discount) || 0;

      const itemTotal = itemPrice * itemAmount;
      const itemDiscountAmount = itemDiscount ? (itemTotal * itemDiscount) / 100 : 0;
      const itemFinalPrice = itemTotal - itemDiscountAmount;

      subtotal += itemTotal;
      totalDiscount += itemDiscountAmount;

      let imageHtml = '<div style="width:60px; height:60px; background:#f0f0f0; border-radius:5px; display:flex; align-items:center; justify-content:center; font-size:20px;">📦</div>';

      if (item.image) {
        let base64Image = item.image.startsWith("data:image") ? item.image.split(",")[1] : item.image;
        let mimeType = item.image.startsWith("data:image/png") ? 'image/png' : 'image/jpeg';
        const cid = `product-${index}`;

        attachments.push({
          name: `${item.name || 'product'}.png`,
          content: base64Image,
          contentType: mimeType,
          cid: cid
        });

        imageHtml = `<img src="cid:${cid}" alt="${item.name || 'Sản phẩm'}" style="width:60px; height:60px; object-fit:cover; border-radius:5px; border:1px solid #ddd;" />`;
      }

      htmlRows += `
        <tr>
          <td style="padding:12px; border:1px solid #ddd; text-align:center;">${imageHtml}</td>
          <td style="padding:12px; border:1px solid #ddd;">
            <strong>${item.name || 'Sản phẩm'}</strong>
            ${itemDiscount ? `<br/><span style="color:#e53935; font-size:12px;">🎉 Giảm ${itemDiscount}%</span>` : ''}
          </td>
          <td style="padding:12px; border:1px solid #ddd; text-align:center;">${itemAmount}</td>
          <td style="padding:12px; border:1px solid #ddd; text-align:right;">${itemPrice.toLocaleString('vi-VN')}₫</td>
          <td style="padding:12px; border:1px solid #ddd; text-align:right;">
            ${itemDiscount ? `
              <div style="text-decoration: line-through; color: #999; font-size: 12px;">${itemTotal.toLocaleString('vi-VN')}₫</div>
              <div style="color: #e53935; font-weight: bold;">${itemFinalPrice.toLocaleString('vi-VN')}₫</div>
            ` : `<div style="font-weight: bold;">${itemTotal.toLocaleString('vi-VN')}₫</div>`}
          </td>
        </tr>
      `;
    });

    const shippingFee = Number(orderInfo.shippingPrice) || 0;
    const taxPrice = Number(orderInfo.taxPrice) || 0;
    const finalTotalAmount = totalAmount || (subtotal - totalDiscount + shippingFee + taxPrice);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>🎉 Đơn hàng ${orderCode} đã được tạo!</h2>
        <table style="width:100%; border-collapse: collapse;">
          <thead>
            <tr style="background:#2c5aa0; color:white;">
              <th>Hình ảnh</th>
              <th>Sản phẩm</th>
              <th>Số lượng</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${htmlRows || '<tr><td colspan="5" style="text-align:center;">Không có sản phẩm</td></tr>'}
          </tbody>
        </table>
        <p><strong>Tổng cộng: ${finalTotalAmount.toLocaleString('vi-VN')}₫</strong></p>
      </div>
    `;

    const response = await client.sendTransacEmail({
      sender: { email: 'trangiahuy04092018@gmail.com', name: 'GH Electric' },
      to: [{ email }],
      subject: `🧾 Đơn hàng ${orderCode} - GH Electric`,
      htmlContent: htmlContent,
      attachment: attachments
    });

    console.log("✅ Mail sent successfully via Brevo:", response);
    return { success: true, messageId: response.messageId };

  } catch (error) {
    console.error("❌ Lỗi gửi mail:", error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmailCreateOrder };
