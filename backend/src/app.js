const express = require('express');
const cors = require('cors');
const productosRoutes = require('./routes/productos.routes');
const paypalRoutes = require('./routes/paypal.routes');
const userRoutes = require('./routes/user.routes');
require('./config/init-db');

const app = express();

// [BUSCAR: API ANGULAR] CORS permite que Angular en localhost:4200 consuma este backend en localhost:3000.
app.use(cors());

// [BUSCAR: PAYPAL PEDIDO ANGULAR] Necesario para leer req.body cuando Angular envia JSON al crear la orden de PayPal.
app.use(express.json());

// [BUSCAR: API] Ruta simple de salud para comprobar rapido que el backend responde.
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'mi-proyecto-backend' });
});

// [BUSCAR: PAYPAL PAGO] Enruta las operaciones de pago hacia el controlador de PayPal.
app.use('/api/paypal', paypalRoutes);
// [BUSCAR: PRODUCTO] Expone el catalogo de productos.
app.use('/api', productosRoutes);
// [BUSCAR: AUTENTICACION USUARIO] Agrupa registro, login, perfil e historial del usuario.
app.use('/api/user', userRoutes);

// [BUSCAR: USUARIO] Rutas de usuario:
// [BUSCAR: API] POST /api/user/register
// [BUSCAR: AUTENTICACION API] POST /api/user/login
// [BUSCAR: API] GET /api/user/profile
// [BUSCAR: API] PUT /api/user/profile
// [BUSCAR: API] GET /api/user/history

// [BUSCAR: API] Las APIs deben responder JSON incluso cuando la ruta no existe.
// [BUSCAR: API ERRORES] Si Express devuelve HTML, el frontend falla intentando parsearlo como JSON.
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'Ruta API no encontrada',
    method: req.method,
    path: req.originalUrl
  });
});

// [BUSCAR: API ERRORES] Ultima red de seguridad para errores no capturados en rutas API.
app.use((error, req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(500).json({
      error: 'Error interno del backend',
      message: error.message
    });
  }

  return next(error);
});

module.exports = app;
