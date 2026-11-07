import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request Interceptor: Attach JWT Token if stored
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format error messages in Amharic
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    let amharicMessage = 'ያልታወቀ ስህተት ተከስቷል። እባክዎ ጥቂት ቆይተው እንደገና ይሞክሩ።';

    if (error.response?.data?.message) {
      amharicMessage = error.response.data.message;
    } else if (error.code === 'ERR_NETWORK') {
      amharicMessage = 'ከሰርቨሩ ጋር መገናኘት አልተቻለም። እባክዎ የበይነመረብ (Internet) ግንኙነትዎን ያረጋግጡ።';
    } else if (error.response?.status === 401) {
      amharicMessage = 'የመግቢያ ፈቃድዎ አብቅቷል። እባክዎ በድጋሚ ይግቡ።';
      localStorage.removeItem('access_token');
    } else if (error.response?.status === 403) {
      amharicMessage = 'ይህንን ገጽ ወይም ተግባር የመመልከት ፈቃድ የለዎትም።';
    }

    return Promise.reject(new Error(amharicMessage));
  }
);

export default api;
