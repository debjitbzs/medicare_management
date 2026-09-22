/* ═══════════════════════════════════════════════════════
   app.js — Core Application Router, Modal & Toast Controller
═══════════════════════════════════════════════════════════ */

const ROUTES = {
  dashboard:    { title: 'Dashboard',             render: () => typeof renderDashboard === 'function' && renderDashboard() },
  medicines:    { title: 'Medicines Inventory',    render: () => typeof renderMedicines === 'function' && renderMedicines() },
  stock:        { title: 'Stock & Batches',       render: () => typeof renderStock === 'function' && renderStock() },
  billing:      { title: 'POS Billing',           render: () => typeof renderBilling === 'function' && renderBilling() },
  bills:        { title: 'Bill History',          render: () => typeof renderBills === 'function' && renderBills() },
  doctors:      { title: 'Doctors Management',    render: () => typeof renderDoctors === 'function' && renderDoctors() },
  patients:     { title: 'Patients Management',   render: () => typeof renderPatients === 'function' && renderPatients() },
  appointments: { title: 'Doctor Appointments',   render: () => typeof renderAppointments === 'function' && renderAppointments() },
  reports:      { title: 'Reports & Analytics',   render: () => typeof renderReports === 'function' && renderReports() },
  users:        { title: 'Users & Staff Passwords', render: () => typeof renderUsers === 'function' && renderUsers() },
  settings:     { title: 'Medicine Shop Settings', render: () => typeof renderSettings === 'function' && renderSettings() },
};

let currentPage = 'dashboard';
let notifTimer = null;

const APP = {
  init() {
    AUTH.init();
    if (!AUTH.isLoggedIn()) {
      // bootApp() handles showing login or setup
      return;
    }

    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    this.setupUserUI();
    this.setupNavigation();
    this.setupModals();
    this.setupClock();
    this.setupNotifications();
    this.loadStoreSettings();

    // Initial page load from URL hash or default to dashboard
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    this.navigate(ROUTES[hash] ? hash : 'dashboard');
  },

  async loadStoreSettings() {
    try {
      const s = await API.getSettings();
      if (s) {
        window._storeSettings = s;
        if (s.store_name) {
          const storeTitleEl = document.getElementById('sidebar-store-title') || document.querySelector('.sidebar-brand');
          if (storeTitleEl) storeTitleEl.textContent = s.store_name;
          const oldStoreNameEl = document.getElementById('sidebar-store-name');
          if (oldStoreNameEl) oldStoreNameEl.textContent = s.store_name;
          document.title = `${s.store_name} — Medify`;
          const loginStoreName = document.getElementById('login-store-name');
          if (loginStoreName) loginStoreName.textContent = s.store_name;
        }
        const logoImg = document.getElementById('sidebar-logo-img');
        const logoFallback = document.getElementById('sidebar-logo-fallback');
        if (s.store_logo && logoImg && logoFallback) {
          logoImg.src = s.store_logo;
          logoImg.classList.remove('hidden');
          logoFallback.classList.add('hidden');
        } else if (logoImg && logoFallback) {
          logoImg.classList.add('hidden');
          logoFallback.classList.remove('hidden');
        }
      }
    } catch (err) {}
  },

  setupUserUI() {
    const user = AUTH.user;
    if (!user) return;
    const nameEl = document.getElementById('sidebar-username');
    const roleEl = document.getElementById('sidebar-role');
    const avatarEl = document.getElementById('user-avatar-text');

    if (nameEl) nameEl.textContent = user.full_name || user.username;
    if (roleEl) roleEl.textContent = user.role === 'admin' ? 'Admin' : 'Pharmacist';
    if (avatarEl) {
      const initial = (user.full_name || user.username || 'A')[0].toUpperCase();
      avatarEl.textContent = initial;
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        if (confirm('Are you sure you want to sign out?')) {
          AUTH.logout();
        }
      };
    }
  },

  setupNavigation() {
    // Nav links
    document.querySelectorAll('.sidebar-nav a[data-page]').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        this.navigate(page);
        this.closeMobileSidebar();
      });
    });

    // Hash change handler
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ROUTES[hash] && hash !== currentPage) {
        this.navigate(hash, false);
      }
    });

    // Mobile sidebar toggle
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarClose = document.getElementById('sidebar-close');
    const overlay = document.getElementById('sidebar-overlay');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('hidden');
      });
    }
    if (sidebarClose) {
      sidebarClose.addEventListener('click', () => this.closeMobileSidebar());
    }
    if (overlay) {
      overlay.addEventListener('click', () => this.closeMobileSidebar());
    }
  },

  closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.add('hidden');
  },

  navigate(page, updateHash = true) {
    if (!ROUTES[page]) page = 'dashboard';
    currentPage = page;

    if (updateHash) {
      window.location.hash = page;
    }

    // Update active nav state
    document.querySelectorAll('.sidebar-nav a[data-page]').forEach((link) => {
      link.classList.toggle('active', link.getAttribute('data-page') === page);
    });

    // Update breadcrumb
    const breadcrumb = document.getElementById('breadcrumb');
    if (breadcrumb) {
      breadcrumb.textContent = ROUTES[page].title;
    }

    // Render target page
    try {
      ROUTES[page].render();
    } catch (err) {
      console.error(`Error rendering page ${page}:`, err);
    }

    // Refresh icons
    setTimeout(() => {
      if (window.lucide) lucide.createIcons();
    }, 50);
  },

  setupClock() {
    const clockEl = document.getElementById('topbar-clock');
    if (!clockEl) return;
    const update = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    };
    update();
    setInterval(update, 30000);
  },

  setupNotifications() {
    const notifBtn = document.getElementById('notif-btn');
    const notifPanel = document.getElementById('notif-panel');
    const notifClose = document.getElementById('notif-close');

    if (notifBtn && notifPanel) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifPanel.classList.toggle('hidden');
        if (!notifPanel.classList.contains('hidden')) {
          this.loadNotifications();
        }
      });
    }

    if (notifClose && notifPanel) {
      notifClose.addEventListener('click', () => notifPanel.classList.add('hidden'));
    }

    document.addEventListener('click', (e) => {
      if (notifPanel && !notifPanel.contains(e.target) && notifBtn && !notifBtn.contains(e.target)) {
        notifPanel.classList.add('hidden');
      }
    });

    // Initial check and periodic refresh
    this.loadNotifications();
    if (notifTimer) clearInterval(notifTimer);
    notifTimer = setInterval(() => this.loadNotifications(), 60000);
  },

  async loadNotifications() {
    const listEl = document.getElementById('notif-list');
    const badge = document.getElementById('notif-badge');
    if (!listEl || !badge) return;

    try {
      const [todayAppts, lowStock, expiryAlerts] = await Promise.all([
        API.getTodayAppts().catch(() => []),
        API.getLowStockAlerts().catch(() => []),
        API.getExpiryAlerts(60).catch(() => []),
      ]);

      const items = [];

      // Doctor appointment notifications (Snooze / Reminder)
      (todayAppts || []).forEach((a) => {
        if (a.status === 'scheduled') {
          items.push({
            typeClass: 'type-appointment',
            icon: 'calendar',
            title: `Doctor Appointment: ${a.doctor?.name || 'Doctor'}`,
            desc: `Token #${a.token_no} — Patient: ${a.patient?.name || 'Patient'} (${a.appointment_time || 'Today'})`,
            action: () => APP.navigate('appointments'),
          });
        }
      });

      // Low stock notifications
      (lowStock || []).slice(0, 5).forEach((m) => {
        items.push({
          typeClass: 'type-low_stock',
          icon: 'alert-triangle',
          title: `Low Stock Alert: ${m.name}`,
          desc: `Only ${m.total_stock} ${m.unit} left (Alert threshold: ${m.min_stock_alert})`,
          action: () => APP.navigate('stock'),
        });
      });

      // Near expiry notifications
      (expiryAlerts || []).slice(0, 5).forEach((b) => {
        items.push({
          typeClass: 'type-expiry',
          icon: 'clock',
          title: `Expiring Soon: ${b.medicine?.name || 'Medicine'} (Batch ${b.batch_no})`,
          desc: `Expires on ${b.expiry_date} (${b.days_to_expiry} days remaining)`,
          action: () => APP.navigate('stock'),
        });
      });

      if (items.length > 0) {
        badge.textContent = items.length > 99 ? '99+' : items.length;
        badge.classList.remove('hidden');

        listEl.innerHTML = items.map((item, idx) => `
          <div class="notif-item ${item.typeClass}" onclick="handleNotifClick(${idx})" style="cursor: pointer">
            <div class="notif-icon"><i data-lucide="${item.icon}"></i></div>
            <div class="notif-content">
              <div class="notif-title">${item.title}</div>
              <div class="notif-msg">${item.desc}</div>
            </div>
          </div>
        `).join('');

        window._notifItems = items;
      } else {
        badge.classList.add('hidden');
        listEl.innerHTML = '<div class="notif-empty">No new alerts for today</div>';
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    }
  },

  setupModals() {
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  },
};

window.handleNotifClick = function(idx) {
  const panel = document.getElementById('notif-panel');
  if (panel) panel.classList.add('hidden');
  if (window._notifItems && window._notifItems[idx]) {
    window._notifItems[idx].action();
  }
};

/* ═══════════════════════════════════════════════════════════
   GLOBAL MODAL HELPERS
═══════════════════════════════════════════════════════════ */
function openModal(title, bodyHtml, footer) {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const bodyEl  = document.getElementById('modal-body');
  const footEl  = document.getElementById('modal-footer');

  if (!overlay || !bodyEl) return;

  titleEl.textContent = title || 'Dialog';
  bodyEl.innerHTML = bodyHtml || '';

  if (Array.isArray(footer)) {
    footEl.innerHTML = '';
    footEl.classList.remove('hidden');
    footer.forEach((btn) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `btn ${btn.cls || 'btn-secondary'}`;
      button.textContent = btn.label;
      button.onclick = btn.action;
      footEl.appendChild(button);
    });
  } else if (typeof footer === 'string') {
    footEl.innerHTML = footer;
    footEl.classList.remove('hidden');
  } else {
    footEl.innerHTML = '';
    footEl.classList.add('hidden');
  }

  overlay.classList.remove('hidden');
  setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 50);
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.classList.add('hidden');
  if (typeof window._onModalClose === 'function') {
    const cb = window._onModalClose;
    window._onModalClose = null;
    cb();
  }
}

/* ═══════════════════════════════════════════════════════════
   GLOBAL TOAST NOTIFICATIONS
═══════════════════════════════════════════════════════════ */
function showToast(message, type = 'info', duration = 3200) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = {
    success: 'check-circle',
    error:   'alert-circle',
    warning: 'alert-triangle',
    info:    'info',
  };

  toast.innerHTML = `
    <i data-lucide="${iconMap[type] || 'info'}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Format utilities
function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Auto-boot on load — bootApp() is defined in auth.js and handles first-run detection
document.addEventListener('DOMContentLoaded', () => {
  bootApp();
});
