const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { verifyCredentials, generateToken, authMiddleware } = require('./auth');
const schemaManager = require('./schema');
const airtableClient = require('./airtable');

// Rate limiting para login (máximo 10 intentos cada 15 min)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Demasiados intentos de acceso. Por favor, reintente en 15 minutos.' }
});

// Variable en memoria para cambiar el rubro dinámicamente si el usuario lo desea
let currentIndustryId = config.DEFAULT_INDUSTRY;

// ==================== RUTAS DE AUTENTICACIÓN ====================

router.post('/auth/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Debe ingresar usuario y contraseña' });
  }

  try {
    const isValid = await verifyCredentials(username, password);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken(username);
    return res.json({
      token,
      user: {
        username,
        role: 'operator'
      }
    });
  } catch (err) {
    console.error('Error en /auth/login:', err);
    return res.status(500).json({ error: 'Error en el servidor de autenticación' });
  }
});

router.get('/auth/me', authMiddleware, (req, res) => {
  return res.json({
    authenticated: true,
    user: req.user
  });
});

// ==================== CONFIGURACIÓN Y VOCABULARIO ====================

router.get('/config', (req, res) => {
  const currentIndustry = config.INDUSTRIES[currentIndustryId] || config.INDUSTRIES.estetica;
  return res.json({
    activeIndustry: currentIndustry,
    allIndustries: Object.values(config.INDUSTRIES),
    airtableConfigured: !airtableClient.isDemoMode()
  });
});

router.post('/config/industry', authMiddleware, (req, res) => {
  const { industryId } = req.body;
  if (config.INDUSTRIES[industryId]) {
    currentIndustryId = industryId;
    return res.json({
      success: true,
      activeIndustry: config.INDUSTRIES[industryId]
    });
  }
  return res.status(400).json({ error: 'Rubro no válido' });
});

// ==================== ESQUEMA DINÁMICO ====================

router.get('/schema', authMiddleware, async (req, res) => {
  try {
    const schema = await schemaManager.getSchema();
    return res.json(schema);
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener el esquema de Airtable' });
  }
});

router.post('/schema/refresh', authMiddleware, async (req, res) => {
  try {
    const schema = await schemaManager.getSchema(true);
    return res.json({
      success: true,
      message: 'Esquema sincronizado exitosamente con Airtable',
      schema
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error al sincronizar esquema con Airtable' });
  }
});

// ==================== CRUD DE REGISTROS ====================

router.get('/records', authMiddleware, async (req, res) => {
  const search = req.query.search || '';
  const maxRecords = Number(req.query.maxRecords) || 100;

  try {
    const result = await airtableClient.listRecords({ search, maxRecords });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Error al listar registros' });
  }
});

router.get('/records/:id', authMiddleware, async (req, res) => {
  try {
    const result = await airtableClient.getRecord(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(404).json({ error: 'Registro no encontrado' });
  }
});

router.post('/records', authMiddleware, async (req, res) => {
  const fields = req.body.fields || req.body;

  if (!fields || typeof fields !== 'object' || Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'Los datos del registro son requeridos' });
  }

  try {
    const result = await airtableClient.createRecord(fields);
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Error al crear el registro' });
  }
});

router.patch('/records/:id', authMiddleware, async (req, res) => {
  const fields = req.body.fields || req.body;

  if (!fields || typeof fields !== 'object' || Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'Datos para actualizar requeridos' });
  }

  try {
    const result = await airtableClient.updateRecord(req.params.id, fields);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Error al actualizar el registro' });
  }
});

router.delete('/records/:id', authMiddleware, async (req, res) => {
  try {
    const result = await airtableClient.deleteRecord(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Error al eliminar el registro' });
  }
});

module.exports = router;
