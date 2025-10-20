const UserRouter = require('./UserRouter')
const ProductRouter = require('./ProductRouter')
const OrderRouter = require('./OrderRouter')
const paymentRouter = require('./PaymentRouter')
const routes = (app) => {
    app.use('/api/user', UserRouter)
    app.use('/api/product', ProductRouter)
    app.use('/api/order', OrderRouter)
    // test nhanh xem router có hoạt động không
    app.get('/api/test', (req, res) => {
        res.json({ message: "✅ API is working!" })
    })
    app.use('/api/payment', paymentRouter)

}

module.exports = routes
