/* ═══════════════════════════════════════════════════════
   reports.js — Reports & Analytics page
═══════════════════════════════════════════════════════════ */

async function renderReports() {
  const container = document.getElementById('page-container');
  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  container.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">Reports & Analytics</h2><p class="page-subtitle">Business insights and data exports</p></div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" onclick="switchReportTab('sales-report',this)">💰 Sales Report</button>
      <button class="tab-btn" onclick="switchReportTab('stock-report',this)">📦 Stock Report</button>
      <button class="tab-btn" onclick="switchReportTab('expiry-report-tab',this)">⚠️ Expiry Report</button>
    </div>

    <!-- Sales Report -->
    <div id="sales-report">
      <div class="card" style="margin-bottom:20px">
        <div class="card-header">
          <span class="card-title">Sales Report</span>
          <div class="flex gap-10">
            <div class="field" style="margin:0">
              <input type="date" id="rep-start" value="${monthStart}" style="background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);padding:8px 12px;border-radius:8px;outline:none;font-size:13px"/>
            </div>
            <div class="field" style="margin:0">
              <input type="date" id="rep-end" value="${today}" style="background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);padding:8px 12px;border-radius:8px;outline:none;font-size:13px"/>
            </div>
            <button class="btn btn-primary btn-sm" onclick="loadSalesReport()"><i data-lucide="bar-chart-2"></i> Generate</button>
            <button class="btn btn-secondary btn-sm" onclick="exportSalesCsv()"><i data-lucide="download"></i> CSV</button>
          </div>
        </div>
        <div id="sales-report-content"><p class="text-muted text-sm">Select date range and click Generate</p></div>
      </div>

      <div class="dashboard-charts">
        <div class="chart-card">
          <div class="card-header"><span class="card-title">Revenue Trend</span></div>
          <canvas id="report-sales-chart"></canvas>
        </div>
        <div class="chart-card">
          <div class="card-header"><span class="card-title">Top Selling Medicines</span></div>
          <canvas id="report-top-chart"></canvas>
        </div>
      </div>
    </div>

    <!-- Stock Report -->
    <div id="stock-report" class="hidden">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Current Stock Valuation</span>
          <button class="btn btn-secondary btn-sm" onclick="downloadCsv(API.stockCsv())"><i data-lucide="download"></i> Export CSV</button>
        </div>
        <div id="stock-report-content"><div class="loading-center"><div class="spinner"></div></div></div>
      </div>
    </div>

    <!-- Expiry Report -->
    <div id="expiry-report-tab" class="hidden">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Expiry Status Report</span>
          <div class="flex gap-10">
            <select id="exp-report-days" onchange="loadExpiryReportTab(this.value)" style="background:var(--bg-input);border:1px solid var(--border);color:var(--text-primary);padding:8px 12px;border-radius:8px;font-size:13px">
              <option value="30">Next 30 days</option>
              <option value="60">Next 60 days</option>
              <option value="90" selected>Next 90 days</option>
              <option value="180">Next 180 days</option>
            </select>
            <button class="btn btn-secondary btn-sm" onclick="downloadCsv(API.expiryCsv(document.getElementById('exp-report-days').value))"><i data-lucide="download"></i> Export</button>
          </div>
        </div>
        <div id="expiry-report-content"><div class="loading-center"><div class="spinner"></div></div></div>
      </div>
    </div>
  `;
  lucide.createIcons();
  loadSalesChart();
  loadTopMedChart();
}

function switchReportTab(tabId, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['sales-report','stock-report','expiry-report-tab'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', id !== tabId);
  });
  if (tabId === 'stock-report') loadStockReport();
  if (tabId === 'expiry-report-tab') loadExpiryReportTab(90);
}

async function loadSalesReport() {
  const start = document.getElementById('rep-start')?.value;
  const end   = document.getElementById('rep-end')?.value;
  const el    = document.getElementById('sales-report-content');
  if (!start || !end) { showToast('Select date range', 'warning'); return; }
  el.innerHTML = `<div class="loading-center" style="padding:30px"><div class="spinner"></div></div>`;

  try {
    const bills = await API.getBills(`?start_date=${start}&end_date=${end}&limit=500`);
    if (!bills || bills.length === 0) {
      el.innerHTML = '<p class="text-muted" style="padding:12px">No sales in this period</p>'; return;
    }
    const total = bills.reduce((s, b) => s + b.total_amount, 0);
    const cashRevenue = bills.filter(b => b.payment_method === 'Cash').reduce((s, b) => s + b.total_amount, 0);
    const upiRevenue  = bills.filter(b => b.payment_method === 'UPI').reduce((s, b) => s + b.total_amount, 0);
    const cardRevenue = bills.filter(b => b.payment_method === 'Card').reduce((s, b) => s + b.total_amount, 0);

    el.innerHTML = `
      <div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:0">
        <div class="kpi-card kpi-success"><div class="kpi-top"><span class="kpi-label">Total Revenue</span><div class="kpi-icon"><i data-lucide="indian-rupee"></i></div></div><div class="kpi-value">₹${total.toFixed(2)}</div><div class="kpi-sub">${bills.length} bills</div></div>
        <div class="kpi-card kpi-primary"><div class="kpi-top"><span class="kpi-label">Cash</span><div class="kpi-icon"><i data-lucide="banknote"></i></div></div><div class="kpi-value">₹${cashRevenue.toFixed(2)}</div></div>
        <div class="kpi-card kpi-accent"><div class="kpi-top"><span class="kpi-label">UPI</span><div class="kpi-icon"><i data-lucide="smartphone"></i></div></div><div class="kpi-value">₹${upiRevenue.toFixed(2)}</div></div>
        <div class="kpi-card kpi-info"><div class="kpi-top"><span class="kpi-label">Card</span><div class="kpi-icon"><i data-lucide="credit-card"></i></div></div><div class="kpi-value">₹${cardRevenue.toFixed(2)}</div></div>
      </div>`;
    lucide.createIcons();
  } catch (err) {
    el.innerHTML = `<p class="text-muted">${err.message}</p>`;
  }
}

let rSalesChart, rTopChart;
async function loadSalesChart() {
  const data = await API.getDailySales(30).catch(() => []);
  const canvas = document.getElementById('report-sales-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (rSalesChart) rSalesChart.destroy();
  rSalesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => new Date(d.date).toLocaleDateString('en-IN', { month:'short', day:'numeric' })),
      datasets: [{
        label: 'Revenue',
        data: data.map(d => d.revenue),
        backgroundColor: 'rgba(99,102,241,0.6)',
        borderColor: '#6366f1',
        borderRadius: 6,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b', callback: v => '₹'+v } },
      },
    },
  });
}

async function loadTopMedChart() {
  const data = await API.getTopMedicines(30, 8).catch(() => []);
  const canvas = document.getElementById('report-top-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (rTopChart) rTopChart.destroy();
  rTopChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.name),
      datasets: [{
        label: 'Qty Sold',
        data: data.map(d => d.qty),
        backgroundColor: ['#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'],
        borderRadius: 6,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } },
        y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
      },
    },
  });
}

async function loadStockReport() {
  const el = document.getElementById('stock-report-content');
  if (!el) return;
  try {
    const batches = await API.getStockBatches();
    if (!batches || batches.length === 0) {
      el.innerHTML = '<p class="text-muted" style="padding:12px">No stock data</p>'; return;
    }
    const totalValue = batches.reduce((s, b) => s + b.qty_available * (b.purchase_price_per_unit || 0), 0);
    const totalSellValue = batches.reduce((s, b) => s + b.qty_available * b.selling_price_per_unit, 0);
    el.innerHTML = `
      <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
        <div class="kpi-card kpi-primary"><div class="kpi-top"><span class="kpi-label">Total Batches</span><div class="kpi-icon"><i data-lucide="package"></i></div></div><div class="kpi-value">${batches.length}</div></div>
        <div class="kpi-card kpi-success"><div class="kpi-top"><span class="kpi-label">Purchase Value</span><div class="kpi-icon"><i data-lucide="indian-rupee"></i></div></div><div class="kpi-value">₹${totalValue.toFixed(0)}</div></div>
        <div class="kpi-card kpi-accent"><div class="kpi-top"><span class="kpi-label">Selling Value</span><div class="kpi-icon"><i data-lucide="trending-up"></i></div></div><div class="kpi-value">₹${totalSellValue.toFixed(0)}</div></div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Medicine</th><th>Batch</th><th>Expiry</th><th>Available</th><th>Purchase/Unit</th><th>Sell/Unit</th><th>Value</th></tr></thead>
        <tbody>${batches.map(b => {
          const val = b.qty_available * b.selling_price_per_unit;
          return `<tr>
            <td><b>${b.medicine_name||'—'}</b></td>
            <td>${b.batch_no}</td>
            <td>${b.expiry_date}</td>
            <td>${b.qty_available}</td>
            <td>₹${(b.purchase_price_per_unit||0).toFixed(2)}</td>
            <td>₹${b.selling_price_per_unit.toFixed(2)}</td>
            <td><b>₹${val.toFixed(2)}</b></td>
          </tr>`;
        }).join('')}</tbody></table></div>`;
    lucide.createIcons();
  } catch (err) { el.innerHTML = `<p class="text-muted">${err.message}</p>`; }
}

async function loadExpiryReportTab(days) {
  const el = document.getElementById('expiry-report-content');
  if (!el) return;
  el.innerHTML = `<div class="loading-center" style="padding:30px"><div class="spinner"></div></div>`;
  try {
    const data = await API.getExpiryReport(days);
    if (!data || data.length === 0) {
      el.innerHTML = `<div class="empty-state"><i data-lucide="check-circle"></i><h3>No expiring medicines</h3></div>`;
      lucide.createIcons(); return;
    }
    el.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Medicine</th><th>Batch No</th><th>Expiry</th><th>Days Left</th><th>Qty</th><th>Status</th></tr></thead>
      <tbody>${data.map(r => `<tr>
        <td><b>${r.medicine_name}</b></td>
        <td><code style="background:var(--bg-input);padding:2px 6px;border-radius:4px;font-size:12px">${r.batch_no}</code></td>
        <td>${r.expiry_date}</td>
        <td class="${r.days_left < 0 ? 'text-danger' : r.days_left <= 30 ? 'text-warning' : 'text-secondary'}">${r.days_left} days</td>
        <td>${r.qty_available}</td>
        <td><span class="badge ${r.status==='expired'?'badge-danger':r.status==='critical'?'badge-danger':'badge-warning'}">${r.status}</span></td>
      </tr>`).join('')}</tbody></table></div>`;
  } catch { el.innerHTML = '<p class="text-muted" style="padding:12px">Failed to load</p>'; }
}

function exportSalesCsv() {
  const start = document.getElementById('rep-start')?.value;
  const end   = document.getElementById('rep-end')?.value;
  if (!start || !end) { showToast('Select date range', 'warning'); return; }
  downloadCsv(API.salesCsv(start, end));
}
