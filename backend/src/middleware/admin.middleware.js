// [BUSCAR: AUTENTICACION ADMIN] Middleware de autorizacion: autenticar no basta; aqui exigimos rol admin.
module.exports = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Solo el administrador puede modificar productos' });
  }

  return next();
};
