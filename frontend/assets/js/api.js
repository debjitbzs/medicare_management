/* ═══════════════════════════════════════════════════════
   api.js — Centralized API client
═══════════════════════════════════════════════════════════ */

const API_BASE = window.API_BASE_URL || '';

const API = {
  async request(method, path, body = null, raw = false) {
    const token = localStorage.getItem('medify_token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
    });

    if (res.status === 401 && path !== '/api/auth/login') {
      AUTH.logout();
      return null;
    }

    if (raw) return res;

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }

    if (!res.ok) {
      const msg = data?.detail || data?.message || (res.status === 401 ? 'Invalid username or password' : `Error ${res.status}`);
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    return data;
  },

  get:    (path)       => API.request('GET',    path),
  post:   (path, body) => API.request('POST',   path, body),
  put:    (path, body) => API.request('PUT',    path, body),
  delete: (path)       => API.request('DELETE', path),
  raw:    (method, path, body) => API.request(method, path, body, true),

  // Auth
  setupStatus: ()    => fetch(`${API_BASE}/api/auth/setup-status`).then(r => r.json()),
  setup:   (data)    => API.post('/api/auth/setup', data),
  login:   (data)    => API.post('/api/auth/login', data),
  getMe:   ()        => API.get('/api/auth/me'),
  getUsers: ()       => API.get('/api/auth/users'),
  createUser: (data) => API.post('/api/auth/users', data),
  deleteUser: (id)   => API.delete(`/api/auth/users/${id}`),

  // Dashboard
  getDashboardStats:   () => API.get('/api/dashboard/stats'),
  getNotifications:    () => API.get('/api/dashboard/notifications'),
  getTopMedicines:     (days=30) => API.get(`/api/dashboard/top-medicines?days=${days}`),
  getDailySales:       (days=30) => API.get(`/api/sales/stats/daily?days=${days}`),

  // Medicines
  getMedicines:   (params='')      => API.get(`/api/medicines${params}`),
  getMedicine:    (id)             => API.get(`/api/medicines/${id}`),
  createMedicine: (data)           => API.post('/api/medicines', data),
  updateMedicine: (id, data)       => API.put(`/api/medicines/${id}`, data),
  deleteMedicine: (id)             => API.delete(`/api/medicines/${id}`),
  getMedicineBatches: (id)         => API.get(`/api/medicines/${id}/batches`),

  // Stock
  getStockBatches: (params='') => API.get(`/api/stock/batches${params}`),
  addStockBatch:   (data)      => API.post('/api/stock/batches', data),
  adjustStock:     (id, qty, reason) => API.raw('PUT', `/api/stock/batches/${id}/adjust?qty_change=${qty}&reason=${encodeURIComponent(reason)}`),
  getExpiryReport: (days=90)   => API.get(`/api/stock/expiry-report?days=${days}`),
  getSuppliers:    ()          => API.get('/api/stock/suppliers'),
  createSupplier:  (data)      => API.post('/api/stock/suppliers', data),

  // Sales
  getBills:       (params='') => API.get(`/api/sales${params}`),
  getBill:        (id)        => API.get(`/api/sales/${id}`),
  createBill:     (data)      => API.post('/api/sales', data),

  // Doctors
  getDoctors:    (params='')   => API.get(`/api/doctors${params}`),
  getDoctor:     (id)          => API.get(`/api/doctors/${id}`),
  createDoctor:  (data)        => API.post('/api/doctors', data),
  updateDoctor:  (id, data)    => API.put(`/api/doctors/${id}`, data),
  deleteDoctor:  (id)          => API.delete(`/api/doctors/${id}`),

  // Patients
  getPatients:        (params='') => API.get(`/api/patients${params}`),
  getPatient:         (id)        => API.get(`/api/patients/${id}`),
  createPatient:      (data)      => API.post('/api/patients', data),
  updatePatient:      (id, data)  => API.put(`/api/patients/${id}`, data),
  deletePatient:      (id)        => API.delete(`/api/patients/${id}`),
  getPatientAppts:    (id)        => API.get(`/api/patients/${id}/appointments`),
  getPatientBills:    (id)        => API.get(`/api/patients/${id}/bills`),

  // Appointments
  getAppointments:  (params='') => API.get(`/api/appointments${params}`),
  getTodayAppts:    (doctorId)  => API.get(`/api/appointments/today${doctorId ? '?doctor_id='+doctorId : ''}`),
  createAppointment:(data)      => API.post('/api/appointments', data),
  updateAppointment:(id, data)  => API.put(`/api/appointments/${id}`, data),
  cancelAppointment:(id)        => API.delete(`/api/appointments/${id}`),
  markNotified:     (id)        => API.put(`/api/appointments/${id}/notify`, {}),

  // Reports
  salesCsv:  (start, end) => `${API_BASE}/api/reports/sales-csv?start_date=${start}&end_date=${end}`,
  stockCsv:  ()           => `${API_BASE}/api/reports/stock-csv`,
  expiryCsv: (days=90)    => `${API_BASE}/api/reports/expiry-csv?days=${days}`,

  // Settings
  getSettings:    () => API.get('/api/settings'),
  updateSettings: (data) => API.put('/api/settings', data),

  // Logo
  uploadLogo: (formData) => {
    const token = localStorage.getItem('medify_token');
    return fetch('/api/settings/logo', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    }).then(r => r.json());
  },
  deleteLogo: () => API.delete('/api/settings/logo'),
  testSMS:    (data) => API.post('/api/settings/test-sms', data),
  sendBillSMS: (billId) => API.post(`/api/sales/${billId}/send-sms`),
  sendApptSMS: (apptId) => API.post(`/api/appointments/${apptId}/send-sms`),
};

// Helper: download CSV with auth token
function downloadCsv(url) {
  const token = localStorage.getItem('medify_token');
  fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(r => r.blob())
    .then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = url.split('/').pop().split('?')[0] + '.csv';
      a.click();
    })
    .catch(() => showToast('Download failed', 'error'));
}
