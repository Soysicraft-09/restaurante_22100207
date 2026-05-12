require('./config/env');
const app = require('./app');

// Puerto configurable por .env. Si no existe, usa 3000 para desarrollo local.
const port = Number(process.env.PORT || 3000);

// Punto de arranque real del backend: aqui Express empieza a escuchar peticiones.
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
