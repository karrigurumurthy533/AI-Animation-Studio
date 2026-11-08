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
  update: (id, payload) => apiClient.patch(`/projects/${id}`, payload),
  delete: (id) => apiClient.delete(`/projects/${id}`),
  duplicate: (id) => apiClient.post(`/projects/${id}/duplicate`),
};
export const jobsApi = {
  list: (params) => apiClient.get("/jobs", { params }),
  get: (id) => apiClient.get(`/jobs/${id}`),
  cancel: (id) => apiClient.post(`/jobs/${id}/cancel`),
  logs: (id) => apiClient.get(`/jobs/${id}/logs`),
  cancelRender: (id) => apiClient.post(`/renders/${id}/cancel`),
};
export const assetsApi = {
  upload: (projectId, file, onUploadProgress) => {
    const body = new FormData(); body.append("file", file);
    return apiClient.post(`/projects/${projectId}/uploads`, body, { headers: { "Content-Type": "multipart/form-data" }, onUploadProgress });
  },
  presign: (payload) => apiClient.post("/uploads/presigned-url", payload),
  completeUpload: (payload) => apiClient.post("/uploads/complete", payload),
  uploadSigned: async (projectId, file) => {
    const signed = await apiClient.post("/uploads/presigned-url", { projectId, fileName: file.name, mimeType: file.type, fileSize: file.size });
    const body = new FormData(); body.append("file", file);
    await apiClient.put(`/uploads/local/${signed.data.uploadId}`, body, { headers: { "Content-Type": "multipart/form-data" } });
    return apiClient.post("/uploads/complete", { projectId, uploadId: signed.data.uploadId, fileName: file.name, mimeType: file.type });
  },
  get: (id) => apiClient.get(`/assets/${id}`),
  download: (id) => apiClient.get(`/assets/${id}/download`, { responseType: "blob" }),
  delete: (id) => apiClient.delete(`/assets/${id}`),
  models: (projectId) => apiClient.get(`/projects/${projectId}/models`),
  list: (projectId, params) => apiClient.get(`/projects/${projectId}/assets`, { params }),
};
export const productionApi = {
  characters: (projectId) => apiClient.get(`/projects/${projectId}/characters`),
  createCharacter: (projectId, payload) => apiClient.post(`/projects/${projectId}/characters`, payload),
  character: (id) => apiClient.get(`/characters/${id}`),
  updateCharacter: (id, payload) => apiClient.patch(`/characters/${id}`, payload),
  analyze: (projectId, payload) => apiClient.post(`/projects/${projectId}/analysis`, payload),
  analysis: (projectId) => apiClient.get(`/projects/${projectId}/analysis`),
  generateModel: (projectId, payload) => apiClient.post(`/projects/${projectId}/models/generate`, payload),
  model: (id) => apiClient.get(`/models/${id}`),
  regenerateModel: (id, payload) => apiClient.post(`/models/${id}/regenerate`, payload),
  approveModel: (id) => apiClient.post(`/models/${id}/approve`),
  mesh: (id, operation, payload = {}) => apiClient.post(`/models/${id}/mesh/${operation}`, payload),
  meshReport: (id) => apiClient.get(`/models/${id}/mesh/report`),
  materials: (characterId) => apiClient.get(`/characters/${characterId}/materials`),
  createMaterial: (characterId, payload) => apiClient.post(`/characters/${characterId}/materials`, payload),
  updateMaterial: (id, payload) => apiClient.patch(`/materials/${id}`, payload),
  generateTexture: (id, payload) => apiClient.post(`/materials/${id}/generate-texture`, payload),
  applyMaterial: (id) => apiClient.post(`/materials/${id}/apply`),
  generateRig: (characterId, payload = {}) => apiClient.post(`/characters/${characterId}/rigging/generate`, payload),
  rigging: (characterId) => apiClient.get(`/characters/${characterId}/rigging`),
  riggingOperation: (characterId, operation, payload = {}) => apiClient.post(`/characters/${characterId}/rigging/${operation}`, payload),
  animationLibrary: () => apiClient.get("/animations/library"),
  createAnimation: (characterId, payload) => apiClient.post(`/characters/${characterId}/animations`, payload),
  generateAnimation: (characterId, payload) => apiClient.post(`/characters/${characterId}/animations/generate`, payload),
  animations: (projectId) => apiClient.get(`/projects/${projectId}/animations`),
  updateAnimation: (id, payload) => apiClient.patch(`/animations/${id}`, payload),
  deleteAnimation: (id) => apiClient.delete(`/animations/${id}`),
  lighting: (projectId) => apiClient.get(`/projects/${projectId}/lighting`),
  createLighting: (projectId, payload) => apiClient.post(`/projects/${projectId}/lighting`, payload),
  updateLighting: (projectId, id, payload) => apiClient.patch(`/projects/${projectId}/lighting/${id}`, payload),
  previewLighting: (projectId, payload = {}) => apiClient.post(`/projects/${projectId}/lighting/preview`, payload),
  scenes: (projectId) => apiClient.get(`/projects/${projectId}/scenes`),
  createScene: (projectId, payload) => apiClient.post(`/projects/${projectId}/scenes`, payload),
  scene: (id) => apiClient.get(`/scenes/${id}`),
  updateScene: (id, payload) => apiClient.patch(`/scenes/${id}`, payload),
  deleteScene: (id) => apiClient.delete(`/scenes/${id}`),
  generateScene: (id, payload = {}) => apiClient.post(`/scenes/${id}/generate`, payload),
  render: (id, payload = {}) => apiClient.post(`/scenes/${id}/render`, payload),
  renderStatus: (id) => apiClient.get(`/renders/${id}`),
  renders: (projectId) => apiClient.get(`/projects/${projectId}/renders`),
  workflow: (projectId) => apiClient.get(`/projects/${projectId}/workflow`),
  workflowStage: (projectId, stage) => apiClient.get(`/projects/${projectId}/workflow/${stage}`),
  approveStage: (projectId, stage) => apiClient.post(`/projects/${projectId}/workflow/${stage}/approve`),
  retryStage: (projectId, stage, payload = {}) => apiClient.post(`/projects/${projectId}/workflow/${stage}/retry`, payload),
  createVersion: (projectId, payload = {}) => apiClient.post(`/projects/${projectId}/versions`, payload),
  versions: (projectId) => apiClient.get(`/projects/${projectId}/versions`),
  version: (id) => apiClient.get(`/versions/${id}`),
  restoreVersion: (id) => apiClient.post(`/versions/${id}/restore`),
};
export const exportsApi = {
  create: (projectId, payload) => apiClient.post(`/projects/${projectId}/export`, payload),
  get: (id) => apiClient.get(`/exports/${id}`),
  list: (projectId) => apiClient.get(`/projects/${projectId}/exports`),
};
