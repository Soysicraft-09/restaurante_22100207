const mysql = require('mysql2');
require('./env');

// Este archivo concentra la conexion a MySQL.
// La idea arquitectonica es que el resto del backend NO conozca credenciales:
// solo importa `connection` y ejecuta consultas.
const connection = mysql.createConnection({
  // Estos valores salen de backend/.env gracias a require('./env').
  // Eso evita quemar usuario, password o nombre de BD directamente en el codigo.
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // Si DB_PORT no existe, usamos el puerto default de MySQL: 3306.
  port: Number(process.env.DB_PORT || 3306)
});

connection.connect((error) => {
  if (error) {
    // Se imprime informacion tecnica util para diagnosticar conexion,
    // pero sin imprimir password ni variables sensibles.
    console.error('Error al conectar con MySQL:', {
      code: error.code,
      errno: error.errno,
      message: error.message,
      sqlState: error.sqlState
    });
    return;
  }

  // Si llegamos aqui, el backend ya puede consultar la tabla productos.
  console.log('Conexion a MySQL exitosa.');
});

// Exportamos una sola conexion compartida para controladores y servicios.
module.exports = connection;
