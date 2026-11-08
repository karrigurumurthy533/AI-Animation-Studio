import { create } from "zustand";
import { projectsApi } from "../services/api";

const stageLabels = ["Image upload", "Image analysis", "Model generation", "Mesh editing", "Materials", "Rigging", "Animation", "Lighting", "Rendering", "Export"];
const stageIndex = Object.fromEntries(stageLabels.map((name, index) => [name.toLowerCase().replaceAll(" ", "_"), index]));
const projectColors = ["red", "sand", "mono", "ember"];
const normalizeProject = (project, index = 0) => {
  const stage = project.currentStage || "image_upload";
  return {
    ...project,
    type: project.projectType,
    stage: stageLabels[stageIndex[stage] ?? 0],
    progress: Math.round(((stageIndex[stage] ?? 0) / (stageLabels.length - 1)) * 100),
    image: projectColors[index % projectColors.length],
  };
};

export const useStudioStore = create((set, get) => ({
  toast: null,
  sidebarOpen: false,
  billingAnnual: false,
  activeProject: null,
  projects: [],
  projectsStatus: "idle",
  projectsError: null,
  clearProjects: () => set({ projects: [], projectsStatus: "idle", projectsError: null, activeProject: null }),
  notify: (message, tone = "info") => {
    set({ toast: { message, tone } });
    window.setTimeout(() => set({ toast: null }), 3200);
  },
  loadProjects: async () => {
    if (["loading", "ready"].includes(get().projectsStatus)) return;
    set({ projectsStatus: "loading", projectsError: null });
    try {
      const response = await projectsApi.list();
      const projects = response.data.map(normalizeProject);
      set({ projects, projectsStatus: "ready", activeProject: get().activeProject || projects[0]?.id || null });
    } catch (error) {
      set({ projectsStatus: "error", projectsError: error.message });
      throw error;
    }
  },
  createProject: async (payload) => {
    const response = await projectsApi.create(payload);
    const project = normalizeProject(response.data, get().projects.length);
    set((state) => ({ projects: [project, ...state.projects], activeProject: project.id }));
    return project;
  },
  updateProject: async (id, payload) => {
    const response = await projectsApi.update(id, payload);
    const project = normalizeProject(response.data);
    set((state) => ({ projects: state.projects.map((item) => item.id === id ? { ...item, ...project } : item) }));
    return project;
  },
  deleteProject: async (id) => {
    await projectsApi.delete(id);
    set((state) => {
      const projects = state.projects.filter((item) => item.id !== id);
      return { projects, activeProject: state.activeProject === id ? projects[0]?.id || null : state.activeProject };
    });
  },
  duplicateProject: async (id) => {
    const response = await projectsApi.duplicate(id);
    const project = normalizeProject(response.data, get().projects.length);
    set((state) => ({ projects: [project, ...state.projects] }));
    return project;
  },
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleBilling: () => set((state) => ({ billingAnnual: !state.billingAnnual })),
  setActiveProject: (id) => set({ activeProject: id }),
}));
