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

    <!-- Tab 2: User Accounts & Passwords -->
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
  if (currentSettingsTab === 'shop') {
    await loadSettingsData();
  } else {
    await loadUsersTable();
  }
}

function switchSettingsTab(tab) {
  currentSettingsTab = tab;
  document.querySelectorAll('.tabs .tab-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', (idx === 0 && tab === 'shop') || (idx === 1 && tab === 'users'));
  });
  const shopP = document.getElementById('tab-shop-panel');
  const userP = document.getElementById('tab-users-panel');
  if (shopP) shopP.classList.toggle('hidden', tab !== 'shop');
  if (userP) userP.classList.toggle('hidden', tab !== 'users');

  if (tab === 'shop') loadSettingsData();
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
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
}

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
