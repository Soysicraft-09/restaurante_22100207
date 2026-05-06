const mysql = require('mysql2');
require('./env');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306)
});

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

module.exports = connection;
