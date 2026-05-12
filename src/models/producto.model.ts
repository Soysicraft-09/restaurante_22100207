// Contrato central del menu.
// Si backend, XML y frontend respetan esta forma, la UI no necesita saber de donde vino el dato.
export interface MenuItem {
  // Identificador unico del producto, usado para trackBy, carrito y favoritos.
  id: number;
  // Nombre visible del platillo/producto.
  name: string;
  // Precio numerico en MXN.
  price: number;
  // Imagen opcional; si no existe, la tarjeta muestra placeholder.
  imageUrl?: string;
  // Categoria usada para filtros y agrupacion visual.
  category: string;
  // Texto comercial que aparece en la tarjeta y detalle.
  description: string;
  // Controla si se puede agregar al carrito.
  inStock: boolean;
  // Maridaje/recomendacion asociada al platillo.
  pairing: string;
  // Temporada o condicion comercial del producto.
  season: string;
}
