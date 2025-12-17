// src/services/CommentService.js
const mongoose = require('mongoose');
const Product = require('../models/ProductModel');
const Order = require('../models/OrderProduct');
const User = require('../models/UserModel');

// Hàm helper để tính toán rating summary
const calculateRatingSummary = (product) => {
    const comments = product.comments;

    if (comments.length === 0) {
        product.ratingSummary = {
            averageRating: 0,
            totalRatings: 0,
            ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        };
    } else {
        const total = comments.length;
        const sum = comments.reduce((acc, comment) => acc + comment.rating, 0);
        const average = sum / total;

        const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        comments.forEach(comment => {
            ratingCounts[comment.rating] = (ratingCounts[comment.rating] || 0) + 1;
        });

        product.ratingSummary = {
            averageRating: Math.round(average * 10) / 10, // Làm tròn 1 chữ số
            totalRatings: total,
            ratingCounts: ratingCounts
        };
    }

    return product.ratingSummary;
};

const CommentService = {
    // Thêm bình luận mới
    addComment: async (productId, commentData) => {
        try {
            const product = await Product.findById(productId);
            if (!product) {
                throw new Error('Sản phẩm không tồn tại');
            }

            const productObjectId = new mongoose.Types.ObjectId(productId);

            // Kiểm tra user đã mua hàng chưa
            const purchasedOrder = await Order.findOne({
                user: commentData.userId,
                isDelivered: true,
                isCancelled: false,
                'orderItems.product': productObjectId
            });

            if (!purchasedOrder) {
                throw new Error('Bạn chưa mua sản phẩm này nên không được đánh giá');
            }

            // Kiểm tra đã đánh giá chưa
            const alreadyCommented = product.comments.find(
                c => c.user.toString() === commentData.userId
            );

            if (alreadyCommented) {
                throw new Error('Bạn đã đánh giá sản phẩm này rồi');
            }

            const newComment = {
                user: commentData.userId,
                userName: commentData.userName,
                userAvatar: commentData.userAvatar,
                rating: commentData.rating,
                comment: commentData.comment,
                images: commentData.images || []
            };

            product.comments.push(newComment);

            // Tính toán lại rating summary
            calculateRatingSummary(product);
            await product.save();

            return {
                status: 'OK',
                message: 'Thêm bình luận thành công',
                data: product.comments
            };
        } catch (error) {
            console.error('❌ addComment error:', error.message);
            throw new Error(error.message);
        }
    },

    // Xóa bình luận - ĐÃ SỬA
    deleteComment: async (productId, commentId, userId, isAdmin = false) => {
        try {
            const product = await Product.findById(productId);
            if (!product) {
                throw new Error('Sản phẩm không tồn tại');
            }

            const comment = product.comments.id(commentId);
            if (!comment) {
                throw new Error('Bình luận không tồn tại');
            }

            // Kiểm tra quyền (chủ comment hoặc admin)
            if (comment.user.toString() !== userId && !isAdmin) {
                throw new Error('Bạn không có quyền xóa bình luận này');
            }

            // Xóa comment
            product.comments.pull(commentId);

            // Tính toán lại rating summary sau khi xóa
            calculateRatingSummary(product);
            await product.save();

            return {
                status: 'OK',
                message: 'Xóa bình luận thành công',
                data: {
                    ratingSummary: product.ratingSummary
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Cập nhật bình luận - ĐÃ SỬA
    updateComment: async (productId, commentId, userId, updateData) => {
        try {
            const product = await Product.findById(productId);
            if (!product) {
                throw new Error('Sản phẩm không tồn tại');
            }

            const comment = product.comments.id(commentId);
            if (!comment) {
                throw new Error('Bình luận không tồn tại');
            }

            // Kiểm tra quyền sở hữu
            if (comment.user.toString() !== userId) {
                throw new Error('Bạn không có quyền chỉnh sửa bình luận này');
            }

            // Cập nhật thông tin
            if (updateData.rating) comment.rating = updateData.rating;
            if (updateData.comment) {
                comment.comment = updateData.comment;
                comment.isEdited = true;
                comment.editedAt = new Date();
            }
            if (updateData.images) comment.images = updateData.images;

            // Tính toán lại rating summary sau khi cập nhật rating
            if (updateData.rating) {
                calculateRatingSummary(product);
            }

            await product.save();

            return {
                status: 'OK',
                message: 'Cập nhật bình luận thành công',
                data: {
                    comment: comment,
                    ratingSummary: product.ratingSummary
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Lấy thống kê rating - CÓ THỂ CẦN TÍNH LẠI NẾU CHƯA CÓ
    getRatingStats: async (productId) => {
        try {
            const product = await Product.findById(productId).select('comments ratingSummary');

            if (!product) {
                throw new Error('Sản phẩm không tồn tại');
            }

            // Nếu chưa có ratingSummary hoặc ratingSummary không đúng, tính toán lại
            if (!product.ratingSummary || Object.keys(product.ratingSummary).length === 0) {
                calculateRatingSummary(product);
                await product.save();
            }

            return {
                status: 'OK',
                message: 'Lấy thống kê rating thành công',
                data: product.ratingSummary
            };
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Các hàm khác giữ nguyên
    getComments: async (productId, page = 1, limit = 10, sort = 'newest') => {
        try {
            const product = await Product.findById(productId).select('comments ratingSummary');

            if (!product) {
                throw new Error('Sản phẩm không tồn tại');
            }

            // Lấy tất cả userId từ comments
            const userIds = product.comments
                .map(comment => comment.user)
                .filter(id => id && mongoose.Types.ObjectId.isValid(id));

            // Lấy thông tin user mới nhất từ database
            const users = await User.find({ _id: { $in: userIds } })
                .select('name avatar email')
                .lean();

            // Tạo map để truy cập nhanh user info
            const userMap = {};
            users.forEach(user => {
                userMap[user._id.toString()] = {
                    name: user.name,
                    avatar: user.avatar,
                    email: user.email
                };
            });

            // Kết hợp thông tin user vào comments
            let comments = product.comments.map(comment => {
                const commentObj = comment.toObject ? comment.toObject() : comment;
                const userId = commentObj.user?.toString();
                const userInfo = userId ? userMap[userId] : null;

                // Ưu tiên thông tin từ database (mới nhất)
                const finalUserName = userInfo?.name || commentObj.userName || 'Người dùng';
                const finalUserAvatar = userInfo?.avatar || commentObj.userAvatar || '';

                // Nếu tên vẫn là "Người dùng" nhưng có email, sử dụng email
                const finalDisplayName = finalUserName === 'Người dùng' && userInfo?.email
                    ? userInfo.email.split('@')[0]
                    : finalUserName;

                return {
                    _id: commentObj._id,
                    user: commentObj.user,
                    userName: finalDisplayName,
                    userAvatar: finalUserAvatar,
                    userEmail: userInfo?.email || '',
                    rating: commentObj.rating,
                    comment: commentObj.comment,
                    images: commentObj.images || [],
                    likes: commentObj.likes || [],
                    isEdited: commentObj.isEdited || false,
                    editedAt: commentObj.editedAt,
                    createdAt: commentObj.createdAt,
                    updatedAt: commentObj.updatedAt
                };
            });

            // Sắp xếp
            switch (sort) {
                case 'newest':
                    comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
                case 'oldest':
                    comments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                    break;
                case 'highest_rating':
                    comments.sort((a, b) => b.rating - a.rating);
                    break;
                case 'lowest_rating':
                    comments.sort((a, b) => a.rating - b.rating);
                    break;
                case 'most_likes':
                    comments.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
                    break;
            }

            // Phân trang
            const startIndex = (page - 1) * limit;
            const endIndex = page * limit;
            const paginatedComments = comments.slice(startIndex, endIndex);

            return {
                status: 'OK',
                message: 'Lấy bình luận thành công',
                data: {
                    comments: paginatedComments,
                    totalComments: comments.length,
                    totalPages: Math.ceil(comments.length / limit),
                    currentPage: page,
                    ratingSummary: product.ratingSummary || {}
                }
            };
        } catch (error) {
            console.error('❌ Error in getComments:', error);
            throw new Error(error.message);
        }
    },

    toggleLikeComment: async (productId, commentId, userId) => {
        try {
            const product = await Product.findById(productId);
            if (!product) {
                throw new Error('Sản phẩm không tồn tại');
            }

            const comment = product.comments.id(commentId);
            if (!comment) {
                throw new Error('Bình luận không tồn tại');
            }

            const likeIndex = comment.likes.indexOf(userId);

            if (likeIndex > -1) {
                // Unlike
                comment.likes.splice(likeIndex, 1);
            } else {
                // Like
                comment.likes.push(userId);
            }

            await product.save();

            return {
                status: 'OK',
                message: likeIndex > -1 ? 'Đã bỏ like' : 'Đã like',
                data: {
                    likes: comment.likes,
                    likesCount: comment.likes.length
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = CommentService;