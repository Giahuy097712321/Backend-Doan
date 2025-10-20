const jwt = require('jsonwebtoken')
const dotenv = require('dotenv')
dotenv.config()

// ✅ Cho phép cả user lẫn admin
const authUserMiddleWare = (req, res, next) => {
    const token = req.headers.token?.split(' ')[1]
    if (!token) {
        return res.status(401).json({
            message: 'Token missing',
            status: 'ERROR'
        })
    }

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, user) => {
        if (err) {
            return res.status(403).json({
                message: 'Invalid token',
                status: 'ERROR'
            })
        }

        req.user = user // Lưu thông tin user vào request
        next()
    })
}

// ✅ Middleware chỉ dành cho admin
const authMiddleWare = (req, res, next) => {
    const token = req.headers.token?.split(' ')[1]
    if (!token) {
        return res.status(401).json({
            message: 'Token missing',
            status: 'ERROR'
        })
    }

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, user) => {
        if (err || !user?.isAdmin) {
            return res.status(403).json({
                message: 'The authentication',
                status: 'ERROR'
            })
        }

        req.user = user
        next()
    })
}

module.exports = {
    authMiddleWare,
    authUserMiddleWare
}
