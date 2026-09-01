const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('./config');

// Precomputamos el hash de la contraseña de operador si está en texto plano
let cachedPasswordHash = null;

async function getPasswordHash() {
  if (!cachedPasswordHash) {
    cachedPasswordHash = await bcrypt.hash(config.OPERATOR_PASSWORD, 10);
  }
  return cachedPasswordHash;
}

async function verifyCredentials(username, password) {
  if (username !== config.OPERATOR_USER) {
    return false;
  }
  const hash = await getPasswordHash();
  return bcrypt.compare(password, hash);
}

function generateToken(username) {
  return jwt.sign(
    {
      username,
      role: 'operator',
      iat: Math.floor(Date.now() / 1000)
    },
    config.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'No se proporcionó token de autorización' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Formato de token inválido. Debe ser Bearer <token>' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado. Inicie sesión nuevamente.' });
  }
}

module.exports = {
  verifyCredentials,
  generateToken,
  authMiddleware
};
