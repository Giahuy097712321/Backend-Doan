// src/services/EmailService.js
const nodemailer = require("nodemailer");
require("dotenv").config();

const sendEmailCreateOrder = async (email, orderItems) => {
  // Khởi tạo transporter với port 587 + TLS
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // TLS
    auth: {
      user: process.env.MAIL_ACCOUNT,
      pass: process.env.MAIL_PASSWORD, // App Password
    },
    tls: {
      rejectUnauthorized: false,
    },
    logger: true,
    debug: true,
  });

  let attachments = [];
  let htmlRows = "";

  orderItems.forEach((item, index) => {
    try {
      let base64Image = item.image;
      if (base64Image.startsWith("data:")) base64Image = base64Image.split(",")[1];

      // Giới hạn kích thước hình <= 1MB, nếu lớn quá thì bỏ đính kèm
      if (Buffer.byteLength(base64Image, "base64") < 1024 * 1024) {
        attachments.push({
          filename: `${item.name}.png`,
          content: Buffer.from(base64Image, "base64"),
          cid: `product${index}`,
        });
      } else {
        console.warn(`⚠️ Hình ảnh ${item.name} quá lớn, bỏ đính kèm`);
      }

      htmlRows += `
        <tr>
          <td style="padding:10px; border:1px solid #ddd; text-align:center;">
            <img src="cid:product${index}" alt="${item.name}" style="width:80px; height:80px; object-fit:cover; border-radius:5px;" />
          </td>
          <td style="padding:10px; border:1px solid #ddd;">${item.name}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:center;">${item.amount}</td>
          <td style="padding:10px; border:1px solid #ddd; text-align:right;">${item.price.toLocaleString()}₫</td>
        </tr>
      `;
    } catch (err) {
      console.warn(`⚠️ Lỗi xử lý hình ${item.name}:`, err.message);
    }
  });

  const htmlContent = `
    <div style="font-family:Arial, sans-serif; line-height:1.6; color:#333;">
      <h2 style="color:#e53935;">🛒 Cảm ơn bạn đã đặt hàng tại Huy Shop!</h2>
      <p>Chúng tôi đã nhận được đơn hàng của bạn, chi tiết sản phẩm như sau:</p>

      <table style="width:100%; border-collapse:collapse; margin-top:15px;">
        <thead>
          <tr>
            <th style="padding:8px; border:1px solid #ddd;">Hình ảnh</th>
            <th style="padding:8px; border:1px solid #ddd;">Tên sản phẩm</th>
            <th style="padding:8px; border:1px solid #ddd;">Số lượng</th>
            <th style="padding:8px; border:1px solid #ddd;">Giá</th>
          </tr>
        </thead>
        <tbody>
          ${htmlRows}
        </tbody>
      </table>

      <p>Chúng tôi sẽ liên hệ với bạn để xác nhận và giao hàng trong thời gian sớm nhất.</p>
      <p>Trân trọng,<br/><strong>Huy Shop</strong></p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Huy Shop" <${process.env.MAIL_ACCOUNT}>`,
      to: email,
      subject: "🧾 Đơn hàng của bạn đã được tạo thành công!",
      html: htmlContent,
      attachments,
    });
    console.log("✅ Mail sent:", info.messageId);
  } catch (err) {
    console.error("❌ Lỗi gửi mail:", err);
  }
};

module.exports = { sendEmailCreateOrder };
