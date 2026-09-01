const schemaManager = require('./schema');

/**
 * Sanitiza y valida el payload enviado por el cliente para asegurar
 * que solo se envíen campos existentes y editables en Airtable.
 */
async function sanitizePayload(rawFields) {
  const schema = await schemaManager.getSchema();
  const allowedFieldsMap = new Map();

  schema.editableFields.forEach(field => {
    allowedFieldsMap.set(field.name, field);
  });

  const sanitized = {};
  const ignoredKeys = [];

  for (const [key, value] of Object.entries(rawFields)) {
    const fieldDef = allowedFieldsMap.get(key);

    if (!fieldDef) {
      ignoredKeys.push(key);
      continue;
    }

    // Limpieza y formateo según el tipo de dato de Airtable
    if (value === null || value === undefined || value === '') {
      // Para selectores o fechas vacías, no enviamos valor o enviamos null
      continue;
    }

    switch (fieldDef.type) {
      case 'number':
      case 'currency':
      case 'percent':
      case 'rating':
        const numVal = Number(value);
        if (!isNaN(numVal)) {
          sanitized[key] = numVal;
        }
        break;

      case 'checkbox':
        sanitized[key] = Boolean(value);
        break;

      case 'singleSelect':
        if (typeof value === 'string' && value.trim()) {
          sanitized[key] = value.trim();
        }
        break;

      case 'multipleSelects':
        if (Array.isArray(value)) {
          sanitized[key] = value.filter(v => typeof v === 'string' && v.trim());
        } else if (typeof value === 'string' && value.trim()) {
          sanitized[key] = [value.trim()];
        }
        break;

      case 'date':
      case 'dateTime':
        if (typeof value === 'string' && value.trim()) {
          sanitized[key] = value.trim();
        }
        break;

      case 'singleLineText':
      case 'multilineText':
      case 'richText':
      case 'email':
      case 'phoneNumber':
      case 'url':
      default:
        if (typeof value === 'string') {
          sanitized[key] = value.trim();
        } else {
          sanitized[key] = String(value);
        }
        break;
    }
  }

  if (ignoredKeys.length > 0) {
    console.log(`ℹ️ [PayloadSanitizer] Claves no presentes o no editables en Airtable descartadas:`, ignoredKeys);
  }

  return sanitized;
}

module.exports = {
  sanitizePayload
};
