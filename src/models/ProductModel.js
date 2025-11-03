// src/models/ProductModel.js
const mongoose = require('mongoose')

const commentSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        userName: { type: String, required: true },
        userAvatar: { type: String },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, required: true },
        images: [{ type: String }], // Hình ảnh đính kèm
        likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Người dùng like comment
        isEdited: { type: Boolean, default: false },
        editedAt: { type: Date }
    },
    {
        timestamps: true
    }
);

const productSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, unique: true },
        image: { type: String, required: true },
        type: { type: String, required: true },
        price: { type: Number, required: true },
        countInStock: { type: Number, required: true },
        rating: { type: Number, required: true, default: 0 },
        description: { type: String },
        discount: { type: Number },
        selled: { type: Number, default: 0 },

        // Thêm trường comments
        comments: [commentSchema],

        // Thêm trường thống kê rating
        ratingSummary: {
            totalRatings: { type: Number, default: 0 },
            averageRating: { type: Number, default: 0 },
            ratingCounts: {
                1: { type: Number, default: 0 },
                2: { type: Number, default: 0 },
                3: { type: Number, default: 0 },
                4: { type: Number, default: 0 },
                5: { type: Number, default: 0 }
            }
        }
    },
    {
        timestamps: true,
    }
);

// Middleware để tính toán rating trung bình
productSchema.pre('save', function (next) {
    if (this.comments && this.comments.length > 0) {
        const totalRatings = this.comments.length;
        const totalScore = this.comments.reduce((sum, comment) => sum + comment.rating, 0);
        const averageRating = totalScore / totalRatings;

        // Tính số lượng từng rating
        const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        this.comments.forEach(comment => {
            ratingCounts[comment.rating]++;
        });

        this.ratingSummary = {
            totalRatings,
            averageRating: Math.round(averageRating * 10) / 10, // Làm tròn 1 chữ số thập phân
            ratingCounts
        };

        this.rating = Math.round(averageRating); // Rating chính làm tròn
    }
    next();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;