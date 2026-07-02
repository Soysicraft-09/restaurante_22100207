const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET || 'mi_jwt_secreto_local';
const tokenExpiration = '7d';
const adminEmail = process.env.ADMIN_EMAIL || 'admin111@gmail.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'adminmegapro';

// [BUSCAR: AUTENTICACION ANGULAR] Crea el JWT que Angular guardara para autenticar las peticiones posteriores.
const createToken = (user, role = 'cliente') => {
  return jwt.sign({ id: user.id, email: user.correo, role }, jwtSecret, {
    expiresIn: tokenExpiration
  });
};

const isAdminEmail = (correo = '') => correo.trim().toLowerCase() === adminEmail.toLowerCase();

// [BUSCAR: USUARIO BASE_DATOS] Guarda en la tabla de historial una accion relevante del usuario.
const logHistory = (userId, action) => {
  const sql = 'INSERT INTO user_history (user_id, action) VALUES (?, ?)';
  db.query(sql, [userId, action], (error) => {
    if (error) {
      console.error('Error al guardar historial de usuario:', error.message);
    }
  });
};

// [BUSCAR: AUTENTICACION USUARIO] Registra un usuario nuevo, evitando correos duplicados y almacenando la contrasena como hash.
const register = (req, res) => {
  const { nombre, correo, password } = req.body;
  const normalizedCorreo = typeof correo === 'string' ? correo.trim().toLowerCase() : '';

  if (!nombre || !correo || !password) {
    return res.status(400).json({ error: 'Nombre, correo y contrasena son obligatorios' });
  }

  if (isAdminEmail(normalizedCorreo)) {
    return res.status(403).json({ error: 'Este correo esta reservado para el administrador' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const checkSql = 'SELECT id FROM users WHERE correo = ? LIMIT 1';
  db.query(checkSql, [normalizedCorreo], (checkError, results) => {
    if (checkError) {
      return res.status(500).json({ error: 'Error al validar el correo' });
    }

    if (results.length > 0) {
      return res.status(409).json({ error: 'El correo ya esta registrado' });
    }

    const insertSql = 'INSERT INTO users (nombre, correo, password_hash) VALUES (?, ?, ?)';
    db.query(insertSql, [nombre, normalizedCorreo, hashedPassword], (insertError, insertResult) => {
      if (insertError) {
        return res.status(500).json({ error: 'Error al registrar el usuario' });
      }

      logHistory(insertResult.insertId, 'Usuario registrado');
      return res.status(201).json({ message: 'Usuario registrado correctamente' });
    });
  });
};

// [BUSCAR: AUTENTICACION] Valida credenciales, emite token JWT y registra el inicio de sesion.
const login = (req, res) => {
  const { correo, password } = req.body;
  const normalizedCorreo = typeof correo === 'string' ? correo.trim().toLowerCase() : '';
  const normalizedAdminPassword = typeof password === 'string' ? password.trim() : '';

  if (!correo || !password) {
    return res.status(400).json({ error: 'Correo y contrasena son obligatorios' });
  }

  if (isAdminEmail(normalizedCorreo)) {
    if (normalizedAdminPassword !== adminPassword) {
      return res.status(401).json({ error: 'Correo o contrasena incorrectos' });
    }

    const adminUser = { id: 0, nombre: 'Administrador', correo: adminEmail };
    const token = createToken(adminUser, 'admin');

    return res.json({ token, role: 'admin' });
  }

  const sql = 'SELECT id, nombre, correo, password_hash FROM users WHERE correo = ? LIMIT 1';
  db.query(sql, [normalizedCorreo], (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Error buscando el usuario' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Correo o contrasena incorrectos' });
    }

    const user = results[0];
    const isValid = bcrypt.compareSync(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Correo o contrasena incorrectos' });
    }

    const token = createToken(user, 'cliente');
    logHistory(user.id, 'Usuario inicio sesion');

    return res.json({ token, role: 'cliente' });
  });
};

// [BUSCAR: AUTENTICACION USUARIO] Devuelve los datos publicos del usuario autenticado usando req.user que inyecta el middleware.
const getProfile = (req, res) => {
  if (req.user.role === 'admin') {
    return res.json({ id: 0, nombre: 'Administrador', correo: adminEmail, role: 'admin' });
  }

  const sql = 'SELECT id, nombre, correo FROM users WHERE id = ? LIMIT 1';
  db.query(sql, [req.user.id], (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Error al consultar el perfil' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json(results[0]);
  });
};

// [BUSCAR: CORREO AUTENTICACION USUARIO] Actualiza nombre, correo y opcionalmente contrasena del usuario autenticado.
const updateProfile = (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ error: 'El perfil administrador no se edita desde esta pantalla' });
  }

  const { nombre, correo, password } = req.body;

  if (!nombre || !correo) {
    return res.status(400).json({ error: 'Nombre y correo son obligatorios' });
  }

  const checkEmailSql = 'SELECT id FROM users WHERE correo = ? AND id <> ? LIMIT 1';
  db.query(checkEmailSql, [correo, req.user.id], (checkError, checkResults) => {
    if (checkError) {
      return res.status(500).json({ error: 'Error al validar el correo' });
    }

    if (checkResults.length > 0) {
      return res.status(409).json({ error: 'El correo ya esta en uso' });
    }

    const updates = [nombre, correo, req.user.id];
    let sql = 'UPDATE users SET nombre = ?, correo = ? WHERE id = ?';

    if (password) {
      const passwordHash = bcrypt.hashSync(password, 10);
      sql = 'UPDATE users SET nombre = ?, correo = ?, password_hash = ? WHERE id = ?';
      updates.splice(2, 0, passwordHash);
    }

    db.query(sql, updates, (updateError) => {
      if (updateError) {
        return res.status(500).json({ error: 'Error al actualizar el perfil' });
      }

      logHistory(req.user.id, 'Usuario actualizo perfil');
      return getProfile(req, res);
    });
  });
};

// [BUSCAR: USUARIO] Devuelve una bitacora descendente de acciones para mostrar el historial del usuario.
const getHistory = (req, res) => {
  const sql = 'SELECT action, created_at AS createdAt FROM user_history WHERE user_id = ? ORDER BY created_at DESC';
  db.query(sql, [req.user.id], (error, results) => {
    if (error) {
      return res.status(500).json({ error: 'Error al consultar el historial' });
    }

    return res.json(results);
  });
};

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  getHistory
};
