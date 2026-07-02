require('./config/env');
const app = require('./app');

// [BUSCAR: CONFIGURACION] Usa el puerto definido por entorno o cae a 3000 si no existe configuracion.
const port = Number(process.env.PORT || 3000);

// [BUSCAR: API] Arranca el servidor HTTP y deja visible la URL local para depuracion.
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
