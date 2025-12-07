const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

class JwtService {
    constructor() {
        this.accessTokenSecret = process.env.ACCESS_TOKEN;
        this.refreshTokenSecret = process.env.REFRESH_TOKEN;

        // Validate
        if (!this.accessTokenSecret || this.accessTokenSecret === 'access_token') {
            console.error('⚠️ Vui lòng thay đổi ACCESS_TOKEN trong file .env!');
            // Fallback cho development
            this.accessTokenSecret = 'development_access_token_secret_change_me';
        }

        if (!this.refreshTokenSecret || this.refreshTokenSecret === 'refresh_token') {
            console.error('⚠️ Vui lòng thay đổi REFRESH_TOKEN trong file .env!');
            this.refreshTokenSecret = 'development_refresh_token_secret_change_me';
        }
    }

    // Tạo access token (ngắn hạn)
    async generateAccessToken(payload) {
        try {
            const token = jwt.sign(
                {
                    ...payload,
                    type: 'access'
                },
                this.accessTokenSecret,
                {
                    expiresIn: '30s' // 15 phút cho production
                }
            );
            return token;
        } catch (error) {
            console.error('❌ Lỗi tạo access token:', error);
            throw error;
        }
    }

    // Tạo refresh token (dài hạn)
    async generateRefreshToken(payload) {
        try {
            const token = jwt.sign(
                {
                    ...payload,
                    type: 'refresh'
                },
                this.refreshTokenSecret,
                {
                    expiresIn: '7d' // 7 ngày
                }
            );
            return token;
        } catch (error) {
            console.error('❌ Lỗi tạo refresh token:', error);
            throw error;
        }
    }

    // Xác thực access token
    verifyAccessToken(token) {
        return new Promise((resolve) => {
            jwt.verify(token, this.accessTokenSecret, (err, decoded) => {
                if (err) {
                    if (err.name === 'TokenExpiredError') {
                        resolve({
                            valid: false,
                            message: 'Token đã hết hạn',
                            expired: true
                        });
                    } else {
                        resolve({
                            valid: false,
                            message: 'Token không hợp lệ'
                        });
                    }
                } else {
                    resolve({
                        valid: true,
                        decoded
                    });
                }
            });
        });
    }

    // Xác thực refresh token
    verifyRefreshToken(token) {
        return new Promise((resolve) => {
            jwt.verify(token, this.refreshTokenSecret, (err, decoded) => {
                if (err) {
                    resolve({
                        valid: false,
                        message: 'Refresh token không hợp lệ'
                    });
                } else {
                    resolve({
                        valid: true,
                        decoded
                    });
                }
            });
        });
    }

    // Refresh token
    async refreshTokenJwtService(refreshToken) {
        try {
            const { valid, decoded } = await this.verifyRefreshToken(refreshToken);

            if (!valid || !decoded) {
                return {
                    status: 'ERR',
                    message: 'Xác thực không hợp lệ'
                };
            }

            const access_token = await this.generateAccessToken({
                id: decoded.id,
                isAdmin: decoded.isAdmin
            });

            return {
                status: 'OK',
                message: 'Làm mới token thành công',
                access_token
            };
        } catch (error) {
            console.error('❌ Lỗi refresh token:', error);
            throw error;
        }
    }

    // Giữ tương thích với code cũ
    async genneralAccessToken(payload) {
        return this.generateAccessToken(payload);
    }

    async genneralRefreshToken(payload) {
        return this.generateRefreshToken(payload);
    }
}

module.exports = new JwtService();