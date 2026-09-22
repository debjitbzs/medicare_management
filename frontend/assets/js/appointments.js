/* ═══════════════════════════════════════════════════════
   appointments.js — Appointment scheduling page
═══════════════════════════════════════════════════════════ */

let apptDoctorFilter = '';
let apptDateFilter   = '';
let apptStatusFilter = '';

async function renderAppointments() {
  const container = document.getElementById('page-container');
  const today = new Date().toISOString().split('T')[0];
  if (!apptDateFilter) apptDateFilter = today;

  container.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">Appointments</h2><p class="page-subtitle">Schedule and manage patient appointments</p></div>
      <button class="btn btn-primary" onclick="openAppointmentModal()"><i data-lucide="calendar-plus"></i> New Appointment</button>
    </div>

    <div class="filter-row">
      <div class="search-wrap">
        <i data-lucide="calendar" class="search-icon"></i>
        <input type="date" id="appt-date-filter" value="${apptDateFilter}" onchange="apptDateFilter=this.value;loadAppointments()" style="padding-left:36px;width:180px"/>
      </div>
      <select id="appt-doc-filter" onchange="apptDoctorFilter=this.value;loadAppointments()" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary);padding:9px 12px;border-radius:8px;font-size:13px">
        <option value="">All Doctors</option>
      </select>
      <select id="appt-status-filter" onchange="apptStatusFilter=this.value;loadAppointments()" style="background:var(--bg-card);border:1px solid var(--border);color:var(--text-primary);padding:9px 12px;border-radius:8px;font-size:13px">
        <option value="">All Status</option>
        <option value="Scheduled">Scheduled</option>
        <option value="Completed">Completed</option>
        <option value="Cancelled">Cancelled</option>
        <option value="No Show">No Show</option>
      </select>
      <button class="btn btn-ghost btn-sm" onclick="apptDateFilter='';apptDoctorFilter='';apptStatusFilter='';renderAppointments()">
        <i data-lucide="x"></i> Clear
      </button>
    </div>

    <div id="appt-summary" class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px"></div>

    <div id="appts-container"><div class="loading-center"><div class="spinner"></div></div></div>
  `;
  lucide.createIcons();

  // Load doctor options
  const docs = await API.getDoctors().catch(() => []);
  const docSelect = document.getElementById('appt-doc-filter');
  docs.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = 'Dr. ' + d.name;
    if (String(d.id) === String(apptDoctorFilter)) opt.selected = true;
    docSelect.appendChild(opt);
  });

  loadAppointments();
}

async function loadAppointments() {
  const el = document.getElementById('appts-container');
  if (!el) return;
  el.innerHTML = `<div class="loading-center"><div class="spinner"></div></div>`;

  let params = '?';
  if (apptDateFilter)   params += `appt_date=${apptDateFilter}&`;
  if (apptDoctorFilter) params += `doctor_id=${apptDoctorFilter}&`;
  if (apptStatusFilter) params += `status=${encodeURIComponent(apptStatusFilter)}&`;

  try {
    const appts = await API.getAppointments(params);

    // Summary counts
    const counts = { Scheduled:0, Completed:0, Cancelled:0, 'No Show':0 };
    appts.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++; });
    const summaryEl = document.getElementById('appt-summary');
    if (summaryEl) summaryEl.innerHTML = `
      <div class="kpi-card kpi-primary"><div class="kpi-top"><span class="kpi-label">Scheduled</span><div class="kpi-icon"><i data-lucide="calendar-clock"></i></div></div><div class="kpi-value">${counts.Scheduled}</div></div>
      <div class="kpi-card kpi-success"><div class="kpi-top"><span class="kpi-label">Completed</span><div class="kpi-icon"><i data-lucide="check-circle-2"></i></div></div><div class="kpi-value">${counts.Completed}</div></div>
      <div class="kpi-card kpi-danger"><div class="kpi-top"><span class="kpi-label">Cancelled</span><div class="kpi-icon"><i data-lucide="x-circle"></i></div></div><div class="kpi-value">${counts.Cancelled}</div></div>
      <div class="kpi-card kpi-warning"><div class="kpi-top"><span class="kpi-label">No Show</span><div class="kpi-icon"><i data-lucide="user-x"></i></div></div><div class="kpi-value">${counts['No Show']}</div></div>
    `;
    lucide.createIcons();

    if (!appts || appts.length === 0) {
      el.innerHTML = `<div class="empty-state"><i data-lucide="calendar-check"></i><h3>No appointments</h3><p>Schedule a new appointment using the button above</p></div>`;
      lucide.createIcons(); return;
    }

    // Group by doctor
    const byDoc = {};
    appts.forEach(a => {
      const key = a.doctor_id;
      if (!byDoc[key]) byDoc[key] = { name: a.doctor_name, spec: a.doctor_specialization, appts: [] };
      byDoc[key].appts.push(a);
    });

    el.innerHTML = Object.values(byDoc).map(group => `
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="width:36px;height:36px;background:linear-gradient(135deg,var(--primary),var(--accent));border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700">
            ${(group.name||'?').charAt(0).toUpperCase()}
          </div>
          <div>
            <div style="font-weight:600">Dr. ${group.name}</div>
            <div class="text-muted text-sm">${group.spec||'General Physician'} · ${group.appts.length} appointment${group.appts.length>1?'s':''}</div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;padding-left:46px">
          ${group.appts.map(a => renderApptCard(a)).join('')}
        </div>
      </div>`).join('');
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><i data-lucide="alert-circle"></i><h3>Error</h3><p>${err.message}</p></div>`;
  }
  lucide.createIcons();
}

function renderApptCard(a) {
  const statusBadge = {
    Scheduled: 'badge-primary', Completed: 'badge-success',
    Cancelled: 'badge-danger', 'No Show': 'badge-warning'
  }[a.status] || 'badge-muted';

  return `
  <div class="appt-card">
    <div class="appt-token">#${a.token_no||'—'}</div>
    <div class="appt-info">
      <div class="appt-patient">${a.patient_name||'Unknown'}</div>
      ${a.reason ? `<div class="text-muted text-sm">${a.reason}</div>` : ''}
      <div class="appt-time-row">
        <span class="appt-time"><i data-lucide="clock"></i>${a.appointment_time}</span>
        <span class="appt-time"><i data-lucide="calendar"></i>${a.appointment_date}</span>
        ${a.notes ? `<span class="appt-time"><i data-lucide="file-text"></i>${a.notes.slice(0,30)}…</span>` : ''}
      </div>
    </div>
    <div class="appt-actions">
      <span class="badge ${statusBadge}">${a.status}</span>
      ${a.status === 'Scheduled' ? `
        <button class="btn btn-success btn-sm" onclick="updateApptStatus(${a.id},'Completed')"><i data-lucide="check"></i></button>
        <button class="btn btn-warning btn-sm" style="background:rgba(245,158,11,0.15);color:var(--warning-light);border-color:rgba(245,158,11,0.3)" onclick="updateApptStatus(${a.id},'No Show')"><i data-lucide="user-x"></i></button>
        <button class="btn btn-danger btn-sm" onclick="cancelAppt(${a.id})"><i data-lucide="x"></i></button>
      ` : ''}
    </div>
  </div>`;
}

async function updateApptStatus(id, status) {
  try {
    await API.updateAppointment(id, { status });
    showToast(`Appointment marked as ${status}`, 'success');
    loadAppointments();
  } catch (err) { showToast(err.message, 'error'); }
}

async function cancelAppt(id) {
  if (!confirm('Cancel this appointment?')) return;
  try {
    await API.cancelAppointment(id);
    showToast('Appointment cancelled', 'success');
    loadAppointments();
  } catch (err) { showToast(err.message, 'error'); }
}

let _modalDoctors = [];
let _modalPatients = [];

function formatPhoneForWa(raw) {
  if (!raw) return '';
  let digits = String(raw).replace(/[^0-9]/g, '');
  if (digits.length === 10) return '91' + digits;
  if (digits.length === 11 && digits.startsWith('0')) return '91' + digits.slice(1);
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  return digits;
}

async function openAppointmentModal(preselectedDoctorId = null) {
  const [doctors, patients] = await Promise.all([
    API.getDoctors().catch(() => []),
    API.getPatients().catch(() => []),
  ]);
  _modalDoctors = doctors;
  _modalPatients = patients;

  const today = new Date().toISOString().split('T')[0];

  openModal('New Appointment', `
    <form id="appt-form" class="form-grid">
      <div class="field"><label>Doctor <span class="req">*</span></label>
        <select name="doctor_id" id="appt-doctor-select" required>
          <option value="">Select doctor</option>
          ${doctors.map(d => `<option value="${d.id}" ${d.id === preselectedDoctorId?'selected':''}>Dr. ${d.name} — ${d.specialization||''}</option>`).join('')}
        </select></div>
      <div class="field"><label>Patient <span class="req">*</span></label>
        <select name="patient_id" id="appt-patient-select" required>
          <option value="">Select patient</option>
          ${patients.map(p => `<option value="${p.id}">${p.name} ${p.phone?'('+p.phone+')':''}</option>`).join('')}
        </select></div>
      <div class="field"><label>Date <span class="req">*</span></label>
        <input type="date" name="appointment_date" required value="${today}" min="${today}"/></div>
      <div class="field"><label>Time <span class="req">*</span></label>
        <input type="time" name="appointment_time" required/></div>
      <div class="field col-span-2"><label>Reason</label>
        <input name="reason" placeholder="e.g. Fever, Follow-up, General checkup…"/></div>
      <div class="field col-span-2"><label>Notes</label>
        <textarea name="notes" rows="2" placeholder="Additional notes…"></textarea></div>
    </form>
  `, [
    { label: 'Cancel', cls: 'btn-secondary', action: closeModal },
    { label: 'Book Appointment', cls: 'btn-primary', action: submitAppointment },
  ]);
}

async function submitAppointment() {
  const form = document.getElementById('appt-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = Object.fromEntries(new FormData(form));
  data.doctor_id  = parseInt(data.doctor_id);
  data.patient_id = parseInt(data.patient_id);
  try {
    const appt = await API.createAppointment(data);
    closeModal();
    showToast(`Appointment booked! Token #${appt.token_no}`, 'success');
    apptDateFilter = data.appointment_date;
    if (document.getElementById('appt-date-filter')) document.getElementById('appt-date-filter').value = apptDateFilter;
    loadAppointments();

    // Background SMS notification
    const patientObj = (_modalPatients || []).find(p => p.id === data.patient_id);
    const doctorObj  = (_modalDoctors || []).find(d => d.id === data.doctor_id);
    const rawPhone   = appt.patient_phone || patientObj?.phone || '';
    const cleanPhone = formatPhoneForWa(rawPhone);

    if (cleanPhone) {
      const apptDate  = data.appointment_date || appt.appointment_date || '';
      const apptTime  = data.appointment_time || appt.appointment_time || '';
      const docName   = (doctorObj ? `Dr. ${doctorObj.name}` : '') || appt.doctor_name || 'Doctor';

      setTimeout(() => {
        openModal('Appointment Confirmed 🎉', `
          <div style="text-align:center;margin-bottom:12px">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:rgba(34,197,94,0.15);color:var(--success);margin-bottom:6px">
              <i data-lucide="calendar-check" style="width:26px;height:26px"></i>
            </div>
            <h3 style="font-size:17px;margin:0">Token #${appt.token_no} Booked!</h3>
            <p style="font-size:12.5px;color:var(--text-muted);margin:4px 0 0">${docName} · ${apptDate} at ${apptTime}</p>
          </div>

          <div style="background:rgba(59, 130, 246, 0.08);border:1px solid rgba(59, 130, 246, 0.3);padding:14px;border-radius:10px;text-align:center;margin-top:12px">
            <p style="font-weight:600;font-size:13px;color:var(--text-primary);margin:0 0 6px">
              📱 SMS Confirmation for Patient (${rawPhone})
            </p>
            <p style="font-size:11.5px;color:var(--text-muted);margin:0 0 12px">
              Automated SMS dispatched in background. Click below to trigger or re-send:
            </p>
            <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
              <button type="button" class="btn btn-primary" onclick="sendApptSmsBackground(${appt.id}, this)" style="display:inline-flex;align-items:center;gap:6px;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer">
                <svg xmlns='http://www.w3.org/2000/svg' width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/></svg>
                Send SMS Now (Background)
              </button>
            </div>
          </div>
        `, [
          { label: '📱 Send SMS', cls: 'btn-secondary', action: (btn) => sendApptSmsBackground(appt.id, btn) },
          { label: 'Done', cls: 'btn-primary', action: closeModal }
        ]);
        lucide.createIcons();
      }, 250);
    }
  } catch (err) { showToast(err.message, 'error'); }
}

window.sendApptSmsBackground = async function(apptId, btnEl) {
  const origHtml = btnEl ? btnEl.innerHTML : '';
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerHTML = `<span style="display:inline-block;width:12px;height:12px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin 0.75s linear infinite;margin-right:4px;vertical-align:middle"></span> Sending SMS...`;
  }
  try {
    const res = await API.sendApptSMS(apptId);
    if (res && res.sent) {
      showToast(res.message || 'SMS confirmation sent in background!', 'success');
      if (btnEl) {
        btnEl.innerHTML = `✅ SMS Sent!`;
        btnEl.classList.remove('btn-primary', 'btn-secondary');
        btnEl.classList.add('btn-success');
      }
    } else {
      showToast(res?.message || 'Could not send SMS. Check SMS Settings.', 'warning');
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerHTML = origHtml;
      }
    }
  } catch (err) {
    showToast(err.message || 'Failed to dispatch SMS', 'error');
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = origHtml;
    }
  }
};

