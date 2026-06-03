const express = require('express');
const { getProductos } = require('../controllers/productos.controller');

const router = express.Router();

// Expone el catalogo del restaurante para que Angular lo consuma por HTTP.
router.get('/productos', getProductos);

module.exports = router;
