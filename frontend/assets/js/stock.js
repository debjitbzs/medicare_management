/* ═══════════════════════════════════════════════════════
   stock.js — Stock management page
═══════════════════════════════════════════════════════════ */

async function renderStock() {
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Stock Management</h2>
        <p class="page-subtitle">Batches, expiry tracking, and suppliers</p>
      </div>
      <div class="flex gap-10">
        <button class="btn btn-secondary btn-sm" onclick="downloadCsv(API.stockCsv())"><i data-lucide="download"></i> Export CSV</button>
        <button class="btn btn-primary" onclick="openAddSupplierModal()"><i data-lucide="truck"></i> Add Supplier</button>
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" data-tab="batches" onclick="switchStockTab('batches',this)">📦 All Batches</button>
      <button class="tab-btn" data-tab="expiry" onclick="switchStockTab('expiry',this)">⚠️ Expiry Report</button>
      <button class="tab-btn" data-tab="suppliers" onclick="switchStockTab('suppliers',this)">🚚 Suppliers</button>
    </div>

    <div id="stock-tab-content"><div class="loading-center"><div class="spinner"></div></div></div>
  `;
  lucide.createIcons();
  loadStockBatches();
}

function switchStockTab(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (tab === 'batches') loadStockBatches();
  else if (tab === 'expiry') loadExpiryReport();
  else if (tab === 'suppliers') loadSuppliers();
}

async function loadStockBatches() {
  const el = document.getElementById('stock-tab-content');
  el.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;
  try {
    const batches = await API.getStockBatches();
    if (!batches || batches.length === 0) {
      el.innerHTML = `<div class="empty-state"><i data-lucide="package"></i><h3>No stock batches</h3><p>Add medicines and then add stock from the Medicines page</p></div>`;
      lucide.createIcons(); return;
    }
    el.innerHTML = `
      <div class="filter-row">
        <div class="search-wrap">
          <i data-lucide="search" class="search-icon"></i>
          <input type="text" id="batch-search" placeholder="Filter by medicine…" oninput="filterBatches(this.value,'${escHtml ? '' : ''}')"/>
        </div>
      </div>
      <div class="table-wrap">
        <table id="batches-table">
          <thead><tr>
            <th>Medicine</th><th>Batch No</th><th>Expiry</th><th>Available</th>
            <th>Purchase/Unit</th><th>Selling/Unit</th><th>Supplier</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody id="batches-body">${batches.map(b => renderBatchRow(b)).join('')}</tbody>
        </table>
      </div>`;
  } catch (err) {
    el.innerHTML = `<p class="text-muted" style="padding:16px">Error: ${err.message}</p>`;
  }
  lucide.createIcons();
}

function renderBatchRow(b) {
  const today = new Date();
  const exp = new Date(b.expiry_date);
  const daysLeft = Math.floor((exp - today) / 86400000);
  let statusBadge;
  if (daysLeft < 0) statusBadge = '<span class="badge badge-danger">Expired</span>';
  else if (daysLeft <= 30) statusBadge = `<span class="badge badge-danger">${daysLeft}d left</span>`;
  else if (daysLeft <= 90) statusBadge = `<span class="badge badge-warning">${daysLeft}d left</span>`;
  else statusBadge = `<span class="badge badge-success">Good</span>`;

  const qtyColor = b.qty_available === 0 ? 'text-danger font-bold' : b.qty_available <= 10 ? 'text-warning font-bold' : 'text-success';

  return `<tr data-medicine="${(b.medicine_name||'').toLowerCase()}">
    <td><span style="font-weight:500">${b.medicine_name||'—'}</span></td>
    <td><code style="background:var(--bg-input);padding:2px 6px;border-radius:4px;font-size:12px">${b.batch_no}</code></td>
    <td>${b.expiry_date}</td>
    <td><span class="${qtyColor}">${b.qty_available}</span></td>
    <td>₹${(b.purchase_price_per_unit||0).toFixed(2)}</td>
    <td>₹${(b.selling_price_per_unit||0).toFixed(2)}</td>
    <td>${b.supplier_name||'—'}</td>
    <td>${statusBadge}</td>
    <td>
      <button class="btn btn-secondary btn-sm" onclick="openAdjustStockModal(${b.id},'${escHtml2(b.medicine_name)}',${b.qty_available})"><i data-lucide="sliders-horizontal"></i></button>
    </td>
  </tr>`;
}

function filterBatches(search) {
  document.querySelectorAll('#batches-body tr').forEach(row => {
    row.style.display = row.dataset.medicine.includes(search.toLowerCase()) ? '' : 'none';
  });
}

async function loadExpiryReport() {
  const el = document.getElementById('stock-tab-content');
  el.innerHTML = `
    <div class="filter-row">
      <label style="font-size:13px;color:var(--text-secondary)">Alert within</label>
      <select id="expiry-days" onchange="loadExpiryReportDays(this.value)" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary);padding:8px 12px;border-radius:8px;font-size:13px">
        <option value="30">30 days</option>
        <option value="60">60 days</option>
        <option value="90" selected>90 days</option>
        <option value="180">180 days</option>
      </select>
      <button class="btn btn-secondary btn-sm" onclick="downloadCsv(API.expiryCsv(document.getElementById('expiry-days')?.value||90))">
        <i data-lucide="download"></i> Export
      </button>
    </div>
    <div id="expiry-content"><div class="loading-center"><div class="spinner"></div></div></div>`;
  lucide.createIcons();
  loadExpiryReportDays(90);
}

async function loadExpiryReportDays(days) {
  const el = document.getElementById('expiry-content');
  try {
    const data = await API.getExpiryReport(days);
    if (!data || data.length === 0) {
      el.innerHTML = `<div class="empty-state"><i data-lucide="check-circle"></i><h3>No expiry alerts</h3><p>All batches are within safe expiry range</p></div>`;
      lucide.createIcons(); return;
    }
    el.innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Medicine</th><th>Batch No</th><th>Expiry Date</th><th>Days Left</th><th>Qty</th><th>Status</th></tr></thead>
      <tbody>${data.map(r => {
        const badge = r.status === 'expired' ? 'badge-danger' : r.status === 'critical' ? 'badge-danger' : 'badge-warning';
        const label = r.status === 'expired' ? 'EXPIRED' : r.status === 'critical' ? `${r.days_left}d` : `${r.days_left}d`;
        return `<tr>
          <td><b>${r.medicine_name}</b></td>
          <td><code style="background:var(--bg-input);padding:2px 6px;border-radius:4px;font-size:12px">${r.batch_no}</code></td>
          <td>${r.expiry_date}</td>
          <td>${r.days_left < 0 ? '<span class="text-danger">'+r.days_left+' days</span>' : r.days_left+' days'}</td>
          <td>${r.qty_available}</td>
          <td><span class="badge ${badge}">${label}</span></td>
        </tr>`;
      }).join('')}
      </tbody></table></div>`;
  } catch {
    el.innerHTML = '<p class="text-muted" style="padding:16px">Failed to load</p>';
  }
  lucide.createIcons();
}

async function loadSuppliers() {
  const el = document.getElementById('stock-tab-content');
  el.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;
  try {
    const suppliers = await API.getSuppliers();
    el.innerHTML = `
      <div style="margin-bottom:14px;display:flex;justify-content:flex-end">
        <button class="btn btn-primary btn-sm" onclick="openAddSupplierModal()"><i data-lucide="plus"></i> Add Supplier</button>
      </div>
      ${suppliers.length === 0 ? `<div class="empty-state"><i data-lucide="truck"></i><h3>No suppliers</h3></div>` :
      `<div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Contact Person</th><th>Phone</th><th>Email</th><th>GST No</th></tr></thead>
        <tbody>${suppliers.map(s => `
          <tr>
            <td><b>${s.name}</b></td>
            <td>${s.contact_person||'—'}</td>
            <td>${s.phone||'—'}</td>
            <td>${s.email||'—'}</td>
            <td>${s.gst_no||'—'}</td>
          </tr>`).join('')}
        </tbody></table></div>`}`;
  } catch { el.innerHTML = '<p class="text-muted" style="padding:16px">Failed to load</p>'; }
  lucide.createIcons();
}

function openAddSupplierModal() {
  openModal('Add Supplier', `
    <form id="supplier-form" class="form-grid">
      <div class="field col-span-2"><label>Supplier Name <span class="req">*</span></label>
        <input name="name" required placeholder="e.g. Sun Pharma Distributors"/></div>
      <div class="field"><label>Contact Person</label><input name="contact_person" placeholder="Full name"/></div>
      <div class="field"><label>Phone</label><input name="phone" placeholder="+91 98765 43210"/></div>
      <div class="field"><label>Email</label><input type="email" name="email" placeholder="contact@supplier.com"/></div>
      <div class="field"><label>GST Number</label><input name="gst_no" placeholder="GST registration no"/></div>
      <div class="field col-span-2"><label>Address</label>
        <textarea name="address" rows="2" placeholder="Full address…"></textarea></div>
    </form>`, [
    { label: 'Cancel', cls: 'btn-secondary', action: closeModal },
    { label: 'Add Supplier', cls: 'btn-primary', action: async () => {
      const form = document.getElementById('supplier-form');
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const data = Object.fromEntries(new FormData(form));
      try { await API.createSupplier(data); closeModal(); showToast('Supplier added', 'success'); loadSuppliers(); }
      catch (err) { showToast(err.message, 'error'); }
    }},
  ]);
}

function openAdjustStockModal(batchId, medicineName, currentQty) {
  openModal(`Adjust Stock — ${medicineName}`, `
    <div style="margin-bottom:16px">
      <p class="text-secondary" style="font-size:13px">Current quantity: <b style="color:var(--text-primary)">${currentQty}</b></p>
    </div>
    <form id="adjust-form" class="form-grid col-1">
      <div class="field"><label>Change (+add / -deduct) <span class="req">*</span></label>
        <input type="number" name="qty_change" required placeholder="e.g. 50 or -5"/></div>
      <div class="field"><label>Reason</label>
        <select name="reason">
          <option>Manual adjustment</option>
          <option>Damaged goods</option>
          <option>Inventory correction</option>
          <option>Return to supplier</option>
        </select></div>
    </form>`, [
    { label: 'Cancel', cls: 'btn-secondary', action: closeModal },
    { label: 'Adjust', cls: 'btn-primary', action: async () => {
      const form = document.getElementById('adjust-form');
      const qty = parseInt(form.querySelector('[name=qty_change]').value);
      const reason = form.querySelector('[name=reason]').value;
      try {
        await API.adjustStock(batchId, qty, reason);
        closeModal(); showToast('Stock adjusted', 'success'); loadStockBatches();
      } catch (err) { showToast(err.message, 'error'); }
    }},
  ]);
}

function escHtml2(str) { return String(str||'').replace(/'/g, "\\'"); }
