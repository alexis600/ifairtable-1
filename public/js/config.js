/**
 * Gestión de Configuración Multi-Tenant, Temas y Vocabulario (White-Label)
 */

class ConfigManager {
  constructor() {
    this.activeTenant = null;
  }

  setTenant(tenant) {
    this.activeTenant = tenant;
    this.applyThemeAndVocabulary();
  }

  applyThemeAndVocabulary() {
    if (!this.activeTenant) return;

    // 1. Aplicar clase de tema al <body>
    document.body.className = `theme-${this.activeTenant.theme || 'aesthetic'}`;

    // 2. Actualizar identidad de marca en el Navbar
    const brandIcon = document.getElementById('brandIcon');
    const brandTitle = document.getElementById('brandTitle');
    const brandSubtitle = document.getElementById('brandSubtitle');
    const currentTenantBadge = document.getElementById('currentTenantBadge');

    if (brandIcon) brandIcon.textContent = this.activeTenant.icon || '🌸';
    if (brandTitle) brandTitle.textContent = this.activeTenant.name || 'Portal de Gestión';
    if (brandSubtitle) brandSubtitle.textContent = this.activeTenant.tagline || '';
    if (currentTenantBadge) {
      currentTenantBadge.textContent = `${this.activeTenant.icon} ${this.activeTenant.name}`;
    }

    // 3. Actualizar textos de vocabulario dinámico
    const v = this.activeTenant.vocabulary || {};
    document.querySelectorAll('[data-voc]').forEach(el => {
      const key = el.getAttribute('data-voc');
      if (v[key]) {
        el.textContent = v[key];
      }
    });

    // Actualizar placeholders del buscador
    const searchInput = document.getElementById('searchInput');
    if (searchInput && v.primarySearchPlaceholder) {
      searchInput.placeholder = v.primarySearchPlaceholder;
    }
  }

  getVocabulary() {
    return this.activeTenant ? (this.activeTenant.vocabulary || {}) : {};
  }
}

window.configManager = new ConfigManager();
