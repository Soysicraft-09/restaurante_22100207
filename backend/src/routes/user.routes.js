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

// Registro y login son publicos porque todavia no existe sesion.
router.post('/register', register);
router.post('/login', login);
// Perfil e historial requieren token JWT valido.
router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.get('/history', authMiddleware, getHistory);

module.exports = router;
