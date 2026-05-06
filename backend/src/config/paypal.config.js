require('./env');

const paypalConfig = {
  clientId: process.env.PAYPAL_CLIENT_ID || '',
  clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
  baseUrl: process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com',
};

const hasPaypalCredentials = () =>
  Boolean(paypalConfig.clientId && paypalConfig.clientSecret);

module.exports = {
  paypalConfig,
  hasPaypalCredentials,
};
