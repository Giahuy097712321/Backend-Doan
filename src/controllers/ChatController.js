// controllers/ChatController.js
const { Message, Conversation } = require('../models/ChatModel');
const ChatService = require('../services/ChatService'); // Thêm dòng này

const ChatController = {
    // Lấy lịch sử chat của user - SỬA: dùng Service
    getChatHistory: async (req, res) => {
        try {
            const { userId } = req.params;

            // SỬA: Dùng Service thay vì trực tiếp
            const messages = await ChatService.getMessages(userId, 'admin');

            res.json({
                status: 'OK',
                message: 'Success',
                data: messages
            });
        } catch (error) {
            res.status(500).json({
                status: 'ERR',
                message: error.message
            });
        }
    },

    // Lấy tất cả conversations cho admin
    getConversations: async (req, res) => {
        try {
            const conversations = await Conversation.find({ isActive: true })
                .sort({ lastMessageTime: -1 });

            res.json({
                status: 'OK',
                message: 'Success',
                data: conversations
            });
        } catch (error) {
            res.status(500).json({
                status: 'ERR',
                message: error.message
            });
        }
    },

    // Đánh dấu tin nhắn đã đọc
    markAsRead: async (req, res) => {
        try {
            const { userId } = req.body;

            await Message.updateMany(
                { receiverId: 'admin', senderId: userId, isRead: false },
                { $set: { isRead: true } }
            );

            await Conversation.findOneAndUpdate(
                { userId: userId },
                { $set: { unreadCount: 0 } }
            );

            res.json({
                status: 'OK',
                message: 'Messages marked as read'
            });
        } catch (error) {
            res.status(500).json({
                status: 'ERR',
                message: error.message
            });
        }
    },

    // Lấy tin nhắn chưa đọc
    getUnreadCount: async (req, res) => {
        try {
            const { userId } = req.params;

            const unreadCount = await Message.countDocuments({
                receiverId: userId,
                isRead: false
            });

            res.json({
                status: 'OK',
                message: 'Success',
                data: unreadCount
            });
        } catch (error) {
            res.status(500).json({
                status: 'ERR',
                message: error.message
            });
        }
    }
};

module.exports = ChatController;