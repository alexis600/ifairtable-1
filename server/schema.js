const config = require('./config');

const READ_ONLY_TYPES = new Set([
  'formula',
  'rollup',
  'lookup',
  'createdTime',
  'lastModifiedTime',
  'autoNumber',
  'createdBy',
  'lastModifiedBy',
  'button',
  'count'
]);

// Esquemas fallback predeterminados personalizados según el rubro del tenant
const FALLBACK_FIELDS_BY_THEME = {
  aesthetic: [
    { id: 'fldHC', name: 'HC', type: 'number', isPrimary: true, required: true, description: 'Historia Clínica / Ficha' },
    { id: 'fldNombre', name: 'Nombre', type: 'singleLineText', required: true },
    { id: 'fldApellido', name: 'Apellido', type: 'singleLineText', required: true },
    { id: 'fldTelefono', name: 'Telefono', type: 'phoneNumber', required: false },
    { id: 'fldMail', name: 'Mail', type: 'email', required: false },
    { id: 'fldHonorarios', name: 'Honorarios', type: 'currency', required: false, options: { precision: 2, symbol: '$' } },
    {
      id: 'fldStatus',
      name: 'Status',
      type: 'singleSelect',
      required: false,
      options: {
        choices: [
          { id: 'opt1', name: 'Activo', color: 'greenBright' },
          { id: 'opt2', name: 'En espera', color: 'yellowBright' },
          { id: 'opt3', name: 'Pausado', color: 'orangeBright' },
          { id: 'opt4', name: 'Inactivo', color: 'grayBright' }
        ]
      }
    },
    { id: 'fldTratamiento', name: 'Tratamiento Principal', type: 'singleLineText', required: false },
    { id: 'fldFechaInicio', name: 'Fecha inicio', type: 'date', required: false },
    { id: 'fldNotas', name: 'Notas', type: 'multilineText', required: false },
    { id: 'fldTurnos', name: 'Turnos', type: 'multipleRecordLinks', readOnly: true, isLinked: true }
  ],
  clinic: [
    { id: 'fldHC', name: 'HC', type: 'number', isPrimary: true, required: true, description: 'Historia Clínica' },
    { id: 'fldNombre', name: 'Nombre', type: 'singleLineText', required: true },
    { id: 'fldApellido', name: 'Apellido', type: 'singleLineText', required: true },
    { id: 'fldTelefono', name: 'Telefono', type: 'phoneNumber', required: false },
    { id: 'fldMail', name: 'Mail', type: 'email', required: false },
    { id: 'fldObraSocial', name: 'Obra Social / Prepaga', type: 'singleLineText', required: false },
    { id: 'fldDiagnostico', name: 'Diagnóstico Preliminar', type: 'singleLineText', required: false },
    {
      id: 'fldStatus',
      name: 'Status',
      type: 'singleSelect',
      required: false,
      options: {
        choices: [
          { id: 'opt1', name: 'En Consulta', color: 'greenBright' },
          { id: 'opt2', name: 'Sala de Espera', color: 'yellowBright' },
          { id: 'opt3', name: 'Derivado', color: 'blueBright' },
          { id: 'opt4', name: 'Alta Médica', color: 'grayBright' }
        ]
      }
    },
    { id: 'fldFechaInicio', name: 'Fecha Ingreso', type: 'date', required: false },
    { id: 'fldNotas', name: 'Evolución / Antecedentes', type: 'multilineText', required: false }
  ],
  rehab: [
    { id: 'fldLegajo', name: 'Legajo', type: 'number', isPrimary: true, required: true },
    { id: 'fldNombre', name: 'Nombre', type: 'singleLineText', required: true },
    { id: 'fldApellido', name: 'Apellido', type: 'singleLineText', required: true },
    { id: 'fldTelefono', name: 'Telefono', type: 'phoneNumber', required: false },
    { id: 'fldPatologia', name: 'Patología / Lesión', type: 'singleLineText', required: false },
    { id: 'fldSesiones', name: 'Sesiones Totales', type: 'number', required: false },
    {
      id: 'fldStatus',
      name: 'Status',
      type: 'singleSelect',
      required: false,
      options: {
        choices: [
          { id: 'opt1', name: 'En Tratamiento', color: 'greenBright' },
          { id: 'opt2', name: 'Evaluación', color: 'yellowBright' },
          { id: 'opt3', name: 'Recuperado', color: 'grayBright' }
        ]
      }
    },
    { id: 'fldFechaInicio', name: 'Fecha Primera Sesión', type: 'date', required: false },
    { id: 'fldNotas', name: 'Evolución Kinefiláctica', type: 'multilineText', required: false }
  ],
  fitness: [
    { id: 'fldSocioNum', name: 'N° Socio', type: 'number', isPrimary: true, required: true },
    { id: 'fldNombre', name: 'Nombre', type: 'singleLineText', required: true },
    { id: 'fldApellido', name: 'Apellido', type: 'singleLineText', required: true },
    { id: 'fldTelefono', name: 'Telefono', type: 'phoneNumber', required: false },
    { id: 'fldMail', name: 'Mail', type: 'email', required: false },
    {
      id: 'fldPlan',
      name: 'Plan de Membresía',
      type: 'singleSelect',
      required: false,
      options: {
        choices: [
          { id: 'p1', name: 'Pase Libre Musculación', color: 'greenBright' },
          { id: 'p2', name: 'CrossFit & Funcional', color: 'orangeBright' },
          { id: 'p3', name: 'Pilates / Yoga', color: 'blueBright' },
          { id: 'p4', name: 'Pase Anual VIP', color: 'yellowBright' }
        ]
      }
    },
    {
      id: 'fldStatus',
      name: 'Estado de Cuota',
      type: 'singleSelect',
      required: false,
      options: {
        choices: [
          { id: 's1', name: 'Al Día', color: 'greenBright' },
          { id: 's2', name: 'Por Vencer', color: 'yellowBright' },
          { id: 's3', name: 'Vencido', color: 'redBright' }
        ]
      }
    },
    { id: 'fldFechaVence', name: 'Fecha Vencimiento', type: 'date', required: false },
    { id: 'fldNotas', name: 'Apto Físico / Observaciones', type: 'multilineText', required: false }
  ]
};

class SchemaManager {
  constructor() {
    this.cachedSchemas = new Map(); // Key: `${baseId}_${tableId}`
    this.cacheTTL = 5 * 60 * 1000;
  }

  isReadOnlyField(field) {
    if (field.readOnly) return true;
    if (READ_ONLY_TYPES.has(field.type)) return true;
    if (field.type === 'multipleRecordLinks') return true; // FKs vinculadas (Turnos) gestionadas externamente
    return false;
  }

  mapAirtableFieldToSchema(field, primaryFieldId, tenant) {
    const isReadOnly = this.isReadOnlyField(field);
    const isPrimary = field.id === primaryFieldId;
    const requiredList = tenant?.formRules?.requiredFields || [];
    const defaultVals = tenant?.formRules?.defaultValues || {};

    const isRequired = isPrimary || requiredList.some(r => r.toLowerCase() === field.name.toLowerCase());
    const matchedDefaultKey = Object.keys(defaultVals).find(k => k.toLowerCase() === field.name.toLowerCase());
    const defaultValue = matchedDefaultKey ? defaultVals[matchedDefaultKey] : null;

    return {
      id: field.id,
      name: field.name,
      type: field.type,
      isPrimary,
      required: isRequired,
      defaultValue,
      readOnly: isReadOnly,
      options: field.options || null,
      description: field.description || ''
    };
  }

  async fetchSchemaFromAirtable(tenant) {
    const baseId = tenant.airtable.baseId;
    const tableId = tenant.airtable.tableId;

    if (!config.AIRTABLE_PAT || config.AIRTABLE_PAT.includes('patXXXXX')) {
      return this.getFallbackSchema(tenant);
    }

    try {
      const url = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${config.AIRTABLE_PAT}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`⚠️ [SchemaManager] Metadata API retornó ${response.status} para base ${baseId}. Usando fallback.`);
        return this.getFallbackSchema(tenant);
      }

      const data = await response.json();
      const table = data.tables.find(t => t.id === tableId || t.name.toLowerCase() === tableId.toLowerCase()) || data.tables[0];

      if (!table) {
        return this.getFallbackSchema(tenant);
      }

      const primaryFieldId = table.primaryFieldId;
      const fields = table.fields.map(f => this.mapAirtableFieldToSchema(f, primaryFieldId, tenant));

      return {
        tenantId: tenant.id,
        baseId: table.id,
        tableId: table.id,
        tableName: table.name,
        primaryFieldId: table.primaryFieldId,
        fields,
        editableFields: fields.filter(f => !f.readOnly),
        formRules: tenant.formRules || {},
        source: 'metadata_api',
        syncedAt: new Date().toISOString()
      };
    } catch (err) {
      console.error(`❌ [SchemaManager] Error en base ${baseId}:`, err.message);
      return this.getFallbackSchema(tenant);
    }
  }

  getFallbackSchema(tenant) {
    const baseFields = FALLBACK_FIELDS_BY_THEME[tenant.theme] || FALLBACK_FIELDS_BY_THEME.aesthetic;
    const primary = baseFields.find(f => f.isPrimary) || baseFields[0];
    const requiredList = tenant?.formRules?.requiredFields || [];
    const defaultVals = tenant?.formRules?.defaultValues || {};

    const fields = baseFields.map(f => {
      const isRequired = f.isPrimary || f.required || requiredList.some(r => r.toLowerCase() === f.name.toLowerCase());
      const matchedDefaultKey = Object.keys(defaultVals).find(k => k.toLowerCase() === f.name.toLowerCase());
      const defaultValue = matchedDefaultKey ? defaultVals[matchedDefaultKey] : null;

      return {
        ...f,
        required: isRequired,
        defaultValue
      };
    });

    return {
      tenantId: tenant.id,
      baseId: tenant.airtable.baseId,
      tableId: tenant.airtable.tableId,
      tableName: tenant.name,
      primaryFieldId: primary ? primary.id : 'fldHC',
      fields,
      editableFields: fields.filter(f => !f.readOnly),
      formRules: tenant.formRules || {},
      source: 'static_fallback_multi_tenant',
      syncedAt: new Date().toISOString()
    };
  }

  async getSchema(tenant, forceRefresh = false) {
    const key = `${tenant.airtable.baseId}_${tenant.airtable.tableId}`;
    const now = Date.now();
    const cached = this.cachedSchemas.get(key);

    if (!cached || forceRefresh || (now - cached.timestamp > this.cacheTTL)) {
      const schema = await this.fetchSchemaFromAirtable(tenant);
      this.cachedSchemas.set(key, { schema, timestamp: now });
      return schema;
    }

    return cached.schema;
  }

  invalidateCache(tenant) {
    if (tenant && tenant.airtable) {
      const key = `${tenant.airtable.baseId}_${tenant.airtable.tableId}`;
      this.cachedSchemas.delete(key);
    } else {
      this.cachedSchemas.clear();
    }
  }
}

const schemaManager = new SchemaManager();
module.exports = schemaManager;
