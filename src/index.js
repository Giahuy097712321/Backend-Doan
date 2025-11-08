// server.js - HOÀN CHỈNH VỚI FIX "MAX PAYLOAD SIZE EXCEEDED"
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

// CORS Configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://trangiahuy-datn.vercel.app',
  'https://fontend-doan-git-main-huys-projects-c7d34491.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

const vercelPatterns = [
  /https:\/\/.*\.vercel\.app\/?$/,
  /https:\/\/.*-git-.*\.vercel\.app\/?$/,
  /https:\/\/.*-.*-.*\.vercel\.app\/?$/,
  /https:\/\/.*-huys-projects-.*\.vercel\.app\/?$/
];

const checkOrigin = (origin) => {
  if (!origin) return true;

  console.log('🔍 Checking origin:', origin);
  const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;

  if (allowedOrigins.includes(origin) || allowedOrigins.includes(normalizedOrigin)) {
    console.log('✅ Exact match');
    return true;
  }

  for (const pattern of vercelPatterns) {
    if (pattern.test(origin) || pattern.test(normalizedOrigin)) {
      console.log('✅ Vercel pattern match');
      return true;
    }
  }

  if (origin.endsWith('.vercel.app') || origin.endsWith('.vercel.app/') ||
    origin.endsWith('.now.sh') || origin.endsWith('.now.sh/') ||
    normalizedOrigin.endsWith('.vercel.app') || normalizedOrigin.endsWith('.now.sh')) {
    console.log('✅ Domain suffix match');
    return true;
  }

  if (process.env.NODE_ENV === 'development' &&
    (origin.includes('localhost') || normalizedOrigin.includes('localhost'))) {
    console.log('✅ Development localhost');
    return true;
  }

  console.log('❌ No match found for origin:', origin);
  return false;
};

// CORS cho Express
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && checkOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, token'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// ✅ QUAN TRỌNG: Socket.io config với MAX PAYLOAD SIZE LỚN
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (checkOrigin(origin)) {
        return callback(null, true);
      }
      console.warn('⚠️ Socket.io CORS blocked:', origin);
      return callback(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  // ✅ FIX LỖI "MAX PAYLOAD SIZE EXCEEDED"
  maxHttpBufferSize: 10e6, // 10MB (mặc định là 1MB)
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
  cookie: false,
  allowEIO3: true
});

// Engine event listeners
io.engine.on("connection", (rawSocket) => {
  console.log('🔄 Raw connection established, transport:', rawSocket.transport.name);

  rawSocket.on("close", (reason, description) => {
    console.log('🔌 Raw connection closed:', reason, description);
  });

  rawSocket.on("error", (error) => {
    console.error('💥 Raw connection error:', error);
  });
});

io.engine.on("connection_error", (err) => {
  console.error('💥 Engine connection error:', err);
});

// Middleware
app.use(bodyParser.json({ limit: '50mb' })); // Tăng limit cho express
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  const origin = req.headers.origin;
  if (checkOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  res.status(200).json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    socketConfig: {
      maxHttpBufferSize: '10MB',
      transports: ['websocket', 'polling']
    }
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

// ✅ HÀM TỐI ƯU HÓA DỮ LIỆU - GIẢM KÍCH THƯỚC PAYLOAD
function optimizeConversations(conversations) {
  return conversations.map(conv => ({
    _id: conv._id?.toString(),
    userId: conv.userId?._id?.toString() || conv.userId?.toString(),
    userName: conv.userId?.name || 'Người dùng',
    lastMessage: conv.lastMessage ?
      (conv.lastMessage.length > 100 ?
        conv.lastMessage.substring(0, 100) + '...' :
        conv.lastMessage)
      : 'Chưa có tin nhắn',
    lastMessageTime: conv.lastMessageTime,
    unreadCount: conv.unreadCount || 0,
    isActive: conv.isActive !== false
  }));
}

function optimizeMessages(messages) {
  return messages.map(msg => ({
    _id: msg._id?.toString(),
    senderId: msg.senderId,
    receiverId: msg.receiverId,
    message: msg.message,
    timestamp: msg.timestamp,
    isRead: msg.isRead || false
  }));
}

// Socket.io logic với OPTIMIZATION
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

    // ✅ TỐI ƯU HÓA DỮ LIỆU ONLINE USERS
    const optimizedUsers = Array.from(onlineUsers.values()).map(user => ({
      id: user.userId,
      name: user.userName,
      role: user.role,
      isOnline: true
    }));

    io.emit('getOnlineUsers', optimizedUsers);
  });

  // Gửi tin nhắn với OPTIMIZATION
  socket.on('sendMessage', async (messageData) => {
    try {
      console.log('📨 New message received from:', messageData.senderId);

      const ChatService = require('./services/ChatService');
      const savedMessage = await ChatService.saveMessage(messageData);

      console.log('💾 Message saved:', savedMessage._id);

      // ✅ TỐI ƯU HÓA TIN NHẮN TRƯỚC KHI GỬI
      const optimizedMessage = {
        _id: savedMessage._id.toString(),
        senderId: savedMessage.senderId,
        receiverId: savedMessage.receiverId,
        message: savedMessage.message,
        timestamp: savedMessage.timestamp,
        isRead: savedMessage.isRead || false
      };

      // Xử lý gửi tin nhắn
      if (messageData.receiverId === 'admin') {
        let adminFound = false;
        for (let [userId, userInfo] of onlineUsers) {
          if (userInfo.role === 'admin') {
            io.to(userInfo.socketId).emit('receiveMessage', optimizedMessage);
            console.log('📤 Sent to admin:', userId);
            adminFound = true;
          }
        }
        if (!adminFound) {
          console.log('⚠️ No admin online, message stored only.');
        }
      } else {
        const userReceiver = onlineUsers.get(messageData.receiverId);
        if (userReceiver) {
          io.to(userReceiver.socketId).emit('receiveMessage', optimizedMessage);
          console.log('📤 Sent to user:', messageData.receiverId);
        } else {
          console.log('⚠️ User not online, message stored only.');
        }
      }

      // Gửi xác nhận cho người gửi
      socket.emit('messageSent', {
        status: 'success',
        messageId: savedMessage._id,
        message: optimizedMessage // ✅ Gửi message đã optimize
      });

      // ✅ CẬP NHẬT CONVERSATIONS VỚI DỮ LIỆU TỐI ƯU
      await updateConversationsForAdmins();

    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('messageError', { error: error.message });
    }
  });

  // Lấy lịch sử chat với OPTIMIZATION
  socket.on('getChatHistory', async (userId) => {
    try {
      const ChatService = require('./services/ChatService');
      const messages = await ChatService.getMessages(userId, 'admin');

      // ✅ TỐI ƯU HÓA LỊCH SỬ CHAT
      const optimizedMessages = optimizeMessages(messages);

      console.log('📚 Sent chat history for user:', userId, 'Messages:', optimizedMessages.length);

      // ✅ KIỂM TRA KÍCH THƯỚC TRƯỚC KHI GỬI
      const dataSize = Buffer.from(JSON.stringify(optimizedMessages)).length;
      console.log('📏 Chat history size:', dataSize, 'bytes');

      if (dataSize > 500000) { // 500KB
        console.warn('⚠️ Chat history large, consider pagination');
        // Có thể cắt bớt messages nếu cần
        const limitedMessages = optimizedMessages.slice(-50); // Giữ 50 tin nhắn gần nhất
        socket.emit('chatHistory', limitedMessages);
      } else {
        socket.emit('chatHistory', optimizedMessages);
      }

    } catch (error) {
      console.error('❌ Error getting chat history:', error);
      socket.emit('chatHistoryError', { error: error.message });
    }
  });

  // Lấy conversations với OPTIMIZATION
  socket.on('getConversations', async () => {
    try {
      const { Conversation } = require('./models/ChatModel');
      const conversations = await Conversation.find({ isActive: true })
        .sort({ lastMessageTime: -1 })
        .limit(100) // ✅ GIỚI HẠN SỐ LƯỢNG
        .populate('userId', 'name email avatar')
        .lean(); // ✅ SỬ DỤNG LEAN ĐỂ GIẢM KÍCH THƯỚC

      console.log('📞 Found conversations:', conversations.length);

      // ✅ TỐI ƯU HÓA DỮ LIỆU CONVERSATIONS
      const optimizedConversations = optimizeConversations(conversations);

      // ✅ KIỂM TRA KÍCH THƯỚC TRƯỚC KHI GỬI
      const dataSize = Buffer.from(JSON.stringify(optimizedConversations)).length;
      console.log('📏 Conversations data size:', dataSize, 'bytes');

      if (dataSize > 100000) { // 100KB
        console.warn('⚠️ Conversations data large, truncating...');
        // Cắt bớt nếu quá lớn
        const limitedConversations = optimizedConversations.slice(0, 50); // Giữ 50 conversations đầu
        socket.emit('conversationsList', limitedConversations);
      } else {
        socket.emit('conversationsList', optimizedConversations);
      }

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

      await ChatService.markMessagesAsRead(userId);
      await ChatService.updateConversationUnreadCount(userId);

      socket.emit('messagesRead', { userId, success: true });

      // ✅ CẬP NHẬT VỚI DỮ LIỆU TỐI ƯU
      await updateConversationsForAdmins();

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

      const conversations = await Conversation.find({ isActive: true });
      for (const conversation of conversations) {
        await ChatService.markMessagesAsRead(conversation.userId);
        await ChatService.updateConversationUnreadCount(conversation.userId);
      }

      socket.emit('allMessagesRead', { success: true });

      // ✅ CẬP NHẬT VỚI DỮ LIỆU TỐI ƯU
      await updateConversationsForAdmins();

    } catch (error) {
      console.error('❌ Error marking all messages as read:', error);
      socket.emit('messagesReadError', { error: error.message });
    }
  });

  // Ping-pong để giữ kết nối
  socket.on('ping', (cb) => {
    if (typeof cb === 'function') {
      cb('pong');
    }
  });

  // Ngắt kết nối
  socket.on('disconnect', (reason) => {
    console.log('🔴 User disconnected:', socket.id, 'Reason:', reason);

    for (let [userId, user] of onlineUsers.entries()) {
      if (user.socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log('🗑️ Removed user from online list:', userId);
        break;
      }
    }

    // ✅ CẬP NHẬT ONLINE USERS VỚI DỮ LIỆU TỐI ƯU
    const optimizedUsers = Array.from(onlineUsers.values()).map(user => ({
      id: user.userId,
      name: user.userName,
      role: user.role,
      isOnline: true
    }));

    io.emit('getOnlineUsers', optimizedUsers);
  });

  socket.on('error', (error) => {
    console.error('💥 Socket error:', error);
  });
});

// ✅ HÀM CẬP NHẬT CONVERSATIONS CHO ADMINS
async function updateConversationsForAdmins() {
  try {
    const { Conversation } = require('./models/ChatModel');
    const conversations = await Conversation.find({ isActive: true })
      .sort({ lastMessageTime: -1 })
      .limit(100)
      .populate('userId', 'name email avatar')
      .lean();

    const optimizedConversations = optimizeConversations(conversations);

    // Gửi đến tất cả admin
    for (let [userId, userInfo] of onlineUsers) {
      if (userInfo.role === 'admin') {
        io.to(userInfo.socketId).emit('conversationsList', optimizedConversations);
      }
    }

    console.log('🔄 Updated conversations for admins');
  } catch (error) {
    console.error('❌ Error updating conversations:', error);
  }
}

// Connect DB
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
  console.log(`💬 Socket.io config: maxHttpBufferSize=10MB`);
  console.log(`✅ Allowed origins:`, allowedOrigins);
});

module.exports = { app, io, server };