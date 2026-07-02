const db = require('./db');
const productosSeed = require('../data/productos.seed');

// [BUSCAR: CORREO AUTENTICACION USUARIO BASE_DATOS] Tabla principal de usuarios: guarda perfil, correo unico y hash de contrasena.
const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

// [BUSCAR: USUARIO] Bitacora simple para registrar acciones importantes del usuario.
const createHistoryTable = `
  CREATE TABLE IF NOT EXISTS user_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

// [BUSCAR: PRODUCTO] Catalogo de productos del restaurante, con datos visibles en el frontend.
const createProductosTable = `
  CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    imagen_url VARCHAR(255) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    disponible TINYINT(1) NOT NULL DEFAULT 1,
    emparejamiento VARCHAR(255) NOT NULL,
    temporada VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

// [BUSCAR: BASE_DATOS] Ejecuta una sentencia de migracion y reporta si la tabla quedo lista.
const runMigration = (sql, name) => {
  db.query(sql, (error) => {
    if (error) {
      console.error(`Error al crear tabla ${name}:`, error.message);
      return;
    }

    console.log(`Tabla ${name} verificada o creada correctamente.`);
  });
};

// [BUSCAR: PRODUCTO INTERFAZ] Si no hay productos cargados, inserta el seed local para evitar una pantalla vacia.
const seedProductosIfNeeded = () => {
  db.query('SELECT COUNT(*) AS total FROM productos', (error, rows) => {
    if (error) {
      console.error('Error al verificar productos:', error.message);
      return;
    }

    if (rows[0].total > 0) {
      console.log('Tabla productos ya contiene datos.');
      return;
    }

    const values = productosSeed.map((producto) => [
      producto.nombre,
      producto.precio,
      producto.imagen_url,
      producto.categoria,
      producto.descripcion,
      producto.disponible,
      producto.emparejamiento,
      producto.temporada,
    ]);

    db.query(
      `
        INSERT INTO productos
          (nombre, precio, imagen_url, categoria, descripcion, disponible, emparejamiento, temporada)
        VALUES ?
      `,
      [values],
      (insertError) => {
        if (insertError) {
          console.error('Error al sembrar productos:', insertError.message);
          return;
        }

        console.log(`Se insertaron ${values.length} productos iniciales.`);
      }
    );
  });
};

// [BUSCAR: PRODUCTO] Al importar este modulo se verifican tablas y se siembra el catalogo base.
runMigration(createUsersTable, 'users');
runMigration(createHistoryTable, 'user_history');
runMigration(createProductosTable, 'productos');
seedProductosIfNeeded();
