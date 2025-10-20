// src/index.js
require('dotenv').config();

const express = require("express");
const mongoose = require("mongoose");
const routes = require('./routes');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const { createPaymentIntent } = require('./services/PaymentService');

const app = express();
const port = process.env.PORT || 3001;

// ✅ CORS config an toàn
const allowedOrigins = [
  'http://localhost:3000',
  'https://fontend-doan.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Postman hoặc server-side
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'CORS policy: Origin not allowed';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Routes
routes(app);

// Test Stripe route
app.post('/test-payment', async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({
      status: 'ERR',
      message: 'STRIPE_SECRET_KEY chưa được thiết lập',
    });
  }

  const { totalPrice } = req.body || { totalPrice: 100000 };
  const result = await createPaymentIntent(totalPrice);
  res.json(result);
});

// Connect DB
mongoose.connect(process.env.MONGO_DB)
  .then(() => console.log('✅ Connect DB success'))
  .catch((err) => console.log('❌ DB connection error:', err));

// Check Stripe key
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ CẢNH BÁO: STRIPE_SECRET_KEY chưa được thiết lập!');
} else {
  console.log('✅ STRIPE_SECRET_KEY đã load thành công.');
}

// Run server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
