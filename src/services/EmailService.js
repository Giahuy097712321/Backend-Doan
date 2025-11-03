const SibApiV3Sdk = require('@sendinblue/client');
const dotenv = require("dotenv");
dotenv.config();

const sendEmailCreateOrder = async (email, orderItems, orderInfo) => {
  try {
    // ✅ VALIDATION CHẶT CHẼ
    if (!orderInfo) {
      console.error("❌ sendEmailCreateOrder: orderInfo is undefined");
      console.error("📧 Email:", email);
      console.error("🛒 Order items:", orderItems);
      return { success: false, error: "orderInfo is undefined" };
    }

    // Đảm bảo orderItems là mảng
    orderItems = orderItems || [];

    console.log("📧 Dữ liệu nhận được trong EmailService:", {
      email,
      orderItemsCount: orderItems.length,
      orderInfo: orderInfo
    });

    // ✅ Kiểm tra các trường bắt buộc
    const orderCode = orderInfo.orderCode || `DH${Date.now()}`;
    const totalAmount = Number(orderInfo.totalPrice) || 0;
    const fullName = orderInfo.fullName || 'Khách hàng';

    console.log("📧 Sending email with orderInfo:", { orderCode, totalAmount, fullName });

    const client = new SibApiV3Sdk.TransactionalEmailsApi();
    client.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

    // Tính toán chi tiết đơn hàng
    let subtotal = 0;
    let totalDiscount = 0;
    let htmlRows = "";

    // Xử lý từng sản phẩm
    orderItems.forEach((item) => {
      const itemPrice = Number(item.price) || 0;
      const itemAmount = Number(item.amount) || 0;
      const itemDiscount = Number(item.discount) || 0;

      const itemTotal = itemPrice * itemAmount;
      const itemDiscountAmount = itemDiscount ? (itemTotal * itemDiscount) / 100 : 0;
      const itemFinalPrice = itemTotal - itemDiscountAmount;

      subtotal += itemTotal;
      totalDiscount += itemDiscountAmount;

      htmlRows += `
        <tr>
          <td style="padding:12px; border:1px solid #ddd; text-align:center;">
            ${item.image ?
          `<img src="${item.image}" alt="${item.name}" style="width:60px; height:60px; object-fit:cover; border-radius:5px; border:1px solid #ddd;" />`
          : '📦'
        }
          </td>
          <td style="padding:12px; border:1px solid #ddd;">
            <strong>${item.name || 'Sản phẩm'}</strong>
            ${itemDiscount ? `<br/><span style="color:#e53935; font-size:12px;">🎉 Giảm ${itemDiscount}%</span>` : ''}
          </td>
          <td style="padding:12px; border:1px solid #ddd; text-align:center;">${itemAmount}</td>
          <td style="padding:12px; border:1px solid #ddd; text-align:right;">
            ${itemPrice.toLocaleString('vi-VN')}₫
          </td>
          <td style="padding:12px; border:1px solid #ddd; text-align:right;">
            ${itemDiscount ? `
              <div style="text-decoration: line-through; color: #999; font-size: 12px;">
                ${itemTotal.toLocaleString('vi-VN')}₫
              </div>
              <div style="color: #e53935; font-weight: bold;">
                ${itemFinalPrice.toLocaleString('vi-VN')}₫
              </div>
            ` : `
              <div style="font-weight: bold;">
                ${itemTotal.toLocaleString('vi-VN')}₫
              </div>
            `}
          </td>
        </tr>
      `;
    });

    // Tính toán tổng tiền
    const shippingFee = Number(orderInfo.shippingPrice) || 0;
    const taxPrice = Number(orderInfo.taxPrice) || 0;
    const finalTotalAmount = totalAmount || (subtotal - totalDiscount + shippingFee + taxPrice);

    // Tạo HTML content đẹp như template của bạn
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Xác nhận đơn hàng</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background: #f5f5f5;">
        <div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2c5aa0 0%, #3a6bb0 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin:0; font-size: 28px;">🎉 Đơn hàng của bạn đã được tạo thành công!</h1>
            <p style="margin:10px 0 0 0; font-size: 16px; opacity:0.9;">Cảm ơn bạn đã mua sắm tại GH Electric</p>
          </div>

          <!-- Order Info -->
          <div style="background: #f8f9fa; padding: 20px; border-left: 4px solid #2c5aa0; margin: 20px;">
            <h3 style="margin:0 0 15px 0; color:#2c5aa0;">📦 Thông tin đơn hàng</h3>
            <table style="width:100%;">
              <tr>
                <td style="padding:5px 0; width:120px;"><strong>Mã đơn hàng:</strong></td>
                <td style="padding:5px 0;"><strong>${orderCode}</strong></td>
              </tr>
              <tr>
                <td style="padding:5px 0;"><strong>Ngày đặt:</strong></td>
                <td style="padding:5px 0;">${new Date().toLocaleString('vi-VN')}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;"><strong>Người nhận:</strong></td>
                <td style="padding:5px 0;">${fullName}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;"><strong>Điện thoại:</strong></td>
                <td style="padding:5px 0;">${orderInfo.phone || 'Chưa có'}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;"><strong>Địa chỉ:</strong></td>
                <td style="padding:5px 0;">${orderInfo.address || 'Chưa có'}, ${orderInfo.city || ''}, ${orderInfo.country || ''}</td>
              </tr>
              <tr>
                <td style="padding:5px 0;"><strong>Phương thức:</strong></td>
                <td style="padding:5px 0;">
                  ${orderInfo.paymentMethod && orderInfo.paymentMethod.includes('tiền mặt') ? '💵 Thanh toán khi nhận hàng' : '💳 Thanh toán online'}
                </td>
              </tr>
            </table>
          </div>

          <!-- Products -->
          <div style="margin: 20px;">
            <h3 style="color:#2c5aa0; margin-bottom:15px;">🛒 Chi tiết sản phẩm</h3>
            <table style="width:100%; border-collapse: collapse; background:white; border: 1px solid #ddd;">
              <thead>
                <tr style="background:#2c5aa0; color:white;">
                  <th style="padding:12px; border:1px solid #ddd; text-align:center;">Hình ảnh</th>
                  <th style="padding:12px; border:1px solid #ddd;">Tên sản phẩm</th>
                  <th style="padding:12px; border:1px solid #ddd; text-align:center;">Số lượng</th>
                  <th style="padding:12px; border:1px solid #ddd; text-align:right;">Đơn giá</th>
                  <th style="padding:12px; border:1px solid #ddd; text-align:right;">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                ${htmlRows || '<tr><td colspan="5" style="padding:20px; text-align:center;">Không có sản phẩm</td></tr>'}
              </tbody>
            </table>
          </div>

          <!-- Summary -->
          <div style="background: #f8f9fa; padding: 20px; margin: 20px; border-radius: 8px;">
            <h3 style="color:#2c5aa0; margin-bottom:15px;">💰 Tổng thanh toán</h3>
            <table style="width:100%; font-size:16px;">
              <tr>
                <td style="padding:8px 0; text-align:right; width:70%;">Tạm tính:</td>
                <td style="padding:8px 0; text-align:right; font-weight:bold;">${subtotal.toLocaleString('vi-VN')}₫</td>
              </tr>
              ${totalDiscount > 0 ? `
                <tr>
                  <td style="padding:8px 0; text-align:right; color:#e53935;">Giảm giá:</td>
                  <td style="padding:8px 0; text-align:right; color:#e53935; font-weight:bold;">-${totalDiscount.toLocaleString('vi-VN')}₫</td>
                </tr>
              ` : ''}
              ${taxPrice > 0 ? `
                <tr>
                  <td style="padding:8px 0; text-align:right;">Thuế (VAT):</td>
                  <td style="padding:8px 0; text-align:right; font-weight:bold;">${taxPrice.toLocaleString('vi-VN')}₫</td>
                </tr>
              ` : ''}
              <tr>
                <td style="padding:8px 0; text-align:right;">Phí vận chuyển:</td>
                <td style="padding:8px 0; text-align:right; font-weight:bold;">
                  ${shippingFee === 0 ? 'MIỄN PHÍ' : `${shippingFee.toLocaleString('vi-VN')}₫`}
                </td>
              </tr>
              <tr style="border-top:2px solid #2c5aa0;">
                <td style="padding:12px 0; text-align:right; font-size:18px; font-weight:bold;">Tổng cộng:</td>
                <td style="padding:12px 0; text-align:right; font-size:18px; color:#e53935; font-weight:bold;">
                  ${finalTotalAmount.toLocaleString('vi-VN')}₫
                </td>
              </tr>
            </table>
          </div>

          <!-- Shipping Info -->
          <div style="background: #e8f5e8; padding: 20px; margin: 20px; border-radius: 8px; border-left: 4px solid #4caf50;">
            <h3 style="color:#2d572c; margin-bottom:10px;">🚚 Thông tin giao hàng</h3>
            <p style="margin:5px 0;">📦 Đơn hàng sẽ được giao trong vòng 2-3 ngày làm việc</p>
            <p style="margin:5px 0;">⏰ Thời gian giao hàng: 8:00 - 18:00</p>
            <p style="margin:5px 0;">☎️ Liên hệ: 1900 1234 (Miễn phí)</p>
            ${orderInfo.isPaid ? '<p style="margin:5px 0; color: #4caf50;">✅ Đơn hàng đã được thanh toán</p>' : ''}
          </div>

          <!-- Footer -->
          <div style="text-align:center; padding: 20px; color: #666; border-top: 1px solid #eee;">
            <p style="margin:5px 0;">Trân trọng,</p>
            <p style="margin:5px 0; font-size:18px; font-weight:bold; color:#2c5aa0;">GH Electric</p>
            <p style="margin:5px 0;">📞 Hotline: 1900 1234</p>
            <p style="margin:5px 0;">📧 Email: trangiahuy04092018@gmail.com</p>
            <p style="margin:5px 0;">🌐 Website: www.gh-electric.com</p>
            <p style="margin:15px 0 0 0; font-size:12px; color:#999;">
              Đây là email tự động, vui lòng không trả lời.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log("📧 Đang gửi email đến:", email);
    console.log("📦 Mã đơn hàng:", orderCode);
    console.log("💰 Tổng tiền:", finalTotalAmount.toLocaleString('vi-VN') + '₫');

    const response = await client.sendTransacEmail({
      sender: { email: 'trangiahuy04092018@gmail.com', name: 'GH Electric' },
      to: [{ email }],
      subject: `🧾 Đơn hàng ${orderCode} - GH Electric`,
      htmlContent: htmlContent,
    });

    console.log("✅ Mail sent successfully via Brevo:", response);
    return { success: true, messageId: response.messageId };

  } catch (error) {
    console.error("❌ Lỗi gửi mail qua Brevo:", error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmailCreateOrder };