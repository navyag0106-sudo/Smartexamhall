/**
 * API service for backend communication
 */

import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (email, password) => api.post('/login', { email, password }),
  logout: () => api.post('/logout'),
  getCurrentUser: () => api.get('/me'),
  getExaminers: () => api.get('/examiners'),
  createExaminer: (data) => api.post('/examiners', data),
  deleteExaminer: (id) => api.delete(`/examiners/${id}`),
};

// Student APIs
export const studentAPI = {
  register: (data) => api.post('/register-student', data),
  getAll: (params = {}) => api.get('/students', { params }),
  getById: (id) => api.get(`/student/${id}`),
  getByRegisterNo: (registerNo) => api.get(`/student/by-register/${registerNo}`),
  update: (id, data) => api.put(`/student/${id}`, data),
  delete: (id) => api.delete(`/student/${id}`),
};

// Verification APIs
export const verificationAPI = {
  verifyFace: (image, registerNo = null) => api.post('/verify-face', { image, register_no: registerNo }),
  verifyLive: (images, registerNo, subjectName = null, requireLiveness = true) => api.post('/verify-live', { images, register_no: registerNo, subject_name: subjectName, require_liveness: requireLiveness }),
  checkFace: (image) => api.post('/check-face', { image }),
  checkLiveness: (images) => api.post('/check-liveness', { images }),
  getStats: () => api.get('/stats'),
  getStudentAttendance: (registerNo) => api.get(`/student-attendance/${registerNo}`),
  getAllAttendance: (params = {}) => api.get('/attendance', { params }),
  getAttendanceSummary: () => api.get('/attendance/summary'),
};

// Logs APIs
export const logsAPI = {
  getAll: (params = {}) => api.get('/logs', { params }),
  getById: (id) => api.get(`/logs/${id}`),
  getSummary: (params = {}) => api.get('/logs/summary', { params }),
  exportCSV: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    window.open(`${api.defaults.baseURL}/logs/export?${queryParams}`, '_blank');
  },
};

// Subject Template APIs
export const subjectTemplateAPI = {
  getAll: (params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.department) queryParams.append('department', params.department);
    if (params.year) queryParams.append('year', params.year);
    const queryString = queryParams.toString();
    return api.get(`/subject-templates${queryString ? `?${queryString}` : ''}`);
  },
  getById: (id) => api.get(`/subject-templates/${id}`),
  getByDeptYear: (department, year) => api.get('/subject-templates/by-dept-year', { params: { department, year } }),
  create: (data) => api.post('/subject-templates', data),
  update: (id, data) => api.put(`/subject-templates/${id}`, data),
  delete: (id) => api.delete(`/subject-templates/${id}`),
};

export default api;
