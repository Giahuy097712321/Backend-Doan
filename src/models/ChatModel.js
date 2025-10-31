const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    senderId: {
        type: String, // Đổi từ ObjectId thành String vì có thể là 'admin'
        required: true
    },
    receiverId: {
        type: String, // 'admin' hoặc userId
        required: true
    },
    message: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    isRead: {
        type: Boolean,
        default: false
    }
});

const conversationSchema = new mongoose.Schema({
    userId: {
        type: String, // Đổi từ ObjectId thành String cho đơn giản
        required: true,
        unique: true
    },
    userName: {
        type: String,
        required: true
    },
    lastMessage: {
        type: String,
        default: ''
    },
    lastMessageTime: {
        type: Date,
        default: Date.now
    },
    unreadCount: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    readAt: {  // 🆕 Thêm field này
        type: Date
    }
});

const Message = mongoose.model('Message', messageSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = { Message, Conversation };