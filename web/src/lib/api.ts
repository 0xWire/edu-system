import axios from 'axios';

const sanitizeURL = (value?: string): string => (value ?? '').replace(/\/$/, '');

const isPrivateClientTarget = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return host === 'backend' || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
  } catch {
    return false;
  }
};

const resolveBaseURL = (): string => {
  const envURL = sanitizeURL(process.env.NEXT_PUBLIC_API_URL);

  if (typeof window !== 'undefined') {
    if (!envURL || isPrivateClientTarget(envURL)) {
      return window.location.origin;
    }
    return envURL;
  }

  return envURL || 'http://localhost:8081';
};

const API_BASE_URL = resolveBaseURL();

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
