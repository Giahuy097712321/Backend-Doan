const express = require("express");
const dotenv = require('dotenv');
const mongoose = require("mongoose");
const routes = require('./routes');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

dotenv.config();
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // React frontend
  credentials: true
}));

// ✅ Tăng giới hạn body lên 10mb
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

app.use(cookieParser());

// Routes
routes(app);

// Connect DB
mongoose.connect(process.env.MONGO_DB)
  .then(() => {
    console.log('✅ Connect DB success');
  })
  .catch((err) => {
    console.log('❌ DB connection error:', err);
  });

// Run server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
