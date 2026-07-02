require('./env');

// [BUSCAR: PAYPAL API CONFIGURACION] Centraliza los datos de configuracion de PayPal para que el resto del backend
// [BUSCAR: CONFIGURACION] no lea variables de entorno directamente y la integracion quede en un solo lugar.
const paypalConfig = {
  // [BUSCAR: PAYPAL] Identificador publico de la aplicacion en PayPal.
  clientId: process.env.PAYPAL_CLIENT_ID || '',
  // [BUSCAR: AUTENTICACION] Secreto privado para autenticacion server-to-server; nunca debe llegar al frontend.
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  // [BUSCAR: API PRUEBAS] URL base de la API; en sandbox se prueban flujos sin usar dinero real.
  baseUrl: process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com',
};

// [BUSCAR: PAYPAL AUTENTICACION API] Verifica si el backend ya tiene ambas credenciales necesarias para hablar con PayPal.
const hasPaypalCredentials = () =>
  Boolean(paypalConfig.clientId && paypalConfig.clientSecret);

module.exports = {
  paypalConfig,
  hasPaypalCredentials,
};
