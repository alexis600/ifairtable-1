const config = require('./config');
const schemaManager = require('./schema');
const { sanitizePayload } = require('./sanitizer');

class AirtableClient {
  constructor() {
    this.demoRecordsByTenant = new Map();
    this.seedDemoData();
  }

  seedDemoData() {
    // 🌸 Estética Demo
    this.demoRecordsByTenant.set('estetica', [
      {
        id: 'recEstetica001',
        fields: {
          'HC': 1001,
          'Nombre': 'Valentina',
          'Apellido': 'Morales',
          'Telefono': '+54 9 11 4567-8901',
          'Mail': 'valentina.morales@example.com',
          'Honorarios': 35000,
          'Status': 'Activo',
          'Tratamiento Principal': 'Higiene Facial Profunda + Peeling',
          'Fecha inicio': '2026-08-15',
          'Notas': 'Piel sensible reactiva. Se recomienda crema calmante.'
        },
        createdTime: '2026-08-15T10:00:00.000Z'
      },
      {
        id: 'recEstetica002',
        fields: {
          'HC': 1002,
          'Nombre': 'Santiago',
          'Apellido': 'Navarro',
          'Telefono': '+54 9 11 5678-1234',
          'Mail': 'santiago.navarro@example.com',
          'Honorarios': 28000,
          'Status': 'En espera',
          'Tratamiento Principal': 'Electrodos y Masajes Descontracturantes',
          'Fecha inicio': '2026-08-20',
          'Notas': 'Evaluación corporal inicial completada.'
        },
        createdTime: '2026-08-20T14:30:00.000Z'
      }
    ]);

    // 🏥 Clínica Demo
    this.demoRecordsByTenant.set('clinica', [
      {
        id: 'recClinica001',
        fields: {
          'HC': 5001,
          'Nombre': 'Lucía',
          'Apellido': 'Gómez',
          'Telefono': '+54 9 11 9876-5432',
          'Mail': 'lucia.gomez@mail.com',
          'Obra Social / Prepaga': 'OSDE 310',
          'Diagnóstico Preliminar': 'Control Cardiológico Anual',
          'Status': 'En Consulta',
          'Fecha Ingreso': '2026-08-29',
          'Notas': 'Electrocardiograma normal. Solicitar ecocardiograma doppler.'
        },
        createdTime: '2026-08-29T09:00:00.000Z'
      },
      {
        id: 'recClinica002',
        fields: {
          'HC': 5002,
          'Nombre': 'Mariana',
          'Apellido': 'Benítez',
          'Telefono': '+54 9 11 8765-4321',
          'Mail': 'mariana.b@mail.com',
          'Obra Social / Prepaga': 'Swiss Medical',
          'Diagnóstico Preliminar': 'Cuadro gripal / Fiebre',
          'Status': 'Sala de Espera',
          'Fecha Ingreso': '2026-08-31',
          'Notas': 'Alergia a la penicilina.'
        },
        createdTime: '2026-08-31T11:15:00.000Z'
      }
    ]);

    // 🌿 Rehab Demo
    this.demoRecordsByTenant.set('rehab', [
      {
        id: 'recRehab001',
        fields: {
          'Legajo': 8001,
          'Nombre': 'Martín',
          'Apellido': 'Palermo',
          'Telefono': '+54 9 11 3322-1100',
          'Patología / Lesión': 'Post-quirúrgico Ligamento Cruzado Anterior',
          'Sesiones Totales': 20,
          'Status': 'En Tratamiento',
          'Fecha Primera Sesión': '2026-08-10',
          'Notas': 'Excelente rango articular en flexión 110°.'
        },
        createdTime: '2026-08-10T15:00:00.000Z'
      }
    ]);

    // ⚡ Fitness Demo
    this.demoRecordsByTenant.set('fitness', [
      {
        id: 'recFit001',
        fields: {
          'N° Socio': 301,
          'Nombre': 'Rodrigo',
          'Apellido': 'De Paul',
          'Telefono': '+54 9 11 7788-9900',
          'Mail': 'rodrigo.motorcito@gym.com',
          'Plan de Membresía': 'Pase Anual VIP',
          'Estado de Cuota': 'Al Día',
          'Fecha Vencimiento': '2027-01-01',
          'Notas': 'Apto médico vigente presentado.'
        },
        createdTime: '2026-08-01T10:00:00.000Z'
      }
    ]);
  }

  isDemoMode() {
    return !config.AIRTABLE_PAT || config.AIRTABLE_PAT.includes('patXXXXX') || config.AIRTABLE_PAT.length < 20;
  }

  getTenantUrl(tenant) {
    return `https://api.airtable.com/v0/${tenant.airtable.baseId}/${tenant.airtable.tableId}`;
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${config.AIRTABLE_PAT}`,
      'Content-Type': 'application/json'
    };
  }

  getDemoRecordsForTenant(tenantId) {
    if (!this.demoRecordsByTenant.has(tenantId)) {
      this.demoRecordsByTenant.set(tenantId, []);
    }
    return this.demoRecordsByTenant.get(tenantId);
  }

  async listRecords(tenant, { search = '', maxRecords = 100 } = {}) {
    if (this.isDemoMode()) {
      const records = this.getDemoRecordsForTenant(tenant.id);
      let filtered = [...records];
      if (search.trim()) {
        const q = search.toLowerCase();
        filtered = filtered.filter(rec => {
          return Object.values(rec.fields).some(val =>
            String(val).toLowerCase().includes(q)
          );
        });
      }
      return { records: filtered, isDemoMode: true, tenantId: tenant.id };
    }

    try {
      const url = new URL(this.getTenantUrl(tenant));
      url.searchParams.set('maxRecords', String(maxRecords));

      if (search.trim()) {
        const cleanSearch = search.trim().replace(/"/g, '\\"');
        url.searchParams.set(
          'filterByFormula',
          `OR(FIND(LOWER("${cleanSearch}"), LOWER({Nombre})), FIND(LOWER("${cleanSearch}"), LOWER({Apellido})))`
        );
      }

      const response = await fetch(url.toString(), {
        headers: this.getHeaders()
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Airtable API Error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      return { records: data.records, isDemoMode: false, tenantId: tenant.id };
    } catch (err) {
      console.error(`❌ Error listRecords (${tenant.id}):`, err.message);
      throw err;
    }
  }

  async getRecord(tenant, recordId) {
    if (this.isDemoMode()) {
      const records = this.getDemoRecordsForTenant(tenant.id);
      const found = records.find(r => r.id === recordId);
      if (!found) throw new Error('Registro no encontrado');
      return { record: found, isDemoMode: true };
    }

    const response = await fetch(`${this.getTenantUrl(tenant)}/${recordId}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error Airtable (${response.status}): ${errText}`);
    }

    const record = await response.json();
    return { record, isDemoMode: false };
  }

  async createRecord(tenant, rawFields) {
    const sanitizedFields = await sanitizePayload(rawFields, tenant);

    if (this.isDemoMode()) {
      const records = this.getDemoRecordsForTenant(tenant.id);
      const newRec = {
        id: `rec_${tenant.id}_${Date.now()}`,
        fields: sanitizedFields,
        createdTime: new Date().toISOString()
      };
      records.unshift(newRec);
      return { record: newRec, isDemoMode: true };
    }

    try {
      const response = await fetch(this.getTenantUrl(tenant), {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          fields: sanitizedFields,
          typecast: true
        })
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        if (errBody.error && errBody.error.type === 'UNKNOWN_FIELD_NAME') {
          schemaManager.invalidateCache(tenant);
          const retryFields = await sanitizePayload(rawFields, tenant);
          const retryRes = await fetch(this.getTenantUrl(tenant), {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ fields: retryFields, typecast: true })
          });
          if (retryRes.ok) {
            return { record: await retryRes.json(), isDemoMode: false };
          }
        }
        throw new Error(errBody.error?.message || `Error al crear en Airtable (${response.status})`);
      }

      const record = await response.json();
      return { record, isDemoMode: false };
    } catch (err) {
      console.error(`❌ Error createRecord (${tenant.id}):`, err.message);
      throw err;
    }
  }

  async updateRecord(tenant, recordId, rawFields) {
    const sanitizedFields = await sanitizePayload(rawFields, tenant);

    if (this.isDemoMode()) {
      const records = this.getDemoRecordsForTenant(tenant.id);
      const index = records.findIndex(r => r.id === recordId);
      if (index === -1) throw new Error('Registro no encontrado');
      records[index].fields = {
        ...records[index].fields,
        ...sanitizedFields
      };
      return { record: records[index], isDemoMode: true };
    }

    try {
      const response = await fetch(`${this.getTenantUrl(tenant)}/${recordId}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify({
          fields: sanitizedFields,
          typecast: true
        })
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        if (errBody.error && errBody.error.type === 'UNKNOWN_FIELD_NAME') {
          schemaManager.invalidateCache(tenant);
          const retryFields = await sanitizePayload(rawFields, tenant);
          const retryRes = await fetch(`${this.getTenantUrl(tenant)}/${recordId}`, {
            method: 'PATCH',
            headers: this.getHeaders(),
            body: JSON.stringify({ fields: retryFields, typecast: true })
          });
          if (retryRes.ok) {
            return { record: await retryRes.json(), isDemoMode: false };
          }
        }
        throw new Error(errBody.error?.message || `Error al actualizar en Airtable (${response.status})`);
      }

      const record = await response.json();
      return { record, isDemoMode: false };
    } catch (err) {
      console.error(`❌ Error updateRecord (${tenant.id}):`, err.message);
      throw err;
    }
  }

  async deleteRecord(tenant, recordId) {
    if (this.isDemoMode()) {
      const records = this.getDemoRecordsForTenant(tenant.id);
      const index = records.findIndex(r => r.id === recordId);
      if (index === -1) throw new Error('Registro no encontrado');
      records.splice(index, 1);
      return { id: recordId, deleted: true, isDemoMode: true };
    }

    const response = await fetch(`${this.getTenantUrl(tenant)}/${recordId}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Error al eliminar en Airtable (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return { ...data, isDemoMode: false };
  }
}

const airtableClient = new AirtableClient();
module.exports = airtableClient;
