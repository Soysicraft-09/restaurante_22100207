const express = require('express');
const {
  createPaypalOrder,
  capturePaypalOrder,
  sendManualReceipt
} = require('../controllers/paypal.controller');

const router = express.Router();

// [BUSCAR: PAYPAL API INTERFAZ] Frontend llama este endpoint desde createOrder() del boton de PayPal.
// [BUSCAR: PAYPAL PEDIDO] Responde con { id } para que el SDK abra/apruebe esa orden especifica.
router.post('/orders', createPaypalOrder);

// [BUSCAR: PAYPAL API] Frontend llama este endpoint desde onApprove() cuando el comprador ya aprobo en PayPal.
// [BUSCAR: PAYPAL PAGO API] Aqui el backend captura el pago y devuelve la respuesta completa de PayPal.
router.post('/orders/:orderId/capture', capturePaypalOrder);

// [BUSCAR: TICKET PAGO PEDIDO PRUEBAS] Para metodos de pago simulados del proyecto: envia ticket despues de confirmar el pedido.
router.post('/receipt/send', sendManualReceipt);

module.exports = router;
