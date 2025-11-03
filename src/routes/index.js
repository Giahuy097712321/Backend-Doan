// routes/index.js - GIẢI PHÁP THAY THẾ
const UserRouter = require('./UserRouter')
const ProductRouter = require('./ProductRouter')
const OrderRouter = require('./OrderRouter')
const paymentRouter = require('./PaymentRouter')
const ChatRouter = require('./ChatRouter');
const CommentController = require('../controllers/CommentController');
const { authUserMiddleWare } = require('../middleware/authMiddleware');

const routes = (app) => {
    app.use('/api/user', UserRouter)
    app.use('/api/product', ProductRouter)
    app.use('/api/order', OrderRouter)
    app.use('/api/payment', paymentRouter)
    app.use('/api/chat', ChatRouter)

    // 🎯 ĐĂNG KÝ COMMENT ROUTES TRỰC TIẾP
    app.post('/api/comment/create/:productId', authUserMiddleWare, CommentController.addComment)
    app.get('/api/comment/get-all/:productId', CommentController.getComments)
    app.put('/api/comment/update/:productId/:commentId', authUserMiddleWare, CommentController.updateComment)
    app.delete('/api/comment/delete/:productId/:commentId', authUserMiddleWare, CommentController.deleteComment)
    app.post('/api/comment/like/:productId/:commentId', authUserMiddleWare, CommentController.toggleLikeComment)
    app.get('/api/comment/rating-stats/:productId', CommentController.getRatingStats)

    // Test routes
    app.get('/api/test', (req, res) => {
        res.json({ message: "✅ API is working!" })
    })

    app.get('/api/comment/test', (req, res) => {
        res.json({ message: "✅ Comment API is working!" })
    })

    console.log('🎯 Comment routes registered DIRECTLY - no router file needed')
}

module.exports = routes