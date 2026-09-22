/* ═══════════════════════════════════════════════════════
   dashboard.js — Dashboard page
═══════════════════════════════════════════════════════════ */

let salesChart = null;
let topMedChart = null;

async function renderDashboard() {
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Dashboard</h2>
        <p class="page-subtitle" id="dash-date"></p>
      </div>
      <div class="flex gap-10">
        <button class="btn btn-secondary btn-sm" onclick="renderDashboard()">
          <i data-lucide="refresh-cw"></i> Refresh
        </button>
      </div>
    </div>

    <!-- KPI Row -->
    <div class="kpi-grid" id="kpi-grid">
      ${[1,2,3,4,5,6,7,8].map(() => `<div class="kpi-card" style="height:100px"><div class="skeleton" style="height:100%"></div></div>`).join('')}
    </div>

    <!-- Charts -->
    <div class="dashboard-charts">
      <div class="chart-card">
        <div class="card-header">
          <span class="card-title">Sales Trend</span>
          <select id="sales-days-select" onchange="refreshSalesChart(this.value)" style="background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);padding:6px 10px;border-radius:6px;font-size:12px">
            <option value="7">Last 7 days</option>
            <option value="30" selected>Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
        <canvas id="sales-chart"></canvas>
      </div>
      <div class="chart-card">
        <div class="card-header"><span class="card-title">Top Medicines</span></div>
        <canvas id="top-med-chart"></canvas>
      </div>
    </div>

    <!-- Bottom -->
    <div class="dashboard-bottom">
      <div class="card">
        <div class="card-header">
          <span class="card-title">⚠️ Low Stock Alerts</span>
          <a href="#stock" class="btn btn-ghost btn-sm">View All</a>
        </div>
        <div id="low-stock-list"><div class="loading-center"><div class="spinner"></div></div></div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title">📅 Today's Appointments</span>
          <a href="#appointments" class="btn btn-ghost btn-sm">View All</a>
        </div>
        <div id="today-appts-list"><div class="loading-center"><div class="spinner"></div></div></div>
      </div>
    </div>
  `;
  lucide.createIcons();

  document.getElementById('dash-date').textContent = new Date().toLocaleDateString('en-IN', {
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  });

  // Load all data in parallel
  const [stats, salesData, topMeds, expiryData, notifications] = await Promise.all([
    API.getDashboardStats().catch(() => null),
    API.getDailySales(30).catch(() => []),
    API.getTopMedicines(30).catch(() => []),
    API.getExpiryReport(90).catch(() => []),
    API.getNotifications().catch(() => []),
  ]);

  if (stats) renderKPIs(stats);
  renderSalesChart(salesData);
  renderTopMedChart(topMeds);
  renderLowStockList();
  renderTodayApptsList(notifications.filter(n => n.type === 'appointment'));
}

function renderKPIs(stats) {
  const currency = '₹';
  document.getElementById('kpi-grid').innerHTML = `
    <div class="kpi-card kpi-success">
      <div class="kpi-top">
        <span class="kpi-label">Today's Revenue</span>
        <div class="kpi-icon"><i data-lucide="indian-rupee"></i></div>
      </div>
      <div class="kpi-value">${currency}${formatNum(stats.today_sales)}</div>
      <div class="kpi-sub">${stats.today_bills} bills today</div>
    </div>
    <div class="kpi-card kpi-primary">
      <div class="kpi-top">
        <span class="kpi-label">Monthly Revenue</span>
        <div class="kpi-icon"><i data-lucide="trending-up"></i></div>
      </div>
      <div class="kpi-value">${currency}${formatNum(stats.monthly_revenue)}</div>
      <div class="kpi-sub">This month</div>
    </div>
    <div class="kpi-card kpi-accent">
      <div class="kpi-top">
        <span class="kpi-label">Today's Appointments</span>
        <div class="kpi-icon"><i data-lucide="calendar-check"></i></div>
      </div>
      <div class="kpi-value">${stats.today_appointments}</div>
      <div class="kpi-sub">Scheduled today</div>
    </div>
    <div class="kpi-card kpi-info">
      <div class="kpi-top">
        <span class="kpi-label">Total Medicines</span>
        <div class="kpi-icon"><i data-lucide="pill"></i></div>
      </div>
      <div class="kpi-value">${stats.total_medicines}</div>
      <div class="kpi-sub">Active items</div>
    </div>
    <div class="kpi-card kpi-warning">
      <div class="kpi-top">
        <span class="kpi-label">Low Stock</span>
        <div class="kpi-icon"><i data-lucide="package-x"></i></div>
      </div>
      <div class="kpi-value">${stats.low_stock_count}</div>
      <div class="kpi-sub">Below minimum</div>
    </div>
    <div class="kpi-card kpi-danger">
      <div class="kpi-top">
        <span class="kpi-label">Expiring Soon</span>
        <div class="kpi-icon"><i data-lucide="alert-triangle"></i></div>
      </div>
      <div class="kpi-value">${stats.expiry_soon_count}</div>
      <div class="kpi-sub">Within 90 days</div>
    </div>
    <div class="kpi-card kpi-primary">
      <div class="kpi-top">
        <span class="kpi-label">Total Patients</span>
        <div class="kpi-icon"><i data-lucide="users"></i></div>
      </div>
      <div class="kpi-value">${stats.total_patients}</div>
      <div class="kpi-sub">Registered</div>
    </div>
    <div class="kpi-card kpi-success">
      <div class="kpi-top">
        <span class="kpi-label">Today's Bills</span>
        <div class="kpi-icon"><i data-lucide="receipt"></i></div>
      </div>
      <div class="kpi-value">${stats.today_bills}</div>
      <div class="kpi-sub">Transactions</div>
    </div>
  `;
  lucide.createIcons();
}

function renderSalesChart(data) {
  const canvas = document.getElementById('sales-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (salesChart) salesChart.destroy();

  salesChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => formatDateShort(d.date)),
      datasets: [{
        label: 'Revenue (₹)',
        data: data.map(d => d.revenue),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: '#6366f1',
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#64748b', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#64748b', font: { size: 11 }, callback: v => '₹'+formatNum(v) } },
      },
    },
  });
}

async function refreshSalesChart(days) {
  const data = await API.getDailySales(parseInt(days)).catch(() => []);
  renderSalesChart(data);
}

function renderTopMedChart(data) {
  const canvas = document.getElementById('top-med-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (topMedChart) topMedChart.destroy();

  const colors = ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#3b82f6'];

  topMedChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.slice(0,8).map(d => d.name),
      datasets: [{
        data: data.slice(0,8).map(d => d.qty),
        backgroundColor: colors,
        borderColor: 'rgba(0,0,0,0)',
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, padding: 12, boxWidth: 12 } },
      },
      cutout: '65%',
    },
  });
}

async function renderLowStockList() {
  const el = document.getElementById('low-stock-list');
  if (!el) return;
  try {
    const meds = await API.getMedicines('?low_stock=true');
    if (!meds || meds.length === 0) {
      el.innerHTML = `<div class="empty-state" style="padding:24px"><i data-lucide="check-circle" style="width:32px;height:32px;color:var(--success-light)"></i><p style="margin-top:8px;color:var(--success-light)">All stocks are healthy</p></div>`;
      lucide.createIcons(); return;
    }
    el.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Medicine</th><th>Stock</th><th>Min</th><th>Status</th></tr></thead>
      <tbody>${meds.slice(0,8).map(m => `
        <tr>
          <td><span style="font-weight:500">${m.name}</span><br><span class="text-muted text-sm">${m.category}</span></td>
          <td><span class="${m.total_stock === 0 ? 'text-danger' : 'text-warning'} font-bold">${m.total_stock}</span></td>
          <td>${m.min_stock_alert}</td>
          <td>${m.total_stock === 0 ? '<span class="badge badge-danger">Out of Stock</span>' : '<span class="badge badge-warning">Low</span>'}</td>
        </tr>`).join('')}
      </tbody></table></div>`;
  } catch {
    el.innerHTML = '<p class="text-muted" style="padding:16px">Failed to load</p>';
  }
  lucide.createIcons();
}

function renderTodayApptsList(appointments) {
  const el = document.getElementById('today-appts-list');
  if (!el) return;
  if (!appointments || appointments.length === 0) {
    el.innerHTML = `<div class="empty-state" style="padding:24px"><i data-lucide="calendar" style="width:32px;height:32px"></i><p style="margin-top:8px">No appointments today</p></div>`;
    lucide.createIcons(); return;
  }
  el.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;padding:4px">
    ${appointments.slice(0,5).map(n => `
      <div class="appt-card" style="padding:10px 12px">
        <div class="appt-token" style="width:34px;height:34px;font-size:13px">${n.data.time || '--'}</div>
        <div class="appt-info">
          <div class="appt-patient">${n.message.split('—')[1]?.replace('Patient:','').trim().split('(')[0].trim() || 'Patient'}</div>
          <div class="appt-doctor">${n.message.split('—')[0]?.replace('Dr.','Dr.').trim()}</div>
        </div>
        <span class="badge badge-primary">Scheduled</span>
      </div>`).join('')}
  </div>`;
  lucide.createIcons();
}

function formatNum(n) {
  if (n >= 100000) return (n/100000).toFixed(1) + 'L';
  if (n >= 1000) return (n/1000).toFixed(1) + 'K';
  return (n || 0).toFixed(2);
}
function formatDateShort(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { month:'short', day:'numeric' });
}
