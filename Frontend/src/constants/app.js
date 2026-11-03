export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
export const APP_NAME = "AI Animation Studio";
export const WORKSPACE_NAME = "Atelier North";
export const DEMO_MODE = !import.meta.env.VITE_API_BASE_URL;
export const ROUTES = {
  home: "/",
  features: "/features",
  howItWorks: "/how-it-works",
  tools: "/ai-tools",
  pricing: "/pricing",
  about: "/about",
  contact: "/contact",
  login: "/login",
  register: "/register",
  studio: "/studio",
  projects: "/studio/projects",
  character: "/studio/character",
  mesh: "/studio/mesh",
  materials: "/studio/materials",
  rigging: "/studio/rigging",
  animation: "/studio/animation",
  film: "/studio/film",
  workflow: "/studio/workflow",
  assets: "/studio/assets",
  versions: "/studio/versions",
  blender: "/studio/blender",
  assistant: "/studio/assistant",
  billing: "/studio/billing",
  settings: "/studio/settings",
};
