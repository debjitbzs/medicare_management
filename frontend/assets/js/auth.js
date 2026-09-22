/* ═══════════════════════════════════════════════════════
   auth.js — Authentication handling
═══════════════════════════════════════════════════════════ */

const AUTH = {
  token: null,
  user:  null,

  init() {
    this.token = localStorage.getItem('medicare_token');
    const userData = localStorage.getItem('medicare_user');
    if (userData) {
      try { this.user = JSON.parse(userData); } catch {}
    }
  },

  isLoggedIn() { return !!this.token; },

  async login(username, password) {
    const data = await API.login({ username, password });
    this.token = data.access_token;
    this.user  = data.user;
    localStorage.setItem('medicare_token', this.token);
    localStorage.setItem('medicare_user', JSON.stringify(this.user));
    return data;
  },

  logout() {
    this.token = null;
    this.user  = null;
    localStorage.removeItem('medicare_token');
    localStorage.removeItem('medicare_user');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
  },

  isAdmin() { return this.user?.role === 'admin'; },
};

// ─── Login Form ─────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = document.getElementById('login-btn');
  const spinner  = document.getElementById('login-spinner');
  const btnText  = document.getElementById('login-btn-text');
  const errorEl  = document.getElementById('login-error');

  errorEl.classList.add('hidden');
  btn.disabled = true;
  spinner.classList.remove('hidden');
  btnText.textContent = 'Signing in…';

  try {
    await AUTH.login(username, password);
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    APP.init();
  } catch (err) {
    errorEl.textContent = err.message || 'Login failed';
    errorEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    spinner.classList.add('hidden');
    btnText.textContent = 'Sign In';
  }
});

// Toggle password visibility
document.getElementById('toggle-pw').addEventListener('click', () => {
  const input = document.getElementById('login-password');
  const icon  = document.getElementById('eye-icon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.setAttribute('data-lucide', 'eye-off');
  } else {
    input.type = 'password';
    icon.setAttribute('data-lucide', 'eye');
  }
  lucide.createIcons();
});
