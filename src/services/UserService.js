const User = require("../models/UserModel")
const bcrypt = require("bcrypt")
const { genneralAccessToken, genneralRefreshToken } = require("./JwtService")
const EmailService = require("./EmailService")

// Thêm hàm tạo OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

const createUser = (newUser) => {
    return new Promise(async (resolve, reject) => {
        const { name, email, password, confirmPassword, phone } = newUser
        try {
            const checkUser = await User.findOne({
                email: email
            })
            if (checkUser !== null) {
                resolve({
                    status: 'ERR',
                    message: 'The email is already'
                })
            }
            const hash = bcrypt.hashSync(password, 10)

            const createdUser = await User.create({
                name,
                email,
                password: hash,
                phone
            })
            if (createdUser) {
                resolve({
                    status: 'OK',
                    message: 'SUCCESS',
                    data: createdUser
                })
            }
        } catch (e) {
            reject(e)
        }
    })
}

const loginUser = (userLogin) => {
    return new Promise(async (resolve, reject) => {
        const { email, password } = userLogin
        try {
            const checkUser = await User.findOne({
                email: email
            })
            if (checkUser == null) {
                resolve({
                    status: 'ERR',
                    message: 'The email is not defined'
                })
            }
            const comparePassword = bcrypt.compareSync(password, checkUser.password)

            if (!comparePassword) {
                resolve({
                    status: 'ERR',
                    message: 'The password or user is incorrect'
                })
            }
            const access_token = await genneralAccessToken({
                id: checkUser.id,
                isAdmin: checkUser.isAdmin
            })
            const refresh_token = await genneralRefreshToken({
                id: checkUser.id,
                isAdmin: checkUser.isAdmin
            })
            resolve({
                status: 'OK',
                message: 'SUCCESS',
                access_token, refresh_token
            })

        } catch (e) {
            reject(e)
        }
    })
}

const updateUser = (id, data) => {
    return new Promise(async (resolve, reject) => {
        try {
            const checkUser = await User.findById(id)
            if (checkUser === null) {
                resolve({
                    status: 'ERR',
                    message: 'The user is not defined'
                })
            }
            const updateUser = await User.findByIdAndUpdate(id, data, { new: true })
            resolve({
                status: 'OK',
                message: 'SUCCESS',
                data: updateUser
            })

        } catch (e) {
            reject(e)
        }
    })
}

const deleteUser = (id, data) => {
    return new Promise(async (resolve, reject) => {
        try {
            const checkUser = await User.findById({
                _id: id
            })
            if (checkUser === null) {
                resolve({
                    status: 'ERR',
                    message: 'The user is not defined'
                })
            }
            await User.findByIdAndDelete(id)
            resolve({
                status: 'OK',
                message: 'Delete user success',
            })

        } catch (e) {
            reject(e)
        }
    })
}

const deleteManyUser = (ids) => {
    return new Promise(async (resolve, reject) => {
        try {
            await User.deleteMany({ _id: ids });
            resolve({
                status: 'OK',
                message: 'Delete user success',
            });
        } catch (e) {
            reject(e);
        }
    });
};

const getAllUser = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const allUser = await User.find()
            resolve({
                status: 'OK',
                message: 'Get all users success',
                data: allUser,
            })

        } catch (e) {
            reject(e)
        }
    })
}

const getDetailsUser = (id) => {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await User.findById({
                _id: id
            })
            if (user === null) {
                resolve({
                    status: 'ERR',
                    message: 'The user is not defined'
                })
            }

            resolve({
                status: 'OK',
                message: 'success',
                data: user
            })

        } catch (e) {
            reject(e)
        }
    })
}

// Thêm hàm đổi mật khẩu
const changePassword = (userId, oldPassword, newPassword) => {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await User.findById(userId)
            if (!user) {
                resolve({
                    status: 'ERR',
                    message: 'User not found'
                })
            }

            // Kiểm tra mật khẩu cũ
            const isCorrectPassword = bcrypt.compareSync(oldPassword, user.password)
            if (!isCorrectPassword) {
                resolve({
                    status: 'ERR',
                    message: 'Old password is incorrect'
                })
            }

            // Mã hóa mật khẩu mới
            const hash = bcrypt.hashSync(newPassword, 10)
            user.password = hash
            await user.save()

            resolve({
                status: 'OK',
                message: 'Password changed successfully'
            })

        } catch (e) {
            reject(e)
        }
    })
}

// Thêm hàm quên mật khẩu
const forgotPassword = (email) => {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await User.findOne({ email })
            if (!user) {
                resolve({
                    status: 'ERR',
                    message: 'Email not found'
                })
            }

            // Tạo OTP và thời gian hết hạn (10 phút)
            const otp = generateOTP()
            const otpExpires = new Date(Date.now() + 10 * 60 * 1000) // 10 phút

            // Lưu OTP vào user
            user.otp = otp
            user.otpExpires = otpExpires
            await user.save()

            // Gửi OTP qua email
            const emailResult = await EmailService.sendOTPEmail(email, otp, user.name)

            if (emailResult.success) {
                resolve({
                    status: 'OK',
                    message: 'OTP sent to your email'
                })
            } else {
                resolve({
                    status: 'ERR',
                    message: 'Failed to send OTP email'
                })
            }

        } catch (e) {
            reject(e)
        }
    })
}

// Thêm hàm reset mật khẩu
const resetPassword = (email, otp, newPassword) => {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await User.findOne({
                email,
                otp,
                otpExpires: { $gt: new Date() }
            })

            if (!user) {
                resolve({
                    status: 'ERR',
                    message: 'Invalid OTP or OTP has expired'
                })
            }

            // Mã hóa mật khẩu mới
            const hash = bcrypt.hashSync(newPassword, 10)
            user.password = hash
            user.otp = undefined
            user.otpExpires = undefined
            await user.save()

            resolve({
                status: 'OK',
                message: 'Password reset successfully'
            })

        } catch (e) {
            reject(e)
        }
    })
}

module.exports = {
    createUser,
    loginUser,
    updateUser,
    deleteUser,
    getAllUser,
    getDetailsUser,
    deleteManyUser,
    changePassword,
    forgotPassword,
    resetPassword
}