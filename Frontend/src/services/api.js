import axios from "axios";
import { API_BASE_URL } from "../constants/app";
import { clearAccessToken, getAccessToken, setAccessToken } from "./session";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshRequest;
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const original = error.config;
    const url = original?.url || "";
    const isAuthEndpoint = /\/auth\/(login|register|refresh|logout|forgot-password|reset-password)/.test(url);
    if (error.response?.status === 401 && original && !original._sessionRetry && !isAuthEndpoint) {
      original._sessionRetry = true;
      try {
        refreshRequest ||= axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        const response = await refreshRequest;
        refreshRequest = null;
        const token = response.data?.data?.access_token;
        if (!token) throw new Error("Session refresh failed");
        setAccessToken(token);
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      } catch (refreshError) {
        refreshRequest = null;
        clearAccessToken();
        window.dispatchEvent(new CustomEvent("auth:expired"));
        return Promise.reject(refreshError);
      }
    }
    const message = error.response?.data?.message || error.message || "The request could not be completed.";
    return Promise.reject(Object.assign(new Error(message), { status: error.response?.status, code: error.response?.data?.error?.code, details: error.response?.data?.error?.details }));
  },
);

export const authApi = {
  login: (payload) => apiClient.post("/auth/login", payload),
  register: (payload) => apiClient.post("/auth/register", payload),
  logout: () => apiClient.post("/auth/logout"),
  refresh: () => apiClient.post("/auth/refresh"),
  currentUser: () => apiClient.get("/auth/me"),
  forgotPassword: (payload) => apiClient.post("/auth/forgot-password", payload),
  resetPassword: (payload) => apiClient.post("/auth/reset-password", payload),
};
export const usersApi = {
  profile: () => apiClient.get("/users/profile"),
  updateProfile: (payload) => apiClient.patch("/users/profile", payload),
  updatePassword: (payload) => apiClient.patch("/users/password", payload),
  deleteAccount: () => apiClient.delete("/users/account"),
};
export const projectsApi = {
  list: (params) => apiClient.get("/projects", { params }),
  get: (id) => apiClient.get(`/projects/${id}`),
  create: (payload) => apiClient.post("/projects", payload),
};
export const jobsApi = {
  get: (id) => apiClient.get(`/jobs/${id}`),
  cancel: (id) => apiClient.post(`/jobs/${id}/cancel`),
};
