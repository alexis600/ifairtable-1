/**
 * Motor de UI Dinámica y Resiliente (Formularios y Tablas adaptados a Airtable)
 */

class DynamicUIManager {
  constructor() {
    this.schema = null;
    this.currentEditingId = null;
    this.pendingDeleteId = null;
    this.records = [];
  }

  setSchema(schema) {
    this.schema = schema;
    this.renderForm();
  }

  /**
   * Genera los campos del formulario según las columnas activas y editables de Airtable
   */
  renderForm() {
    const container = document.getElementById('dynamicFormGrid');
    if (!container || !this.schema) return;

    container.innerHTML = '';
    const voc = window.configManager.getVocabulary();

    this.schema.editableFields.forEach(field => {
      const group = document.createElement('div');
      group.className = 'form-group';

      if (field.type === 'multilineText' || field.type === 'richText') {
        group.classList.add('full-width');
      }

      // Etiqueta adaptativa
      let labelText = field.name;
      if (field.isPrimary && voc.identifierLabel) {
        labelText = `${field.name} (${voc.identifierLabel})`;
      } else if (field.type === 'date' || field.type === 'dateTime') {
        labelText = `${field.name} (DD/MM/AAAA)`;
      }

      const isRequired = field.required || field.isPrimary;
      const label = document.createElement('label');
      label.className = 'form-label';
      label.htmlFor = `field_${field.id}`;
      label.innerHTML = `${labelText} ${isRequired ? '<span class="required-star">*</span>' : ''}`;

      let inputEl;

      switch (field.type) {
        case 'singleSelect':
          inputEl = document.createElement('select');
          inputEl.className = 'form-control';
          const defaultOpt = document.createElement('option');
          defaultOpt.value = '';
          defaultOpt.textContent = '-- Seleccionar opción --';
          inputEl.appendChild(defaultOpt);

          if (field.options && field.options.choices) {
            field.options.choices.forEach(choice => {
              const opt = document.createElement('option');
              opt.value = choice.name;
              opt.textContent = choice.name;
              inputEl.appendChild(opt);
            });
          }
          if (field.defaultValue) {
            inputEl.value = field.defaultValue;
          }
          break;

        case 'checkbox':
          const checkWrapper = document.createElement('label');
          checkWrapper.className = 'checkbox-label';
          inputEl = document.createElement('input');
          inputEl.type = 'checkbox';
          inputEl.className = 'form-checkbox';
          if (field.defaultValue) inputEl.checked = Boolean(field.defaultValue);
          checkWrapper.appendChild(inputEl);
          checkWrapper.appendChild(document.createTextNode(` ${field.name}`));
          group.appendChild(checkWrapper);
          inputEl.id = `field_${field.id}`;
          inputEl.name = field.name;
          inputEl.addEventListener('change', () => inputEl.classList.remove('is-invalid'));
          container.appendChild(group);
          return;

        case 'multilineText':
        case 'richText':
          inputEl = document.createElement('textarea');
          inputEl.className = 'form-control';
          inputEl.placeholder = `Ingrese ${field.name.toLowerCase()}...`;
          if (field.defaultValue) inputEl.value = field.defaultValue;
          break;

        case 'number':
        case 'currency':
        case 'percent':
          inputEl = document.createElement('input');
          inputEl.type = 'number';
          inputEl.step = field.type === 'currency' ? '0.01' : '1';
          inputEl.className = 'form-control';
          inputEl.placeholder = field.type === 'currency' ? '$ 0.00' : '0';
          if (field.defaultValue !== null && field.defaultValue !== undefined) inputEl.value = field.defaultValue;
          break;

        case 'date':
        case 'dateTime':
          inputEl = document.createElement('input');
          inputEl.type = 'date';
          inputEl.lang = 'es-AR';
          inputEl.className = 'form-control';
          if (field.defaultValue) inputEl.value = field.defaultValue;
          break;

        case 'email':
          inputEl = document.createElement('input');
          inputEl.type = 'email';
          inputEl.className = 'form-control';
          inputEl.placeholder = 'ejemplo@correo.com';
          if (field.defaultValue) inputEl.value = field.defaultValue;
          break;

        case 'phoneNumber':
          inputEl = document.createElement('input');
          inputEl.type = 'tel';
          inputEl.className = 'form-control';
          inputEl.placeholder = '+54 9 11 ...';
          if (field.defaultValue) inputEl.value = field.defaultValue;
          break;

        default:
          inputEl = document.createElement('input');
          inputEl.type = 'text';
          inputEl.className = 'form-control';
          inputEl.placeholder = `Ingrese ${field.name.toLowerCase()}...`;
          if (field.defaultValue) inputEl.value = field.defaultValue;
          break;
      }

      inputEl.id = `field_${field.id}`;
      inputEl.name = field.name;
      if (isRequired) inputEl.required = true;

      inputEl.addEventListener('input', () => inputEl.classList.remove('is-invalid'));
      inputEl.addEventListener('change', () => inputEl.classList.remove('is-invalid'));

      group.appendChild(label);
      group.appendChild(inputEl);
      container.appendChild(group);
    });
  }

  /**
   * Extrae los valores del formulario respetando los nombres exactos de Airtable
   */
  getFormData() {
    if (!this.schema) return {};
    const formData = {};

    this.schema.editableFields.forEach(field => {
      const input = document.getElementById(`field_${field.id}`);
      if (!input) return;

      if (field.type === 'checkbox') {
        formData[field.name] = input.checked;
      } else {
        const val = input.value.trim();
        if (val !== '') {
          formData[field.name] = val;
        }
      }
    });

    return formData;
  }

  /**
   * Carga los datos de un registro en el formulario para pasar a Modo Edición
   */
  setEditMode(record) {
    this.currentEditingId = record.id;
    const voc = window.configManager.getVocabulary();

    const formTitle = document.getElementById('formTitle');
    const formModeBadge = document.getElementById('formModeBadge');
    const submitBtn = document.getElementById('btnSubmitForm');
    const btnSaveAndNew = document.getElementById('btnSaveAndNew');
    const btnCancelEdit = document.getElementById('btnCancelEdit');

    if (formTitle) formTitle.textContent = `${voc.editAction || 'Editar'} (ID: ${record.fields.HC || record.id})`;
    if (formModeBadge) {
      formModeBadge.textContent = '✏️ Modo Edición';
      formModeBadge.style.display = 'inline-flex';
    }
    if (submitBtn) submitBtn.innerHTML = '💾 Actualizar Cambios';
    if (btnSaveAndNew) btnSaveAndNew.style.display = 'none';
    if (btnCancelEdit) btnCancelEdit.style.display = 'inline-flex';

    // Rellenar los inputs
    if (this.schema) {
      this.schema.editableFields.forEach(field => {
        const input = document.getElementById(`field_${field.id}`);
        if (!input) return;

        const val = record.fields[field.name];
        if (field.type === 'checkbox') {
          input.checked = Boolean(val);
        } else if (field.type === 'date' || field.type === 'dateTime') {
          if (val) {
            const str = String(val).split('T')[0];
            const p = str.split(/[-/]/);
            if (p.length === 3 && p[2].length === 4) {
              // DD/MM/YYYY -> YYYY-MM-DD
              input.value = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
            } else {
              input.value = str;
            }
          } else {
            input.value = '';
          }
        } else {
          input.value = val !== undefined && val !== null ? val : '';
        }
      });
    }

    // Scroll suave hacia el formulario
    document.getElementById('formSection')?.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Resetea el formulario al Modo Creación
   */
  resetFormMode() {
    this.currentEditingId = null;
    const voc = window.configManager.getVocabulary();

    const form = document.getElementById('patientForm');
    if (form) form.reset();

    const formTitle = document.getElementById('formTitle');
    const formModeBadge = document.getElementById('formModeBadge');
    const submitBtn = document.getElementById('btnSubmitForm');
    const btnSaveAndNew = document.getElementById('btnSaveAndNew');
    const btnCancelEdit = document.getElementById('btnCancelEdit');

    if (formTitle) formTitle.textContent = voc.newAction || 'Nuevo Registro';
    if (formModeBadge) formModeBadge.style.display = 'none';
    if (submitBtn) submitBtn.innerHTML = `💾 Guardar ${voc.entitySingular || 'Registro'}`;
    if (btnSaveAndNew) btnSaveAndNew.style.display = 'inline-flex';
    if (btnCancelEdit) btnCancelEdit.style.display = 'none';

    // Restablecer valores por defecto y limpiar estados de validación
    if (this.schema && this.schema.editableFields) {
      this.schema.editableFields.forEach(field => {
        const input = document.getElementById(`field_${field.id}`);
        if (!input) return;
        input.classList.remove('is-invalid');
        if (field.defaultValue !== undefined && field.defaultValue !== null) {
          if (field.type === 'checkbox') {
            input.checked = Boolean(field.defaultValue);
          } else {
            input.value = field.defaultValue;
          }
        }
      });
    }
  }

  /**
   * Valida campos obligatorios en el cliente antes de enviar
   */
  validateForm() {
    if (!this.schema || !this.schema.editableFields) return { valid: true };

    const missingFields = [];
    let firstInvalidInput = null;

    this.schema.editableFields.forEach(field => {
      const isRequired = field.required || field.isPrimary;
      if (!isRequired) return;

      const input = document.getElementById(`field_${field.id}`);
      if (!input) return;

      const val = field.type === 'checkbox' ? input.checked : (input.value ? input.value.trim() : '');
      if (val === '' || val === null || val === undefined) {
        missingFields.push(field.name);
        input.classList.add('is-invalid');
        if (!firstInvalidInput) firstInvalidInput = input;
      } else {
        input.classList.remove('is-invalid');
      }
    });

    if (missingFields.length > 0) {
      if (firstInvalidInput) {
        firstInvalidInput.focus();
      }
      return {
        valid: false,
        message: `Completá los campos requeridos: ${missingFields.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Renderiza la tabla dinámica de registros
   */
  renderTable(records) {
    this.records = records;
    const tableHead = document.getElementById('tableHeaderRow');
    const tableBody = document.getElementById('tableBody');
    const totalCountEl = document.getElementById('statTotalRecords');
    const activeCountEl = document.getElementById('statActiveRecords');
    const voc = window.configManager.getVocabulary();

    if (totalCountEl) totalCountEl.textContent = records.length;
    if (activeCountEl) {
      const activeCount = records.filter(r => String(r.fields.Status || '').toLowerCase().includes('activo')).length;
      activeCountEl.textContent = activeCount;
    }

    if (!tableHead || !tableBody) return;

    tableHead.innerHTML = '';
    tableBody.innerHTML = '';

    if (records.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-state">
            <div class="empty-icon">📭</div>
            <p>No se encontraron ${voc.entityPlural?.toLowerCase() || 'registros'}.</p>
          </td>
        </tr>
      `;
      return;
    }

    // Identificar columnas visibles clave según el esquema
    const visibleColumns = this.getVisibleColumns();

    // Crear cabeceras
    visibleColumns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col.name;
      tableHead.appendChild(th);
    });
    // Columna de acciones
    const thActions = document.createElement('th');
    thActions.textContent = 'Acciones';
    thActions.style.textAlign = 'right';
    tableHead.appendChild(thActions);

    // Crear filas
    records.forEach(rec => {
      const tr = document.createElement('tr');

      visibleColumns.forEach(col => {
        const td = document.createElement('td');
        const rawVal = rec.fields[col.name];

        if (col.type === 'singleSelect' && rawVal) {
          const pillClass = `status-${String(rawVal).toLowerCase().replace(/\s+/g, '-')}`;
          td.innerHTML = `<span class="status-pill ${pillClass}">${rawVal}</span>`;
        } else if (col.type === 'currency' && typeof rawVal === 'number') {
          td.textContent = `$ ${rawVal.toLocaleString('es-AR')}`;
        } else if (col.type === 'checkbox') {
          td.textContent = rawVal ? '✅ Sí' : '❌ No';
        } else if (col.name.toLowerCase() === 'turnos' || col.type === 'multipleRecordLinks') {
          const count = Array.isArray(rawVal) ? rawVal.length : 0;
          if (count > 0) {
            td.innerHTML = `<span class="status-pill status-blueBright" title="Vinculado externamente por Telegram/Make">📅 ${count} Turno(s)</span>`;
          } else {
            td.innerHTML = `<span style="color: var(--text-muted); font-size: 0.8rem;">0 Turnos</span>`;
          }
        } else if (col.type === 'date' || col.type === 'dateTime' || col.name.toLowerCase().includes('fecha')) {
          if (rawVal) {
            const strVal = String(rawVal).split('T')[0];
            const parts = strVal.split(/[-/]/);
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                // Formato YYYY-MM-DD -> DD/MM/AAAA
                const [y, m, d] = parts;
                td.textContent = `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
              } else {
                td.textContent = strVal;
              }
            } else {
              td.textContent = rawVal;
            }
          } else {
            td.textContent = '-';
          }
        } else if (Array.isArray(rawVal)) {
          td.textContent = `${rawVal.length} elemento(s)`;
        } else if (col.type === 'multilineText' && rawVal) {
          td.innerHTML = `<span title="${rawVal}" style="display: inline-block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${rawVal}</span>`;
        } else {
          td.textContent = rawVal !== undefined && rawVal !== null && rawVal !== '' ? rawVal : '-';
        }

        tr.appendChild(td);
      });

      // Acciones: Editar y Eliminar
      const tdActions = document.createElement('td');
      tdActions.style.textAlign = 'right';
      tdActions.innerHTML = `
        <div class="row-actions" style="justify-content: flex-end;">
          <button class="btn-row-action edit" title="Editar paciente" data-id="${rec.id}">
            ✏️ Editar
          </button>
          <button class="btn-row-action delete" title="Eliminar paciente" data-id="${rec.id}">
            🗑️ Eliminar
          </button>
        </div>
      `;

      // Eventos
      tdActions.querySelector('.edit').addEventListener('click', () => {
        this.setEditMode(rec);
      });

      tdActions.querySelector('.delete').addEventListener('click', () => {
        this.promptDelete(rec);
      });

      tr.appendChild(tdActions);
      tableBody.appendChild(tr);
    });
  }

  getVisibleColumns() {
    if (!this.schema || !this.schema.fields) return [];
    // Respetar el orden natural exacto de columnas definido en Airtable
    return [...this.schema.fields];
  }

  promptDelete(record) {
    this.pendingDeleteId = record.id;
    const name = `${record.fields.Nombre || ''} ${record.fields.Apellido || ''}`.trim() || `ID: ${record.fields.HC || record.id}`;
    const modal = document.getElementById('deleteModal');
    const textEl = document.getElementById('modalDeleteText');

    if (textEl) {
      textEl.innerHTML = `¿Está seguro de que desea eliminar a <strong>${name}</strong>?<br><span style="font-size: 0.8rem; color: #ef4444;">Esta acción borrará el registro de forma permanente en Airtable.</span>`;
    }
    if (modal) modal.classList.add('open');
  }

  closeDeleteModal() {
    this.pendingDeleteId = null;
    const modal = document.getElementById('deleteModal');
    if (modal) modal.classList.remove('open');
  }
}

window.dynamicUI = new DynamicUIManager();
