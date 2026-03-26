// frontend/lib/axios.ts
import axios from 'axios';

const apiClient = axios.create({
 baseURL: '/api', 
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, add this request to the queue
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(
          `/api/auth/refresh`,
          {},
          { withCredentials: true }
        );

        isRefreshing = false;
        processQueue(null); // Resolve all waiting requests
        return apiClient(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        failedQueue = []; // Clear queue on hard failure
if (typeof window !== 'undefined') {
    window.location.href = '/login';
}
return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;