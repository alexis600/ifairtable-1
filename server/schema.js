const config = require('./config');

// Tipos de Airtable considerados de solo lectura o generados por el sistema
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

// Esquema fallback predeterminado para BaseBotTurnos si falla Metadata API
const FALLBACK_FIELDS = [
  { id: 'fldHC', name: 'HC', type: 'number', isPrimary: true, required: true, description: 'Historia Clínica o Ficha' },
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
  { id: 'fldFechaInicio', name: 'Fecha inicio', type: 'date', required: false },
  { id: 'fldNotas', name: 'Notas', type: 'multilineText', required: false },
  { id: 'fldTurnos', name: 'Turnos', type: 'multipleRecordLinks', readOnly: true, isLinked: true }
];

class SchemaManager {
  constructor() {
    this.cachedSchema = null;
    this.lastFetched = 0;
    this.cacheTTL = 5 * 60 * 1000; // 5 minutos
  }

  isReadOnlyField(field) {
    if (field.readOnly) return true;
    if (READ_ONLY_TYPES.has(field.type)) return true;
    // Si es linked record pero no queremos forzar creación de links en formulario simple
    return false;
  }

  mapAirtableFieldToSchema(field, primaryFieldId) {
    const isReadOnly = this.isReadOnlyField(field);
    const isPrimary = field.id === primaryFieldId;

    return {
      id: field.id,
      name: field.name,
      type: field.type,
      isPrimary,
      readOnly: isReadOnly,
      options: field.options || null,
      description: field.description || ''
    };
  }

  async fetchSchemaFromAirtable() {
    if (!config.AIRTABLE_PAT) {
      console.warn('⚠️ [SchemaManager] No se configuró AIRTABLE_PAT. Usando esquema fallback.');
      return this.getFallbackSchema();
    }

    try {
      const url = `https://api.airtable.com/v0/meta/bases/${config.AIRTABLE_BASE_ID}/tables`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${config.AIRTABLE_PAT}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.warn(`⚠️ [SchemaManager] Metadata API retornó ${response.status}: ${errorBody}. Cambiando a modo fallback dinámico.`);
        return await this.inferSchemaFromRecords();
      }

      const data = await response.json();
      const table = data.tables.find(t => t.id === config.AIRTABLE_TABLE_ID || t.name.toLowerCase() === 'pacientes' || t.name.toLowerCase() === 'clientes') || data.tables[0];

      if (!table) {
        console.warn('⚠️ [SchemaManager] Tabla no encontrada en metadata. Usando fallback.');
        return this.getFallbackSchema();
      }

      const primaryFieldId = table.primaryFieldId;
      const fields = table.fields.map(f => this.mapAirtableFieldToSchema(f, primaryFieldId));

      return {
        tableId: table.id,
        tableName: table.name,
        primaryFieldId: table.primaryFieldId,
        fields,
        editableFields: fields.filter(f => !f.readOnly),
        source: 'metadata_api',
        syncedAt: new Date().toISOString()
      };
    } catch (err) {
      console.error('❌ [SchemaManager] Error al consultar Metadata API:', err.message);
      return await this.inferSchemaFromRecords();
    }
  }

  async inferSchemaFromRecords() {
    try {
      const url = `https://api.airtable.com/v0/${config.AIRTABLE_BASE_ID}/${config.AIRTABLE_TABLE_ID}?maxRecords=5`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${config.AIRTABLE_PAT}`
        }
      });

      if (!response.ok) {
        return this.getFallbackSchema();
      }

      const data = await response.json();
      const fieldsMap = new Map();

      // Sembrar con fallback primero
      FALLBACK_FIELDS.forEach(f => fieldsMap.set(f.name, { ...f }));

      // Enriquecer con campos observados en los registros reales
      if (data.records && data.records.length > 0) {
        data.records.forEach(rec => {
          Object.keys(rec.fields).forEach(key => {
            if (!fieldsMap.has(key)) {
              const val = rec.fields[key];
              let detectedType = 'singleLineText';
              if (typeof val === 'number') detectedType = 'number';
              else if (typeof val === 'boolean') detectedType = 'checkbox';
              else if (Array.isArray(val)) detectedType = 'multipleRecordLinks';

              fieldsMap.set(key, {
                id: `inferred_${key}`,
                name: key,
                type: detectedType,
                isPrimary: false,
                readOnly: Array.isArray(val) && val[0] && typeof val[0] === 'string' && val[0].startsWith('rec')
              });
            }
          });
        });
      }

      const fields = Array.from(fieldsMap.values());
      return {
        tableId: config.AIRTABLE_TABLE_ID,
        tableName: 'Pacientes',
        primaryFieldId: 'fldHC',
        fields,
        editableFields: fields.filter(f => !f.readOnly),
        source: 'inferred_records',
        syncedAt: new Date().toISOString()
      };
    } catch (err) {
      return this.getFallbackSchema();
    }
  }

  getFallbackSchema() {
    return {
      tableId: config.AIRTABLE_TABLE_ID,
      tableName: 'Pacientes / Clientes',
      primaryFieldId: 'fldHC',
      fields: FALLBACK_FIELDS,
      editableFields: FALLBACK_FIELDS.filter(f => !f.readOnly),
      source: 'static_fallback',
      syncedAt: new Date().toISOString()
    };
  }

  async getSchema(forceRefresh = false) {
    const now = Date.now();
    if (!this.cachedSchema || forceRefresh || (now - this.lastFetched > this.cacheTTL)) {
      this.cachedSchema = await this.fetchSchemaFromAirtable();
      this.lastFetched = now;
    }
    return this.cachedSchema;
  }

  invalidateCache() {
    this.cachedSchema = null;
    this.lastFetched = 0;
  }
}

const schemaManager = new SchemaManager();
module.exports = schemaManager;
