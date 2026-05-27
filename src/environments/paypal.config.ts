// Configuracion PUBLICA del SDK de PayPal usada por Angular.
// Importante: el Client ID puede vivir en frontend; el Client Secret JAMAS debe salir del backend.
// Arquitectura: Angular carga botones con este archivo, pero crea/captura ordenes mediante Express.
export const paypalConfig = {
  clientId: 'AW_U74G8r7lsdju3fS8k7TivM3fqXhPC67WI_xKiaYsnGDJyk1n2-3ZEQH2-IIbsI8hFKPPKwLRblSXm',
  currency: 'MXN',
  // PayPal valida el locale con guion bajo. `es-MX` rompe la carga del SDK con Bad Request.
  locale: 'es_MX',
  buyerCountry: 'MX',
};
