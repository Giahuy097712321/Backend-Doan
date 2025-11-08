// services/ChatService.js
const { Message, Conversation } = require('../models/ChatModel');
const User = require('../models/UserModel');

const ChatService = {
    // services/ChatService.js - kiểm tra phần saveMessage
    // services/ChatService.js - SỬA PHẦN saveMessage
    saveMessage: async (messageData) => {
        try {
            console.log('💾 Saving message:', messageData);

            const message = new Message({
                senderId: messageData.senderId,
                receiverId: messageData.receiverId,
                message: messageData.message,
                timestamp: messageData.timestamp || new Date()
            });

            const savedMessage = await message.save();
            console.log('✅ Message saved to DB:', savedMessage._id);

            // ✅ FIX: LUÔN CẬP NHẬT TÊN THẬT KHI CÓ TIN NHẮN MỚI
            if (messageData.receiverId === 'admin' && messageData.senderId !== 'admin') {
                let realUserName = 'Khách hàng';

                try {
                    const User = mongoose.model('User');
                    const user = await User.findById(messageData.senderId);
                    if (user) {
                        realUserName = user.name || user.username || user.email?.split('@')[0] || `User_${messageData.senderId.substring(messageData.senderId.length - 6)}`;
                    }
                } catch (error) {
                    console.log('❌ Error getting user info:', error);
                }

                await Conversation.findOneAndUpdate(
                    { userId: messageData.senderId },
                    {
                        userId: messageData.senderId,
                        userName: realUserName, // ✅ LUÔN DÙNG TÊN THẬT
                        lastMessage: messageData.message,
                        lastMessageTime: messageData.timestamp || new Date(),
                        $inc: { unreadCount: 1 },
                        isActive: true
                    },
                    { upsert: true, new: true }
                );

                console.log('📝 Conversation updated with real name:', realUserName);
            }

            return savedMessage;

        } catch (error) {
            console.error('❌ Error saving message:', error);
            throw new Error(error.message);
        }
    },

    getMessages: async (userId, targetId, limit = 100) => {
        try {
            const messages = await Message.find({
                $or: [
                    { senderId: userId, receiverId: targetId },
                    { senderId: targetId, receiverId: userId }
                ]
            }).sort({ timestamp: 1 }).limit(limit).lean();

            console.log('📨 Retrieved messages count:', messages.length);
            return messages;
        } catch (error) {
            console.error('❌ Error getting messages:', error);
            throw new Error(error.message);
        }
    },

    markMessagesAsRead: async (userId) => {
        try {
            const result = await Message.updateMany(
                {
                    receiverId: 'admin',
                    senderId: userId,
                    isRead: false
                },
                {
                    $set: {
                        isRead: true,
                        readAt: new Date()
                    }
                }
            );

            console.log('📖 Marked messages as read:', result.modifiedCount, 'messages for user:', userId);
            return result;
        } catch (error) {
            console.error('❌ Error marking messages as read:', error);
            throw new Error(error.message);
        }
    },

    updateConversationUnreadCount: async (userId) => {
        try {
            const unreadCount = await Message.countDocuments({
                receiverId: 'admin',
                senderId: userId,
                isRead: false
            });

            await Conversation.findOneAndUpdate(
                { userId: userId },
                {
                    $set: {
                        unreadCount: unreadCount,
                        readAt: new Date()
                    }
                },
                { upsert: true }
            );

            console.log('🔄 Updated unread count for user:', userId, 'Count:', unreadCount);
            return unreadCount;
        } catch (error) {
            console.error('❌ Error updating unread count:', error);
            throw new Error(error.message);
        }
    }
};

module.exports = ChatService;