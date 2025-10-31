// server.js
require('dotenv').config();

const express = require("express");
const mongoose = require("mongoose");
const routes = require('./routes');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');

const { createPaymentIntent } = require('./services/PaymentService');

const app = express();
const server = createServer(app);
const port = process.env.PORT || 3001;

// ✅ CORS config linh hoạt cho cả localhost và production
const allowedOrigins = [
  'http://localhost:3000',
  'https://fontend-doan.vercel.app',
  process.env.FRONTEND_URL // Thêm biến môi trường cho frontend URL
].filter(Boolean); // Loại bỏ các giá trị undefined

// CORS cho Express
app.use(cors({
  origin: function (origin, callback) {
    // Cho phép requests không có origin (như Postman, mobile apps, server-side requests)
    if (!origin) return callback(null, true);

    // Kiểm tra origin có trong danh sách allowed không
    if (allowedOrigins.some(allowedOrigin =>
      origin === allowedOrigin ||
      origin.startsWith(allowedOrigin.replace('https://', 'http://')) ||
      (process.env.NODE_ENV === 'development' && origin.includes('localhost'))
    )) {
      return callback(null, true);
    }

    const msg = `CORS policy: Origin ${origin} not allowed`;
    console.warn('⚠️ CORS blocked:', msg);
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie']
}));

// CORS cho Socket.io
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.some(allowedOrigin =>
        origin === allowedOrigin ||
        (process.env.NODE_ENV === 'development' && origin.includes('localhost'))
      )) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'] // Hỗ trợ cả hai loại transport
});

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

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

// Socket.io logic
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔗 User connected:', socket.id, 'from:', socket.handshake.headers.origin);

  // Thêm user vào danh sách online
  socket.on('addUser', (userId, userData) => {
    onlineUsers.set(userId, {
      socketId: socket.id,
      ...userData
    });
    console.log('👥 Online users:', Array.from(onlineUsers.keys()));
    io.emit('getOnlineUsers', Array.from(onlineUsers.values()));
  });

  // Gửi tin nhắn
  socket.on('sendMessage', async (messageData) => {
    try {
      console.log('📨 New message received:', messageData);

      const ChatService = require('./services/ChatService');
      const savedMessage = await ChatService.saveMessage(messageData);

      console.log('💾 Message saved:', savedMessage._id);

      // === Xử lý gửi tin nhắn ===
      if (messageData.receiverId === 'admin') {
        // User gửi → tìm admin trong onlineUsers (Map)
        let adminFound = false;
        for (let [userId, userInfo] of onlineUsers) {
          if (userInfo.role === 'admin') {
            io.to(userInfo.socketId).emit('receiveMessage', savedMessage);
            console.log('📤 Sent to admin:', userId);
            adminFound = true;
          }
        }
        if (!adminFound) {
          console.log('⚠️ No admin online, message stored only.');
        }
      } else {
        // Admin gửi → tìm user cụ thể
        const userReceiver = onlineUsers.get(messageData.receiverId);
        if (userReceiver) {
          io.to(userReceiver.socketId).emit('receiveMessage', savedMessage);
          console.log('📤 Sent to user:', messageData.receiverId);
        } else {
          console.log('⚠️ User not online, message stored only.');
        }
      }

      // Gửi xác nhận cho người gửi
      socket.emit('messageSent', {
        status: 'success',
        messageId: savedMessage._id,
        message: savedMessage
      });

      // === Cập nhật danh sách conversation cho admin ===
      const { Conversation } = require('./models/ChatModel');
      const conversations = await Conversation.find({ isActive: true })
        .sort({ lastMessageTime: -1 });

      // Gửi update đến tất cả admin
      for (let [userId, userInfo] of onlineUsers) {
        if (userInfo.role === 'admin') {
          io.to(userInfo.socketId).emit('conversationsList', conversations);
          console.log('🔄 Sent updated conversations to admin:', userId);
        }
      }

    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('messageError', { error: error.message });
    }
  });

  // Lấy lịch sử chat
  socket.on('getChatHistory', async (userId) => {
    try {
      const ChatService = require('./services/ChatService');
      const messages = await ChatService.getMessages(userId, 'admin');
      socket.emit('chatHistory', messages);
      console.log('📚 Sent chat history for user:', userId, 'Messages:', messages.length);
    } catch (error) {
      console.error('❌ Error getting chat history:', error);
      socket.emit('chatHistoryError', { error: error.message });
    }
  });

  // Lấy conversations cho admin
  socket.on('getConversations', async () => {
    try {
      const { Conversation } = require('./models/ChatModel');
      const conversations = await Conversation.find({ isActive: true })
        .sort({ lastMessageTime: -1 })
        .populate('userId', 'name email avatar');

      console.log('📞 Sending conversations:', conversations.length);
      socket.emit('conversationsList', conversations);
    } catch (error) {
      console.error('❌ Error getting conversations:', error);
      socket.emit('conversationsError', { error: error.message });
    }
  });

  // Đánh dấu tin nhắn đã đọc
  socket.on('markMessagesAsRead', async (userId) => {
    try {
      console.log('📖 Marking messages as read for user:', userId);
      const ChatService = require('./services/ChatService');

      // Đánh dấu tin nhắn đã đọc
      await ChatService.markMessagesAsRead(userId);

      // Cập nhật unread count
      await ChatService.updateConversationUnreadCount(userId);

      // Gửi confirmation
      socket.emit('messagesRead', { userId, success: true });

      // Cập nhật danh sách conversations
      const { Conversation } = require('./models/ChatModel');
      const conversations = await Conversation.find({ isActive: true })
        .sort({ lastMessageTime: -1 })
        .populate('userId', 'name email avatar');

      socket.emit('conversationsList', conversations);

    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
      socket.emit('messagesReadError', { error: error.message });
    }
  });

  // Đánh dấu tất cả tin nhắn đã đọc
  socket.on('markAllMessagesAsRead', async () => {
    try {
      console.log('📖 Marking ALL messages as read');
      const ChatService = require('./services/ChatService');
      const { Conversation } = require('./models/ChatModel');

      // Lấy tất cả conversations
      const conversations = await Conversation.find({ isActive: true });

      // Đánh dấu tất cả tin nhắn là đã đọc
      for (const conversation of conversations) {
        await ChatService.markMessagesAsRead(conversation.userId);
        await ChatService.updateConversationUnreadCount(conversation.userId);
      }

      socket.emit('allMessagesRead', { success: true });
      socket.emit('conversationsUpdated');

    } catch (error) {
      console.error('❌ Error marking all messages as read:', error);
      socket.emit('messagesReadError', { error: error.message });
    }
  });

  // Ngắt kết nối
  socket.on('disconnect', () => {
    console.log('🔴 User disconnected:', socket.id);

    for (let [userId, user] of onlineUsers.entries()) {
      if (user.socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log('🗑️ Removed user from online list:', userId);
        break;
      }
    }

    io.emit('getOnlineUsers', Array.from(onlineUsers.values()));
  });

  socket.on('error', (error) => {
    console.error('💥 Socket error:', error);
  });
});

// Connect DB với config linh hoạt
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_DB;
    if (!mongoURI) {
      throw new Error('MONGO_DB environment variable is not defined');
    }

    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connect DB success');
  } catch (err) {
    console.log('❌ DB connection error:', err);
    // Thử kết nối lại sau 5 giây
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// Check Stripe key
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('⚠️ CẢNH BÁO: STRIPE_SECRET_KEY chưa được thiết lập!');
} else {
  console.log('✅ STRIPE_SECRET_KEY đã load thành công.');
}

// Xử lý lỗi toàn cục
process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

// Run server
server.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💬 Socket.io is ready for connections`);
  console.log(`✅ Allowed origins:`, allowedOrigins);
});

module.exports = { app, io, server };