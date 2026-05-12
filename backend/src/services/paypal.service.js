const { Buffer } = require('node:buffer');
const { paypalConfig } = require('../config/paypal.config');

// PayPal pide Basic Auth para obtener el token OAuth.
// Basic Auth = clientId:clientSecret codificado en base64.
const getBasicAuth = () => {
  const credentials = `${paypalConfig.clientId}:${paypalConfig.clientSecret}`;
  return Buffer.from(credentials).toString('base64');
};

// Solicita a PayPal un access_token temporal.
// Ese token es el que autoriza operaciones posteriores como crear/capturar ordenes.
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
    // Si PayPal responde error, detenemos el flujo porque sin token no se puede cobrar.
    throw new Error(`No fue posible obtener access token de PayPal: ${JSON.stringify(data)}`);
  }

  return data.access_token;
};

// Crea una orden en PayPal, pero todavia NO cobra.
// La orden representa "quiero cobrar este total"; el usuario debe aprobarla despues.
const createOrderInPaypal = async ({ total, currency = 'MXN' }) => {
  const accessToken = await getAccessToken();
  // PayPal espera montos con dos decimales como string.
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
    // Sin id no hay orden valida para que el SDK la abra en el navegador.
    throw new Error(`No fue posible crear orden en PayPal: ${JSON.stringify(data)}`);
  }

  // approveUrl es la URL oficial donde el comprador autoriza el pago.
  const approveUrl = Array.isArray(data.links)
    ? data.links.find((link) => link.rel === 'approve')?.href || null
    : null;

  return {
    id: data.id,
    status: data.status,
    approveUrl,
  };
};

// Captura una orden previamente aprobada por el comprador.
// Capturar es el paso que intenta completar el cobro.
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
    // En pagos, fallar fuerte es correcto: no debemos generar pedido si PayPal no confirma captura.
    throw new Error(`No fue posible capturar orden en PayPal: ${JSON.stringify(data)}`);
  }

  return data;
};

// API interna del servicio para que controladores no repitan logica PayPal.
module.exports = {
  createOrderInPaypal,
  captureOrderInPaypal,
};
