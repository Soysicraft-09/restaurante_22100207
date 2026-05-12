require('./env');

// Configuracion central para hablar con PayPal desde el backend.
// IMPORTANTE: clientSecret solo debe existir aqui/en .env, nunca en Angular.
const paypalConfig = {
  clientId: process.env.PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  // Sandbox es el entorno de pruebas de PayPal. Live seria dinero real.
  baseUrl: process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com',
};

// Helper para validar rapidamente si el backend tiene credenciales suficientes.
const hasPaypalCredentials = () =>
  Boolean(paypalConfig.clientId && paypalConfig.clientSecret);

// Exportamos la configuracion y el validador por si otro modulo necesita usarlos.
module.exports = {
  paypalConfig,
  hasPaypalCredentials,
};
