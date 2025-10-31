const express = require('express');
const router = express.Router();
const ChatController = require('../controllers/ChatController');
const { authUserMiddleWare, authMiddleWare } = require('../middleware/authMiddleware');

router.get('/history/:userId', authUserMiddleWare, ChatController.getChatHistory);
router.get('/conversations', authMiddleWare, ChatController.getConversations);
router.put('/mark-read', authMiddleWare, ChatController.markAsRead);
router.get('/unread/:userId', authUserMiddleWare, ChatController.getUnreadCount);

module.exports = router;