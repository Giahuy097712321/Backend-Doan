const nodemailer = require("nodemailer");

exports.sendEmailCreateOrder = async (email, orderItems, orderInfo) => {
  try {
    if (!orderInfo) {
      console.error("❌ sendEmailCreateOrder: orderInfo is undefined");
      return;
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 🧾 Tạo nội dung danh sách sản phẩm
    const itemsHtml = orderItems.map(item => `
      <li>${item.name || item.productName} - SL: ${item.amount}</li>
    `).join("");

    // 📩 Nội dung email
    const mailOptions = {
      from: `"Shop Cầu Lông" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `🛒 Xác nhận đơn hàng #${orderInfo.orderCode}`,
      html: `
        <h3>Xin chào ${orderInfo.fullName},</h3>
        <p>Bạn vừa đặt hàng thành công tại Shop Cầu Lông.</p>
        <p><b>Mã đơn hàng:</b> ${orderInfo.orderCode}</p>
        <p><b>Tổng tiền:</b> ${orderInfo.totalPrice.toLocaleString()}₫</p>
        <p><b>Phương thức thanh toán:</b> ${orderInfo.paymentMethod}</p>
        <p><b>Địa chỉ giao hàng:</b> ${orderInfo.address}, ${orderInfo.city}, ${orderInfo.country}</p>
        <p><b>Sản phẩm:</b></p>
        <ul>${itemsHtml}</ul>
        <p>Cảm ơn bạn đã mua hàng!</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Email xác nhận đơn hàng đã được gửi thành công!");
  } catch (error) {
    console.error("❌ Lỗi khi gửi email:", error);
  }
};
