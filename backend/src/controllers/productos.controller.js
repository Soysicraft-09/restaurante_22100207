const db = require('../config/db');

// Controlador HTTP para listar productos.
// En arquitectura sencilla: ruta -> controlador -> base de datos -> respuesta JSON.
const getProductos = (req, res) => {
  // La consulta traduce nombres de columnas de MySQL a nombres usados por Angular.
  // Ejemplo: `nombre` en BD se convierte en `name` para el frontend.
  const sql = `
    SELECT
      id,
      nombre AS name,
      precio AS price,
      imagen_url AS imageUrl,
      categoria AS category,
      descripcion AS description,
      disponible AS inStock,
      emparejamiento AS pairing,
      temporada AS season
    FROM productos
    ORDER BY id ASC
  `;

  db.query(sql, (error, resultados) => {
    if (error) {
      // No exponemos el error SQL completo al cliente por seguridad.
      return res.status(500).json({ error: 'Error al obtener productos' });
    }

    // MySQL puede devolver numeros/booleans con tipos diferentes segun configuracion.
    // Normalizamos antes de responder para que Angular reciba el contrato MenuItem esperado.
    const productos = resultados.map((producto) => ({
      ...producto,
      price: Number(producto.price),
      inStock: Boolean(producto.inStock)
    }));

    return res.json(productos);
  });
};

// Exportamos el controlador para conectarlo en productos.routes.js.
module.exports = {
  getProductos
};
