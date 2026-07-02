const path = require('node:path');
const dotenv = require('dotenv');

// [BUSCAR: API CONFIGURACION] Carga las variables del archivo .env ubicado en la raiz del backend.
const envPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: envPath });

// [BUSCAR: CONFIGURACION] Valores por defecto para que el proyecto arranque en desarrollo aunque falte
// [BUSCAR: CONFIGURACION] alguna variable; en produccion deberian venir todas definidas.
process.env.PORT ||= '3000';
process.env.DB_HOST ||= 'localhost';
process.env.DB_USER ||= 'root';
process.env.DB_PASSWORD ||= '';
process.env.DB_NAME ||= 'casa_quetzal';
process.env.DB_PORT ||= '3306';
process.env.JWT_SECRET ||= 'mi_secreto_jwt';
process.env.PAYPAL_ENV ||= 'sandbox';

