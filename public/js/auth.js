/**
 * Manejo de Autenticación de Operador en el Frontend
 */

class AuthManager {
  constructor() {
    this.tokenKey = 'airtable_portal_token';
    this.currentUser = null;
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token) {
    localStorage.setItem(this.tokenKey, token);
  }

  removeToken() {
    localStorage.removeItem(this.tokenKey);
  }

  isAuthenticated() {
    return Boolean(this.getToken());
  }

  async checkAuth() {
    const token = this.getToken();
    if (!token) {
      this.showLoginView(true);
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

    this.setToken(data.token);
    this.currentUser = data.user;
    this.showLoginView(false);
    this.updateUserUI();
    return data;
  }

  logout() {
    this.removeToken();
    this.currentUser = null;
    this.showLoginView(true);
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
}

window.authManager = new AuthManager();
