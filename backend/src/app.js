const express = require('express');
const cors = require('cors');
const productosRoutes = require('./routes/productos.routes');
const paypalRoutes = require('./routes/paypal.routes');

const app = express();

// CORS permite que Angular en localhost:4200 consuma este backend en localhost:3000.
app.use(cors());

// Necesario para leer req.body cuando Angular envia JSON al crear la orden de PayPal.
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'mi-proyecto-backend' });
});

app.use('/api/paypal', paypalRoutes);
app.use('/api', productosRoutes);

// Monta las rutas de pago:
// POST /api/paypal/orders
// POST /api/paypal/orders/:orderId/capture
app.use('/api', paypalRoutes);

module.exports = app;
