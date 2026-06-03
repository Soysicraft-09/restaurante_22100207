const jwt = require('jsonwebtoken');

// Secreto usado para validar el JWT emitido en login; cae al valor local si falta entorno.
const secret = process.env.JWT_SECRET || 'mi_jwt_secreto_local';

// Middleware que exige un Bearer token valido y deja el usuario decodificado en req.user.
module.exports = (req, res, next) => {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticacion requerido' });
  }

  try {
    const payload = jwt.verify(token, secret);

    req.user = {
      id: payload.id,
      correo: payload.email
    };

    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalido o expirado' });
  }
};
