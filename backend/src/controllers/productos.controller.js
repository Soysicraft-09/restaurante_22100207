const db = require('../config/db');

const getProductos = (req, res) => {
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
      return res.status(500).json({ error: 'Error al obtener productos' });
    }

    const productos = resultados.map((producto) => ({
      ...producto,
      price: Number(producto.price),
      inStock: Boolean(producto.inStock)
    }));

    return res.json(productos);
  });
};

module.exports = {
  getProductos
};
