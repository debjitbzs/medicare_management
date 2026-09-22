/* ═══════════════════════════════════════════════════════
   doctors.js — Doctor management page
═══════════════════════════════════════════════════════════ */

async function renderDoctors() {
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">Doctors</h2><p class="page-subtitle">Manage doctor profiles and schedules</p></div>
      <button class="btn btn-primary" onclick="openDoctorModal()"><i data-lucide="plus"></i> Add Doctor</button>
    </div>
    <div class="filter-row">
      <div class="search-wrap">
        <i data-lucide="search" class="search-icon"></i>
        <input type="text" id="doc-search" placeholder="Search doctors…" oninput="loadDoctors(this.value)"/>
      </div>
    </div>
    <div id="doctors-grid"><div class="loading-center"><div class="spinner"></div></div></div>
  `;
  lucide.createIcons();
  loadDoctors();
}

let docSearchTimer;
async function loadDoctors(search = '') {
  const el = document.getElementById('doctors-grid');
  if (!el) return;
  clearTimeout(docSearchTimer);
  docSearchTimer = setTimeout(async () => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    try {
      const docs = await API.getDoctors(params);
      if (!docs || docs.length === 0) {
        el.innerHTML = `<div class="empty-state"><i data-lucide="stethoscope"></i><h3>No doctors found</h3><p>Add your first doctor to get started</p></div>`;
        lucide.createIcons(); return;
      }
      el.innerHTML = `<div class="doctor-grid">${docs.map(d => renderDoctorCard(d)).join('')}</div>`;
    } catch (err) {
      el.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i><h3>Error</h3><p>${err.message}</p></div>`;
    }
    lucide.createIcons();
  }, 200);
}

function renderDoctorCard(d) {
  const initials = d.name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
  return `
  <div class="doctor-card">
    <div style="display:flex;align-items:flex-start;gap:14px">
      <div class="doctor-avatar">${initials}</div>
      <div style="flex:1;min-width:0">
        <div class="doctor-name">Dr. ${d.name}</div>
        <div class="doctor-spec">${d.specialization||'General Physician'}</div>
        ${d.qualification ? `<div class="text-muted text-sm">${d.qualification}</div>` : ''}
      </div>
    </div>
    <hr class="divider"/>
    <div class="doctor-info-list">
      ${d.phone ? `<div class="doctor-info-item"><i data-lucide="phone"></i>${d.phone}</div>` : ''}
      ${d.email ? `<div class="doctor-info-item"><i data-lucide="mail"></i>${d.email}</div>` : ''}
      ${d.schedule_days ? `<div class="doctor-info-item"><i data-lucide="calendar"></i>${d.schedule_days}</div>` : ''}
      ${d.schedule_time ? `<div class="doctor-info-item"><i data-lucide="clock"></i>${d.schedule_time}</div>` : ''}
      ${d.consultation_fee > 0 ? `<div class="doctor-info-item"><i data-lucide="indian-rupee"></i>₹${d.consultation_fee} consultation</div>` : ''}
      ${d.room_no ? `<div class="doctor-info-item"><i data-lucide="door-open"></i>Room: ${d.room_no}</div>` : ''}
    </div>
    <div class="doctor-actions">
      <button class="btn btn-primary btn-sm" style="flex:1" onclick="APP.navigate('appointments');setTimeout(()=>openAppointmentModal(${d.id}),300)">
        <i data-lucide="calendar-plus"></i> Book Appointment
      </button>
      <button class="btn btn-ghost btn-sm" onclick="openDoctorModal(${d.id})"><i data-lucide="edit-2"></i></button>
      <button class="btn btn-danger btn-sm" onclick="deleteDoctor(${d.id},'${escSq(d.name)}')"><i data-lucide="trash-2"></i></button>
    </div>
  </div>`;
}

function doctorFormHTML(d = {}) {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const selectedDays = (d.schedule_days||'').split(',').map(s => s.trim());
  return `
  <form id="doc-form" class="form-grid">
    <div class="field"><label>Full Name <span class="req">*</span></label>
      <input name="name" required value="${d.name||''}" placeholder="e.g. Rajesh Kumar"/></div>
    <div class="field"><label>Specialization</label>
      <select name="specialization">
        ${['Cardiologist','Dermatologist','ENT','General Physician','Gynecologist','Neurologist','Ophthalmologist','Orthopedic','Pediatrician','Psychiatrist','Pulmonologist','Urologist','Other']
          .map(s => `<option ${d.specialization===s?'selected':''}>${s}</option>`).join('')}
      </select></div>
    <div class="field"><label>Qualification</label>
      <input name="qualification" value="${d.qualification||''}" placeholder="e.g. MBBS, MD"/></div>
    <div class="field"><label>Phone</label>
      <input name="phone" value="${d.phone||''}" placeholder="+91 XXXXX XXXXX"/></div>
    <div class="field"><label>Email</label>
      <input type="email" name="email" value="${d.email||''}" placeholder="doctor@example.com"/></div>
    <div class="field"><label>Room No</label>
      <input name="room_no" value="${d.room_no||''}" placeholder="e.g. 101"/></div>
    <div class="field"><label>Consultation Fee (₹)</label>
      <input type="number" name="consultation_fee" value="${d.consultation_fee||0}" min="0" step="50"/></div>
    <div class="field"><label>Schedule Time</label>
      <input name="schedule_time" value="${d.schedule_time||''}" placeholder="e.g. 09:00-13:00"/></div>
    <div class="field col-span-2">
      <label>Available Days</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px">
        ${days.map(day => `
          <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;color:var(--text-secondary)">
            <input type="checkbox" name="schedule_days" value="${day}" ${selectedDays.includes(day)?'checked':''}/>
            ${day}
          </label>`).join('')}
      </div>
    </div>
  </form>`;
}

function openDoctorModal(id = null) {
  if (id) {
    API.getDoctor(id).then(d => {
      openModal('Edit Doctor', doctorFormHTML(d), [
        { label: 'Cancel', cls: 'btn-secondary', action: closeModal },
        { label: 'Save', cls: 'btn-primary', action: () => submitDoctor(id) },
      ]);
    }).catch(() => showToast('Failed to load', 'error'));
  } else {
    openModal('Add Doctor', doctorFormHTML(), [
      { label: 'Cancel', cls: 'btn-secondary', action: closeModal },
      { label: 'Add Doctor', cls: 'btn-primary', action: () => submitDoctor(null) },
    ]);
  }
}

async function submitDoctor(id = null) {
  const form = document.getElementById('doc-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const fd = new FormData(form);
  const data = {};
  for (const [key, val] of fd.entries()) {
    if (key === 'schedule_days') {
      if (!data.schedule_days) data.schedule_days = [];
      data.schedule_days.push(val);
    } else {
      data[key] = val;
    }
  }
  if (Array.isArray(data.schedule_days)) data.schedule_days = data.schedule_days.join(',');
  data.consultation_fee = parseFloat(data.consultation_fee) || 0;

  try {
    if (id) await API.updateDoctor(id, data);
    else await API.createDoctor(data);
    closeModal();
    showToast(id ? 'Doctor updated' : 'Doctor added', 'success');
    loadDoctors();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteDoctor(id, name) {
  if (!confirm(`Remove Dr. ${name}?`)) return;
  try {
    await API.deleteDoctor(id);
    showToast('Doctor removed', 'success');
    loadDoctors();
  } catch (err) { showToast(err.message, 'error'); }
}

function escSq(str) { return String(str||'').replace(/'/g, "\\'"); }
