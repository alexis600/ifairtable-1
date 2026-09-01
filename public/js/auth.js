/**
 * Manejo de Autenticación Multi-Tenant en el Frontend
 */

class AuthManager {
  constructor() {
    this.tokenKey = 'airtable_portal_token';
    this.tenantKey = 'airtable_portal_tenant';
    this.currentUser = null;
    this.currentTenant = null;
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  setSession(token, user, tenant) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.tenantKey, JSON.stringify(tenant));
    this.currentUser = user;
    this.currentTenant = tenant;
    window.configManager.setTenant(tenant);
  }

  clearSession() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.tenantKey);
    this.currentUser = null;
    this.currentTenant = null;
  }

  async checkAuth() {
    const token = this.getToken();
    if (!token) {
      this.showLoginView(true);
      await this.loadPublicTenants();
      return false;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        this.logout();
        return false;
      }

      const data = await res.json();
      this.currentUser = data.user;
      this.currentTenant = data.tenant;
      window.configManager.setTenant(data.tenant);
      this.showLoginView(false);
      this.updateUserUI();
      return true;
    } catch (err) {
      this.logout();
      return false;
    }
  }

  async login(username, password) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Error al iniciar sesión');
    }

    this.setSession(data.token, data.user, data.tenant);
    this.showLoginView(false);
    this.updateUserUI();
    return data;
  }

  logout() {
    this.clearSession();
    this.showLoginView(true);
    this.loadPublicTenants();
  }

  showLoginView(show) {
    const loginView = document.getElementById('loginView');
    if (loginView) {
      loginView.style.display = show ? 'flex' : 'none';
    }
  }

  updateUserUI() {
    const userDisplay = document.getElementById('userDisplayName');
    if (userDisplay && this.currentUser) {
      userDisplay.textContent = this.currentUser.username;
    }
  }

  async loadPublicTenants() {
    try {
      const res = await fetch('/api/auth/tenants');
      if (!res.ok) return;
      const data = await res.json();
      const container = document.getElementById('tenantQuickSelector');
      if (!container) return;

      container.innerHTML = '';
      data.tenants.forEach(t => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tenant-quick-btn';
        btn.innerHTML = `
          <span class="tenant-btn-icon">${t.icon}</span>
          <div class="tenant-btn-info">
            <strong>${t.name}</strong>
            <small>${t.username} / ${t.demoPassword}</small>
          </div>
        `;

        btn.addEventListener('click', () => {
          document.getElementById('loginUser').value = t.username;
          document.getElementById('loginPass').value = t.demoPassword;
        });

        container.appendChild(btn);
      });
    } catch (err) {
      console.warn('Error al cargar lista pública de comercios:', err);
    }
  }
}

window.authManager = new AuthManager();
