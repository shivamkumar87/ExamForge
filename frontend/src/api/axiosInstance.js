import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

axiosInstance.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('examforge-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      const token = parsed?.state?.token;
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore parse errors
  }
  return config;
});

export default axiosInstance;