// services/ChatService.js - FIX LỖI HIỂN THỊ TIN NHẮN MỚI
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

            // ✅ FIX: TẠO MESSAGE MỚI
            const message = new Message({
                senderId: messageData.senderId,
                receiverId: messageData.receiverId,
                message: messageData.message,
                timestamp: messageData.timestamp || new Date(),
                isRead: messageData.isRead || false
            });

            const savedMessage = await message.save();
            console.log('✅ Message saved to DB:', savedMessage._id);

            // ✅ FIX: CẬP NHẬT CONVERSATION
            let targetUserId = null;
            let realUserName = 'Khách hàng';

            if (messageData.receiverId === 'admin') {
                targetUserId = messageData.senderId;
            } else if (messageData.senderId === 'admin') {
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
                    }
                } catch (error) {
                    console.log('❌ Error getting user info:', error.message);
                }

                const updateData = {
                    userId: targetUserId,
                    userName: realUserName,
                    lastMessage: messageData.message,
                    lastMessageTime: messageData.timestamp || new Date(),
                    isActive: true
                };

                if (messageData.senderId !== 'admin') {
                    updateData.$inc = { unreadCount: 1 };
                }

                await Conversation.findOneAndUpdate(
                    { userId: targetUserId },
                    updateData,
                    { upsert: true, new: true }
                );

                console.log('📝 Conversation updated:', realUserName);
            }

            return savedMessage;

        } catch (error) {
            console.error('❌ Error saving message:', error);
            throw new Error(error.message);
        }
    },

    getMessages: async (userId, targetId, limit = 200) => {
        try {
            console.log('🔍 Getting messages between:', userId, 'and', targetId);

            // ✅ FIX QUAN TRỌNG: SORT THEO THỜI GIAN MỚI NHẤT VÀ TĂNG LIMIT
            const messages = await Message.find({
                $or: [
                    { senderId: userId, receiverId: targetId },
                    { senderId: targetId, receiverId: userId }
                ]
            })
                .sort({ timestamp: -1 }) // ✅ FIX: SORT MỚI NHẤT TRƯỚC
                .limit(limit)
                .lean();

            console.log('📨 Retrieved messages count:', messages.length);

            // ✅ FIX: LOG TẤT CẢ TIN NHẮN ĐỂ DEBUG
            console.log('📝 ALL MESSAGES IN DB:');
            messages.forEach((msg, index) => {
                console.log(`  ${index + 1}. [${new Date(msg.timestamp).toLocaleString('vi-VN')}] ${msg.senderId}: ${msg.message.substring(0, 50)}${msg.message.length > 50 ? '...' : ''}`);
            });

            // ✅ FIX: TRẢ VỀ THEO THỨ TỰ CŨ → MỚI ĐỂ HIỂN THỊ ĐÚNG
            return messages.reverse();

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
    },

    // ✅ THÊM HÀM MỚI: Lấy tin nhắn mới nhất
    getRecentMessages: async (userId, targetId, since = null) => {
        try {
            let query = {
                $or: [
                    { senderId: userId, receiverId: targetId },
                    { senderId: targetId, receiverId: userId }
                ]
            };

            if (since) {
                query.timestamp = { $gt: since };
            }

            const messages = await Message.find(query)
                .sort({ timestamp: 1 }) // Cũ → mới để hiển thị
                .limit(100)
                .lean();

            console.log('🆕 Recent messages since', since, ':', messages.length);
            return messages;
        } catch (error) {
            console.error('❌ Error getting recent messages:', error);
            throw new Error(error.message);
        }
    }
};

module.exports = ChatService;