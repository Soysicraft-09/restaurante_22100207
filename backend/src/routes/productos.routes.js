const express = require('express');
const { getProductos } = require('../controllers/productos.controller');

const router = express.Router();

router.get('/productos', getProductos);

module.exports = router;
