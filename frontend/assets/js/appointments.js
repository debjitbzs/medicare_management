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

    // Show WhatsApp / SMS notification option
    const patientObj = (_modalPatients || []).find(p => p.id === data.patient_id);
    const doctorObj  = (_modalDoctors || []).find(d => d.id === data.doctor_id);
    const rawPhone   = appt.patient_phone || patientObj?.phone || '';
    const cleanPhone = formatPhoneForWa(rawPhone);

    if (cleanPhone) {
      const storeName = window._storeSettings?.store_name || 'Medify Pharmacy';
      const apptDate  = data.appointment_date || appt.appointment_date || '';
      const apptTime  = data.appointment_time || appt.appointment_time || '';
      const docName   = (doctorObj ? `Dr. ${doctorObj.name}` : '') || appt.doctor_name || 'Doctor';
      const waMsg = encodeURIComponent(
        `*${storeName}*\n` +
        `🏥 *Appointment Confirmation*\n\n` +
        `🎫 *Token Number:* #${appt.token_no}\n` +
        `👨‍⚕️ *Doctor:* ${docName}\n` +
        `📅 *Date:* ${apptDate}\n` +
        `⏰ *Time:* ${apptTime}\n\n` +
        `Please arrive 10 minutes prior to your slot. Thank you! 🙏`
      );
      const smsMsg = encodeURIComponent(
        `${storeName}: Appt Confirmed Token #${appt.token_no} with ${docName} on ${apptDate} at ${apptTime}. Please reach 10 mins early.`
      );
      const waLink  = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${waMsg}`;
      const smsLink = `sms:+${cleanPhone}?body=${smsMsg}`;

      setTimeout(() => {
        openModal('Appointment Confirmed 🎉', `
          <div style="text-align:center;margin-bottom:12px">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:rgba(34,197,94,0.15);color:var(--success);margin-bottom:6px">
              <i data-lucide="calendar-check" style="width:26px;height:26px"></i>
            </div>
            <h3 style="font-size:17px;margin:0">Token #${appt.token_no} Booked!</h3>
            <p style="font-size:12.5px;color:var(--text-muted);margin:4px 0 0">${docName} · ${apptDate} at ${apptTime}</p>
          </div>

          <div style="background:rgba(34, 197, 94, 0.08);border:1px solid rgba(34, 197, 94, 0.3);padding:14px;border-radius:10px;text-align:center;margin-top:12px">
            <p style="font-weight:600;font-size:13px;color:var(--text-primary);margin:0 0 6px">
              📲 Send Token & Appointment Details to Patient (${rawPhone})
            </p>
            <p style="font-size:11.5px;color:var(--text-muted);margin:0 0 12px">
              Click below to send instant confirmation via WhatsApp or SMS:
            </p>
            <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
              <a href="${waLink}" target="_blank" rel="noopener" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:8px;background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;font-size:13px;font-weight:600;box-shadow:0 2px 8px rgba(37,211,102,0.3)">
                <svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='currentColor'><path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z'/></svg>
                Send on WhatsApp
              </a>
              <a href="${smsLink}" style="text-decoration:none;display:inline-flex;align-items:center;gap:6px;padding:8px 18px;border-radius:8px;background:var(--bg-card);color:var(--text-primary);font-size:13px;font-weight:600;border:1px solid var(--border)">
                <svg xmlns='http://www.w3.org/2000/svg' width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'/></svg>
                Send via SMS
              </a>
            </div>
          </div>
        `, [
          { label: '💬 Send on WhatsApp', cls: 'btn-success', action: () => window.open(waLink, '_blank') },
          { label: 'Done', cls: 'btn-secondary', action: closeModal }
        ]);
        lucide.createIcons();
      }, 250);
    }
  } catch (err) { showToast(err.message, 'error'); }
}

