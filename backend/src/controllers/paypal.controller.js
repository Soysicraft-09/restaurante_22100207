const { sendReceiptEmail } = require('../services/receipt.service');
// [BUSCAR: PAYPAL API] URLs oficiales de la API REST de PayPal.
// [BUSCAR: AUTENTICACION PRUEBAS] Sandbox = pruebas con cuentas ficticias. Live = dinero real. NO mezcles credenciales entre entornos.
const PAYPAL_API_BASE = {
  sandbox: 'https://api-m.sandbox.paypal.com',
  live: 'https://api-m.paypal.com'
};

const getPaypalBaseUrl = () => {
  // [BUSCAR: API] Por seguridad el backend cae a sandbox si PAYPAL_ENV no dice explicitamente "live".
  const environment = process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox';
  return PAYPAL_API_BASE[environment];
};

// [BUSCAR: AUTENTICACION API] Obtiene un access token temporal usando las credenciales privadas del backend.
const getPaypalAccessToken = async () => {
  // [BUSCAR: AUTENTICACION API CONFIGURACION] Estas credenciales son SECRETAS: solo deben existir en backend/.env.
  // [BUSCAR: PAYPAL] El frontend usa clientId publico, pero nunca debe conocer clientSecret.
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Faltan PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET en backend/.env');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  // [BUSCAR: PAYPAL] OAuth2 Client Credentials:
  // [BUSCAR: PAYPAL AUTENTICACION API] 1. El backend se autentica contra PayPal.
  // [BUSCAR: PAYPAL] 2. PayPal regresa un access_token temporal.
  // [BUSCAR: AUTENTICACION] 3. Ese token autoriza crear/capturar ordenes sin exponer secretos al navegador.
  const response = await fetch(`${getPaypalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PayPal no pudo generar access token: ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
};

// [BUSCAR: PAYPAL PEDIDO] Crea la orden inicial en PayPal. Esto todavia no cobra; solo deja la orden lista
// [BUSCAR: PAYPAL USUARIO] para que el usuario la apruebe en la ventana de PayPal.
const createPaypalOrder = async (req, res) => {
  try {
    const { amount, currency = 'MXN' } = req.body;
    const numericAmount = Number(amount);

    // [BUSCAR: PAYPAL PAGO] Nunca confies ciegamente en el navegador: valida monto antes de enviarlo a PayPal.
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Monto invalido para PayPal' });
    }

    const accessToken = await getPaypalAccessToken();

    // [BUSCAR: PEDIDO] Crear orden NO cobra todavia.
    // [BUSCAR: PAYPAL USUARIO PAGO] Solo registra con PayPal "quiero cobrar este monto"; el usuario aun debe aprobar.
    const response = await fetch(`${getPaypalBaseUrl()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            description: 'Pedido Casa Quetzal',
            amount: {
              currency_code: currency,
              value: numericAmount.toFixed(2)
            }
          }
        ]
      })
    });

    const data = await response.json();

    // [BUSCAR: PAYPAL ANGULAR] Si PayPal rechaza, regresamos su detalle para que Angular pueda mostrar una causa legible.
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'PayPal rechazo la creacion de la orden',
        paypal: data
      });
    }

    return res.json({ id: data.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// [BUSCAR: PAYPAL USUARIO PAGO PEDIDO] Captura la orden despues de la aprobacion del usuario. Aqui PayPal completa el cobro.
const capturePaypalOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // [BUSCAR: PAYPAL] El orderId viene del SDK despues de que el comprador aprueba en la ventana de PayPal.
    if (!orderId) {
      return res.status(400).json({ error: 'Falta orderId' });
    }

    const accessToken = await getPaypalAccessToken();

    // [BUSCAR: PAGO] Capturar SI intenta completar el cobro.
    // [BUSCAR: PAYPAL AUTENTICACION API ANGULAR] Por eso se hace en backend: necesitamos el token de PayPal y no queremos secretos en Angular.
    const response = await fetch(`${getPaypalBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'PayPal rechazo la captura de la orden',
        paypal: data
      });
    }

    const receiptPayload = req.body?.receipt;

    if (!receiptPayload) {
      return res.json(data);
    }

    try {
      const receipt = await sendReceiptEmail({
        ...receiptPayload,
        paymentMethod: 'PayPal',
        paypalOrderId: orderId,
      });

      return res.json({ ...data, receipt });
    } catch (receiptError) {
      return res.json({
        ...data,
        receiptError: receiptError.message,
      });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const sendManualReceipt = async (req, res) => {
  try {
    const receipt = await sendReceiptEmail(req.body);
    return res.json({ receipt });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

module.exports = {
  createPaypalOrder,
  capturePaypalOrder,
  sendManualReceipt
};
