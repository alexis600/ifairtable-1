const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { verifyTenantCredentials, generateToken, authMiddleware } = require('./auth');
const { getPublicTenantsList } = require('./tenants');
const schemaManager = require('./schema');
const airtableClient = require('./airtable');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Demasiados intentos de acceso. Por favor, reintente en 15 minutos.' }
});

// ==================== AUTENTICACIÓN MULTI-TENANT ====================

router.post('/auth/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Debe ingresar usuario y contraseña' });
  }

  try {
    const tenant = await verifyTenantCredentials(username, password);
    if (!tenant) {
      return res.status(401).json({ error: 'Credenciales inválidas para este comercio' });
    }

    const token = generateToken(tenant, username);

    return res.json({
      token,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        theme: tenant.theme,
        icon: tenant.icon,
        tagline: tenant.tagline,
        vocabulary: tenant.vocabulary,
        airtable: {
          baseId: tenant.airtable.baseId,
          tableId: tenant.airtable.tableId
        }
      },
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
    user: req.user,
    tenant: {
      id: req.tenant.id,
      name: req.tenant.name,
      theme: req.tenant.theme,
      icon: req.tenant.icon,
      tagline: req.tenant.tagline,
      vocabulary: req.tenant.vocabulary,
      airtable: {
        baseId: req.tenant.airtable.baseId,
        tableId: req.tenant.airtable.tableId
      }
    }
  });
});

// ==================== ESQUEMA DINÁMICO POR INQUILINO ====================

router.get('/schema', authMiddleware, async (req, res) => {
  try {
    const schema = await schemaManager.getSchema(req.tenant);
    return res.json(schema);
  } catch (err) {
    return res.status(500).json({ error: 'Error al obtener el esquema de Airtable para este comercio' });
  }
});

router.post('/schema/refresh', authMiddleware, async (req, res) => {
  try {
    const schema = await schemaManager.getSchema(req.tenant, true);
    return res.json({
      success: true,
      message: `Esquema de ${req.tenant.name} sincronizado exitosamente con Airtable`,
      schema
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error al sincronizar esquema con Airtable' });
  }
});

// ==================== CRUD AISLADO POR INQUILINO ====================

router.get('/records', authMiddleware, async (req, res) => {
  const search = req.query.search || '';
  const maxRecords = Number(req.query.maxRecords) || 100;

  try {
    const result = await airtableClient.listRecords(req.tenant, { search, maxRecords });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Error al listar registros' });
  }
});

router.get('/records/:id', authMiddleware, async (req, res) => {
  try {
    const result = await airtableClient.getRecord(req.tenant, req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(404).json({ error: 'Registro no encontrado en este comercio' });
  }
});

router.post('/records', authMiddleware, async (req, res) => {
  const fields = req.body.fields || req.body;

  if (!fields || typeof fields !== 'object' || Object.keys(fields).length === 0) {
    return res.status(400).json({ error: 'Los datos del registro son requeridos' });
  }

  const requiredList = req.tenant.formRules?.requiredFields || [];
  const missing = [];
  for (const reqField of requiredList) {
    const val = fields[reqField];
    if (val === undefined || val === null || String(val).trim() === '') {
      missing.push(reqField);
    }
  }
  if (missing.length > 0) {
    return res.status(400).json({ error: `Los siguientes campos son obligatorios: ${missing.join(', ')}` });
  }

  if (req.tenant.formRules?.defaultValues) {
    for (const [defKey, defVal] of Object.entries(req.tenant.formRules.defaultValues)) {
      if (!fields[defKey] || String(fields[defKey]).trim() === '') {
        fields[defKey] = defVal;
      }
    }
  }

  try {
    const result = await airtableClient.createRecord(req.tenant, fields);
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

  // Proteger campos bloqueados contra edición desde la web (ej. Status)
  const nonEditable = (req.tenant.formRules?.nonEditableFields || []).map(f => f.toLowerCase());
  for (const key of Object.keys(fields)) {
    if (nonEditable.includes(key.toLowerCase())) {
      delete fields[key];
    }
  }

  try {
    const result = await airtableClient.updateRecord(req.tenant, req.params.id, fields);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Error al actualizar el registro' });
  }
});

router.delete('/records/:id', authMiddleware, async (req, res) => {
  try {
    const result = await airtableClient.deleteRecord(req.tenant, req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Error al eliminar el registro' });
  }
});

module.exports = router;
