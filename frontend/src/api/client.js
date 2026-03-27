import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// ── Supabase — keys from .env only, never hardcoded ──────────────────────────
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_KEY in .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Axios instance ────────────────────────────────────────────────────────────
const API = axios.create({
  baseURL: 'https://novus-backend-ujgc.onrender.com',
  headers: { 'Content-Type': 'application/json' },
});

// ── Auth token injector ───────────────────────────────────────────────────────
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('careersync_token') || localStorage.getItem('token');
  
  // Routes that do NOT need a token
  const isAuthRoute = config.url.includes('/login') || config.url.includes('/register');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // Only log if it's not a login/register route to keep the console clean
    if (!isAuthRoute) console.log("✅ Token successfully attached to request:", config.url);
  } else if (!isAuthRoute) {
    // Only throw the red error if we are trying to access protected data without a token
    console.error(`❌ No token found for protected route: ${config.url}. Request will fail.`);
  }
  
  return config;
});

// ── Global error normalizer — handles Pydantic validation error objects ───────
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error?.response?.data?.detail;

    if (Array.isArray(detail)) {
      error.message = detail.map(e => e.msg).join(', ');
    } else if (typeof detail === 'string') {
      error.message = detail;
    } else {
      error.message = 'Something went wrong. Please try again.';
    }

    return Promise.reject(error);
  }
);

// ── API modules ───────────────────────────────────────────────────────────────

export const authAPI = {
  login: (email, password) => API.post('/api/auth/login', { email, password }),
  register: (data) => API.post('/api/auth/register', data),
  getUser: (userId) => API.get(`/api/auth/user/${userId}`),
  updateGmail: (userId, gmail_account, gmail_app_password) =>
    API.put('/api/auth/update-gmail', { user_id: userId, gmail_account, gmail_app_password }),
  updateProfile: (userId, name) =>
    API.put('/api/auth/update-profile', { user_id: userId, name }),
};

export const applicationsAPI = {
  getAll: (userId) => API.post('/api/applications/list', { user_id: userId }),
  add: (data) => API.post('/api/applications/add', data),
  updateStage: (appId, stage) => API.put('/api/applications/stage', { app_id: appId, stage }),
  updateRecruiter: (appId, data) => API.put('/api/applications/recruiter', { app_id: appId, ...data }),
  delete: (appId) => API.delete(`/api/applications/${appId}`),
};

export const gmailAPI = {
  sync: (userId) => API.post('/api/gmail/sync', { user_id: userId }),
  status: (userId) => API.get(`/api/gmail/status/${userId}`),
};

export const recruiterAPI = {
  enrichOne: (appId, company) => API.post('/api/recruiter/enrich-one', { app_id: appId, company }),
  enrichMissing: (userId) => API.post('/api/recruiter/enrich-missing', { user_id: userId }),
  enrichAll: (userId) => API.post('/api/recruiter/enrich-all', { user_id: userId }),
};

export const jobsAPI = {
  search: (data) => API.post('/api/jobs/search', data),
  save: (data) => API.post('/api/jobs/save', data),
  getApplied: (userId) => API.get(`/api/jobs/applied/${userId}`),
  suggestions: (q, type = 'keyword') => API.get(`/api/jobs/suggestions?q=${encodeURIComponent(q)}&type=${type}`),
  click: (jobId, userId) => API.post('/api/jobs/click', { job_id: jobId, user_id: userId }),
  
  // ── NEW ATS MATCH ENDPOINT ──
  getMatchScore: (data) => API.post('/api/jobs/match', data),
};

export default API;