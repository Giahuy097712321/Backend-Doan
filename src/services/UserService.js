const User = require("../models/UserModel");
const bcrypt = require("bcrypt");
const JwtService = require("./JwtService");
const EmailService = require("./EmailService");

const createUser = (newUser) => {
    return new Promise(async (resolve, reject) => {
        const { name, email, password, confirmPassword, phone } = newUser;

        try {
            // Kiểm tra email đã tồn tại
            const checkUser = await User.findOne({ email });
            if (checkUser) {
                resolve({
                    status: 'ERR',
                    message: 'Email đã tồn tại'
                });
                return;
            }

            // Hash password
            const hash = bcrypt.hashSync(password, 10);

            // Tạo user
            const createdUser = await User.create({
                name,
                email,
                password: hash,
                phone,
                isAdmin: false
            });

            // Không trả password
            const userData = createdUser.toObject();
            delete userData.password;

            resolve({
                status: 'OK',
                message: 'Đăng ký thành công',
                data: userData
            });

        } catch (error) {
            console.error('❌ Lỗi tạo user:', error);
            reject(error);
        }
    });
};

const loginUser = (userLogin) => {
    return new Promise(async (resolve, reject) => {
        const { email, password } = userLogin;

        try {
            // Tìm user
            const user = await User.findOne({ email });

            if (!user) {
                resolve({
                    status: 'ERR',
                    message: 'Email hoặc mật khẩu không đúng'
                });
                return;
            }

            // So sánh password
            const comparePassword = bcrypt.compareSync(password, user.password);
            if (!comparePassword) {
                resolve({
                    status: 'ERR',
                    message: 'Email hoặc mật khẩu không đúng'
                });
                return;
            }

            // Tạo tokens
            const access_token = await JwtService.generateAccessToken({
                id: user._id,
                isAdmin: user.isAdmin
            });

            const refresh_token = await JwtService.generateRefreshToken({
                id: user._id,
                isAdmin: user.isAdmin
            });

            // Không trả password
            const userData = user.toObject();
            delete userData.password;

            resolve({
                status: 'OK',
                message: 'Đăng nhập thành công',
                access_token,
                refresh_token,
                user: userData
            });

        } catch (error) {
            console.error('❌ Lỗi đăng nhập:', error);
            reject(error);
        }
    });
};

// Các hàm khác giữ nguyên nhưng sửa import JwtService
const updateUser = (id, data) => {
    return new Promise(async (resolve, reject) => {
        try {
            const user = await User.findById(id);
            if (!user) {
                resolve({
                    status: 'ERR',
                    message: 'User không tồn tại'
                });
                return;
            }

            // Nếu có password mới thì hash
            if (data.password) {
                data.password = bcrypt.hashSync(data.password, 10);
            }

            const updatedUser = await User.findByIdAndUpdate(id, data, {
                new: true
            });

            resolve({
                status: 'OK',
                message: 'Cập nhật thành công',
                data: updatedUser
            });

        } catch (error) {
            console.error('❌ Lỗi update user:', error);
            reject(error);
        }
    });
};
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
// Trong backend UserService.js - kiểm tra email service
const forgotPassword = (email) => {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('📧 Bắt đầu forgotPassword cho:', email);

            const user = await User.findOne({ email });
            if (!user) {
                console.log('❌ User không tồn tại');
                resolve({ status: 'ERR', message: 'Email không tồn tại' });
                return;
            }

            console.log('✅ Tìm thấy user:', user.name);

            // Tạo OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            console.log('🔐 OTP:', otp);

            // Lưu OTP
            user.otp = otp;
            user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
            await user.save();
            console.log('💾 Đã lưu OTP');

            // Gửi email - KIỂM TRA PHẦN NÀY
            console.log('📤 Gửi email...');
            const emailResult = await EmailService.sendOTPEmail(email, otp, user.name);
            console.log('📩 Kết quả gửi email:', emailResult);

            if (emailResult.success) {
                resolve({ status: 'OK', message: 'OTP đã gửi' });
            } else {
                console.log('❌ Lỗi gửi email:', emailResult.error);
                resolve({ status: 'ERR', message: 'Lỗi gửi email: ' + emailResult.error });
            }

        } catch (error) {
            console.error('💥 Lỗi forgotPassword:', error);
            reject(error);
        }
    });
};

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
    resetPassword,
    // Tương thích với code cũ
    genneralAccessToken: JwtService.genneralAccessToken,
    genneralRefreshToken: JwtService.genneralRefreshToken,
    refreshTokenJwtService: JwtService.refreshTokenJwtService
}