// src/services/CommentService.js
const Product = require('../models/ProductModel');

const CommentService = {
    // Thêm bình luận mới
    addComment: async (productId, commentData) => {
        try {
            const product = await Product.findById(productId);
            if (!product) {
                throw new Error('Sản phẩm không tồn tại');
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
            await product.save();

            // Populate thông tin user cho comment mới
            const updatedProduct = await Product.findById(productId)
                .populate('comments.user', 'name avatar');

            return {
                status: 'OK',
                message: 'Thêm bình luận thành công',
                data: updatedProduct.comments
            };
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Lấy tất cả bình luận của sản phẩm
    getComments: async (productId, page = 1, limit = 10, sort = 'newest') => {
        try {
            const product = await Product.findById(productId)
                .populate('comments.user', 'name avatar')
                .select('comments ratingSummary');

            if (!product) {
                throw new Error('Sản phẩm không tồn tại');
            }

            let comments = product.comments;

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
                    comments.sort((a, b) => b.likes.length - a.likes.length);
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
                    ratingSummary: product.ratingSummary
                }
            };
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Chỉnh sửa bình luận
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

            await product.save();

            return {
                status: 'OK',
                message: 'Cập nhật bình luận thành công',
                data: comment
            };
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Xóa bình luận
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

            product.comments.pull(commentId);
            await product.save();

            return {
                status: 'OK',
                message: 'Xóa bình luận thành công'
            };
        } catch (error) {
            throw new Error(error.message);
        }
    },

    // Like/Unlike comment
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
    },

    // Lấy thống kê rating
    getRatingStats: async (productId) => {
        try {
            const product = await Product.findById(productId).select('ratingSummary');

            if (!product) {
                throw new Error('Sản phẩm không tồn tại');
            }

            return {
                status: 'OK',
                message: 'Lấy thống kê rating thành công',
                data: product.ratingSummary
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
};

module.exports = CommentService;