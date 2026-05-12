const path = require('node:path');
const dotenv = require('dotenv');

// __dirname apunta a backend/src/config.
// Subimos dos niveles para llegar a backend/.env.
const envPath = path.resolve(__dirname, '../../.env');

// Carga las variables de entorno antes de que otros modulos lean process.env.
// Sin esto, DB_HOST, PAYPAL_CLIENT_ID, etc. llegarian como undefined.
dotenv.config({ path: envPath });
