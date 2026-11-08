import { create } from "zustand";
import { authApi } from "../services/api";
import { clearAccessToken, setAccessToken } from "../services/session";
import { useStudioStore } from "./useStudioStore";

let restoreTask;
export const useAuthStore = create((set) => ({
  user: null,
  status: "loading",
  error: null,
  restore: async () => {
    if (restoreTask) return restoreTask;
    restoreTask = (async () => {
      try {
        const refreshed = await authApi.refresh();
        const accessToken = refreshed?.data?.access_token;
        if (!accessToken) throw new Error("No active session");
        setAccessToken(accessToken);
        const current = await authApi.currentUser();
        set({ user: current.data, status: "authenticated", error: null });
      } catch {
        clearAccessToken();
        useStudioStore.getState().clearProjects();
        set({ user: null, status: "anonymous", error: null });
      } finally {
        restoreTask = null;
      }
    })();
    return restoreTask;
  },
  login: async (payload) => {
    const response = await authApi.login(payload);
    setAccessToken(response.data.access_token);
    useStudioStore.getState().clearProjects();
    set({ user: response.data.user, status: "authenticated", error: null });
    return response.data.user;
  },
  register: async (payload) => {
    const { confirmPassword, ...request } = payload;
    const response = await authApi.register(request);
    setAccessToken(response.data.access_token);
    useStudioStore.getState().clearProjects();
    set({ user: response.data.user, status: "authenticated", error: null });
    return response.data.user;
  },
  logout: async () => {
    try { await authApi.logout(); } finally {
      clearAccessToken();
      useStudioStore.getState().clearProjects();
      set({ user: null, status: "anonymous", error: null });
    }
  },
  expire: () => {
    clearAccessToken();
    useStudioStore.getState().clearProjects();
    set({ user: null, status: "anonymous", error: null });
  },
  syncUser: (user) => set({ user, status: "authenticated" }),
}));
