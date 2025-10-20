// src/services/EmailService.js
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config();

const sendEmailCreateOrder = async (email, orderItems) => {
  // Tạo transporter với TLS port 587
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // TLS
    auth: {
      user: process.env.MAIL_ACCOUNT, // Gmail account
      pass: process.env.MAIL_PASSWORD, // App Password, không dùng mật khẩu chính
    },
    tls: {
      rejectUnauthorized: false, // tránh lỗi certificate
    },
    debug: true, // log chi tiết kết nối
  });

  let attachments = [];
  let htmlRows = "";

  orderItems.forEach((item, index) => {
    let base64Image = item.image;
    if (base64Image.startsWith("data:")) base64Image = base64Image.split(",")[1];

    attachments.push({
      filename: `${item.name}.png`,
      content: Buffer.from(base64Image, "base64"),
      cid: `product${index}`,
    });

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
  });

  const htmlContent = `
    <div style="font-family:Arial, sans-serif; line-height:1.6; color:#333;">
      <h2 style="color:#e53935;">🛒 Cảm ơn bạn đã đặt hàng tại Huy Shop!</h2>
      <p>Chi tiết sản phẩm:</p>
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
      <p>Chúng tôi sẽ liên hệ với bạn để xác nhận và giao hàng.</p>
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
