const express = require('express');
const {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto
} = require('../controllers/productos.controller');
const authMiddleware = require('../middleware/auth.middleware');
const adminMiddleware = require('../middleware/admin.middleware');

const router = express.Router();

// [BUSCAR: PRODUCTO API ANGULAR] Expone el catalogo del restaurante para que Angular lo consuma por HTTP.
router.get('/productos', getProductos);
// [BUSCAR: ADMIN CARRITO] Solo el admin puede crear, editar o eliminar productos; el cliente solo compra.
router.post('/productos', authMiddleware, adminMiddleware, createProducto);
router.put('/productos/:id', authMiddleware, adminMiddleware, updateProducto);
router.delete('/productos/:id', authMiddleware, adminMiddleware, deleteProducto);

module.exports = router;
