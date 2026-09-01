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
          break;

        case 'checkbox':
          const checkWrapper = document.createElement('label');
          checkWrapper.className = 'checkbox-label';
          inputEl = document.createElement('input');
          inputEl.type = 'checkbox';
          inputEl.className = 'form-checkbox';
          checkWrapper.appendChild(inputEl);
          checkWrapper.appendChild(document.createTextNode(` ${field.name}`));
          group.appendChild(checkWrapper);
          inputEl.id = `field_${field.id}`;
          inputEl.name = field.name;
          container.appendChild(group);
          return;

        case 'multilineText':
        case 'richText':
          inputEl = document.createElement('textarea');
          inputEl.className = 'form-control';
          inputEl.placeholder = `Ingrese ${field.name.toLowerCase()}...`;
          break;

        case 'number':
        case 'currency':
        case 'percent':
          inputEl = document.createElement('input');
          inputEl.type = 'number';
          inputEl.step = field.type === 'currency' ? '0.01' : '1';
          inputEl.className = 'form-control';
          inputEl.placeholder = field.type === 'currency' ? '$ 0.00' : '0';
          break;

        case 'date':
        case 'dateTime':
          inputEl = document.createElement('input');
          inputEl.type = 'date';
          inputEl.className = 'form-control';
          break;

        case 'email':
          inputEl = document.createElement('input');
          inputEl.type = 'email';
          inputEl.className = 'form-control';
          inputEl.placeholder = 'ejemplo@correo.com';
          break;

        case 'phoneNumber':
          inputEl = document.createElement('input');
          inputEl.type = 'tel';
          inputEl.className = 'form-control';
          inputEl.placeholder = '+54 9 11 ...';
          break;

        default:
          inputEl = document.createElement('input');
          inputEl.type = 'text';
          inputEl.className = 'form-control';
          inputEl.placeholder = `Ingrese ${field.name.toLowerCase()}...`;
          break;
      }

      inputEl.id = `field_${field.id}`;
      inputEl.name = field.name;
      if (isRequired) inputEl.required = true;

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
        } else if (Array.isArray(rawVal)) {
          td.textContent = `${rawVal.length} elemento(s)`;
        } else {
          td.textContent = rawVal !== undefined && rawVal !== null ? rawVal : '-';
        }

        tr.appendChild(td);
      });

      // Acciones: Editar y Eliminar
      const tdActions = document.createElement('td');
      tdActions.style.textAlign = 'right';
      tdActions.innerHTML = `
        <div class="row-actions" style="justify-content: flex-end;">
          <button class="btn-row-action edit" title="Editar registro" data-id="${rec.id}">
            ✏️ Editar
          </button>
          <button class="btn-row-action delete" title="Eliminar registro" data-id="${rec.id}">
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
    if (!this.schema) return [];
    // Priorizamos campos visuales clave (máximo 6 columnas para no saturar)
    const priorityNames = ['HC', 'Nombre', 'Apellido', 'Telefono', 'Mail', 'Honorarios', 'Status', 'Fecha inicio'];
    const fields = this.schema.fields.filter(f => !f.readOnly || f.name === 'HC');

    const sorted = [...fields].sort((a, b) => {
      const idxA = priorityNames.indexOf(a.name);
      const idxB = priorityNames.indexOf(b.name);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });

    return sorted.slice(0, 6);
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
