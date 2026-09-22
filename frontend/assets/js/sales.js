/* ═══════════════════════════════════════════════════════
   sales.js — POS Billing page
═══════════════════════════════════════════════════════════ */

let posCart = [];         // [{medicine, batch, qty, price, gst}]
let posAllMeds = [];      // full medicine list for search
let posPatientId = null;
let posDiscount = 0;

async function renderBilling() {
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="page-header" style="margin-bottom:14px">
      <div>
        <h2 class="page-title">Billing / POS</h2>
        <p class="page-subtitle">Create new bill</p>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="APP.navigate('bills')">
        <i data-lucide="receipt"></i> Bill History
      </button>
    </div>

    <div class="pos-layout">
      <!-- Left: Search + Results -->
      <div class="pos-left">
        <!-- Patient info bar -->
        <div class="card" style="padding:14px">
          <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
            <div class="field" style="flex:1;min-width:160px;margin:0">
              <label>Patient Name</label>
              <input id="pos-patient-name" placeholder="Walk-in customer" style="background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);padding:9px 12px;width:100%;outline:none;font-size:13px"/>
            </div>
            <div class="field" style="flex:1;min-width:140px;margin:0">
              <label>Phone</label>
              <input id="pos-patient-phone" placeholder="+91 XXXXX" style="background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);padding:9px 12px;width:100%;outline:none;font-size:13px"/>
            </div>
            <div class="field" style="width:130px;margin:0">
              <label>Discount %</label>
              <input type="number" id="pos-discount" value="0" min="0" max="100" step="0.5" onchange="posDiscount=parseFloat(this.value)||0;renderCart()" style="background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);padding:9px 12px;width:100%;outline:none;font-size:13px"/>
            </div>
            <div class="field" style="width:130px;margin:0">
              <label>Payment</label>
              <select id="pos-payment" style="background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);padding:9px 12px;width:100%;outline:none;font-size:13px">
                <option>Cash</option><option>Card</option><option>UPI</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Medicine Search -->
        <div class="pos-search-row">
          <input type="text" id="pos-search" placeholder="🔍 Search medicine by name or generic name…" oninput="posSearch(this.value)" autocomplete="off"/>
        </div>

        <!-- Results -->
        <div class="pos-results" id="pos-results">
          <div class="empty-state" style="padding:40px">
            <i data-lucide="search"></i>
            <h3>Search for a medicine</h3>
            <p>Type to search and add to bill</p>
          </div>
        </div>
      </div>

      <!-- Right: Cart + Totals -->
      <div class="pos-right">
        <div class="pos-bill-header">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h3>🧾 Bill Items</h3>
            <span id="cart-count" class="badge badge-primary">0 items</span>
          </div>
        </div>
        <div class="pos-items" id="pos-items">
          <div class="empty-state" style="padding:30px;font-size:12px">
            <i data-lucide="shopping-cart"></i>
            <p>No items added</p>
          </div>
        </div>
        <div class="pos-totals" id="pos-totals">
          <div class="total-row"><span>Subtotal</span><span id="pos-subtotal">₹0.00</span></div>
          <div class="total-row"><span>Discount</span><span id="pos-discount-amt" style="color:var(--danger-light)">-₹0.00</span></div>
          <div class="total-row"><span>CGST</span><span id="pos-cgst">₹0.00</span></div>
          <div class="total-row"><span>SGST</span><span id="pos-sgst">₹0.00</span></div>
          <div class="total-row grand"><span>Total</span><span id="pos-total" style="color:var(--success-light)">₹0.00</span></div>
          <div style="margin-top:10px;display:flex;gap:8px;align-items:center">
            <label style="font-size:12px;color:var(--text-secondary);flex-shrink:0">Amount Paid ₹</label>
            <input type="number" id="pos-amount-paid" placeholder="0.00" step="0.01" oninput="calcChange()" style="flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);padding:8px 10px;outline:none;font-size:14px;font-weight:600"/>
          </div>
          <div class="total-row" style="color:var(--accent-light);margin-top:4px">
            <span>Change</span><span id="pos-change">₹0.00</span>
          </div>
        </div>
        <div class="pos-actions">
          <button class="btn btn-danger btn-sm" onclick="clearCart()"><i data-lucide="trash-2"></i></button>
          <button class="btn btn-primary" style="flex:1" onclick="submitBill()">
            <i data-lucide="check-circle"></i> Generate Bill
          </button>
        </div>
      </div>
    </div>
  `;
  lucide.createIcons();

  // Pre-load medicines
  posAllMeds = await API.getMedicines().catch(() => []);
  posCart = [];
  posDiscount = 0;
}

let posSearchTimer;
function posSearch(val) {
  clearTimeout(posSearchTimer);
  posSearchTimer = setTimeout(() => renderPosResults(val), 200);
}

function renderPosResults(val) {
  const el = document.getElementById('pos-results');
  if (!val || val.trim().length < 1) {
    el.innerHTML = `<div class="empty-state" style="padding:40px"><i data-lucide="search"></i><h3>Search for a medicine</h3><p>Type to search and add to bill</p></div>`;
    lucide.createIcons(); return;
  }
  const q = val.toLowerCase();
  const results = posAllMeds.filter(m =>
    m.name.toLowerCase().includes(q) ||
    (m.generic_name||'').toLowerCase().includes(q)
  ).slice(0, 20);

  if (results.length === 0) {
    el.innerHTML = `<div class="empty-state" style="padding:40px"><i data-lucide="search-x"></i><h3>No results</h3><p>Try a different search term</p></div>`;
    lucide.createIcons(); return;
  }

  el.innerHTML = results.map(m => {
    // Get best batch selling price
    const inCart = posCart.find(c => c.medicine.id === m.id);
    return `<div class="pos-med-row" onclick="addToCart(${m.id})">
      <div class="pos-med-info">
        <div class="pos-med-name">${m.name} ${inCart ? `<span class="badge badge-success" style="font-size:10px">In cart: ${inCart.qty}</span>` : ''}</div>
        <div class="pos-med-detail">${m.category} · ${m.generic_name||m.manufacturer||'—'} · Stock: ${m.total_stock}</div>
      </div>
      <div style="text-align:right">
        <div class="pos-med-price">₹—</div>
        <div class="pos-med-stock">${m.unit}</div>
      </div>
    </div>`;
  }).join('');
  lucide.createIcons();
}

async function addToCart(medicineId) {
  const med = posAllMeds.find(m => m.id === medicineId);
  if (!med) return;

  if (med.total_stock <= 0) { showToast(`${med.name} is out of stock`, 'warning'); return; }

  // Fetch batch info
  const batches = await API.getMedicineBatches(medicineId).catch(() => []);
  const batch = batches.find(b => b.qty_available > 0);

  if (!batch) { showToast(`No available batch for ${med.name}`, 'warning'); return; }

  const existing = posCart.find(c => c.medicine.id === medicineId);
  if (existing) {
    if (existing.qty >= batch.qty_available) { showToast('Cannot exceed available stock', 'warning'); return; }
    existing.qty++;
  } else {
    posCart.push({
      medicine: med,
      batch: batch,
      qty: 1,
      price: batch.selling_price_per_unit,
      gst: med.gst_percent,
    });
  }
  renderCart();
  showToast(`${med.name} added`, 'success');
}

function renderCart() {
  const itemsEl = document.getElementById('pos-items');
  const countEl = document.getElementById('cart-count');
  if (!itemsEl) return;

  countEl.textContent = posCart.length + (posCart.length === 1 ? ' item' : ' items');

  if (posCart.length === 0) {
    itemsEl.innerHTML = `<div class="empty-state" style="padding:30px;font-size:12px"><i data-lucide="shopping-cart"></i><p>No items added</p></div>`;
    lucide.createIcons();
    updatePOSTotals();
    return;
  }

  itemsEl.innerHTML = posCart.map((item, idx) => `
    <div class="pos-item">
      <div class="pos-item-name">
        ${item.medicine.name}
        <span>₹${item.price.toFixed(2)} / ${item.medicine.unit} · GST ${item.gst}%</span>
      </div>
      <div class="qty-control">
        <button class="qty-btn" onclick="changeQty(${idx},-1)">−</button>
        <span class="qty-display">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${idx},1)">+</button>
      </div>
      <div class="pos-item-total">₹${(item.qty * item.price).toFixed(2)}</div>
      <button class="remove-item-btn" onclick="removeFromCart(${idx})"><i data-lucide="x"></i></button>
    </div>
  `).join('');
  lucide.createIcons();
  updatePOSTotals();
}

function changeQty(idx, delta) {
  const item = posCart[idx];
  const newQty = item.qty + delta;
  if (newQty <= 0) { posCart.splice(idx, 1); }
  else if (newQty > item.batch.qty_available) { showToast('Cannot exceed available stock', 'warning'); return; }
  else { item.qty = newQty; }
  renderCart();
}

function removeFromCart(idx) { posCart.splice(idx, 1); renderCart(); }
function clearCart() { posCart = []; posDiscount = 0; document.getElementById('pos-discount').value = 0; renderCart(); }

function updatePOSTotals() {
  let subtotal = posCart.reduce((s, i) => s + i.qty * i.price, 0);
  let cgst = posCart.reduce((s, i) => s + (i.qty * i.price * i.gst / 100) / 2, 0);
  let sgst = cgst;
  const discAmt = subtotal * posDiscount / 100;
  const total = subtotal - discAmt + cgst + sgst;

  document.getElementById('pos-subtotal').textContent   = '₹' + subtotal.toFixed(2);
  document.getElementById('pos-discount-amt').textContent = '-₹' + discAmt.toFixed(2);
  document.getElementById('pos-cgst').textContent      = '₹' + cgst.toFixed(2);
  document.getElementById('pos-sgst').textContent      = '₹' + sgst.toFixed(2);
  document.getElementById('pos-total').textContent     = '₹' + total.toFixed(2);
  calcChange();
}

function calcChange() {
  const total = parseFloat(document.getElementById('pos-total')?.textContent?.replace('₹','')) || 0;
  const paid  = parseFloat(document.getElementById('pos-amount-paid')?.value) || 0;
  const change = paid - total;
  document.getElementById('pos-change').textContent = '₹' + Math.max(0, change).toFixed(2);
}

async function submitBill() {
  if (posCart.length === 0) { showToast('Add at least one medicine', 'warning'); return; }

  const patientName  = document.getElementById('pos-patient-name')?.value.trim();
  const patientPhone = document.getElementById('pos-patient-phone')?.value.trim();
  const payment      = document.getElementById('pos-payment')?.value;
  const amountPaid   = parseFloat(document.getElementById('pos-amount-paid')?.value) || 0;

  const billData = {
    patient_name: patientName || 'Walk-in',
    patient_phone: patientPhone || null,
    payment_method: payment,
    discount_percent: posDiscount,
    amount_paid: amountPaid,
    items: posCart.map(i => ({
      medicine_id: i.medicine.id,
      batch_id: i.batch.id,
      qty_sold: i.qty,
      selling_price_per_unit: i.price,
      gst_percent: i.gst,
    })),
  };

  try {
    const bill = await API.createBill(billData);
    showToast(`Bill ${bill.bill_no} created!`, 'success');
    // Reload medicine stocks
    posAllMeds = await API.getMedicines().catch(() => []);
    // Show print view
    openBillPrint(bill);
    clearCart();
  } catch (err) {
    showToast(err.message || 'Failed to create bill', 'error');
  }
}

function openBillPrint(bill) {
  const settings = window._storeSettings || {};
  const storeName = settings.store_name || 'MediCare Pharmacy';
  const biller = bill.biller_name || AUTH.user?.full_name || AUTH.user?.username || 'Staff';

  openModal('Sale Completed — ' + bill.bill_no, `
    <div style="text-align: center; margin-bottom: 14px">
      <div style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: rgba(34, 197, 94, 0.15); color: var(--success); margin-bottom: 6px">
        <i data-lucide="check-circle-2" style="width: 24px; height: 24px"></i>
      </div>
      <h3 style="font-size: 16px; margin: 0">Bill Generated Successfully!</h3>
      <p style="font-size: 12px; color: var(--text-muted); margin: 2px 0 0">Bill #${bill.bill_no} is saved in database</p>
    </div>

    <div class="bill-print" id="print-content" style="max-height: 380px; overflow-y: auto; padding: 14px; background: rgba(0,0,0,0.25); border-radius: 8px; border: 1px solid var(--border)">
      <h2 style="text-align: center; font-size: 16px; margin: 0 0 2px">${storeName}</h2>
      ${settings.store_address ? `<p style="text-align:center;font-size:11px;color:var(--text-secondary);margin:0">${settings.store_address}</p>` : ''}
      ${settings.store_phone ? `<p style="text-align:center;font-size:11px;color:var(--text-secondary);margin:0">Ph: ${settings.store_phone}</p>` : ''}
      <div class="bill-divider" style="margin: 8px 0"></div>
      <div style="font-size: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px">
        <p style="margin:0"><b>Bill No:</b> ${bill.bill_no}</p>
        <p style="margin:0;text-align:right"><b>Date:</b> ${new Date(bill.created_at).toLocaleDateString('en-IN')}</p>
        <p style="margin:0"><b>Patient:</b> ${bill.patient_name||'Walk-in'}</p>
        <p style="margin:0;text-align:right"><b>Payment:</b> ${bill.payment_method}</p>
        <p style="margin:2px 0;grid-column: span 2; color: var(--primary-light)"><b>Billed By:</b> ${biller}</p>
      </div>
      <div class="bill-divider" style="margin: 8px 0"></div>
      <table style="width:100%;font-size:11px">
        <thead><tr><th style="text-align:left">Item</th><th>Qty</th><th>Rate</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>
          ${(bill.items||[]).map(i => `<tr>
            <td>${i.medicine_name||'Medicine'}</td>
            <td style="text-align:center">${i.qty_sold}</td>
            <td style="text-align:center">₹${i.selling_price_per_unit.toFixed(2)}</td>
            <td style="text-align:right">₹${i.line_total.toFixed(2)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="bill-divider" style="margin: 8px 0"></div>
      <p style="text-align:right;font-size:12px;margin:2px 0">Subtotal: ₹${bill.subtotal.toFixed(2)}</p>
      ${bill.discount_amount > 0 ? `<p style="text-align:right;font-size:12px;color:var(--success);margin:2px 0">Discount: -₹${bill.discount_amount.toFixed(2)}</p>` : ''}
      ${bill.cgst_amount > 0 ? `<p style="text-align:right;font-size:11px;color:var(--text-muted);margin:2px 0">CGST: ₹${bill.cgst_amount.toFixed(2)}</p>` : ''}
      ${bill.sgst_amount > 0 ? `<p style="text-align:right;font-size:11px;color:var(--text-muted);margin:2px 0">SGST: ₹${bill.sgst_amount.toFixed(2)}</p>` : ''}
      <p class="bill-total" style="text-align:right;font-size:15px;color:var(--text-primary);margin:4px 0"><b>TOTAL: ₹${bill.total_amount.toFixed(2)}</b></p>
      <p style="text-align:right;font-size:11px;color:var(--text-muted);margin:0">Paid: ₹${bill.amount_paid.toFixed(2)} | Change: ₹${bill.change_amount.toFixed(2)}</p>
    </div>
  `, [
    { label: '🖨️ Print Bill', cls: 'btn-primary', action: () => printBillReceipt(bill) },
    { label: '✕ Close', cls: 'btn-secondary', action: closeModal },
  ]);
}

function printBillReceipt(bill) {
  const settings = window._storeSettings || {};
  const storeName = settings.store_name || 'MediCare Pharmacy';
  const biller = bill.biller_name || AUTH.user?.full_name || AUTH.user?.username || 'Staff';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt — ${bill.bill_no}</title>
      <style>
        @page { size: auto; margin: 4mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 12px; margin: 0; padding: 10px; color: #000; width: 300px; margin: 0 auto; }
        h2 { margin: 0 0 4px; text-align: center; font-size: 16px; font-weight: 700; }
        p { margin: 2px 0; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .divider { border-top: 1px dashed #666; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 4px 0; }
        th { text-align: left; border-bottom: 1px solid #000; padding: 3px 0; }
        td { padding: 3px 0; }
        .total-row { font-size: 13px; font-weight: 700; }
      </style>
    </head>
    <body>
      <h2>${storeName}</h2>
      ${settings.store_address ? `<p class="text-center" style="font-size: 10px">${settings.store_address}</p>` : ''}
      ${settings.store_phone ? `<p class="text-center" style="font-size: 10px">Ph: ${settings.store_phone}</p>` : ''}
      ${settings.store_gst ? `<p class="text-center" style="font-size: 10px">GSTIN: ${settings.store_gst}</p>` : ''}
      ${settings.store_license ? `<p class="text-center" style="font-size: 10px">DL No: ${settings.store_license}</p>` : ''}
      <div class="divider"></div>
      <p><b>Bill No:</b> ${bill.bill_no}</p>
      <p><b>Date:</b> ${new Date(bill.created_at).toLocaleString('en-IN')}</p>
      <p><b>Billed By:</b> ${biller}</p>
      <p><b>Patient:</b> ${bill.patient_name || 'Walk-in'}</p>
      ${bill.patient_phone ? `<p><b>Phone:</b> ${bill.patient_phone}</p>` : ''}
      <p><b>Payment:</b> ${bill.payment_method}</p>
      <div class="divider"></div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center">Qty</th>
            <th style="text-align: right">Rate</th>
            <th style="text-align: right">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${(bill.items || []).map(i => `
            <tr>
              <td>${i.medicine_name || 'Item'}</td>
              <td style="text-align: center">${i.qty_sold}</td>
              <td style="text-align: right">₹${i.selling_price_per_unit.toFixed(2)}</td>
              <td style="text-align: right">₹${i.line_total.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="divider"></div>
      <p class="text-right">Subtotal: ₹${bill.subtotal.toFixed(2)}</p>
      ${bill.discount_amount > 0 ? `<p class="text-right">Discount: -₹${bill.discount_amount.toFixed(2)}</p>` : ''}
      ${bill.cgst_amount > 0 ? `<p class="text-right">CGST: ₹${bill.cgst_amount.toFixed(2)}</p>` : ''}
      ${bill.sgst_amount > 0 ? `<p class="text-right">SGST: ₹${bill.sgst_amount.toFixed(2)}</p>` : ''}
      <div class="divider"></div>
      <p class="text-right total-row">TOTAL: ₹${bill.total_amount.toFixed(2)}</p>
      <p class="text-right" style="font-size: 10px">Paid: ₹${bill.amount_paid.toFixed(2)} | Change: ₹${bill.change_amount.toFixed(2)}</p>
      <div class="divider"></div>
      <p class="text-center" style="font-size: 10px; margin-top: 6px">Thank you for your visit!</p>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=420,height=580');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  } else {
    window.print();
  }
}

// Bill History Page
async function renderBills() {
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">Bill History</h2><p class="page-subtitle">All sales transactions and bill records</p></div>
      <div class="flex gap-10">
        <input type="date" id="bill-start" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary);padding:8px 12px;border-radius:8px;font-size:13px;outline:none"/>
        <input type="date" id="bill-end" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary);padding:8px 12px;border-radius:8px;font-size:13px;outline:none"/>
        <button class="btn btn-secondary btn-sm" onclick="loadBillHistory()"><i data-lucide="filter"></i> Filter</button>
        <button class="btn btn-secondary btn-sm" onclick="exportBillsCsv()"><i data-lucide="download"></i> CSV</button>
      </div>
    </div>
    <div id="bills-list"><div class="loading-center"><div class="spinner"></div></div></div>
  `;
  lucide.createIcons();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('bill-start').value = today;
  document.getElementById('bill-end').value = today;
  loadBillHistory();
}

async function loadBillHistory() {
  const el = document.getElementById('bills-list');
  const start = document.getElementById('bill-start')?.value;
  const end   = document.getElementById('bill-end')?.value;
  let params  = '?';
  if (start) params += `start_date=${start}&`;
  if (end)   params += `end_date=${end}&`;

  try {
    const bills = await API.getBills(params);
    if (!bills || bills.length === 0) {
      el.innerHTML = `<div class="empty-state"><i data-lucide="receipt"></i><h3>No bills found</h3><p>Adjust date range or create a new bill</p></div>`;
      lucide.createIcons(); return;
    }

    const total = bills.reduce((s, b) => s + b.total_amount, 0);
    el.innerHTML = `
      <div class="kpi-grid" style="margin-bottom:16px;grid-template-columns:repeat(3,1fr)">
        <div class="kpi-card kpi-success"><div class="kpi-top"><span class="kpi-label">Total Revenue</span><div class="kpi-icon"><i data-lucide="indian-rupee"></i></div></div><div class="kpi-value">₹${total.toFixed(2)}</div></div>
        <div class="kpi-card kpi-primary"><div class="kpi-top"><span class="kpi-label">Bills Count</span><div class="kpi-icon"><i data-lucide="receipt"></i></div></div><div class="kpi-value">${bills.length}</div></div>
        <div class="kpi-card kpi-accent"><div class="kpi-top"><span class="kpi-label">Avg Bill Value</span><div class="kpi-icon"><i data-lucide="bar-chart-2"></i></div></div><div class="kpi-value">₹${(total/bills.length).toFixed(2)}</div></div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Bill No</th><th>Patient</th><th>Billed By</th><th>Phone</th><th>Payment</th><th>Items</th><th>Total</th><th>Date</th><th>Actions</th></tr></thead>
        <tbody>${bills.map(b => `
          <tr>
            <td><b>${b.bill_no}</b></td>
            <td>${b.patient_name||'Walk-in'}</td>
            <td><span class="badge badge-primary" style="font-size: 11px">${b.biller_name || 'Staff'}</span></td>
            <td>${b.patient_phone||'—'}</td>
            <td><span class="badge ${b.payment_method==='Cash'?'badge-success':b.payment_method==='UPI'?'badge-accent':'badge-info'}">${b.payment_method}</span></td>
            <td>${(b.items||[]).length}</td>
            <td><b>₹${b.total_amount.toFixed(2)}</b></td>
            <td>${new Date(b.created_at).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'})}</td>
            <td><button class="btn btn-ghost btn-sm" onclick="viewBill(${b.id})"><i data-lucide="eye"></i></button></td>
          </tr>`).join('')}
        </tbody></table></div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i><h3>Error</h3><p>${err.message}</p></div>`;
  }
  lucide.createIcons();
}

async function viewBill(id) {
  const bill = await API.getBill(id).catch(() => null);
  if (!bill) { showToast('Failed to load bill', 'error'); return; }
  openBillPrint(bill);
}

function exportBillsCsv() {
  const start = document.getElementById('bill-start')?.value;
  const end   = document.getElementById('bill-end')?.value;
  if (!start || !end) { showToast('Please select date range', 'warning'); return; }
  downloadCsv(API.salesCsv(start, end));
}
