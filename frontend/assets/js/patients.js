/* ═══════════════════════════════════════════════════════
   patients.js — Patient management page
═══════════════════════════════════════════════════════════ */

async function renderPatients() {
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">Patients</h2><p class="page-subtitle">Manage patient records</p></div>
      <button class="btn btn-primary" onclick="openPatientModal()"><i data-lucide="user-plus"></i> Add Patient</button>
    </div>
    <div class="filter-row">
      <div class="search-wrap">
        <i data-lucide="search" class="search-icon"></i>
        <input type="text" id="pat-search" placeholder="Search by name or phone…" oninput="loadPatients(this.value)"/>
      </div>
    </div>
    <div id="patients-container"><div class="loading-center"><div class="spinner"></div></div></div>
  `;
  lucide.createIcons();
  loadPatients();
}

let patTimer;
async function loadPatients(search = '') {
  clearTimeout(patTimer);
  patTimer = setTimeout(async () => {
    const el = document.getElementById('patients-container');
    if (!el) return;
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    try {
      const patients = await API.getPatients(params);
      if (!patients || patients.length === 0) {
        el.innerHTML = `<div class="empty-state"><i data-lucide="users"></i><h3>No patients found</h3><p>Add your first patient record</p></div>`;
        lucide.createIcons(); return;
      }
      el.innerHTML = `<div class="table-wrap"><table>
        <thead><tr><th>Name</th><th>Age/Gender</th><th>Phone</th><th>Blood Group</th><th>Allergies</th><th>Registered</th><th>Actions</th></tr></thead>
        <tbody>${patients.map(p => `
          <tr>
            <td><b style="cursor:pointer;color:var(--primary-light)" onclick="viewPatient(${p.id})">${p.name}</b></td>
            <td>${p.age ? p.age + 'y' : '—'} ${p.gender ? '/ '+p.gender : ''}</td>
            <td>${p.phone||'—'}</td>
            <td>${p.blood_group ? `<span class="badge badge-danger">${p.blood_group}</span>` : '—'}</td>
            <td>${p.allergies ? `<span class="text-warning text-sm" title="${p.allergies}">⚠ ${p.allergies.slice(0,20)}${p.allergies.length>20?'…':''}</span>` : '—'}</td>
            <td class="text-muted text-sm">${new Date(p.created_at).toLocaleDateString('en-IN')}</td>
            <td>
              <div class="flex gap-10">
                <button class="btn btn-secondary btn-sm" onclick="viewPatient(${p.id})"><i data-lucide="eye"></i></button>
                <button class="btn btn-ghost btn-sm" onclick="openPatientModal(${p.id})"><i data-lucide="edit-2"></i></button>
                <button class="btn btn-danger btn-sm" onclick="deletePatient(${p.id},'${escSq(p.name)}')"><i data-lucide="trash-2"></i></button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody></table></div>`;
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i><h3>Error</h3><p>${err.message}</p></div>`;
    }
    lucide.createIcons();
  }, 200);
}

function patientFormHTML(p = {}) {
  return `
  <form id="pat-form" class="form-grid">
    <div class="field"><label>Full Name <span class="req">*</span></label>
      <input name="name" required value="${p.name||''}" placeholder="Patient full name"/></div>
    <div class="field"><label>Phone</label>
      <input name="phone" value="${p.phone||''}" placeholder="+91 XXXXX XXXXX"/></div>
    <div class="field"><label>Age</label>
      <input type="number" name="age" value="${p.age||''}" placeholder="Age" min="0" max="150"/></div>
    <div class="field"><label>Gender</label>
      <select name="gender">
        <option value="">Select gender</option>
        ${['Male','Female','Other'].map(g => `<option ${p.gender===g?'selected':''}>${g}</option>`).join('')}
      </select></div>
    <div class="field"><label>Email</label>
      <input type="email" name="email" value="${p.email||''}" placeholder="patient@example.com"/></div>
    <div class="field"><label>Blood Group</label>
      <select name="blood_group">
        <option value="">Select blood group</option>
        ${['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => `<option ${p.blood_group===g?'selected':''}>${g}</option>`).join('')}
      </select></div>
    <div class="field col-span-2"><label>Address</label>
      <textarea name="address" rows="2" placeholder="Full address…">${p.address||''}</textarea></div>
    <div class="field col-span-2"><label>Allergies</label>
      <input name="allergies" value="${p.allergies||''}" placeholder="e.g. Penicillin, Sulfa drugs…"/></div>
    <div class="field col-span-2"><label>Medical History</label>
      <textarea name="medical_history" rows="3" placeholder="Chronic conditions, past surgeries…">${p.medical_history||''}</textarea></div>
  </form>`;
}

function openPatientModal(id = null) {
  if (id) {
    API.getPatient(id).then(p => {
      openModal('Edit Patient', patientFormHTML(p), [
        { label: 'Cancel', cls: 'btn-secondary', action: closeModal },
        { label: 'Save', cls: 'btn-primary', action: () => submitPatient(id) },
      ]);
    }).catch(() => showToast('Failed to load', 'error'));
  } else {
    openModal('Add Patient', patientFormHTML(), [
      { label: 'Cancel', cls: 'btn-secondary', action: closeModal },
      { label: 'Add Patient', cls: 'btn-primary', action: () => submitPatient(null) },
    ]);
  }
}

async function submitPatient(id = null) {
  const form = document.getElementById('pat-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = Object.fromEntries(new FormData(form));
  if (data.age) data.age = parseInt(data.age);
  else delete data.age;
  if (!data.gender) delete data.gender;
  if (!data.blood_group) delete data.blood_group;

  try {
    if (id) await API.updatePatient(id, data);
    else await API.createPatient(data);
    closeModal();
    showToast(id ? 'Patient updated' : 'Patient added', 'success');
    loadPatients();
  } catch (err) { showToast(err.message, 'error'); }
}

async function viewPatient(id) {
  const [patient, appts, bills] = await Promise.all([
    API.getPatient(id),
    API.getPatientAppts(id).catch(() => []),
    API.getPatientBills(id).catch(() => []),
  ]);

  openModal(`Patient — ${patient.name}`, `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      <div>
        <div class="text-muted text-sm">Phone</div><div>${patient.phone||'—'}</div>
      </div>
      <div>
        <div class="text-muted text-sm">Age / Gender</div>
        <div>${patient.age ? patient.age+'y' : '—'} ${patient.gender ? '/ '+patient.gender : ''}</div>
      </div>
      <div>
        <div class="text-muted text-sm">Blood Group</div>
        <div>${patient.blood_group ? `<span class="badge badge-danger">${patient.blood_group}</span>` : '—'}</div>
      </div>
      <div>
        <div class="text-muted text-sm">Email</div><div>${patient.email||'—'}</div>
      </div>
      ${patient.allergies ? `<div class="col-span-2"><div class="text-muted text-sm">⚠ Allergies</div><div style="color:var(--warning-light)">${patient.allergies}</div></div>` : ''}
      ${patient.medical_history ? `<div class="col-span-2"><div class="text-muted text-sm">Medical History</div><div>${patient.medical_history}</div></div>` : ''}
    </div>
    <div class="tabs">
      <button class="tab-btn active" onclick="switchPatTab(this,'pat-appts')">Appointments (${appts.length})</button>
      <button class="tab-btn" onclick="switchPatTab(this,'pat-bills')">Bills (${bills.length})</button>
    </div>
    <div id="pat-appts">
      ${appts.length === 0 ? '<p class="text-muted" style="padding:12px">No appointments</p>' :
        `<div class="table-wrap"><table><thead><tr><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
        <tbody>${appts.map(a => `<tr>
          <td>Dr. ${a.doctor_name}<br><span class="text-muted text-sm">${a.doctor_specialization||''}</span></td>
          <td>${a.appointment_date}</td><td>${a.appointment_time}</td>
          <td><span class="badge ${a.status==='Scheduled'?'badge-primary':a.status==='Completed'?'badge-success':'badge-danger'}">${a.status}</span></td>
        </tr>`).join('')}</tbody></table></div>`}
    </div>
    <div id="pat-bills" class="hidden">
      ${bills.length === 0 ? '<p class="text-muted" style="padding:12px">No bills</p>' :
        `<div class="table-wrap"><table><thead><tr><th>Bill No</th><th>Total</th><th>Date</th></tr></thead>
        <tbody>${bills.map(b => `<tr><td>${b.bill_no}</td><td>₹${b.total_amount}</td><td>${new Date(b.created_at).toLocaleDateString()}</td></tr>`).join('')}
        </tbody></table></div>`}
    </div>
  `, [{ label: 'Close', cls: 'btn-secondary', action: closeModal }], 'modal-lg');
}

function switchPatTab(btn, tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ['pat-appts','pat-bills'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', id !== tabId);
  });
}

async function deletePatient(id, name) {
  if (!confirm(`Remove patient "${name}"?`)) return;
  try { await API.deletePatient(id); showToast('Patient removed', 'success'); loadPatients(); }
  catch (err) { showToast(err.message, 'error'); }
}
