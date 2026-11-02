// API Client for Smart Waste Management Backend

const API_BASE = '';

function getAuthHeader() {
  const token = localStorage.getItem('worker_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/api/health`);
  return res.json();
}

export async function classifyImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/api/classify`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to classify image.');
  }

  return res.json();
}

export async function submitComplaint(complaintData) {
  const formData = new FormData();
  formData.append('citizen_name', complaintData.name);
  formData.append('citizen_email', complaintData.email);
  formData.append('location_text', complaintData.location);
  
  if (complaintData.latitude) {
    formData.append('latitude', complaintData.latitude);
  }
  if (complaintData.longitude) {
    formData.append('longitude', complaintData.longitude);
  }
  if (complaintData.temp_image_url) {
    formData.append('temp_image_url', complaintData.temp_image_url);
  }
  if (complaintData.imageFile) {
    formData.append('file', complaintData.imageFile);
  }
  if (complaintData.detections) {
    formData.append('detections_json', JSON.stringify(complaintData.detections));
  }
  if (complaintData.assigned_worker_id) {
    formData.append('assigned_worker_id', complaintData.assigned_worker_id);
  }

  const res = await fetch(`${API_BASE}/api/complaints`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to submit complaint.');
  }

  return res.json();
}

export async function getAvailableWorkers() {
  const res = await fetch(`${API_BASE}/api/workers`);
  if (!res.ok) {
    return [];
  }
  return res.json();
}

export async function reassignComplaintWorker(publicId, workerId) {
  const res = await fetch(`${API_BASE}/api/complaints/${encodeURIComponent(publicId)}/assign`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ worker_id: workerId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to assign worker to complaint.');
  }
  return res.json();
}

export async function getComplaint(publicId) {
  const res = await fetch(`${API_BASE}/api/complaints/${encodeURIComponent(publicId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Complaint '${publicId}' not found.`);
  }
  return res.json();
}

export async function workerLogin(username, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed. Check your username and password.');
  }

  const data = await res.json();
  localStorage.setItem('worker_token', data.access_token);
  localStorage.setItem('worker_info', JSON.stringify(data.worker));
  return data;
}

export async function workerRegister(registrationData) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(registrationData),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Registration failed. Please try again.');
  }

  const data = await res.json();
  localStorage.setItem('worker_token', data.access_token);
  localStorage.setItem('worker_info', JSON.stringify(data.worker));
  return data;
}

export function workerLogout() {
  localStorage.removeItem('worker_token');
  localStorage.removeItem('worker_info');
}

export function getStoredWorker() {
  const info = localStorage.getItem('worker_info');
  return info ? JSON.parse(info) : null;
}

export async function getWorkerJobs() {
  const res = await fetch(`${API_BASE}/api/workers/jobs`, {
    headers: {
      ...getAuthHeader(),
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      workerLogout();
      throw new Error('Session expired. Please log in again.');
    }
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to load assigned jobs.');
  }

  return res.json();
}

export async function completeJobWithProof(publicId, proofFile) {
  const formData = new FormData();
  formData.append('proof_image', proofFile);

  const res = await fetch(`${API_BASE}/api/workers/jobs/${encodeURIComponent(publicId)}/complete`, {
    method: 'PATCH',
    headers: {
      ...getAuthHeader(),
    },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to mark job completed.');
  }

  return res.json();
}
