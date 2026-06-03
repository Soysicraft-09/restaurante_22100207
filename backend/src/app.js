const express = require('express');
const cors = require('cors');
const productosRoutes = require('./routes/productos.routes');
const paypalRoutes = require('./routes/paypal.routes');
const userRoutes = require('./routes/user.routes');
require('./config/init-db');

const app = express();

// CORS permite que Angular en localhost:4200 consuma este backend en localhost:3000.
app.use(cors());

// Necesario para leer req.body cuando Angular envia JSON al crear la orden de PayPal.
app.use(express.json());

// Ruta simple de salud para comprobar rapido que el backend responde.
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'mi-proyecto-backend' });
});

// Enruta las operaciones de pago hacia el controlador de PayPal.
app.use('/api/paypal', paypalRoutes);
// Expone el catalogo de productos.
app.use('/api', productosRoutes);
// Agrupa registro, login, perfil e historial del usuario.
app.use('/api/user', userRoutes);

// Rutas de usuario:
// POST /api/user/register
// POST /api/user/login
// GET /api/user/profile
// PUT /api/user/profile
// GET /api/user/history

module.exports = app;
