const express = require('express');
const {
  register,
  login,
  getProfile,
  updateProfile,
  getHistory
} = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.get('/history', authMiddleware, getHistory);

module.exports = router;
