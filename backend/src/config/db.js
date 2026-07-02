const mysql = require('mysql2');
require('./env');

// [BUSCAR: BASE_DATOS CONFIGURACION] Crea una conexion unica a MySQL usando la configuracion cargada desde env.
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306)
});

// [BUSCAR: ERRORES] Intenta conectar al iniciar el proceso para fallar rapido si la base no responde.
connection.connect((error) => {
  if (error) {
    console.error('Error al conectar con MySQL:', {
      code: error.code,
      errno: error.errno,
      message: error.message,
      sqlState: error.sqlState
    });
    return;
  }

  console.log('Conexion a MySQL exitosa.');
});

// [BUSCAR: BASE_DATOS] Exporta la conexion compartida para que controllers y scripts reutilicen el mismo pool.
module.exports = connection;
