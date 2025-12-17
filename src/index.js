// server.js - FIX LỖI "io is not defined"
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
  // Include PATCH so preflight checks allow PATCH method (needed for setDefaultAddress)
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// ✅ FIX: ĐẶT KHAI BÁO io Ở ĐÂY - TRƯỚC KHI SỬ DỤNG
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
  maxHttpBufferSize: 10e6, // 10MB
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
app.use(bodyParser.json({ limit: '50mb' }));
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

// ✅ HÀM LẤY TÊN THẬT TỪ USER - FIXED LỖI
async function getRealUserName(userId) {
  try {
    console.log('🔍 Getting real name for userId:', userId, 'Type:', typeof userId);

    // ✅ FIX: Kiểm tra và xử lý userId hợp lệ
    if (!userId || userId === 'admin') {
      return userId === 'admin' ? 'Quản trị viên' : 'Người dùng';
    }

    // ✅ FIX QUAN TRỌNG: Đảm bảo userId là string
    const userIdStr = String(userId).trim();

    if (!userIdStr || userIdStr === 'undefined' || userIdStr === 'null') {
      console.log('❌ Invalid userId:', userId);
      return 'Người dùng';
    }

    const User = mongoose.model('User');

    // ✅ FIX: XỬ LÝ ĐẶC BIỆT CHO test-user VÀ CÁC ID KHÔNG PHẢI OBJECTID
    if (userIdStr === 'test-user' || !mongoose.Types.ObjectId.isValid(userIdStr)) {
      console.log(`🔄 Handling non-ObjectId user: ${userIdStr}`);

      // Tìm user theo username, email, hoặc các trường khác
      const user = await User.findOne({
        $or: [
          { username: userIdStr },
          { email: userIdStr },
          { displayName: userIdStr },
          { fullName: userIdStr }
        ]
      }).lean();

      if (user) {
        const realName = user.fullName || user.name || user.username || user.displayName ||
          user.email?.split('@')[0] || `User_${userIdStr.substring(0, 8)}`;
        console.log(`✅ Found non-ObjectId user ${userIdStr}: ${realName}`);
        return realName;
      } else {
        console.log(`❌ Non-ObjectId user not found: ${userIdStr}`);
        return `User_${userIdStr.substring(0, 8)}`;
      }
    }

    // ✅ XỬ LÝ OBJECTID HỢP LỆ
    let user;
    try {
      user = await User.findById(userIdStr).lean();
    } catch (dbError) {
      console.log(`❌ Database error for ${userIdStr}:`, dbError.message);
      return `User_${userIdStr.substring(userIdStr.length - 6)}`;
    }

    if (!user) {
      console.log(`❌ User not found in database: ${userIdStr}`);
      return `User_${userIdStr.substring(userIdStr.length - 6)}`;
    }

    // ✅ THỬ CÁC TRƯỜNG TÊN KHÁC NHAU - ƯU TIÊN THEO THỨ TỰ
    const realName =
      user.fullName?.trim() ||
      user.name?.trim() ||
      user.displayName?.trim() ||
      user.username?.trim() ||
      (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}`.trim() : null) ||
      user.email?.split('@')[0] ||
      `User_${userIdStr.substring(userIdStr.length - 6)}`;

    console.log(`✅ Found real name for ${userIdStr}: ${realName}`);
    return realName;

  } catch (error) {
    console.log(`❌ Error getting user name for ${userId}:`, error.message);

    // ✅ FIX: Xử lý lỗi an toàn - không dùng substring nếu có lỗi
    try {
      const userIdStr = String(userId || 'unknown');
      return userIdStr.length >= 6 ? `User_${userIdStr.substring(userIdStr.length - 6)}` : `User_${userIdStr}`;
    } catch {
      return 'Người dùng';
    }
  }
}


// ✅ HÀM TỐI ƯU HÓA CONVERSATIONS VỚI TÊN THẬT - FIXED
async function optimizeConversationsWithRealNames(conversations) {
  try {
    console.log('🔄 Optimizing conversations with real names...');

    // ✅ FIX: LOẠI BỎ CONVERSATIONS TRÙNG LẶP TRƯỚC KHI XỬ LÝ
    const uniqueConversations = conversations.reduce((acc, current) => {
      const existing = acc.find(item => item.userId?.toString() === current.userId?.toString());
      if (!existing) {
        acc.push(current);
      } else {
        // Ưu tiên conversation có lastMessageTime mới hơn
        if (new Date(current.lastMessageTime || 0) > new Date(existing.lastMessageTime || 0)) {
          const index = acc.indexOf(existing);
          acc[index] = current;
        }
      }
      return acc;
    }, []);

    console.log(`📊 After deduplication: ${uniqueConversations.length} conversations`);

    const optimizedConversations = await Promise.all(
      uniqueConversations.map(async (conv) => {
        try {
          // ✅ FIX: Đảm bảo userId là string
          const userId = String(conv.userId || '').trim();

          if (!userId) {
            console.log('⚠️ Empty userId in conversation:', conv._id);
            return {
              _id: conv._id?.toString(),
              userId: 'unknown',
              userName: 'Người dùng',
              lastMessage: conv.lastMessage ?
                (conv.lastMessage.length > 100 ?
                  conv.lastMessage.substring(0, 100) + '...' :
                  conv.lastMessage)
                : 'Chưa có tin nhắn',
              lastMessageTime: conv.lastMessageTime,
              unreadCount: conv.unreadCount || 0,
              isActive: conv.isActive !== false
            };
          }

          const realUserName = await getRealUserName(userId);

          return {
            _id: conv._id?.toString(),
            userId: userId,
            userName: realUserName, // ✅ TÊN THẬT
            lastMessage: conv.lastMessage ?
              (conv.lastMessage.length > 100 ?
                conv.lastMessage.substring(0, 100) + '...' :
                conv.lastMessage)
              : 'Chưa có tin nhắn',
            lastMessageTime: conv.lastMessageTime,
            unreadCount: conv.unreadCount || 0,
            isActive: conv.isActive !== false
          };
        } catch (error) {
          console.log('❌ Error optimizing conversation:', error);
          return {
            _id: conv._id?.toString(),
            userId: String(conv.userId || 'unknown'),
            userName: 'Người dùng',
            lastMessage: 'Lỗi tải tin nhắn',
            lastMessageTime: conv.lastMessageTime,
            unreadCount: 0,
            isActive: false
          };
        }
      })
    );

    // ✅ SẮP XẾP THEO THỜI GIAN TIN NHẮN MỚI NHẤT
    optimizedConversations.sort((a, b) => {
      return new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0);
    });

    console.log('✅ Optimized conversations:', optimizedConversations.length);

    // ✅ LOG KẾT QUẢ CUỐI CÙNG
    console.log('🎯 FINAL CONVERSATIONS:');
    optimizedConversations.forEach((conv, index) => {
      console.log(`  ${index + 1}. ${conv.userId} -> "${conv.userName}" (${conv.unreadCount} unread)`);
    });

    return optimizedConversations;

  } catch (error) {
    console.error('❌ Error in optimizeConversationsWithRealNames:', error);
    return conversations.map(conv => ({
      _id: conv._id?.toString(),
      userId: String(conv.userId || 'unknown'),
      userName: 'Người dùng',
      lastMessage: conv.lastMessage || 'Chưa có tin nhắn',
      lastMessageTime: conv.lastMessageTime,
      unreadCount: conv.unreadCount || 0,
      isActive: conv.isActive !== false
    }));
  }
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

// ✅ SOCKET.IO LOGIC - ĐẶT SAU KHI io ĐÃ ĐƯỢC KHAI BÁO
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔗 User connected:', socket.id, 'from:', socket.handshake.headers.origin);

  // Thêm user vào danh sách online - FIXED
  socket.on('addUser', (userId, userData) => {
    try {
      // ✅ FIX: Đảm bảo userId là string
      const userIdStr = String(userId || '').trim();

      if (!userIdStr) {
        console.log('⚠️ Invalid userId in addUser');
        return;
      }

      onlineUsers.set(userIdStr, {
        socketId: socket.id,
        userId: userIdStr,
        ...userData
      });

      console.log('👥 Online users:', Array.from(onlineUsers.keys()));

      // ✅ TỐI ƯU HÓA DỮ LIỆU ONLINE USERS
      const optimizedUsers = Array.from(onlineUsers.values()).map(user => ({
        id: user.userId,
        name: user.userName || `User_${user.userId.substring(user.userId.length - 6)}`,
        role: user.role,
        isOnline: true
      }));

      io.emit('getOnlineUsers', optimizedUsers);
    } catch (error) {
      console.error('❌ Error in addUser:', error);
    }
  });

  // Gửi tin nhắn với OPTIMIZATION
  // server.js - FIX REAL-TIME CHAT HISTORY
  // ... (phần trên giữ nguyên) ...

  // server.js - FIX REAL-TIME MESSAGES
  // ... (phần trên giữ nguyên) ...

  // Gửi tin nhắn với FIX REAL-TIME
  socket.on('sendMessage', async (messageData) => {
    try {
      console.log('📨 New message received:', {
        senderId: messageData.senderId,
        receiverId: messageData.receiverId,
        message: messageData.message,
        timestamp: messageData.timestamp
      });

      const ChatService = require('./services/ChatService');

      let savedMessage;
      try {
        savedMessage = await ChatService.saveMessage(messageData);
        console.log('💾 Message saved successfully:', savedMessage._id);
      } catch (saveError) {
        console.error('❌ FAILED to save message:', saveError);
        socket.emit('messageError', { error: 'Lỗi lưu tin nhắn: ' + saveError.message });
        return;
      }

      // ✅ TỐI ƯU HÓA TIN NHẮN
      const optimizedMessage = {
        _id: savedMessage._id.toString(),
        senderId: savedMessage.senderId,
        receiverId: savedMessage.receiverId,
        message: savedMessage.message,
        timestamp: savedMessage.timestamp,
        isRead: savedMessage.isRead || false
      };

      console.log('📤 Sending optimized message:', optimizedMessage);

      // ✅ FIX: GỬI TIN NHẮN REAL-TIME ĐẾN TẤT CẢ NGƯỜI DÙNG LIÊN QUAN
      const targetUserIds = new Set();

      if (messageData.receiverId === 'admin') {
        // Tin nhắn từ user → admin
        targetUserIds.add(messageData.senderId); // User gửi

        // Tìm tất cả admin online
        for (let [userId, userInfo] of onlineUsers) {
          if (userInfo.role === 'admin') {
            targetUserIds.add(userId);
          }
        }
      } else {
        // Tin nhắn từ admin → user
        targetUserIds.add(messageData.receiverId); // User nhận

        // Tìm tất cả admin online
        for (let [userId, userInfo] of onlineUsers) {
          if (userInfo.role === 'admin') {
            targetUserIds.add(userId);
          }
        }
      }

      // ✅ GỬI TIN NHẮN REAL-TIME
      for (let targetUserId of targetUserIds) {
        const targetUser = onlineUsers.get(targetUserId);
        if (targetUser) {
          io.to(targetUser.socketId).emit('receiveMessage', optimizedMessage);
          console.log('📤 Sent real-time message to:', targetUserId);
        }
      }

      // ✅ FIX QUAN TRỌNG: GỬI CHAT HISTORY UPDATE CHO TẤT CẢ ADMIN
      let historyUserId = messageData.receiverId === 'admin' ? messageData.senderId : messageData.receiverId;

      try {
        const updatedMessages = await ChatService.getMessages(historyUserId, 'admin');
        const optimizedUpdatedMessages = optimizeMessages(updatedMessages);

        // Gửi đến tất cả admin
        for (let [userId, userInfo] of onlineUsers) {
          if (userInfo.role === 'admin') {
            io.to(userInfo.socketId).emit('chatHistory', optimizedUpdatedMessages);
            console.log('🔄 Updated FULL chat history for admin:', userId, 'Total messages:', updatedMessages.length);
          }
        }
      } catch (historyError) {
        console.error('❌ Error updating chat history:', historyError);
      }

      // Gửi xác nhận cho người gửi
      socket.emit('messageSent', {
        status: 'success',
        messageId: savedMessage._id,
        message: optimizedMessage
      });

      // ✅ CẬP NHẬT CONVERSATIONS
      await updateConversationsForAdmins();

    } catch (error) {
      console.error('❌ Error in sendMessage:', error);
      socket.emit('messageError', { error: 'Lỗi hệ thống: ' + error.message });
    }
  });

  // Lấy lịch sử chat với FIX ĐẦY ĐỦ
  socket.on('getChatHistory', async (userId) => {
    try {
      console.log('🔄 Loading FULL chat history for:', userId);

      const ChatService = require('./services/ChatService');
      const messages = await ChatService.getMessages(userId, 'admin');

      // ✅ TỐI ƯU HÓA LỊCH SỬ CHAT
      const optimizedMessages = optimizeMessages(messages);

      console.log('📚 Sending FULL chat history to client:', optimizedMessages.length, 'messages');

      // ✅ LOG TẤT CẢ TIN NHẮN ĐỂ DEBUG
      console.log('🎯 ALL MESSAGES IN RESPONSE:');
      optimizedMessages.forEach((msg, index) => {
        const time = new Date(msg.timestamp).toLocaleTimeString('vi-VN');
        const sender = msg.senderId === 'admin' ? 'ADMIN' : 'USER';
        console.log(`  ${index + 1}. [${time}] ${sender}: ${msg.message}`);
      });

      socket.emit('chatHistory', optimizedMessages);

      console.log('✅ FULL Chat history sent successfully');

    } catch (error) {
      console.error('❌ Error getting chat history:', error);
      socket.emit('chatHistoryError', { error: error.message });
    }
  });

  // ... (phần còn lại giữ nguyên) ...

  // ... (phần còn lại giữ nguyên) ...

  // ✅ LẤY CONVERSATIONS VỚI TÊN THẬT - FIXED
  socket.on('getConversations', async () => {
    try {
      const { Conversation } = require('./models/ChatModel');

      console.log('🔄 Getting conversations with REAL user names...');

      const conversations = await Conversation.find({ isActive: true })
        .sort({ lastMessageTime: -1 })
        .limit(100)
        .lean();

      console.log('📞 Raw conversations found:', conversations.length);

      // ✅ TỐI ƯU HÓA VỚI TÊN THẬT
      const optimizedConversations = await optimizeConversationsWithRealNames(conversations);

      console.log('🎯 Final conversations with REAL names:');
      optimizedConversations.forEach((conv, index) => {
        console.log(`  ${index + 1}. ${conv.userId} -> "${conv.userName}" (${conv.unreadCount} unread)`);
      });

      socket.emit('conversationsList', optimizedConversations);

    } catch (error) {
      console.error('❌ Error getting conversations:', error);
      socket.emit('conversationsError', {
        error: 'Lỗi khi tải danh sách hội thoại: ' + error.message
      });
    }
  });

  // Đánh dấu tin nhắn đã đọc - FIXED
  socket.on('markMessagesAsRead', async (userId) => {
    try {
      // ✅ FIX: Đảm bảo userId là string
      const userIdStr = String(userId || '').trim();

      if (!userIdStr) {
        console.log('⚠️ Invalid userId in markMessagesAsRead');
        return;
      }

      console.log('📖 Marking messages as read for user:', userIdStr);
      const ChatService = require('./services/ChatService');

      await ChatService.markMessagesAsRead(userIdStr);
      await ChatService.updateConversationUnreadCount(userIdStr);

      socket.emit('messagesRead', { userId: userIdStr, success: true });

      // ✅ CẬP NHẬT VỚI TÊN THẬT
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

      // ✅ CẬP NHẬT VỚI TÊN THẬT
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

  // Ngắt kết nối - FIXED
  socket.on('disconnect', (reason) => {
    console.log('🔴 User disconnected:', socket.id, 'Reason:', reason);

    for (let [userId, user] of onlineUsers.entries()) {
      if (user.socketId === socket.id) {
        onlineUsers.delete(userId);
        console.log('🗑️ Removed user from online list:', userId);
        break;
      }
    }

    const optimizedUsers = Array.from(onlineUsers.values()).map(user => ({
      id: user.userId,
      name: user.userName || `User_${user.userId.substring(user.userId.length - 6)}`,
      role: user.role,
      isOnline: true
    }));

    io.emit('getOnlineUsers', optimizedUsers);
  });

  socket.on('error', (error) => {
    console.error('💥 Socket error:', error);
  });
});

// ✅ HÀM CẬP NHẬT CONVERSATIONS CHO ADMINS VỚI TÊN THẬT - FIXED
async function updateConversationsForAdmins() {
  try {
    const { Conversation } = require('./models/ChatModel');

    const conversations = await Conversation.find({ isActive: true })
      .sort({ lastMessageTime: -1 })
      .limit(100)
      .lean();

    const optimizedConversations = await optimizeConversationsWithRealNames(conversations);

    // Gửi đến tất cả admin
    for (let [userId, userInfo] of onlineUsers) {
      if (userInfo.role === 'admin') {
        io.to(userInfo.socketId).emit('conversationsList', optimizedConversations);
      }
    }

    console.log('🔄 Updated conversations for admins with real names');
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

// ✅ DEBUG USER SCHEMA
async function debugUserSchema() {
  try {
    const User = mongoose.model('User');
    const sampleUser = await User.findOne().lean();

    if (sampleUser) {
      console.log('🔍 USER SCHEMA FIELDS:', Object.keys(sampleUser));
      console.log('📝 SAMPLE USER DATA:', sampleUser);
    } else {
      console.log('⚠️ No users found in database');
    }
  } catch (error) {
    console.log('❌ Error debugging user schema:', error);
  }
}

// Gọi debug sau khi kết nối DB
setTimeout(debugUserSchema, 2000);

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

// ✅ FIX: EXPORT io ĐỂ SỬ DỤNG Ở NƠI KHÁC
module.exports = { app, io, server };