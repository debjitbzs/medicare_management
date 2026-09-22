/* ═══════════════════════════════════════════════════════
   medicines.js — Medicine management page
═══════════════════════════════════════════════════════════ */

const CATEGORIES = ['Tablet','Capsule','Syrup','Injection','Drops','Ointment','Powder','Inhaler','Other'];
const CAT_COLORS = {
  Tablet:'badge-primary', Capsule:'badge-accent', Syrup:'badge-success',
  Injection:'badge-danger', Drops:'badge-info', Ointment:'badge-warning',
  Powder:'badge-muted', Inhaler:'badge-warning', Other:'badge-muted'
};

let medViewMode = 'grid'; // 'grid' | 'table'
let medSearch = '';
let medCategoryFilter = '';
let medLowStockFilter = false;

async function renderMedicines() {
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">Medicines</h2>
        <p class="page-subtitle">Manage your medicine catalog</p>
      </div>
      <button class="btn btn-primary" onclick="openAddMedicineModal()">
        <i data-lucide="plus"></i> Add Medicine
      </button>
    </div>

    <div class="filter-row">
      <div class="search-wrap">
        <i data-lucide="search" class="search-icon"></i>
        <input type="text" id="med-search" placeholder="Search medicines…" value="${medSearch}" oninput="onMedSearch(this.value)" />
      </div>
      <select id="med-cat-filter" onchange="onMedCatFilter(this.value)" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary);padding:9px 12px;border-radius:8px;font-size:13px">
        <option value="">All Categories</option>
        ${CATEGORIES.map(c => `<option value="${c}" ${medCategoryFilter===c?'selected':''}>${c}</option>`).join('')}
      </select>
      <label class="flex items-center gap-10" style="cursor:pointer;font-size:13px;color:var(--text-secondary)">
        <input type="checkbox" id="med-low-stock" ${medLowStockFilter?'checked':''} onchange="onMedLowStock(this.checked)" />
        Low Stock Only
      </label>
      <div style="margin-left:auto;display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm btn-icon ${medViewMode==='grid'?'active':''}" onclick="setMedView('grid')" title="Grid view"><i data-lucide="layout-grid"></i></button>
        <button class="btn btn-ghost btn-sm btn-icon ${medViewMode==='table'?'active':''}" onclick="setMedView('table')" title="Table view"><i data-lucide="list"></i></button>
      </div>
    </div>

    <div id="med-list-container"><div class="loading-center"><div class="spinner"></div></div></div>
  `;
  lucide.createIcons();
  await loadMedicineList();
}

let medSearchTimer;
function onMedSearch(val) { medSearch = val; clearTimeout(medSearchTimer); medSearchTimer = setTimeout(loadMedicineList, 300); }
function onMedCatFilter(val) { medCategoryFilter = val; loadMedicineList(); }
function onMedLowStock(val) { medLowStockFilter = val; loadMedicineList(); }
function setMedView(mode) { medViewMode = mode; renderMedicines(); }

async function loadMedicineList() {
  const el = document.getElementById('med-list-container');
  if (!el) return;
  let params = '?';
  if (medSearch) params += `search=${encodeURIComponent(medSearch)}&`;
  if (medCategoryFilter) params += `category=${encodeURIComponent(medCategoryFilter)}&`;
  if (medLowStockFilter) params += `low_stock=true&`;

  try {
    const meds = await API.getMedicines(params);
    if (!meds || meds.length === 0) {
      el.innerHTML = `<div class="empty-state"><i data-lucide="pill"></i><h3>No medicines found</h3><p>Try adjusting your filters or add a new medicine</p></div>`;
      lucide.createIcons(); return;
    }
    if (medViewMode === 'grid') {
      el.innerHTML = `<div class="med-grid">${meds.map(m => renderMedCard(m)).join('')}</div>`;
    } else {
      el.innerHTML = renderMedTable(meds);
    }
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i><h3>Error loading medicines</h3><p>${err.message}</p></div>`;
  }
  lucide.createIcons();
}

function renderMedCard(m) {
  const stockClass = m.total_stock <= 0 ? 'danger' : m.total_stock <= m.min_stock_alert ? 'warning' : 'ok';
  const stockBadge = m.total_stock <= 0 ? 'badge-danger' : m.total_stock <= m.min_stock_alert ? 'badge-warning' : 'badge-success';
  return `
  <div class="med-card">
    <div class="med-card-top">
      <span class="badge ${CAT_COLORS[m.category] || 'badge-muted'} med-cat-badge">${m.category}</span>
      ${m.requires_prescription ? '<span class="badge badge-warning" style="font-size:9px">Rx</span>' : ''}
    </div>
    <div class="med-name">${m.name}</div>
    <div class="med-generic">${m.generic_name || m.manufacturer || '—'}</div>
    <div class="med-info-row">
      <span class="text-muted text-sm">Stock</span>
      <span class="med-stock ${stockClass}">${m.total_stock} ${m.unit}s</span>
    </div>
    <div class="stock-progress" style="margin-top:6px">
      <div class="stock-bar ${stockClass === 'ok' ? 'high' : stockClass === 'warning' ? 'medium' : 'low'}"
           style="width:${Math.min(100, (m.total_stock / Math.max(m.min_stock_alert*3,1))*100)}%"></div>
    </div>
    <div class="med-info-row" style="margin-top:8px">
      <span class="text-muted text-sm">GST ${m.gst_percent}%</span>
      <span class="text-muted text-sm">${m.rack_location ? '📍 '+m.rack_location : ''}</span>
    </div>
    <div class="med-actions">
      <button class="btn btn-secondary btn-sm" onclick="openAddStockModal(${m.id},'${escHtml(m.name)}')"><i data-lucide="package-plus"></i> Stock</button>
      <button class="btn btn-ghost btn-sm" onclick="openEditMedicineModal(${m.id})"><i data-lucide="edit-2"></i></button>
      <button class="btn btn-danger btn-sm" onclick="deleteMedicine(${m.id},'${escHtml(m.name)}')"><i data-lucide="trash-2"></i></button>
    </div>
  </div>`;
}

function renderMedTable(meds) {
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>Name</th><th>Category</th><th>Manufacturer</th>
      <th>Unit</th><th>Stock</th><th>Rack</th><th>GST%</th><th>Actions</th>
    </tr></thead>
    <tbody>${meds.map(m => `
      <tr>
        <td>
          <span style="font-weight:500">${m.name}</span>
          ${m.generic_name ? `<br><span class="text-muted text-sm">${m.generic_name}</span>` : ''}
          ${m.requires_prescription ? ' <span class="badge badge-warning" style="font-size:9px">Rx</span>' : ''}
        </td>
        <td><span class="badge ${CAT_COLORS[m.category]||'badge-muted'}">${m.category}</span></td>
        <td>${m.manufacturer || '—'}</td>
        <td>${m.unit}</td>
        <td>
          <span class="${m.total_stock <= 0 ? 'text-danger font-bold' : m.total_stock <= m.min_stock_alert ? 'text-warning font-bold' : 'text-success'}">${m.total_stock}</span>
          ${m.total_stock <= m.min_stock_alert ? `<span class="badge badge-warning" style="margin-left:4px;font-size:9px">Low</span>` : ''}
        </td>
        <td>${m.rack_location || '—'}</td>
        <td>${m.gst_percent}%</td>
        <td>
          <div class="flex gap-10">
            <button class="btn btn-secondary btn-sm" onclick="openAddStockModal(${m.id},'${escHtml(m.name)}')"><i data-lucide="package-plus"></i></button>
            <button class="btn btn-ghost btn-sm" onclick="openEditMedicineModal(${m.id})"><i data-lucide="edit-2"></i></button>
            <button class="btn btn-danger btn-sm" onclick="deleteMedicine(${m.id},'${escHtml(m.name)}')"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      </tr>`).join('')}
    </tbody></table></div>`;
}

// ─── Add / Edit Medicine Modal ────────────────────────────
function medicineFormHTML(data = {}) {
  return `
  <form id="med-form" class="form-grid">
    <div class="field"><label>Medicine Name <span class="req">*</span></label>
      <input name="name" value="${data.name||''}" required placeholder="e.g. Paracetamol 500mg"/></div>
    <div class="field"><label>Generic Name</label>
      <input name="generic_name" value="${data.generic_name||''}" placeholder="e.g. Acetaminophen"/></div>
    <div class="field"><label>Category <span class="req">*</span></label>
      <select name="category" required>
        ${CATEGORIES.map(c => `<option value="${c}" ${data.category===c?'selected':''}>${c}</option>`).join('')}
      </select></div>
    <div class="field"><label>Manufacturer</label>
      <input name="manufacturer" value="${data.manufacturer||''}" placeholder="e.g. Sun Pharma"/></div>
    <div class="field"><label>HSN Code</label>
      <input name="hsn_code" value="${data.hsn_code||''}" placeholder="e.g. 3004"/></div>
    <div class="field"><label>Unit</label>
      <select name="unit">
        ${['Strip','Bottle','Vial','Tube','Sachet','Tablet','Capsule','ml','mg'].map(u=>`<option ${data.unit===u?'selected':''}>${u}</option>`).join('')}
      </select></div>
    <div class="field"><label>Rack Location</label>
      <input name="rack_location" value="${data.rack_location||''}" placeholder="e.g. A-12"/></div>
    <div class="field"><label>Min Stock Alert</label>
      <input type="number" name="min_stock_alert" value="${data.min_stock_alert||10}" min="0"/></div>
    <div class="field"><label>GST %</label>
      <select name="gst_percent">
        ${[0,5,12,18,28].map(g=>`<option value="${g}" ${data.gst_percent==g?'selected':''}>${g}%</option>`).join('')}
      </select></div>
    <div class="field"><label>Requires Prescription</label>
      <select name="requires_prescription">
        <option value="false" ${!data.requires_prescription?'selected':''}>No</option>
        <option value="true" ${data.requires_prescription?'selected':''}>Yes</option>
      </select></div>
    <div class="field col-span-2"><label>Description</label>
      <textarea name="description" rows="2" placeholder="Optional notes…">${data.description||''}</textarea></div>
  </form>`;
}

function openAddMedicineModal() {
  openModal('Add Medicine', medicineFormHTML(), [
    { label: 'Cancel', cls: 'btn-secondary', action: closeModal },
    { label: 'Add Medicine', cls: 'btn-primary', action: submitAddMedicine },
  ]);
}

async function submitAddMedicine() {
  const form = document.getElementById('med-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const fd = new FormData(form);
  const data = Object.fromEntries(fd);
  data.min_stock_alert = parseInt(data.min_stock_alert);
  data.gst_percent = parseFloat(data.gst_percent);
  data.requires_prescription = data.requires_prescription === 'true';
  try {
    await API.createMedicine(data);
    closeModal();
    showToast('Medicine added successfully', 'success');
    loadMedicineList();
  } catch (err) { showToast(err.message, 'error'); }
}

async function openEditMedicineModal(id) {
  const m = await API.getMedicine(id).catch(() => null);
  if (!m) { showToast('Failed to load medicine', 'error'); return; }
  openModal('Edit Medicine', medicineFormHTML(m), [
    { label: 'Cancel', cls: 'btn-secondary', action: closeModal },
    { label: 'Save Changes', cls: 'btn-primary', action: () => submitEditMedicine(id) },
  ]);
}

async function submitEditMedicine(id) {
  const form = document.getElementById('med-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const fd = new FormData(form);
  const data = Object.fromEntries(fd);
  data.min_stock_alert = parseInt(data.min_stock_alert);
  data.gst_percent = parseFloat(data.gst_percent);
  data.requires_prescription = data.requires_prescription === 'true';
  try {
    await API.updateMedicine(id, data);
    closeModal();
    showToast('Medicine updated', 'success');
    loadMedicineList();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteMedicine(id, name) {
  if (!confirm(`Delete medicine "${name}"?`)) return;
  try {
    await API.deleteMedicine(id);
    showToast('Medicine removed', 'success');
    loadMedicineList();
  } catch (err) { showToast(err.message, 'error'); }
}

// ─── Add Stock Modal ──────────────────────────────────────
async function openAddStockModal(medicineId, medicineName) {
  const suppliers = await API.getSuppliers().catch(() => []);
  const today = new Date().toISOString().split('T')[0];
  openModal(`Add Stock — ${medicineName}`, `
    <form id="stock-form" class="form-grid">
      <div class="field"><label>Batch Number <span class="req">*</span></label>
        <input name="batch_no" required placeholder="e.g. BT2024001"/></div>
      <div class="field"><label>Expiry Date <span class="req">*</span></label>
        <input type="date" name="expiry_date" required min="${today}"/></div>
      <div class="field"><label>Purchase Date <span class="req">*</span></label>
        <input type="date" name="purchase_date" value="${today}" required/></div>
      <div class="field"><label>Supplier</label>
        <select name="supplier_id">
          <option value="">Select supplier</option>
          ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
        </select></div>
      <div class="field"><label>Qty Purchased <span class="req">*</span></label>
        <input type="number" name="qty_purchased" required min="1" placeholder="e.g. 100" oninput="calcPerUnit()"/></div>
      <div class="field"><label>Total Purchase Price (₹) <span class="req">*</span></label>
        <input type="number" name="purchase_price_total" required min="0" step="0.01" placeholder="e.g. 500" oninput="calcPerUnit()"/></div>
      <div class="field"><label>Selling Price / Unit (₹) <span class="req">*</span></label>
        <input type="number" name="selling_price_per_unit" required min="0" step="0.01" placeholder="e.g. 8.50"/></div>
      <div class="field"><label>Purchase Price / Unit</label>
        <input id="per-unit-display" readonly style="opacity:0.6" placeholder="Auto-calculated"/></div>
      <div class="field col-span-2"><label>Notes</label>
        <textarea name="notes" rows="2" placeholder="Optional…"></textarea></div>
      <input type="hidden" name="medicine_id" value="${medicineId}"/>
    </form>`,
    [
      { label: 'Cancel', cls: 'btn-secondary', action: closeModal },
      { label: 'Add to Stock', cls: 'btn-primary', action: submitAddStock },
    ]
  );
}

function calcPerUnit() {
  const qty = parseFloat(document.querySelector('[name=qty_purchased]')?.value) || 0;
  const total = parseFloat(document.querySelector('[name=purchase_price_total]')?.value) || 0;
  const display = document.getElementById('per-unit-display');
  if (display && qty > 0) display.value = '₹' + (total / qty).toFixed(4);
}

async function submitAddStock() {
  const form = document.getElementById('stock-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const fd = new FormData(form);
  const data = Object.fromEntries(fd);
  data.medicine_id = parseInt(data.medicine_id);
  data.qty_purchased = parseInt(data.qty_purchased);
  data.purchase_price_total = parseFloat(data.purchase_price_total);
  data.selling_price_per_unit = parseFloat(data.selling_price_per_unit);
  if (data.supplier_id) data.supplier_id = parseInt(data.supplier_id);
  else delete data.supplier_id;
  try {
    await API.addStockBatch(data);
    closeModal();
    showToast('Stock added successfully', 'success');
    loadMedicineList();
  } catch (err) { showToast(err.message, 'error'); }
}

function escHtml(str) {
  return String(str).replace(/['"&<>]/g, c => ({'\'':'&#39;','"':'&quot;','&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
}
