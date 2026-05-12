// Variables de configuracion para desarrollo local.
// Angular reemplaza/usa este objeto para evitar strings regados por la app.
export const environment = {
  // false indica que estamos en modo desarrollo, no produccion.
  production: false,
  // URL base del backend Express.
  apiUrl: 'http://localhost:3000/api',
  // Client ID publico de PayPal. Puede vivir en frontend; el secreto NO.
  paypalClientId: 'AazRkj4HA28IW1CmXmZpXGHV5whqcN_utTq0carY63HPsWbPjc2AgCK-roZYqeRbC33oEZxY82ntDQsE',
  // Locale usado por PayPal para idioma/formato regional.
  paypalLocale: 'es_MX',
  // Moneda principal de cobro.
  currency: 'MXN',
};
