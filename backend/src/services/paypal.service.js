const { Buffer } = require('node:buffer');
const { paypalConfig } = require('../config/paypal.config');

const getBasicAuth = () => {
  const credentials = `${paypalConfig.clientId}:${paypalConfig.clientSecret}`;
  return Buffer.from(credentials).toString('base64');
};

const getAccessToken = async () => {
  const response = await fetch(`${paypalConfig.baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${getBasicAuth()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    throw new Error(`No fue posible obtener access token de PayPal: ${JSON.stringify(data)}`);
  }

  return data.access_token;
};

const createOrderInPaypal = async ({ total, currency = 'MXN' }) => {
  const accessToken = await getAccessToken();
  const amountValue = Number(total || 0).toFixed(2);

  const response = await fetch(`${paypalConfig.baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amountValue,
          },
        },
      ],
    }),
  });

  const data = await response.json();

  if (!response.ok || !data.id) {
    throw new Error(`No fue posible crear orden en PayPal: ${JSON.stringify(data)}`);
  }

  const approveUrl = Array.isArray(data.links)
    ? data.links.find((link) => link.rel === 'approve')?.href || null
    : null;

  return {
    id: data.id,
    status: data.status,
    approveUrl,
  };
};

const captureOrderInPaypal = async (orderId) => {
  const accessToken = await getAccessToken();

  const response = await fetch(`${paypalConfig.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`No fue posible capturar orden en PayPal: ${JSON.stringify(data)}`);
  }

  return data;
};

module.exports = {
  createOrderInPaypal,
  captureOrderInPaypal,
};
