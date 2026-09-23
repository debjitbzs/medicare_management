/* ═══════════════════════════════════════════════════════
   auth.js — Authentication + First-Run Setup Wizard
═══════════════════════════════════════════════════════════ */

const AUTH = {
  token: null,
  user:  null,

  init() {
    this.token = localStorage.getItem('medify_token');
    const userData = localStorage.getItem('medify_user');
    if (userData) {
      try { this.user = JSON.parse(userData); } catch {}
    }
  },

  isLoggedIn() { return !!this.token; },

  async login(username, password) {
    const data = await API.login({ username, password });
    if (!data || !data.access_token) {
      throw new Error('Invalid username or password');
    }
    this._saveSession(data);
    return data;
  },

  async setup(payload) {
    const data = await API.setup(payload);
    if (!data || !data.access_token) {
      throw new Error('Store setup completed, but login session could not be established');
    }
    this._saveSession(data);
    return data;
  },

  _saveSession(data) {
    if (!data) return;
    this.token = data.access_token;
    this.user  = data.user;
    if (this.token) localStorage.setItem('medify_token', this.token);
    if (this.user) localStorage.setItem('medify_user', JSON.stringify(this.user));
  },

  logout() {
    this.token = null;
    this.user  = null;
    localStorage.removeItem('medify_token');
    localStorage.removeItem('medify_user');
    document.getElementById('app').classList.add('hidden');
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    // Show login, check if setup is now needed (edge case: all users deleted)
  },

  isAdmin() { return this.user?.role === 'admin'; },
};

// ─── Boot: decide what to show on load ──────────────────
async function bootApp() {
  AUTH.init();
  if (AUTH.isLoggedIn()) {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    APP.init();
    return;
  }
  // Check if first-run wizard needed
  try {
    const { is_first_run } = await API.setupStatus();
    if (is_first_run) {
      showSetupWizard();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('setup-screen').classList.add('hidden');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  lucide.createIcons();
}

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
    spinner.classList.add('hidden');;
    btnText.textContent = 'Sign In';
  }
});

// Toggle password visibility — login
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

// ─── Setup Wizard ────────────────────────────────────────
let _setupStep = 1;
let _setupLogo = null;

function showSetupWizard(step = 1) {
  _setupStep = step;
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.add('hidden');
  const screen = document.getElementById('setup-screen');
  screen.classList.remove('hidden');
  renderSetupStep(step);
  lucide.createIcons();
}

function renderSetupStep(step) {
  document.getElementById('setup-step-1').classList.toggle('hidden', step !== 1);
  document.getElementById('setup-step-2').classList.toggle('hidden', step !== 2);
  document.getElementById('setup-step-3').classList.toggle('hidden', step !== 3);
  // Update progress dots
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`setup-dot-${i}`);
    if (dot) {
      dot.classList.toggle('active', i <= step);
      dot.classList.toggle('current', i === step);
    }
  }
}

function setupNext() {
  if (_setupStep === 1) {
    const storeName = document.getElementById('setup-store-name').value.trim();
    const storePhone = document.getElementById('setup-store-phone').value.trim();
    if (!storeName) { document.getElementById('setup-store-name').focus(); return; }
    if (!storePhone) { document.getElementById('setup-store-phone').focus(); return; }
    _setupStep = 2;
    renderSetupStep(2);
  } else if (_setupStep === 2) {
    const fullName = document.getElementById('setup-admin-name').value.trim();
    const username = document.getElementById('setup-admin-user').value.trim();
    const pw1 = document.getElementById('setup-admin-pw').value;
    const pw2 = document.getElementById('setup-admin-pw2').value;
    const errEl = document.getElementById('setup-err-2');
    errEl.classList.add('hidden');
    if (!fullName || !username || !pw1) { errEl.textContent = 'All fields required.'; errEl.classList.remove('hidden'); return; }
    if (pw1 !== pw2) { errEl.textContent = 'Passwords do not match.'; errEl.classList.remove('hidden'); return; }
    if (pw1.length < 6) { errEl.textContent = 'Password must be at least 6 characters.'; errEl.classList.remove('hidden'); return; }
    _setupStep = 3;
    renderSetupStep(3);
  }
}

function setupBack() {
  if (_setupStep > 1) { _setupStep--; renderSetupStep(_setupStep); }
}

document.getElementById('setup-logo-input')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  _setupLogo = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const preview = document.getElementById('setup-logo-preview');
    preview.src = ev.target.result;
    preview.classList.remove('hidden');
    document.getElementById('setup-logo-placeholder').classList.add('hidden');
  };
  reader.readAsDataURL(file);
});

async function submitSetup() {
  const errEl = document.getElementById('setup-err-3');
  errEl.classList.add('hidden');
  const btn = document.getElementById('setup-submit-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="btn-spinner" style="display:inline-block"></div> Setting up…';

  try {
    const payload = {
      store_name: document.getElementById('setup-store-name').value.trim(),
      store_phone: document.getElementById('setup-store-phone').value.trim(),
      store_email: document.getElementById('setup-store-email').value.trim(),
      store_language: document.getElementById('setup-language').value,
      admin_full_name: document.getElementById('setup-admin-name').value.trim(),
      admin_username: document.getElementById('setup-admin-user').value.trim(),
      admin_password: document.getElementById('setup-admin-pw').value,
    };
    await AUTH.setup(payload);

    // Upload logo if provided
    if (_setupLogo) {
      const fd = new FormData();
      fd.append('file', _setupLogo);
      await API.uploadLogo(fd);
    }

    // Enter the app
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    APP.init();
  } catch (err) {
    errEl.textContent = err.message || 'Setup failed. Please try again.';
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.innerHTML = 'Launch My Store 🚀';
  }
}
