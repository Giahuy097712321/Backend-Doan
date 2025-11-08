// services/ChatService.js - FIX LỖI LƯU TIN NHẮN
const mongoose = require('mongoose');
const { Message, Conversation } = require('../models/ChatModel');

const ChatService = {
    saveMessage: async (messageData) => {
        try {
            console.log('💾 Saving message:', {
                senderId: messageData.senderId,
                receiverId: messageData.receiverId,
                message: messageData.message,
                timestamp: messageData.timestamp
            });

            // ✅ FIX: TẠO MESSAGE MỚI VỚI DỮ LIỆU ĐẦY ĐỦ
            const message = new Message({
                senderId: messageData.senderId,
                receiverId: messageData.receiverId,
                message: messageData.message,
                timestamp: messageData.timestamp || new Date(),
                isRead: messageData.isRead || false
            });

            const savedMessage = await message.save();
            console.log('✅ Message saved to DB:', savedMessage._id);

            // ✅ FIX: LUÔN CẬP NHẬT CONVERSATION CHO CẢ 2 TRƯỜNG HỢP
            let targetUserId = null;
            let realUserName = 'Khách hàng';

            if (messageData.receiverId === 'admin') {
                // Tin nhắn từ user gửi đến admin
                targetUserId = messageData.senderId;
            } else if (messageData.senderId === 'admin') {
                // Tin nhắn từ admin gửi đến user
                targetUserId = messageData.receiverId;
            }

            if (targetUserId && targetUserId !== 'admin') {
                try {
                    const User = mongoose.model('User');
                    const user = await User.findById(targetUserId);
                    if (user) {
                        realUserName = user.fullName || user.name || user.username ||
                            user.displayName || user.email?.split('@')[0] ||
                            `User_${targetUserId.substring(targetUserId.length - 6)}`;
                    } else {
                        realUserName = `User_${targetUserId.substring(targetUserId.length - 6)}`;
                    }
                } catch (error) {
                    console.log('❌ Error getting user info:', error.message);
                    realUserName = `User_${targetUserId.substring(targetUserId.length - 6)}`;
                }

                // ✅ FIX: CẬP NHẬT CONVERSATION VỚI TÊN THẬT
                const updateData = {
                    userId: targetUserId,
                    userName: realUserName,
                    lastMessage: messageData.message,
                    lastMessageTime: messageData.timestamp || new Date(),
                    isActive: true
                };

                // Chỉ tăng unreadCount nếu tin nhắn từ user (không phải admin)
                if (messageData.senderId !== 'admin') {
                    updateData.$inc = { unreadCount: 1 };
                } else {
                    updateData.unreadCount = 0; // Admin gửi thì reset unreadCount
                }

                await Conversation.findOneAndUpdate(
                    { userId: targetUserId },
                    updateData,
                    { upsert: true, new: true }
                );

                console.log('📝 Conversation updated for user:', targetUserId, 'Name:', realUserName);
            }

            return savedMessage;

        } catch (error) {
            console.error('❌ Error saving message:', error);
            throw new Error(error.message);
        }
    },

    getMessages: async (userId, targetId, limit = 100) => {
        try {
            console.log('🔍 Getting messages between:', userId, 'and', targetId);

            const messages = await Message.find({
                $or: [
                    { senderId: userId, receiverId: targetId },
                    { senderId: targetId, receiverId: userId }
                ]
            })
                .sort({ timestamp: 1 })
                .limit(limit)
                .lean();

            console.log('📨 Retrieved messages count:', messages.length);

            // ✅ FIX: LOG CHI TIẾT ĐỂ DEBUG
            if (messages.length > 0) {
                console.log('📝 Latest messages:');
                messages.slice(-5).forEach((msg, index) => {
                    console.log(`  ${index + 1}. [${new Date(msg.timestamp).toLocaleTimeString()}] ${msg.senderId}: ${msg.message}`);
                });
            }

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
                        lastUpdate: new Date()
                    }
                },
                { upsert: true, new: true }
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