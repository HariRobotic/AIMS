import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({ baseURL: BASE_URL });

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ─── Detections ───────────────────────────────────────────────────────────────
export const detectionsAPI = {
  upload: (file, onProgress) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/detections/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
    });
  },
  createJob: (data) => api.post('/detections/jobs', data),
  listJobs: (params) => api.get('/detections/jobs', { params }),
  getJob: (id) => api.get(`/detections/jobs/${id}`),
  getJobResults: (id, params) => api.get(`/detections/jobs/${id}/results`, { params }),
  listUploads: (params) => api.get('/detections/uploads', { params }),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsAPI = {
  summary: () => api.get('/analytics/summary'),
  timeseries: (days) => api.get('/analytics/timeseries', { params: { days } }),
  scoreDistribution: () => api.get('/analytics/score-distribution'),
};

// ─── Streams ─────────────────────────────────────────────────────────────────
export const streamsAPI = {
  list: () => api.get('/streams'),
  create: (data) => api.post('/streams', data),
  delete: (id) => api.delete(`/streams/${id}`),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminAPI = {
  stats: () => api.get('/admin/stats'),
  listUsers: () => api.get('/admin/users'),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  listModels: () => api.get('/admin/models'),
};

export const modelsAPI = {
  list: () => api.get('/models'),
};

export default api;

// ─── Data Management ──────────────────────────────────────────────────────────
export const dataAPI = {
  // Admin: delete any user's data
  adminDeleteUserData: (userId) => api.delete(`/admin/data/user/${userId}`),
  adminDeleteAllData: () => api.delete('/admin/data/all'),
  adminDeleteAllJobs: () => api.delete('/admin/data/jobs'),
  adminDeleteAllUploads: () => api.delete('/admin/data/uploads'),

  // User: delete own data
  deleteMyAll: () => api.delete('/data/my/all'),
  deleteMyJobs: () => api.delete('/data/my/jobs'),
  deleteMyUploads: () => api.delete('/data/my/uploads'),
  deleteMyJob: (jobId) => api.delete(`/data/my/job/${jobId}`),
  deleteMyUpload: (uploadId) => api.delete(`/data/my/upload/${uploadId}`),
};