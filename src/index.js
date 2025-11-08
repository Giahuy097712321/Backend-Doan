// server.js - FIX LỖI userId.substring is not a function
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

// ... (phần CORS configuration giữ nguyên) ...

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

    // ✅ FIX: Xử lý cả ObjectId và string ID
    let user;
    if (mongoose.Types.ObjectId.isValid(userIdStr)) {
      // Nếu là ObjectId hợp lệ
      user = await User.findById(userIdStr).lean();
    } else {
      // Nếu không phải ObjectId, tìm theo các trường khác
      user = await User.findOne({
        $or: [
          { _id: userIdStr },
          { email: userIdStr },
          { username: userIdStr }
        ]
      }).lean();
    }

    if (!user) {
      console.log(`❌ User not found: ${userIdStr}`);
      // ✅ FIX: Kiểm tra độ dài trước khi dùng substring
      return userIdStr.length >= 6 ? `User_${userIdStr.substring(userIdStr.length - 6)}` : `User_${userIdStr}`;
    }

    // ✅ THỬ CÁC TRƯỜNG TÊN KHÁC NHAU
    const realName =
      user.fullName ||
      user.name ||
      user.username ||
      user.displayName ||
      user.firstName ||
      user.lastName ||
      (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : null) ||
      user.email?.split('@')[0] ||
      (userIdStr.length >= 6 ? `User_${userIdStr.substring(userIdStr.length - 6)}` : `User_${userIdStr}`);

    console.log(`✅ Found real name for ${userIdStr}: ${realName}`);
    return realName;

  } catch (error) {
    console.log(`❌ Error getting user name for ${userId}:`, error.message);

    // ✅ FIX: Xử lý lỗi an toàn
    try {
      const userIdStr = String(userId || '');
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

    const optimizedConversations = await Promise.all(
      conversations.map(async (conv) => {
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

    console.log('✅ Optimized conversations:', optimizedConversations.length);
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

// ... (phần còn lại của server giữ nguyên cho đến socket logic) ...

// Socket.io logic với OPTIMIZATION
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

  // ... (phần còn lại của socket handlers giữ nguyên) ...

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

// ... (phần còn lại của server giữ nguyên) ...