const jwt = require('jsonwebtoken');
const config = require('./config');
const { verifyTenantCredentials, getTenantById } = require('./tenants');

function generateToken(tenant, username) {
  return jwt.sign(
    {
      username,
      tenantId: tenant.id,
      role: 'tenant_operator',
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
    const tenant = getTenantById(decoded.tenantId);

    if (!tenant) {
      return res.status(401).json({ error: 'Comercio / Inquilino no encontrado o desactivado' });
    }

    req.user = decoded;
    req.tenant = tenant;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado. Inicie sesión nuevamente.' });
  }
}

module.exports = {
  verifyTenantCredentials,
  generateToken,
  authMiddleware
};
