const UserService = require('../services/UserService')
const JwtService = require('../services/JwtService')
const createUser = async (req, res) => {
    try {
        console.log(req.body)
        const { name, email, password, confirmPassword, phone } = req.body
        const reg = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
        const isCheckEmail = reg.test(email)
        if (!email || !password || !confirmPassword) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The input is required'
            })
        }
        else if (!isCheckEmail) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The input is email'
            })
        }
        else if (password !== confirmPassword) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The passord is equal confirmPassword'
            });
        }
        console.log('isCheckEmail', isCheckEmail)
        const result = await UserService.createUser(req.body)
        return res.status(200).json(result)
    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}
const loginUser = async (req, res) => {
    try {
        console.log(req.body)
        const { email, password } = req.body
        const reg = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
        const isCheckEmail = reg.test(email)
        if (!email || !password) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The input is required'
            })
        }
        else if (!isCheckEmail) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The input is email'
            })
        }


        const result = await UserService.loginUser(req.body)
        const { refresh_token, ...newResult } = result
        res.cookie('refresh_token', refresh_token, {
            httpOnly: true,
            secure: false,    // true nếu chạy HTTPS (VD: deploy)
            sameSite: 'strict'
        })
        return res.status(200).json(newResult)
    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}
const updateUser = async (req, res) => {
    try {
        const userId = req.params.id
        const data = req.body
        if (!userId) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The userID is required'
            });
        }
        console.log('userId', userId)
        const result = await UserService.updateUser(userId, data)
        return res.status(200).json(result)
    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}
const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id

        if (!userId) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The userID is required'
            });
        }

        const result = await UserService.deleteUser(userId)
        return res.status(200).json(result)
    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}
const deleteManyUser = async (req, res) => {
    try {
        const { ids } = req.body; // destructuring cho gọn
        if (!ids || ids.length === 0) {
            return res.status(200).json({
                status: 'ERR',
                message: 'The ids is required'
            });
        }

        const response = await UserService.deleteMany(ids);
        return res.status(200).json(response);
    } catch (e) {
        return res.status(404).json({
            message: e.message || 'Something went wrong'
        });
    }
};

const getAllUser = async (req, res) => {
    try {

        const result = await UserService.getAllUser()
        return res.status(200).json(result)
    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}
const getDetailsUser = async (req, res) => {
    try {
        const userId = req.params.id

        if (!userId) {
            return res.status(200).json({
                status: 'ERROR',
                message: 'The userID is required'
            });
        }

        const result = await UserService.getDetailsUser(userId)
        return res.status(200).json(result)
    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}
const refreshToken = async (req, res) => {
    console.log('req.cookies.refresh_token', req.cookies.refresh_token)
    try {
        const token = req.cookies.refresh_token

        if (!token) {
            return res.status(200).json({
                status: 'ERROR',
                message: 'The token is required'
            });
        }

        const result = await JwtService.refreshTokenJwtService(token)
        return res.status(200).json(result)
        return
    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}
const logoutUser = async (req, res) => {
    try {
        res.clearCookie('refresh_token')
        return res.status(200).json({
            status: 'OK',
            message: 'Loout successfully'
        })

    } catch (e) {
        return res.status(404).json({
            message: e
        })
    }
}
module.exports = {
    deleteManyUser, createUser, loginUser, updateUser, deleteUser, getAllUser, getDetailsUser, refreshToken, logoutUser
}