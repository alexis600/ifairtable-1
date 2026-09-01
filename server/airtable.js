const config = require('./config');
const schemaManager = require('./schema');
const { sanitizePayload } = require('./sanitizer');

class AirtableClient {
  constructor() {
    this.baseUrl = `https://api.airtable.com/v0/${config.AIRTABLE_BASE_ID}/${config.AIRTABLE_TABLE_ID}`;
    // Memoria en vivo para modo simulación (si el PAT no fue configurado aún)
    this.demoRecords = [
      {
        id: 'recDemo001',
        fields: {
          'HC': 1001,
          'Nombre': 'Valentina',
          'Apellido': 'Morales',
          'Telefono': '+54 9 11 4567-8901',
          'Mail': 'valentina.morales@example.com',
          'Honorarios': 35000,
          'Status': 'Activo',
          'Fecha inicio': '2026-08-15',
          'Notas': 'Tratamiento facial hidratante intensivo. Piel sensible.',
          'Turnos': ['recTurno01', 'recTurno02']
        },
        createdTime: '2026-08-15T10:00:00.000Z'
      },
      {
        id: 'recDemo002',
        fields: {
          'HC': 1002,
          'Nombre': 'Santiago',
          'Apellido': 'Navarro',
          'Telefono': '+54 9 11 5678-1234',
          'Mail': 'santiago.navarro@example.com',
          'Honorarios': 28000,
          'Status': 'En espera',
          'Fecha inicio': '2026-08-20',
          'Notas': 'Evaluación corporal y plan de electrodos.',
          'Turnos': ['recTurno03']
        },
        createdTime: '2026-08-20T14:30:00.000Z'
      },
      {
        id: 'recDemo003',
        fields: {
          'HC': 1003,
          'Nombre': 'Camila',
          'Apellido': 'Ríos',
          'Telefono': '+54 9 11 6789-4321',
          'Mail': 'camila.rios@example.com',
          'Honorarios': 42000,
          'Status': 'Activo',
          'Fecha inicio': '2026-08-28',
          'Notas': 'Dermoabrasión con punta de diamante.',
          'Turnos': []
        },
        createdTime: '2026-08-28T16:00:00.000Z'
      }
    ];
  }

  isDemoMode() {
    return !config.AIRTABLE_PAT || config.AIRTABLE_PAT.includes('patXXXXXXXX') || config.AIRTABLE_PAT.length < 20;
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${config.AIRTABLE_PAT}`,
      'Content-Type': 'application/json'
    };
  }

  async listRecords({ search = '', maxRecords = 100 } = {}) {
    if (this.isDemoMode()) {
      let filtered = [...this.demoRecords];
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(rec => {
          return Object.values(rec.fields).some(val => 
            String(val).toLowerCase().includes(q)
          );
        });
      }
      return { records: filtered, isDemoMode: true };
    }

    try {
      const url = new URL(this.baseUrl);
      url.searchParams.set('maxRecords', String(maxRecords));

      // Si hay término de búsqueda, aplicamos fórmula segura de Airtable
      if (search.trim()) {
        const cleanSearch = search.trim().replace(/"/g, '\\"');
        url.searchParams.set(
          'filterByFormula',
          `OR(FIND(LOWER("${cleanSearch}"), LOWER({Nombre})), FIND(LOWER("${cleanSearch}"), LOWER({Apellido})), FIND("${cleanSearch}", {HC} & ""))`
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
      return { records: data.records, isDemoMode: false };
    } catch (err) {
      console.error('❌ Error listRecords:', err.message);
      throw err;
    }
  }

  async getRecord(recordId) {
    if (this.isDemoMode()) {
      const found = this.demoRecords.find(r => r.id === recordId);
      if (!found) throw new Error('Registro no encontrado');
      return { record: found, isDemoMode: true };
    }

    const response = await fetch(`${this.baseUrl}/${recordId}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Airtable Error al obtener registro (${response.status}): ${errText}`);
    }

    const record = await response.json();
    return { record, isDemoMode: false };
  }

  async createRecord(rawFields) {
    const sanitizedFields = await sanitizePayload(rawFields);

    if (this.isDemoMode()) {
      const newRec = {
        id: `recDemo_${Date.now()}`,
        fields: sanitizedFields,
        createdTime: new Date().toISOString()
      };
      this.demoRecords.unshift(newRec);
      return { record: newRec, isDemoMode: true };
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          fields: sanitizedFields,
          typecast: true
        })
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        // Auto-recuperación ante cambios repentinos de esquema (UNKNOWN_FIELD_NAME)
        if (errBody.error && errBody.error.type === 'UNKNOWN_FIELD_NAME') {
          console.warn('⚠️ [AirtableClient] Campo desconocido detectado en Airtable. Refrescando esquema...');
          schemaManager.invalidateCache();
          const retryFields = await sanitizePayload(rawFields);
          const retryRes = await fetch(this.baseUrl, {
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
      console.error('❌ Error createRecord:', err.message);
      throw err;
    }
  }

  async updateRecord(recordId, rawFields) {
    const sanitizedFields = await sanitizePayload(rawFields);

    if (this.isDemoMode()) {
      const index = this.demoRecords.findIndex(r => r.id === recordId);
      if (index === -1) throw new Error('Registro no encontrado');
      this.demoRecords[index].fields = {
        ...this.demoRecords[index].fields,
        ...sanitizedFields
      };
      return { record: this.demoRecords[index], isDemoMode: true };
    }

    try {
      const response = await fetch(`${this.baseUrl}/${recordId}`, {
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
          schemaManager.invalidateCache();
          const retryFields = await sanitizePayload(rawFields);
          const retryRes = await fetch(`${this.baseUrl}/${recordId}`, {
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
      console.error('❌ Error updateRecord:', err.message);
      throw err;
    }
  }

  async deleteRecord(recordId) {
    if (this.isDemoMode()) {
      const index = this.demoRecords.findIndex(r => r.id === recordId);
      if (index === -1) throw new Error('Registro no encontrado');
      this.demoRecords.splice(index, 1);
      return { id: recordId, deleted: true, isDemoMode: true };
    }

    const response = await fetch(`${this.baseUrl}/${recordId}`, {
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
