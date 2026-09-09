/**
 * Controlador Principal de la Aplicación (SPA Multi-Tenant)
 */

class App {
  constructor() {
    this.debounceTimer = null;
  }

  async init() {
    // 1. Registrar eventos del DOM primero (para asegurar que Salir, Login, etc. funcionen siempre)
    this.bindEvents();

    // 2. Comprobar autenticación
    const isAuth = await window.authManager.checkAuth();

    // 3. Si está autenticado, cargar datos y esquema
    if (isAuth) {
      await this.loadSchemaAndData();
    }
  }

  bindEvents() {
    // Evento Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('loginUser').value;
        const p = document.getElementById('loginPass').value;
        try {
          await window.authManager.login(u, p);
          this.showToast('Sesión iniciada con éxito', 'success');
          await this.loadSchemaAndData();
        } catch (err) {
          this.showToast(err.message, 'error');
        }
      });
    }

    // Evento Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        window.authManager.logout();
        this.showToast('Sesión cerrada correctamente', 'info');
      });
    }

    // Evento Sincronizar Esquema
    const btnSyncSchema = document.getElementById('btnSyncSchema');
    if (btnSyncSchema) {
      btnSyncSchema.addEventListener('click', async () => {
        btnSyncSchema.classList.add('loading');
        btnSyncSchema.textContent = '🔄 Sincronizando...';
        try {
          const res = await this.authFetch('/api/schema/refresh', { method: 'POST' });
          const data = await res.json();
          window.dynamicUI.setSchema(data.schema);
          this.showToast('Esquema de Airtable sincronizado correctamente', 'success');
          await this.loadRecords();
        } catch (err) {
          this.showToast('Error al sincronizar esquema', 'error');
        } finally {
          btnSyncSchema.classList.remove('loading');
          btnSyncSchema.textContent = '🔄 Sincronizar Esquema';
        }
      });
    }

    // Evento Búsqueda en tiempo real
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.loadRecords(e.target.value);
        }, 300);
      });
    }

    // Evento Envío de Formulario (Crear o Actualizar)
    const patientForm = document.getElementById('patientForm');
    if (patientForm) {
      patientForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleFormSubmit(false);
      });
    }

    // Botón Guardar y Nuevo
    const btnSaveAndNew = document.getElementById('btnSaveAndNew');
    if (btnSaveAndNew) {
      btnSaveAndNew.addEventListener('click', async () => {
        await this.handleFormSubmit(true);
      });
    }

    // Botón Cancelar Edición
    const btnCancelEdit = document.getElementById('btnCancelEdit');
    if (btnCancelEdit) {
      btnCancelEdit.addEventListener('click', () => {
        window.dynamicUI.resetFormMode();
      });
    }

    // Botón Limpiar Formulario
    const btnResetForm = document.getElementById('btnResetForm');
    if (btnResetForm) {
      btnResetForm.addEventListener('click', () => {
        window.dynamicUI.resetFormMode();
      });
    }

    // Eventos Modal de Borrado
    const btnCancelDelete = document.getElementById('btnCancelDelete');
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');

    if (btnCancelDelete) {
      btnCancelDelete.addEventListener('click', () => {
        window.dynamicUI.closeDeleteModal();
      });
    }

    if (btnConfirmDelete) {
      btnConfirmDelete.addEventListener('click', async () => {
        const id = window.dynamicUI.pendingDeleteId;
        if (!id) return;
        try {
          await this.authFetch(`/api/records/${id}`, { method: 'DELETE' });
          this.showToast('Registro eliminado con éxito de Airtable', 'success');
          window.dynamicUI.closeDeleteModal();
          await this.loadRecords();
        } catch (err) {
          this.showToast(err.message || 'Error al eliminar', 'error');
        }
      });
    }
  }

  async authFetch(url, options = {}) {
    const token = window.authManager.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      window.authManager.logout();
      throw new Error('Sesión expirada. Por favor inicie sesión nuevamente.');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error en la solicitud (${res.status})`);
    }
    return res;
  }

  async loadSchemaAndData() {
    try {
      // 1. Obtener Esquema de Airtable
      const schemaRes = await this.authFetch('/api/schema');
      const schema = await schemaRes.json();
      window.dynamicUI.setSchema(schema);

      // 2. Obtener Registros de Airtable
      await this.loadRecords();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async loadRecords(search = '') {
    try {
      const url = search ? `/api/records?search=${encodeURIComponent(search)}` : '/api/records';
      const res = await this.authFetch(url);
      const data = await res.json();
      window.dynamicUI.renderTable(data.records);

      const demoBadge = document.getElementById('demoModeBadge');
      if (demoBadge) {
        demoBadge.style.display = data.isDemoMode ? 'inline-flex' : 'none';
      }
    } catch (err) {
      this.showToast('Error al cargar registros', 'error');
    }
  }

  async handleFormSubmit(saveAndNew = false) {
    const validation = window.dynamicUI.validateForm();
    if (!validation.valid) {
      this.showToast(validation.message, 'warning');
      return;
    }

    const formData = window.dynamicUI.getFormData();
    const editingId = window.dynamicUI.currentEditingId;
    const voc = window.configManager.getVocabulary();

    if (Object.keys(formData).length === 0) {
      this.showToast('Por favor complete los campos requeridos', 'warning');
      return;
    }

    try {
      if (editingId) {
        // Actualizar registro existente
        await this.authFetch(`/api/records/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({ fields: formData })
        });
        this.showToast(`${voc.entitySingular || 'Registro'} actualizado exitosamente`, 'success');
        window.dynamicUI.resetFormMode();
      } else {
        // Crear nuevo registro
        await this.authFetch('/api/records', {
          method: 'POST',
          body: JSON.stringify({ fields: formData })
        });
        this.showToast(`${voc.entitySingular || 'Registro'} creado exitosamente en Airtable`, 'success');

        if (saveAndNew) {
          window.dynamicUI.resetFormMode();
          const firstInput = document.querySelector('#dynamicFormGrid input');
          if (firstInput) firstInput.focus();
        } else {
          window.dynamicUI.resetFormMode();
        }
      }

      await this.loadRecords();
    } catch (err) {
      this.showToast(err.message || 'Error al guardar registro', 'error');
    }
  }

  showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || '🔔'}</span>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(120%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
