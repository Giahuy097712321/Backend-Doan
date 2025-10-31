const UserRouter = require('./UserRouter')
const ProductRouter = require('./ProductRouter')
const OrderRouter = require('./OrderRouter')
const paymentRouter = require('./PaymentRouter')
const ChatRouter = require('./ChatRouter');
const routes = (app) => {
    app.use('/api/user', UserRouter)
    app.use('/api/product', ProductRouter)
    app.use('/api/order', OrderRouter)
    // test nhanh xem router có hoạt động không
    app.get('/api/test', (req, res) => {
        res.json({ message: "✅ API is working!" })
    })
    app.use('/api/payment', paymentRouter)
    app.use('/api/chat', ChatRouter);
    // Thêm vào routes/index.js
    app.get('/api/chat/test-service', async (req, res) => {
        try {
            const ChatService = require('../services/ChatService');
            // Test save message
            const testMessage = await ChatService.saveMessage({
                senderId: 'test-user',
                senderName: 'Test User',
                receiverId: 'admin',
                message: 'Test message from service',
                timestamp: new Date()
            });

            res.json({
                status: 'OK',
                message: 'Service test successful',
                data: testMessage
            });
        } catch (error) {
            res.status(500).json({
                status: 'ERR',
                message: error.message
            });
        }
    });
}

module.exports = routes
