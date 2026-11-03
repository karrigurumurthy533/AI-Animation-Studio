import { create } from "zustand";
export const useStudioStore = create((set) => ({
  toast: null,
  sidebarOpen: false,
  billingAnnual: false,
  activeProject: "PRJ-042",
  notify: (message, tone = "info") => {
    set({ toast: { message, tone } });
    window.setTimeout(() => set({ toast: null }), 3200);
  },
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleBilling: () => set((s) => ({ billingAnnual: !s.billingAnnual })),
  setActiveProject: (id) => set({ activeProject: id }),
}));
