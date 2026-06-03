const db = require('../config/db');
const productosSeed = require('../data/productos.seed');

// Convierte el seed local al mismo formato que expone la API para que la vista
// no dependa de si los datos vienen de la base o del respaldo inicial.
const mapSeedToApi = () =>
  productosSeed.map((producto, index) => ({
    id: index + 1,
    name: producto.nombre,
    price: Number(producto.precio),
    imageUrl: producto.imagen_url,
    category: producto.categoria,
    description: producto.descripcion,
    inStock: Boolean(producto.disponible),
    pairing: producto.emparejamiento,
    season: producto.temporada,
  }));

// Devuelve el catalogo de productos desde MySQL y, si la tabla no existe o esta
// vacia, cae al seed local para que el frontend siga funcionando.
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
      return res.json(mapSeedToApi());
    }

    if (resultados.length === 0) {
      return res.json(mapSeedToApi());
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
