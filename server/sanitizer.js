const schemaManager = require('./schema');

/**
 * Sanitiza y valida el payload enviado por el cliente para asegurar
 * que solo se envíen campos existentes y editables en la tabla del inquilino (tenant).
 */
async function sanitizePayload(rawFields, tenant) {
  const schema = await schemaManager.getSchema(tenant);
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

    if (value === null || value === undefined || value === '') {
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
          const val = value.trim();
          // Detectar formato DD/MM/YYYY o DD-MM-YYYY y convertir a YYYY-MM-DD para Airtable
          const latamMatch = val.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (latamMatch) {
            const day = latamMatch[1].padStart(2, '0');
            const month = latamMatch[2].padStart(2, '0');
            const year = latamMatch[3];
            sanitized[key] = `${year}-${month}-${day}`;
          } else {
            sanitized[key] = val;
          }
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

  return sanitized;
}

module.exports = {
  sanitizePayload
};
