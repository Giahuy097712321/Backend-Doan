// src/controllers/CommentController.js
const CommentService = require('../services/CommentService');
const mongoose = require('mongoose');

const User = require('../models/UserModel'); // ✅ THÊM DÒNG NÀY
const Order = require('../models/OrderProduct');
const CommentController = {
    // Thêm bình luận
    // src/controllers/CommentController.js - Sửa hàm addComment
    // src/controllers/CommentController.js - Sửa phần addComment
    addComment: async (req, res) => {
        try {
            console.log('📝 [addComment] Called');
            console.log('👤 User from request:', req.user);
            console.log('📦 Request params:', req.params);
            console.log('📝 Request body:', req.body);

            const { productId } = req.params;
            const { rating, comment, images } = req.body;
            const userId = req.user.id;

            // Lấy thông tin user
            const user = await User.findById(userId).select('name avatar email');

            if (!user) {
                return res.status(400).json({
                    status: 'ERR',
                    message: 'Không tìm thấy thông tin người dùng'
                });
            }

            // Sử dụng thông tin từ database
            let userName = user.name || user.email?.split('@')[0] || 'Người dùng';
            let userAvatar = user.avatar || '';

            const commentData = {
                userId: userId,
                userName: userName,
                userAvatar: userAvatar,
                rating: parseInt(rating),
                comment: comment.trim(),
                images: images || []
            };

            const result = await CommentService.addComment(productId, commentData);

            res.status(200).json(result);
        } catch (error) {
            console.error('❌ Error in addComment:', error);
            // Trả về message lỗi từ service
            res.status(400).json({
                status: 'ERR',
                message: error.message || 'Lỗi server'
            });
        }
    },


    // Lấy tất cả bình luận của sản phẩm
    getComments: async (req, res) => {
        try {
            console.log('📖 Get comments called:', req.params, req.query);

            const { productId } = req.params;
            const { page, limit, sort } = req.query;

            const result = await CommentService.getComments(
                productId,
                parseInt(page) || 1,
                parseInt(limit) || 10,
                sort || 'newest'
            );

            res.status(200).json(result);
        } catch (error) {
            console.error('❌ Error in getComments:', error);
            res.status(500).json({
                status: 'ERR',
                message: error.message || 'Lỗi server'
            });
        }
    },

    // Cập nhật bình luận
    updateComment: async (req, res) => {
        try {
            console.log('✏️ Update comment called:', req.params, req.body);

            const { productId, commentId } = req.params;
            const updateData = req.body;
            const userId = req.user.id;

            const result = await CommentService.updateComment(
                productId,
                commentId,
                userId,
                updateData
            );

            res.status(200).json(result);
        } catch (error) {
            console.error('❌ Error in updateComment:', error);
            res.status(500).json({
                status: 'ERR',
                message: error.message || 'Lỗi server'
            });
        }
    },

    // Xóa bình luận
    deleteComment: async (req, res) => {
        try {
            console.log('🗑️ Delete comment called:', req.params);

            const { productId, commentId } = req.params;
            const userId = req.user.id;
            const isAdmin = req.user?.isAdmin || false;

            const result = await CommentService.deleteComment(
                productId,
                commentId,
                userId,
                isAdmin
            );

            res.status(200).json(result);
        } catch (error) {
            console.error('❌ Error in deleteComment:', error);
            res.status(500).json({
                status: 'ERR',
                message: error.message || 'Lỗi server'
            });
        }
    },

    // Like/Unlike comment
    toggleLikeComment: async (req, res) => {
        try {
            console.log('❤️ Toggle like called:', req.params);

            const { productId, commentId } = req.params;
            const userId = req.user.id;

            const result = await CommentService.toggleLikeComment(
                productId,
                commentId,
                userId
            );

            res.status(200).json(result);
        } catch (error) {
            console.error('❌ Error in toggleLikeComment:', error);
            res.status(500).json({
                status: 'ERR',
                message: error.message || 'Lỗi server'
            });
        }
    },

    // Lấy thống kê rating
    getRatingStats: async (req, res) => {
        try {
            console.log('📊 Get rating stats called:', req.params);

            const { productId } = req.params;

            const result = await CommentService.getRatingStats(productId);

            res.status(200).json(result);
        } catch (error) {
            console.error('❌ Error in getRatingStats:', error);
            res.status(500).json({
                status: 'ERR',
                message: error.message || 'Lỗi server'
            });
        }
    },

    // Test route
    testComment: async (req, res) => {
        try {
            console.log('🧪 Test comment route called');
            res.status(200).json({
                status: 'OK',
                message: 'Comment API is working!',
                timestamp: new Date()
            });
        } catch (error) {
            console.error('❌ Error in testComment:', error);
            res.status(500).json({
                status: 'ERR',
                message: error.message
            });
        }
    }
};

module.exports = CommentController;