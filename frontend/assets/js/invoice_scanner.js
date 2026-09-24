/* ═══════════════════════════════════════════════════════
   invoice_scanner.js — AI-powered invoice scanning
   Scan supplier bills → auto-populate medicines & stock
═══════════════════════════════════════════════════════════ */

let _scannedItems = [];   // holds the parsed items for editing

async function renderInvoiceScanner() {
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h2 class="page-title">📸 AI Invoice Scanner</h2>
        <p class="page-subtitle">Scan supplier bills to auto-add medicines & stock in seconds</p>
      </div>
    </div>

    <!-- ── Gemini Key Notice ── -->
    <div id="scanner-key-notice" class="scanner-key-banner hidden">
      <i data-lucide="key"></i>
      <span>Gemini API key not configured. <a href="#" onclick="APP.navigate('settings')">Go to Settings → AI Scanner</a> to add it, or enter below:</span>
      <div class="scanner-key-inline">
        <input type="password" id="inline-api-key" placeholder="AIzaSy... paste your Gemini key" />
      </div>
    </div>

    <!-- ── Upload Zone ── -->
    <div class="scanner-upload-card" id="scanner-upload-card">
      <div class="scanner-drop-zone" id="scanner-drop-zone"
           ondragover="event.preventDefault(); this.classList.add('drag-over')"
           ondragleave="this.classList.remove('drag-over')"
           ondrop="handleInvoiceDrop(event)">
        <div class="scanner-drop-icon">
          <i data-lucide="scan-line"></i>
        </div>
        <h3>Drop supplier invoice here</h3>
        <p>or use the buttons below</p>
        <div class="scanner-btn-group">
          <label class="btn btn-primary scanner-upload-btn" for="invoice-file-input">
            <i data-lucide="upload"></i> Choose Photo / PDF
          </label>
          <input type="file" id="invoice-file-input" accept="image/*" hidden onchange="handleInvoiceFileSelect(this)">
          <button class="btn btn-secondary" onclick="openCamera()">
            <i data-lucide="camera"></i> Use Camera
          </button>
        </div>
        <p class="scanner-hint">Supports JPEG, PNG, WebP · Max 20MB</p>
      </div>

      <!-- Camera view (hidden by default) -->
      <div id="camera-container" class="camera-container hidden">
        <video id="camera-video" autoplay playsinline></video>
        <div class="camera-controls">
          <button class="btn btn-primary btn-lg" onclick="capturePhoto()">
            <i data-lucide="aperture"></i> Capture
          </button>
          <button class="btn btn-secondary" onclick="closeCamera()">
            <i data-lucide="x"></i> Cancel
          </button>
        </div>
        <canvas id="camera-canvas" class="hidden"></canvas>
      </div>

      <!-- Preview of selected image -->
      <div id="invoice-preview" class="invoice-preview hidden">
        <img id="invoice-preview-img" src="" alt="Invoice preview">
        <div class="invoice-preview-actions">
          <button class="btn btn-primary btn-lg" id="scan-btn" onclick="runAIScan()">
            <i data-lucide="sparkles"></i>
            <span id="scan-btn-text">Scan with AI</span>
            <div id="scan-spinner" class="btn-spinner hidden"></div>
          </button>
          <button class="btn btn-secondary" onclick="clearInvoice()">
            <i data-lucide="trash-2"></i> Clear
          </button>
        </div>
      </div>
    </div>

    <!-- ── Scanned Results Table (hidden until scan runs) ── -->
    <div id="scanner-results" class="hidden">
      <div class="scanner-results-header">
        <div>
          <h3 id="scanner-results-title">Scanned Items</h3>
          <p id="scanner-results-subtitle" class="page-subtitle"></p>
        </div>
        <div class="flex gap-10">
          <button class="btn btn-secondary btn-sm" onclick="addManualRow()">
            <i data-lucide="plus"></i> Add Row
          </button>
          <button class="btn btn-primary" id="import-all-btn" onclick="importAllItems()">
            <i data-lucide="database"></i>
            <span id="import-btn-text">Import All to System</span>
            <div id="import-spinner" class="btn-spinner hidden"></div>
          </button>
        </div>
      </div>

      <div class="scanner-legend">
        <span class="badge badge-new">🆕 New Medicine</span> will be created &nbsp;|&nbsp;
        <span class="badge badge-existing">✅ Exists</span> stock batch will be added
      </div>

      <div class="table-wrap" id="scanned-table-wrap">
        <!-- table rendered here -->
      </div>
    </div>
  `;
  lucide.createIcons();

  // Key is built-in — no warning needed
}

// ─── File / Drop handlers ────────────────────────────────────────────────────

function handleInvoiceFileSelect(input) {
  if (input.files && input.files[0]) {
    showInvoicePreview(input.files[0]);
  }
}

function handleInvoiceDrop(event) {
  event.preventDefault();
  document.getElementById('scanner-drop-zone').classList.remove('drag-over');
  const file = event.dataTransfer.files[0];
  if (file) showInvoicePreview(file);
}

function showInvoicePreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('invoice-preview-img').src = e.target.result;
    document.getElementById('invoice-preview').classList.remove('hidden');
    document.getElementById('scanner-drop-zone').classList.add('hidden');
    document.getElementById('camera-container').classList.add('hidden');
  };
  reader.readAsDataURL(file);
  // Store file reference
  window._invoiceFile = file;
}

function clearInvoice() {
  window._invoiceFile = null;
  _scannedItems = [];
  document.getElementById('invoice-preview').classList.add('hidden');
  document.getElementById('scanner-drop-zone').classList.remove('hidden');
  document.getElementById('scanner-results').classList.add('hidden');
  document.getElementById('invoice-file-input').value = '';
}

// ─── Camera ─────────────────────────────────────────────────────────────────

let _cameraStream = null;

async function openCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
    });
    _cameraStream = stream;
    const video = document.getElementById('camera-video');
    video.srcObject = stream;
    document.getElementById('camera-container').classList.remove('hidden');
    document.getElementById('scanner-drop-zone').classList.add('hidden');
  } catch (err) {
    showToast('Camera access denied or not available', 'error');
  }
}

function capturePhoto() {
  const video = document.getElementById('camera-video');
  const canvas = document.getElementById('camera-canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  canvas.toBlob(blob => {
    const file = new File([blob], 'invoice-capture.jpg', { type: 'image/jpeg' });
    closeCamera();
    showInvoicePreview(file);
  }, 'image/jpeg', 0.92);
}

function closeCamera() {
  if (_cameraStream) {
    _cameraStream.getTracks().forEach(t => t.stop());
    _cameraStream = null;
  }
  document.getElementById('camera-container').classList.add('hidden');
  document.getElementById('scanner-drop-zone').classList.remove('hidden');
}

// ─── AI Scan ─────────────────────────────────────────────────────────────────

async function runAIScan() {
  if (!window._invoiceFile) {
    showToast('Please select an invoice image first', 'error');
    return;
  }

  const btn = document.getElementById('scan-btn');
  const btnText = document.getElementById('scan-btn-text');
  const spinner = document.getElementById('scan-spinner');

  btn.disabled = true;
  btnText.textContent = 'Scanning…';
  spinner.classList.remove('hidden');

  try {
    const formData = new FormData();
    formData.append('image', window._invoiceFile);

    // Include inline API key if user entered one
    const inlineKey = document.getElementById('inline-api-key')?.value?.trim();
    if (inlineKey) formData.append('gemini_api_key', inlineKey);

    const result = await API.scanInvoice(formData);
    _scannedItems = result.items || [];

    if (_scannedItems.length === 0) {
      showToast('No medicine items detected. Try a clearer photo.', 'warning');
      return;
    }

    showToast(`✅ Detected ${_scannedItems.length} items from invoice!`, 'success');
    renderScannedTable();

  } catch (err) {
    showToast(`Scan failed: ${err.message}`, 'error');
    console.error(err);
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Scan with AI';
    spinner.classList.add('hidden');
  }
}

// ─── Results Table ───────────────────────────────────────────────────────────

function renderScannedTable() {
  const resultsDiv = document.getElementById('scanner-results');
  resultsDiv.classList.remove('hidden');

  const newCount = _scannedItems.filter(i => i.is_new_medicine).length;
  const existCount = _scannedItems.length - newCount;

  document.getElementById('scanner-results-title').textContent = `${_scannedItems.length} Items Detected`;
  document.getElementById('scanner-results-subtitle').textContent =
    `${newCount} new medicines to create · ${existCount} existing (stock will be added)`;

  const categories = ['Tablet','Capsule','Syrup','Injection','Drops','Ointment','Powder','Inhaler','Other'];
  const catOptions = categories.map(c => `<option value="${c}">${c}</option>`).join('');

  const rows = _scannedItems.map((item, idx) => {
    const isNew = item.is_new_medicine;
    return `
      <tr class="${isNew ? 'row-new-medicine' : 'row-existing-medicine'}" id="scan-row-${idx}">
        <td>
          <span class="badge ${isNew ? 'badge-new' : 'badge-existing'}" title="${isNew ? 'Will create new medicine' : 'Exists: ' + (item.existing_medicine_name||'')}">
            ${isNew ? '🆕 New' : '✅ Exists'}
          </span>
        </td>
        <td>
          <input class="scan-input scan-input-name" data-idx="${idx}" data-field="name"
            value="${escHtml(item.name)}" placeholder="Medicine name" />
          <input class="scan-input scan-input-generic" data-idx="${idx}" data-field="generic_name"
            value="${escHtml(item.generic_name||'')}" placeholder="Generic / Salt name" />
        </td>
        <td>
          <select class="scan-select" data-idx="${idx}" data-field="category" onchange="updateScannedField(this)">
            ${categories.map(c => `<option value="${c}" ${item.category===c?'selected':''}>${c}</option>`).join('')}
          </select>
        </td>
        <td>
          <input class="scan-input scan-input-sm" data-idx="${idx}" data-field="manufacturer"
            value="${escHtml(item.manufacturer||'')}" placeholder="Manufacturer" />
        </td>
        <td>
          <input class="scan-input scan-input-sm" data-idx="${idx}" data-field="batch_no"
            value="${escHtml(item.batch_no||'')}" placeholder="Batch No" />
        </td>
        <td>
          <input class="scan-input scan-input-sm" type="date" data-idx="${idx}" data-field="expiry_date"
            value="${item.expiry_date||''}" />
        </td>
        <td>
          <input class="scan-input scan-input-xs" type="number" min="1" data-idx="${idx}" data-field="qty"
            value="${item.qty||0}" />
        </td>
        <td>
          <input class="scan-input scan-input-xs" type="number" min="0" step="0.01" data-idx="${idx}" data-field="purchase_price_total"
            value="${(item.purchase_price_total||0).toFixed(2)}" />
        </td>
        <td>
          <input class="scan-input scan-input-xs" type="number" min="0" step="0.01" data-idx="${idx}" data-field="selling_price_per_unit"
            value="${(item.selling_price_per_unit||0).toFixed(2)}" />
        </td>
        <td>
          <input class="scan-input scan-input-xs" type="number" min="0" step="1" data-idx="${idx}" data-field="gst_percent"
            value="${item.gst_percent||12}" />
        </td>
        <td>
          <button class="btn btn-icon btn-danger-ghost" onclick="removeScannedRow(${idx})" title="Remove">
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  document.getElementById('scanned-table-wrap').innerHTML = `
    <table class="scanned-table">
      <thead>
        <tr>
          <th style="width:80px">Status</th>
          <th style="min-width:200px">Medicine / Generic Name</th>
          <th style="width:110px">Category</th>
          <th style="width:120px">Manufacturer</th>
          <th style="width:110px">Batch No</th>
          <th style="width:130px">Expiry</th>
          <th style="width:70px">Qty</th>
          <th style="width:100px">Purchase Total (₹)</th>
          <th style="width:100px">Selling/Unit (₹)</th>
          <th style="width:60px">GST%</th>
          <th style="width:50px"></th>
        </tr>
      </thead>
      <tbody id="scanned-tbody">
        ${rows}
      </tbody>
    </table>
  `;

  // Attach oninput to all scan inputs
  document.querySelectorAll('.scan-input').forEach(input => {
    input.addEventListener('change', () => updateScannedField(input));
    input.addEventListener('input', () => updateScannedField(input));
  });

  lucide.createIcons();
}

function updateScannedField(el) {
  const idx = parseInt(el.dataset.idx);
  const field = el.dataset.field;
  if (_scannedItems[idx] !== undefined) {
    const val = el.type === 'number' ? (parseFloat(el.value) || 0) : el.value;
    _scannedItems[idx][field] = val;
  }
}

function removeScannedRow(idx) {
  _scannedItems.splice(idx, 1);
  renderScannedTable();
}

function addManualRow() {
  _scannedItems.push({
    name: '',
    generic_name: '',
    manufacturer: '',
    batch_no: '',
    hsn_code: '',
    expiry_date: '',
    qty: 1,
    unit: 'Strip',
    purchase_price_total: 0,
    selling_price_per_unit: 0,
    category: 'Tablet',
    gst_percent: 12,
    is_new_medicine: true,
    existing_medicine_id: null,
  });
  renderScannedTable();
  // Scroll to last row
  setTimeout(() => {
    const tbody = document.getElementById('scanned-tbody');
    if (tbody) tbody.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

// ─── Import ──────────────────────────────────────────────────────────────────

async function importAllItems() {
  // Collect latest values from inputs
  document.querySelectorAll('.scan-input, .scan-select').forEach(el => updateScannedField(el));

  const validItems = _scannedItems.filter(item => item.name && item.name.trim());
  if (validItems.length === 0) {
    showToast('No valid items to import', 'error');
    return;
  }

  const btn = document.getElementById('import-all-btn');
  const btnText = document.getElementById('import-btn-text');
  const spinner = document.getElementById('import-spinner');

  btn.disabled = true;
  btnText.textContent = 'Importing…';
  spinner.classList.remove('hidden');

  try {
    const result = await API.importInvoiceItems(validItems);

    showToast(
      `✅ Done! ${result.new_medicines} new medicines created · ${result.stock_updated} stock batches added`,
      'success'
    );

    // Show result summary
    document.getElementById('scanner-results').innerHTML = `
      <div class="import-success-card">
        <div class="import-success-icon"><i data-lucide="check-circle"></i></div>
        <h3>Import Complete!</h3>
        <div class="import-stats">
          <div class="import-stat">
            <span class="import-stat-value">${result.new_medicines}</span>
            <span class="import-stat-label">New Medicines Created</span>
          </div>
          <div class="import-stat">
            <span class="import-stat-value">${result.stock_updated}</span>
            <span class="import-stat-label">Stock Batches Added</span>
          </div>
          <div class="import-stat">
            <span class="import-stat-value">${result.total}</span>
            <span class="import-stat-label">Total Processed</span>
          </div>
        </div>
        <div class="import-actions">
          <button class="btn btn-primary" onclick="clearInvoice(); renderInvoiceScanner()">
            <i data-lucide="scan-line"></i> Scan Another Invoice
          </button>
          <button class="btn btn-secondary" onclick="APP.navigate('stock')">
            <i data-lucide="package"></i> View Stock
          </button>
          <button class="btn btn-secondary" onclick="APP.navigate('medicines')">
            <i data-lucide="pill"></i> View Medicines
          </button>
        </div>
      </div>
    `;
    lucide.createIcons();

  } catch (err) {
    showToast(`Import failed: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btnText.textContent = 'Import All to System';
    spinner.classList.add('hidden');
  }
}

// helper already in main scope: escHtml
