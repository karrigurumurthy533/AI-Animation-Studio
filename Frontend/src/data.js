export const stages = [
  "Image upload",
  "Image analysis",
  "Model generation",
  "Mesh editing",
  "Materials",
  "Rigging",
  "Animation",
  "Lighting",
  "Rendering",
  "Export",
];
export const projects = [
  {
    id: "PRJ-042",
    name: "The Red Nomad",
    type: "Character film",
    stage: "Animation",
    progress: 68,
    updated: "2 hours ago",
    color: "red",
    image: "nomad",
  },
  {
    id: "PRJ-039",
    name: "Quiet Tides",
    type: "Environment study",
    stage: "Materials",
    progress: 42,
    updated: "Yesterday",
    color: "sand",
    image: "tides",
  },
  {
    id: "PRJ-035",
    name: "Paper City",
    type: "World building",
    stage: "Model generation",
    progress: 24,
    updated: "Oct 28",
    color: "mono",
    image: "city",
  },
  {
    id: "PRJ-031",
    name: "Morrow",
    type: "Character exploration",
    stage: "Rigging",
    progress: 81,
    updated: "Oct 26",
    color: "ember",
    image: "morrow",
  },
];
export const assets = [
  {
    name: "nomad_character_v04.glb",
    kind: "3D Model",
    format: "GLB",
    size: "18.4 MB",
    date: "Oct 30, 2026",
    icon: "box",
  },
  {
    name: "skin_clay_material_v02.png",
    kind: "Texture",
    format: "PNG",
    size: "4.8 MB",
    date: "Oct 30, 2026",
    icon: "texture",
  },
  {
    name: "walk_cycle_take03.fbx",
    kind: "Animation",
    format: "FBX",
    size: "2.1 MB",
    date: "Oct 29, 2026",
    icon: "motion",
  },
  {
    name: "scene_03_camera.blend",
    kind: "Blender Project",
    format: "BLEND",
    size: "126 MB",
    date: "Oct 28, 2026",
    icon: "blend",
  },
  {
    name: "scene_03_preview_4k.png",
    kind: "Render",
    format: "PNG",
    size: "12.2 MB",
    date: "Oct 27, 2026",
    icon: "image",
  },
];
export const navGroups = [
  {
    label: "OVERVIEW",
    items: [
      ["Dashboard", "/studio"],
      ["Projects", "/studio/projects"],
    ],
  },
  {
    label: "PRODUCTION",
    items: [
      ["Character Lab", "/studio/character"],
      ["Mesh Lab", "/studio/mesh"],
      ["Materials Lab", "/studio/materials"],
      ["Rigging Lab", "/studio/rigging"],
      ["Animation Lab", "/studio/animation"],
      ["Film Production", "/studio/film"],
      ["Workflow Editor", "/studio/workflow"],
    ],
  },
  {
    label: "LIBRARY",
    items: [
      ["Assets", "/studio/assets"],
      ["Versions", "/studio/versions"],
      ["Blender Bridge", "/studio/blender"],
      ["AI Assistant", "/studio/assistant"],
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      ["Billing", "/studio/billing"],
      ["Settings", "/studio/settings"],
    ],
  },
];
export const features = [
  [
    "Image to 3D",
    "Turn a reference image into an editable character starting point.",
    "Scan",
  ],
  [
    "Mesh intelligence",
    "Review geometry and prepare topology for downstream work.",
    "Triangle",
  ],
  [
    "Materials & textures",
    "Direct color, surface response and texture maps.",
    "Palette",
  ],
  [
    "Character DNA",
    "Carry silhouette, proportions and signature details across shots.",
    "Fingerprint",
  ],
  [
    "Rigging & motion",
    "Build skeletons, shape performances and refine the timeline.",
    "Bone",
  ],
  [
    "AI film production",
    "Bring storyboards, scenes, characters and cameras together.",
    "Clapperboard",
  ],
];
export const fmt = (n) => new Intl.NumberFormat("en-US").format(n);
