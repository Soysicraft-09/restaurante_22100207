const db = require('../config/db');
const productosSeed = require('../data/productos.seed');

// [BUSCAR: PRODUCTO API INTERFAZ] Convierte el seed local al mismo formato que expone la API para que la vista
// [BUSCAR: ERRORES] no dependa de si los datos vienen de la base o del respaldo inicial.
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

const mapDbToApi = (producto) => ({
  ...producto,
  price: Number(producto.price),
  inStock: Boolean(producto.inStock)
});

const selectProductSql = `
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
`;

const validateProductPayload = (payload) => {
  const { name, price, imageUrl, category, description, inStock, pairing, season } = payload;
  const numericPrice = Number(price);
  const product = {
    name: name ? String(name).trim() : '',
    price: numericPrice,
    imageUrl: imageUrl ? String(imageUrl).trim() : '',
    category: category ? String(category).trim() : '',
    description: description ? String(description).trim() : '',
    inStock,
    pairing: pairing ? String(pairing).trim() : '',
    season: season ? String(season).trim() : ''
  };

  if (
    !product.name ||
    !product.category ||
    !product.description ||
    !product.pairing ||
    !product.season ||
    !Number.isFinite(numericPrice) ||
    numericPrice <= 0 ||
    typeof inStock !== 'boolean'
  ) {
    return { error: 'Datos de producto invalidos' };
  }

  return { product };
};

const getProductById = (id, res) => {
  db.query(`${selectProductSql} WHERE id = ? LIMIT 1`, [id], (selectError, results) => {
    if (selectError) {
      return res.status(500).json({ error: 'No se pudo consultar el producto' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    return res.json(mapDbToApi(results[0]));
  });
};

// [BUSCAR: PRODUCTO BASE_DATOS] Devuelve el catalogo de productos desde MySQL y, si la tabla no existe o esta
// [BUSCAR: PRODUCTO] vacia, cae al seed local para que el frontend siga funcionando.
const getProductos = (req, res) => {
  db.query(`${selectProductSql} ORDER BY id ASC`, (error, resultados) => {
    if (error) {
      return res.json(mapSeedToApi());
    }

    if (resultados.length === 0) {
      return res.json(mapSeedToApi());
    }

    const productos = resultados.map(mapDbToApi);

    return res.json(productos);
  });
};

// [BUSCAR: ADMIN PRODUCTO API] Crea un producto nuevo. Esta accion esta protegida por auth + admin en la ruta.
const createProducto = (req, res) => {
  const validation = validateProductPayload(req.body);

  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const product = validation.product;
  const sql = `
    INSERT INTO productos
      (nombre, precio, imagen_url, categoria, descripcion, disponible, emparejamiento, temporada)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      product.name,
      product.price,
      product.imageUrl,
      product.category,
      product.description,
      product.inStock ? 1 : 0,
      product.pairing,
      product.season
    ],
    (insertError, insertResult) => {
      if (insertError) {
        return res.status(500).json({ error: 'Error al crear el producto' });
      }

      return getProductById(insertResult.insertId, res);
    }
  );
};

// [BUSCAR: ADMIN PRODUCTO API] Actualiza un producto completo. Esta accion esta protegida por auth + admin en la ruta.
const updateProducto = (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Id de producto invalido' });
  }

  const validation = validateProductPayload(req.body);

  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const product = validation.product;
  const sql = `
    UPDATE productos
    SET
      nombre = ?,
      precio = ?,
      imagen_url = ?,
      categoria = ?,
      descripcion = ?,
      disponible = ?,
      emparejamiento = ?,
      temporada = ?
    WHERE id = ?
  `;

  db.query(
    sql,
    [
      product.name,
      product.price,
      product.imageUrl,
      product.category,
      product.description,
      product.inStock ? 1 : 0,
      product.pairing,
      product.season,
      id
    ],
    (updateError, updateResult) => {
      if (updateError) {
        return res.status(500).json({ error: 'Error al actualizar el producto' });
      }

      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      return getProductById(id, res);
    }
  );
};

// [BUSCAR: ADMIN PRODUCTO API] Elimina un producto. Esta accion esta protegida por auth + admin en la ruta.
const deleteProducto = (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Id de producto invalido' });
  }

  db.query('DELETE FROM productos WHERE id = ?', [id], (deleteError, deleteResult) => {
    if (deleteError) {
      return res.status(500).json({ error: 'Error al eliminar el producto' });
    }

    if (deleteResult.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    return res.json({ message: 'Producto eliminado correctamente', id });
  });
};

module.exports = {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto
};
