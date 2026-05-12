const express = require('express');
const { getProductos } = require('../controllers/productos.controller');

// Router agrupa endpoints relacionados con productos.
// Esto mantiene app.js limpio y separa responsabilidades.
const router = express.Router();

// GET /api/productos
// Devuelve el menu que Angular consume en ProductService.
router.get('/productos', getProductos);

module.exports = router;
