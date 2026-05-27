const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'mi_jwt_secreto_local';

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
