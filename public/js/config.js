/**
 * Gestión de Configuración Multirrubro, Temas y Vocabulario (White-Label)
 */

class ConfigManager {
  constructor() {
    this.activeIndustry = null;
    this.allIndustries = [];
  }

  async loadConfig() {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error('Error al cargar configuración');
      const data = await res.json();
      
      this.activeIndustry = data.activeIndustry;
      this.allIndustries = data.allIndustries;
      this.applyThemeAndVocabulary();
      return data;
    } catch (err) {
      console.warn('Usando configuración local por defecto:', err);
      // Fallback predeterminado a Estética
      this.activeIndustry = {
        id: 'estetica',
        name: 'Centro de Estética & Belleza',
        theme: 'aesthetic',
        icon: '🌸',
        tagline: 'Gestión Integral de Clientes y Tratamientos',
        vocabulary: {
          entitySingular: 'Cliente',
          entityPlural: 'Clientes',
          newAction: 'Nuevo Cliente',
          editAction: 'Editar Cliente',
          identifierLabel: 'Ficha / ID',
          eventsLabel: 'Tratamientos / Turnos',
          primarySearchPlaceholder: 'Buscar por nombre, teléfono o ficha...'
        }
      };
      this.applyThemeAndVocabulary();
    }
  }

  async setIndustry(industryId, token) {
    try {
      const res = await fetch('/api/config/industry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ industryId })
      });

      if (!res.ok) throw new Error('No se pudo cambiar el rubro');
      const data = await res.json();
      this.activeIndustry = data.activeIndustry;
      this.applyThemeAndVocabulary();
      return this.activeIndustry;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  applyThemeAndVocabulary() {
    if (!this.activeIndustry) return;

    // 1. Aplicar clase de tema al <body>
    document.body.className = `theme-${this.activeIndustry.theme}`;

    // 2. Actualizar identidad de marca en el Navbar
    const brandIcon = document.getElementById('brandIcon');
    const brandTitle = document.getElementById('brandTitle');
    const brandSubtitle = document.getElementById('brandSubtitle');
    const loginBrandIcon = document.getElementById('loginBrandIcon');
    const loginBrandTitle = document.getElementById('loginBrandTitle');

    if (brandIcon) brandIcon.textContent = this.activeIndustry.icon;
    if (brandTitle) brandTitle.textContent = this.activeIndustry.name;
    if (brandSubtitle) brandSubtitle.textContent = this.activeIndustry.tagline;
    if (loginBrandIcon) loginBrandIcon.textContent = this.activeIndustry.icon;
    if (loginBrandTitle) loginBrandTitle.textContent = this.activeIndustry.name;

    // 3. Actualizar textos de vocabulario dinámico
    const v = this.activeIndustry.vocabulary;
    document.querySelectorAll('[data-voc]').forEach(el => {
      const key = el.getAttribute('data-voc');
      if (v[key]) {
        el.textContent = v[key];
      }
    });

    // Actualizar placeholders
    const searchInput = document.getElementById('searchInput');
    if (searchInput && v.primarySearchPlaceholder) {
      searchInput.placeholder = v.primarySearchPlaceholder;
    }

    // 4. Sincronizar el select del header
    const industrySelect = document.getElementById('industrySelect');
    if (industrySelect) {
      industrySelect.value = this.activeIndustry.id;
    }
  }

  getVocabulary() {
    return this.activeIndustry ? this.activeIndustry.vocabulary : {};
  }
}

window.configManager = new ConfigManager();
