const express = require('express');
const {
  createPaypalOrder,
  capturePaypalOrder
} = require('../controllers/paypal.controller');

const router = express.Router();

// Frontend llama este endpoint desde createOrder() del boton de PayPal.
// Responde con { id } para que el SDK abra/apruebe esa orden especifica.
router.post('/paypal/orders', createPaypalOrder);

// Frontend llama este endpoint desde onApprove() cuando el comprador ya aprobo en PayPal.
// Aqui el backend captura el pago y devuelve la respuesta completa de PayPal.
router.post('/paypal/orders/:orderId/capture', capturePaypalOrder);

module.exports = router;
