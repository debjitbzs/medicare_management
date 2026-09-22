/* ═══════════════════════════════════════════════════════
   settings.js — Shop Profile & User Management
═══════════════════════════════════════════════════════════ */

let currentSettingsTab = 'shop';

async function renderSettings(tab = 'shop') {
  currentSettingsTab = tab;
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Store & User Management</h2>
        <p class="page-subtitle">Configure medicine shop details, pharmacy name, and staff login accounts</p>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="tabs">
      <button class="tab-btn ${currentSettingsTab === 'shop' ? 'active' : ''}" onclick="switchSettingsTab('shop')">
        <i data-lucide="store" style="width: 15px; height: 15px; vertical-align: middle; margin-right: 6px"></i> Medicine Shop Details
      </button>
      <button class="tab-btn ${currentSettingsTab === 'sms' ? 'active' : ''}" onclick="switchSettingsTab('sms')">
        <i data-lucide="message-square" style="width: 15px; height: 15px; vertical-align: middle; margin-right: 6px"></i> SMS Automation
      </button>
      <button class="tab-btn ${currentSettingsTab === 'users' ? 'active' : ''}" onclick="switchSettingsTab('users')">
        <i data-lucide="users" style="width: 15px; height: 15px; vertical-align: middle; margin-right: 6px"></i> Users & Staff Passwords
      </button>
    </div>

    <!-- Tab 1: Medicine Shop Profile -->
    <div id="tab-shop-panel" class="${currentSettingsTab === 'shop' ? '' : 'hidden'}" style="max-width: 850px">
      <div class="card" style="margin-bottom: 24px">
        <div class="card-header">
          <span class="card-title"><i data-lucide="store" style="margin-right: 8px"></i> Pharmacy Store Information</span>
          <span class="badge badge-primary">Printed on All Bills</span>
        </div>
        <form id="settings-form" onsubmit="saveSettings(event)" style="padding: 16px 0">
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px; padding: 12px 16px; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border)">
            <div id="settings-logo-wrap" style="width: 52px; height: 52px; border-radius: 8px; background: #ffffff; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--border); flex-shrink: 0">
              <img id="settings-logo-img" src="" class="hidden" style="width: 100%; height: 100%; object-fit: contain; padding: 2px" alt="Store Logo" />
              <i id="settings-logo-icon" data-lucide="image" style="color: var(--text-muted); width: 24px; height: 24px"></i>
            </div>
            <div style="flex: 1">
              <div style="font-weight: 600; font-size: 13.5px; color: var(--text-primary)">Pharmacy Logo</div>
              <div style="font-size: 12px; color: var(--text-muted)">Displays on bills, thermal receipts, and sidebar</div>
            </div>
            <div>
              <input type="file" id="settings-logo-input" accept="image/*" class="hidden" onchange="uploadStoreLogoFromSettings(event)" />
              <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('settings-logo-input').click()">
                <i data-lucide="upload"></i> Upload Logo
              </button>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
            <div class="form-group">
              <label>Medicine Shop Name <span style="color: var(--danger)">*</span></label>
              <input type="text" id="set-store-name" class="form-control" placeholder="e.g. Apollo / MediCare Pharmacy" required />
            </div>
            <div class="form-group">
              <label>Currency Symbol <span style="color: var(--danger)">*</span></label>
              <input type="text" id="set-currency" class="form-control" placeholder="₹, $, etc." required />
            </div>
            <div class="form-group">
              <label>Phone / Contact Number</label>
              <input type="text" id="set-phone" class="form-control" placeholder="+91 98765 43210" />
            </div>
            <div class="form-group">
              <label>Shop Email Address</label>
              <input type="email" id="set-email" class="form-control" placeholder="info@pharmacy.com" />
            </div>
            <div class="form-group">
              <label>GST / Tax Number (GSTIN)</label>
              <input type="text" id="set-gst" class="form-control" placeholder="e.g. 19ABCDE1234F1Z5" />
            </div>
            <div class="form-group">
              <label>Drug License Number</label>
              <input type="text" id="set-license" class="form-control" placeholder="e.g. DL-WB-12345" />
            </div>
          </div>

          <div class="form-group" style="margin-top: 10px">
            <label>Shop Full Address</label>
            <textarea id="set-address" class="form-control" rows="2" placeholder="Full store address, road, landmark, city (will appear at the top of thermal/A4 receipts)"></textarea>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px">
            <div class="form-group">
              <label>Low Stock Warning Threshold (Units)</label>
              <input type="number" id="set-low-stock" class="form-control" min="1" max="500" value="20" />
            </div>
            <div class="form-group">
              <label>Expiry Alert Horizon (Days in Advance)</label>
              <input type="number" id="set-expiry-days" class="form-control" min="7" max="365" value="90" />
            </div>
          </div>

          <div style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px">
            <button type="submit" class="btn btn-primary" id="save-settings-btn">
              <i data-lucide="save"></i> Save Shop Profile
            </button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title"><i data-lucide="shield" style="margin-right: 8px"></i> System & Current Session</span>
        </div>
        <div style="padding: 12px 0; font-size: 14px; line-height: 1.8; color: var(--text-secondary)">
          <div><strong>Logged in as:</strong> <span>${AUTH.user?.full_name || 'Admin'} (${AUTH.user?.username})</span></div>
          <div><strong>Role:</strong> <span class="badge ${AUTH.user?.role === 'admin' ? 'badge-primary' : 'badge-accent'}">${AUTH.user?.role || 'admin'}</span></div>
          <div><strong>Local Database:</strong> SQLite (Zero-Configuration, fully persistent)</div>
          <div><strong>Version:</strong> MediCare Pro v1.0.0</div>
        </div>
      </div>
    </div>

    <!-- Tab 2: SMS Automation -->
    <div id="tab-sms-panel" class="${currentSettingsTab === 'sms' ? '' : 'hidden'}" style="max-width: 850px">
      <div class="card" style="margin-bottom: 24px">
        <div class="card-header">
          <span class="card-title"><i data-lucide="send" style="margin-right: 8px"></i> Automated Background SMS</span>
          <span class="badge badge-accent">No Laptop Login Needed</span>
        </div>

        <div style="padding: 16px 0">
          <div style="background: rgba(79, 70, 229, 0.08); border: 1px solid rgba(79, 70, 229, 0.25); border-radius: 10px; padding: 14px 16px; margin-bottom: 20px">
            <h4 style="margin: 0 0 6px; font-size: 14px; color: var(--text-primary)">🚀 How Background SMS Automation Works:</h4>
            <p style="font-size: 12.5px; color: var(--text-secondary); margin: 0; line-height: 1.6">
              When enabled, our backend automatically shoots an instant SMS to the patient's phone the moment a bill is generated or an appointment is booked. You do not need to log in to WhatsApp, scan QR codes, or click send buttons!
            </p>
            <div style="margin-top: 10px; font-size: 12px; color: var(--text-muted)">
              💡 <strong>Free Setup:</strong> Register at <a href="https://www.fast2sms.com" target="_blank" rel="noopener" style="color: var(--primary-light); text-decoration: underline">Fast2SMS.com</a> (Takes 30 seconds with mobile number). Copy your <strong>API Authorization Key</strong> from their dashboard and paste it below.
            </div>
          </div>

          <form id="sms-settings-form" onsubmit="saveSmsSettings(event)">
            <div class="form-group" style="margin-bottom: 16px">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer">
                <input type="checkbox" id="set-auto-sms-enabled" style="width: 18px; height: 18px; accent-color: var(--primary)" />
                <span style="font-weight: 600; font-size: 14px">Enable Automated Background SMS Dispatch</span>
              </label>
            </div>

            <div class="form-group">
              <label>Fast2SMS API Authorization Key</label>
              <input type="password" id="set-fast2sms-key" class="form-control" placeholder="Paste your Fast2SMS API key here" autocomplete="off" />
              <small style="color: var(--text-muted); font-size: 11px">Found in Fast2SMS Dashboard → Dev API → API Authorization</small>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 16px">
              <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer">
                  <input type="checkbox" id="set-auto-sms-bill" checked style="width: 16px; height: 16px; accent-color: var(--primary)" />
                  <span style="font-size: 13px">Auto-send SMS when Bill is created</span>
                </label>
              </div>
              <div class="form-group">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer">
                  <input type="checkbox" id="set-auto-sms-appt" checked style="width: 16px; height: 16px; accent-color: var(--primary)" />
                  <span style="font-size: 13px">Auto-send SMS when Appointment is booked</span>
                </label>
              </div>
            </div>

            <div style="margin-top: 24px; display: flex; justify-content: flex-end; gap: 12px">
              <button type="submit" class="btn btn-primary" id="save-sms-btn">
                <i data-lucide="save"></i> Save SMS Configuration
              </button>
            </div>
          </form>

          <hr style="border: 0; border-top: 1px solid var(--border); margin: 24px 0" />

          <!-- Test SMS Tool -->
          <div style="background: var(--bg-surface); padding: 16px; border-radius: 10px; border: 1px solid var(--border)">
            <h4 style="margin: 0 0 4px; font-size: 13.5px"><i data-lucide="phone-call" style="width: 14px; height: 14px; vertical-align: middle"></i> Test Live SMS Sending</h4>
            <p style="font-size: 12px; color: var(--text-muted); margin: 0 0 12px">Send an immediate test SMS to any mobile number to verify your API key</p>
            <div style="display: flex; gap: 10px; max-width: 450px">
              <input type="text" id="test-sms-phone" class="form-control" placeholder="Enter 10-digit mobile number" maxlength="10" />
              <button type="button" class="btn btn-outline" id="btn-test-sms" onclick="sendTestSms()" style="white-space: nowrap">
                <i data-lucide="send"></i> Send Test
              </button>
            </div>
            <div id="test-sms-result" class="hidden" style="margin-top: 10px; font-size: 12px; padding: 8px 12px; border-radius: 6px"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 3: User Accounts & Passwords -->
    <div id="tab-users-panel" class="${currentSettingsTab === 'users' ? '' : 'hidden'}" style="max-width: 950px">
      <div class="card">
        <div class="card-header flex justify-between items-center">
          <div>
            <span class="card-title"><i data-lucide="user-check" style="margin-right: 8px"></i> System Users & Staff Accounts</span>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px">Manage staff who can login, issue bills, and manage stocks</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="openCreateUserModal()">
            <i data-lucide="user-plus"></i> Create New User
          </button>
        </div>

        <div id="users-table-container" style="padding-top: 12px">
          <div class="loading-center"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
  `;

  lucide.createIcons();
  if (currentSettingsTab === 'shop' || currentSettingsTab === 'sms') {
    await loadSettingsData();
  } else {
    await loadUsersTable();
  }
}

function switchSettingsTab(tab) {
  currentSettingsTab = tab;
  document.querySelectorAll('.tabs .tab-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', (idx === 0 && tab === 'shop') || (idx === 1 && tab === 'sms') || (idx === 2 && tab === 'users'));
  });
  const shopP = document.getElementById('tab-shop-panel');
  const smsP  = document.getElementById('tab-sms-panel');
  const userP = document.getElementById('tab-users-panel');
  if (shopP) shopP.classList.toggle('hidden', tab !== 'shop');
  if (smsP)  smsP.classList.toggle('hidden', tab !== 'sms');
  if (userP) userP.classList.toggle('hidden', tab !== 'users');

  if (tab === 'shop' || tab === 'sms') loadSettingsData();
  if (tab === 'users') loadUsersTable();
}

async function renderUsers() {
  await renderSettings('users');
}

async function loadSettingsData() {
  try {
    const s = await API.getSettings();
    if (!s) return;
    window._storeSettings = s;
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== undefined) el.value = val;
    };
    setVal('set-store-name', s.store_name || 'MediCare Pharmacy');
    setVal('set-currency', s.currency_symbol || '₹');
    setVal('set-phone', s.store_phone || '');
    setVal('set-email', s.store_email || '');
    setVal('set-gst', s.store_gst || '');
    setVal('set-license', s.store_license || '');
    setVal('set-address', s.store_address || '');
    setVal('set-low-stock', s.low_stock_days || '20');
    setVal('set-expiry-days', s.expiry_alert_days || '90');
    setVal('set-fast2sms-key', s.fast2sms_api_key || '');

    const smsEn = document.getElementById('set-auto-sms-enabled');
    if (smsEn) smsEn.checked = s.auto_sms_enabled === 'true';
    const smsBill = document.getElementById('set-auto-sms-bill');
    if (smsBill) smsBill.checked = s.auto_sms_bill !== 'false';
    const smsAppt = document.getElementById('set-auto-sms-appt');
    if (smsAppt) smsAppt.checked = s.auto_sms_appointment !== 'false';

    if (s.store_logo) {
      const logoImg = document.getElementById('settings-logo-img');
      const logoIcon = document.getElementById('settings-logo-icon');
      if (logoImg) {
        logoImg.src = s.store_logo;
        logoImg.classList.remove('hidden');
        if (logoIcon) logoIcon.classList.add('hidden');
      }
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

async function uploadStoreLogoFromSettings(e) {
  const file = e.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await API.uploadLogo(fd);
    showToast('Store logo updated successfully!', 'success');
    if (res.url) {
      if (window._storeSettings) window._storeSettings.store_logo = res.url;
      const logoImg = document.getElementById('settings-logo-img');
      const logoIcon = document.getElementById('settings-logo-icon');
      if (logoImg) {
        logoImg.src = res.url + '?t=' + Date.now();
        logoImg.classList.remove('hidden');
        if (logoIcon) logoIcon.classList.add('hidden');
      }
      const sideLogo = document.getElementById('sidebar-logo-img');
      const sideFallback = document.getElementById('sidebar-logo-fallback');
      if (sideLogo && sideFallback) {
        sideLogo.src = res.url + '?t=' + Date.now();
        sideLogo.classList.remove('hidden');
        sideFallback.classList.add('hidden');
      }
    }
  } catch (err) {
    showToast(err.message || 'Failed to upload logo', 'error');
  }
}
window.uploadStoreLogoFromSettings = uploadStoreLogoFromSettings;

async function saveSmsSettings(e) {
  e.preventDefault();
  const btn = document.getElementById('save-sms-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const data = {
    auto_sms_enabled: document.getElementById('set-auto-sms-enabled').checked ? 'true' : 'false',
    fast2sms_api_key: document.getElementById('set-fast2sms-key').value.trim(),
    auto_sms_bill: document.getElementById('set-auto-sms-bill').checked ? 'true' : 'false',
    auto_sms_appointment: document.getElementById('set-auto-sms-appt').checked ? 'true' : 'false',
  };

  try {
    await API.updateSettings(data);
    showToast('SMS Automation settings saved successfully!', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to save SMS settings', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="save"></i> Save SMS Configuration';
    if (window.lucide) lucide.createIcons();
  }
}
window.saveSmsSettings = saveSmsSettings;

async function sendTestSms() {
  const phone = document.getElementById('test-sms-phone')?.value.trim();
  const apiKey = document.getElementById('set-fast2sms-key')?.value.trim();
  const resEl = document.getElementById('test-sms-result');
  const btn = document.getElementById('btn-test-sms');

  if (!phone || phone.length < 10) {
    showToast('Please enter a valid 10-digit mobile number', 'warning');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Sending…';
  if (resEl) resEl.className = 'hidden';

  try {
    const res = await API.testSMS({ phone, api_key: apiKey });
    if (resEl) {
      resEl.classList.remove('hidden');
      if (res.return) {
        resEl.style.background = 'rgba(34, 197, 94, 0.15)';
        resEl.style.color = 'var(--success)';
        resEl.style.border = '1px solid var(--success)';
        resEl.innerHTML = `✅ <b>Success!</b> Test SMS dispatched to ${phone}. Message ID: ${res.request_id || 'OK'}`;
        showToast('Test SMS sent successfully!', 'success');
      } else {
        resEl.style.background = 'rgba(239, 68, 68, 0.15)';
        resEl.style.color = 'var(--danger)';
        resEl.style.border = '1px solid var(--danger)';
        resEl.innerHTML = `❌ <b>Failed:</b> ${res.message || 'Check your Fast2SMS API key'}`;
        showToast('SMS failed: ' + (res.message || 'Check key'), 'error');
      }
    }
  } catch (err) {
    if (resEl) {
      resEl.classList.remove('hidden');
      resEl.style.background = 'rgba(239, 68, 68, 0.15)';
      resEl.style.color = 'var(--danger)';
      resEl.style.border = '1px solid var(--danger)';
      resEl.innerHTML = `❌ <b>Error:</b> ${err.message}`;
    }
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="send"></i> Send Test';
    if (window.lucide) lucide.createIcons();
  }
}
window.sendTestSms = sendTestSms;


async function saveSettings(e) {
  e.preventDefault();
  const btn = document.getElementById('save-settings-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const storeName = document.getElementById('set-store-name').value.trim();
  const data = {
    store_name: storeName,
    currency_symbol: document.getElementById('set-currency').value.trim() || '₹',
    store_phone: document.getElementById('set-phone').value.trim(),
    store_email: document.getElementById('set-email').value.trim(),
    store_gst: document.getElementById('set-gst').value.trim(),
    store_license: document.getElementById('set-license').value.trim(),
    store_address: document.getElementById('set-address').value.trim(),
    low_stock_days: document.getElementById('set-low-stock').value || '20',
    expiry_alert_days: document.getElementById('set-expiry-days').value || '90',
  };

  try {
    await API.updateSettings(data);
    window._storeSettings = data;

    // Dynamically update brand title on page & sidebar
    const brandEl = document.querySelector('.sidebar-brand');
    if (brandEl && storeName) brandEl.textContent = storeName;
    document.title = `${storeName} — Pharmacy Management`;

    showToast('Shop details updated successfully!', 'success');
  } catch (err) {
    showToast(err.message || 'Failed to save settings', 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="save"></i> Save Shop Profile';
    lucide.createIcons();
  }
}

/* ═══════════════════════════════════════════════════════════
   USER & PASSWORD MANAGEMENT
═══════════════════════════════════════════════════════════ */
async function loadUsersTable() {
  const container = document.getElementById('users-table-container');
  if (!container) return;

  try {
    const users = await API.getUsers();
    if (!users || users.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No users registered</p></div>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Username</th>
              <th>Role</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>
                  <div class="flex items-center gap-10">
                    <div class="user-avatar" style="width: 32px; height: 32px; font-size: 13px">
                      ${(u.full_name || u.username)[0].toUpperCase()}
                    </div>
                    <div>
                      <strong>${u.full_name || u.username}</strong>
                      ${u.id === AUTH.user?.id ? '<span class="badge badge-sm badge-info" style="margin-left: 6px">You</span>' : ''}
                    </div>
                  </div>
                </td>
                <td><code>${u.username}</code></td>
                <td>
                  <span class="badge ${u.role === 'admin' ? 'badge-primary' : 'badge-accent'}">
                    ${u.role === 'admin' ? 'Administrator' : 'Pharmacist / Staff'}
                  </span>
                </td>
                <td>${u.email || '—'}</td>
                <td>
                  <span class="badge badge-success">Active</span>
                </td>
                <td>
                  ${u.id !== AUTH.user?.id ? `
                    <button class="btn btn-ghost btn-sm" title="Delete User" onclick="deleteUserAccount(${u.id}, '${u.username}')" style="color: var(--danger)">
                      <i data-lucide="trash-2"></i>
                    </button>
                  ` : '<span style="color: var(--text-muted); font-size: 12px">Current user</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    lucide.createIcons();
  } catch (err) {
    container.innerHTML = `<div class="alert-error">${err.message || 'Failed to load users'}</div>`;
  }
}

function openCreateUserModal() {
  openModal('Create New User & Password', `
    <form id="create-user-form" onsubmit="submitCreateUser(event)">
      <div style="display: flex; flex-direction: column; gap: 14px">
        <div class="form-group">
          <label>Username <span style="color: var(--danger)">*</span></label>
          <input type="text" id="u-username" class="form-control" placeholder="e.g. john_doe" required autocomplete="off" />
          <small style="color: var(--text-muted); font-size: 11px">Used for signing into MediCare</small>
        </div>

        <div class="form-group">
          <label>Full Name <span style="color: var(--danger)">*</span></label>
          <input type="text" id="u-fullname" class="form-control" placeholder="e.g. John Doe" required />
        </div>

        <div class="form-group">
          <label>Password <span style="color: var(--danger)">*</span></label>
          <input type="password" id="u-password" class="form-control" placeholder="Enter secure password" required autocomplete="new-password" minlength="4" />
        </div>

        <div class="form-group">
          <label>Role <span style="color: var(--danger)">*</span></label>
          <select id="u-role" class="form-control" required>
            <option value="pharmacist" selected>Pharmacist / Billing Staff</option>
            <option value="admin">Administrator (Full Access)</option>
          </select>
        </div>

        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="u-email" class="form-control" placeholder="john@medicare.local" />
        </div>
      </div>
    </form>
  `, [
    { label: 'Cancel', cls: 'btn-secondary', action: closeModal },
    { label: 'Create Account', cls: 'btn-primary', action: () => {
      const form = document.getElementById('create-user-form');
      if (form) form.requestSubmit();
    }},
  ]);
}

async function submitCreateUser(e) {
  e.preventDefault();
  const username = document.getElementById('u-username').value.trim();
  const fullName = document.getElementById('u-fullname').value.trim();
  const password = document.getElementById('u-password').value;
  const role = document.getElementById('u-role').value;
  const email = document.getElementById('u-email').value.trim() || undefined;

  if (!username || !password) {
    showToast('Username and password are required', 'warning');
    return;
  }

  try {
    await API.createUser({
      username,
      full_name: fullName,
      password,
      role,
      email,
    });
    closeModal();
    showToast(`User account for "${username}" created!`, 'success');
    await loadUsersTable();
  } catch (err) {
    showToast(err.message || 'Failed to create user', 'error');
  }
}

async function deleteUserAccount(id, username) {
  if (!confirm(`Are you sure you want to delete user account "${username}"?`)) return;
  try {
    await API.deleteUser(id);
    showToast(`User "${username}" deleted`, 'success');
    await loadUsersTable();
  } catch (err) {
    showToast(err.message || 'Failed to delete user', 'error');
  }
}
