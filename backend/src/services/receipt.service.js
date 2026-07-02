const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
require('../config/env');

const escapeXml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const normalizeLines = (lines = []) =>
  Array.isArray(lines)
    ? lines
        .map((line) => ({
          item: line.item || {},
          quantity: Number(line.quantity || 0),
        }))
        .filter((line) => line.item.name && Number.isFinite(line.quantity) && line.quantity > 0)
    : [];

const calculateTotal = (lines) =>
  lines.reduce((total, line) => total + Number(line.item.price || 0) * line.quantity, 0);

const buildReceiptData = (payload = {}) => {
  const now = new Date();
  const lines = normalizeLines(payload.lines);
  const folio = payload.folio || `CQ-${now.getTime()}`;
  const taxRate = Number.isFinite(Number(payload.taxRate)) ? Number(payload.taxRate) : 0.16;
  const subtotal = calculateTotal(lines);
  const iva = subtotal * taxRate;
  const total = subtotal + iva;

  return {
    folio,
    createdAt: now.toISOString(),
    customerName: payload.customerName || 'Cliente',
    customerEmail: payload.customerEmail || '',
    paymentMethod: payload.paymentMethod || 'No especificado',
    paypalOrderId: payload.paypalOrderId || '',
    lines,
    taxRate,
    subtotal,
    iva,
    total,
  };
};

const buildReceiptXml = (receipt) => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<ticket>\n';
  xml += `  <folio>${escapeXml(receipt.folio)}</folio>\n`;
  xml += `  <fecha>${escapeXml(receipt.createdAt)}</fecha>\n`;
  xml += '  <restaurante>Casa Quetzal</restaurante>\n';
  xml += `  <cliente>${escapeXml(receipt.customerName)}</cliente>\n`;
  xml += `  <correo>${escapeXml(receipt.customerEmail)}</correo>\n`;
  xml += `  <metodo_pago>${escapeXml(receipt.paymentMethod)}</metodo_pago>\n`;

  if (receipt.paypalOrderId) {
    xml += `  <paypal_order_id>${escapeXml(receipt.paypalOrderId)}</paypal_order_id>\n`;
  }

  xml += '  <lineas>\n';

  for (const line of receipt.lines) {
    const unitPrice = Number(line.item.price || 0);
    xml += '    <linea>\n';
    xml += `      <id>${escapeXml(line.item.id)}</id>\n`;
    xml += `      <producto>${escapeXml(line.item.name)}</producto>\n`;
    xml += `      <categoria>${escapeXml(line.item.category)}</categoria>\n`;
    xml += `      <cantidad>${line.quantity}</cantidad>\n`;
    xml += `      <precio_unitario>${unitPrice.toFixed(2)}</precio_unitario>\n`;
    xml += `      <subtotal>${(unitPrice * line.quantity).toFixed(2)}</subtotal>\n`;
    xml += '    </linea>\n';
  }

  xml += '  </lineas>\n';
  xml += `  <subtotal>${receipt.subtotal.toFixed(2)}</subtotal>\n`;
  xml += `  <iva tasa="${receipt.taxRate.toFixed(2)}">${receipt.iva.toFixed(2)}</iva>\n`;
  xml += `  <total>${receipt.total.toFixed(2)}</total>\n`;
  xml += '</ticket>\n';

  return xml;
};

const buildReceiptPdf = (receipt) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: 'LETTER' });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.fontSize(20).text('Casa Quetzal', { align: 'center' });
    doc.moveDown(0.4);
    doc.fontSize(14).text('Ticket de compra', { align: 'center' });
    doc.moveDown();

    doc.fontSize(10);
    doc.text(`Folio: ${receipt.folio}`);
    doc.text(`Fecha: ${receipt.createdAt}`);
    doc.text(`Cliente: ${receipt.customerName}`);
    doc.text(`Correo: ${receipt.customerEmail}`);
    doc.text(`Metodo de pago: ${receipt.paymentMethod}`);

    if (receipt.paypalOrderId) {
      doc.text(`PayPal Order ID: ${receipt.paypalOrderId}`);
    }

    doc.moveDown();
    doc.fontSize(12).text('Detalle del pedido');
    doc.moveDown(0.5);

    for (const line of receipt.lines) {
      const unitPrice = Number(line.item.price || 0);
      doc.fontSize(10).text(`${line.quantity} x ${line.item.name}`);
      doc.text(`Categoria: ${line.item.category || 'Sin categoria'}`);
      doc.text(`Precio unitario: $${unitPrice.toFixed(2)} MXN`);
      doc.text(`Subtotal: $${(unitPrice * line.quantity).toFixed(2)} MXN`);
      doc.moveDown(0.5);
    }

    doc.moveDown();
    doc.fontSize(11).text(`Subtotal: $${receipt.subtotal.toFixed(2)} MXN`, { align: 'right' });
    doc.text(`IVA ${(receipt.taxRate * 100).toFixed(0)}%: $${receipt.iva.toFixed(2)} MXN`, { align: 'right' });
    doc.fontSize(14).text(`Total: $${receipt.total.toFixed(2)} MXN`, { align: 'right' });
    doc.moveDown();
    doc.fontSize(9).fillColor('#555').text('Gracias por comprar en Casa Quetzal.', { align: 'center' });

    doc.end();
  });

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('Faltan SMTP_HOST, SMTP_USER o SMTP_PASS en backend/.env');
  }


  // [BUSCAR: TICKET CORREO AUTENTICACION CONFIGURACION] se usa nodemailer para enviar el correo con el ticket, usando la configuracion SMTP cargada desde .env; se recomienda usar un servicio como Gmail con una contraseña de app para evitar exponer credenciales reales.
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
};

const sendReceiptEmail = async (payload) => {
  const receipt = buildReceiptData(payload);

  if (!receipt.customerEmail) {
    throw new Error('Falta correo del cliente para enviar el ticket');
  }

  if (receipt.lines.length === 0) {
    throw new Error('No hay productos para generar el ticket');
  }

  const xml = buildReceiptXml(receipt);
  const pdf = await buildReceiptPdf(receipt);
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;


  // [BUSCAR: TICKET CORREO CARRITO] Envia el correo con el ticket adjunto en XML y PDF. El cliente recibira un email con su ticket de compra.
  await transporter.sendMail({
    from,
    to: receipt.customerEmail,
    subject: `Ticket Casa Quetzal ${receipt.folio}`,
    text: `Gracias por tu compra. Adjuntamos tu ticket en XML y PDF. Folio: ${receipt.folio}`,
    attachments: [
      {
        filename: `${receipt.folio}.xml`,
        content: xml,
        contentType: 'application/xml',
      },
      {
        filename: `${receipt.folio}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
  });

  return { folio: receipt.folio, sentTo: receipt.customerEmail };
};

module.exports = {
  sendReceiptEmail,
  buildReceiptData,
  buildReceiptXml,
  buildReceiptPdf,
};
