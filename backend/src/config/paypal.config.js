require('./env');

// Centraliza los datos de configuracion de PayPal para que el resto del backend
// no lea variables de entorno directamente y la integracion quede en un solo lugar.
const paypalConfig = {
  // Identificador publico de la aplicacion en PayPal.
  clientId: process.env.PAYPAL_CLIENT_ID || '',
  // Secreto privado para autenticacion server-to-server; nunca debe llegar al frontend.
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  // URL base de la API; en sandbox se prueban flujos sin usar dinero real.
  baseUrl: process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com',
};

// Verifica si el backend ya tiene ambas credenciales necesarias para hablar con PayPal.
const hasPaypalCredentials = () =>
  Boolean(paypalConfig.clientId && paypalConfig.clientSecret);

module.exports = {
  paypalConfig,
  hasPaypalCredentials,
};
