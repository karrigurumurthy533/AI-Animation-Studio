import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Box,
  Check,
  ChevronDown,
  CircleHelp,
  Clapperboard,
  Clock3,
  Download,
  File,
  FileImage,
  Film,
  FolderKanban,
  Gauge,
  Grid2X2,
  Image,
  Layers3,
  MoreHorizontal,
  Move3D,
  Palette,
  Play,
  Plus,
  RotateCcw,
  Save,
  Scan,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Triangle,
  Upload,
  WandSparkles,
  Workflow,
  X,
} from "lucide-react";
import { stages } from "../data";
import { useStudioStore } from "../store/useStudioStore";
import { useAuthStore } from "../store/useAuthStore";
import { assetsApi, exportsApi, jobsApi, productionApi, usersApi } from "../services/api";
import { API_BASE_URL } from "../constants/app";
import { getAccessToken } from "../services/session";
const CharacterViewport = lazy(
  () => import("../components/CharacterViewport.jsx"),
);
import {
  Button,
  DemoNotice,
  EmptyState,
  Eyebrow,
  PageTitle,
  SectionTitle,
  Status,
} from "../components/ui";
const actionMessage =
  "This control is a demo. Processing services are not connected.";
function Action({ children, onClick, secondary = false, disabled = false }) {
  return (
    <button
      className={`button ${secondary ? "outline" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
      <ArrowUpRight size={14} />
    </button>
  );
}
function TinyAction({ children, onClick }) {
  return (
    <button className="tiny-action" onClick={onClick}>
      {children}
    </button>
  );
}
function Progress({ value }) {
  return (
    <div className="progress">
      <i style={{ width: `${value}%` }} />
    </div>
  );
}
function Table({ columns, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Stat({ label, value, delta }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <b>{value}</b>
      <small>{delta}</small>
    </article>
  );
}
function ProjectTile({ project }) {
  const setProject = useStudioStore((s) => s.setActiveProject);
  const navigate = useNavigate();
  const openProject = () => {
    setProject(project.id);
    navigate(`/studio/character?projectId=${encodeURIComponent(project.id)}`);
  };
  return (
    <button className="project-tile" onClick={openProject}>
      <div className={`project-thumb thumb-${project.image}`}>
        <div className="tile-figure" />
        <span>{project.id}</span>
        <MoreHorizontal size={16} />
      </div>
      <div className="project-info">
        <div>
          <h3>{project.name}</h3>
          <p>{project.type}</p>
        </div>
        <Status tone={project.progress > 75 ? "good" : "active"}>
          {project.stage}
        </Status>
      </div>
      <div className="project-progress">
        <Progress value={project.progress} />
        <span>{project.progress}%</span>
      </div>
    </button>
  );
}
async function ensureCharacter(projectId, name = "Character") {
  if (!projectId) throw new Error("Select a project first.");
  const existing = await productionApi.characters(projectId);
  if (existing.data.length) return existing.data[0];
  const created = await productionApi.createCharacter(projectId, { name, characterType: "custom", appearanceDNA: {} });
  return created.data;
}
export function Dashboard() {
  const notify = useStudioStore((s) => s.notify);
  const active = useStudioStore((s) => s.activeProject);
  const user = useAuthStore((s) => s.user);
  const projects = useStudioStore((s) => s.projects);
  const loadProjects = useStudioStore((s) => s.loadProjects);
  const projectsStatus = useStudioStore((s) => s.projectsStatus);
  const navigate = useNavigate();
  useEffect(() => { loadProjects().catch((error) => notify(error.message, "error")); }, [loadProjects, notify]);
  return (
    <>
      <PageTitle
        eyebrow="MONDAY, NOVEMBER 3, 2026"
        title={`Good morning, ${(user?.name || "creator").split(/\s+/)[0]}.`}
        description="Your production floor is ready. Pick up where the frame left off."
        action={
          <Action
            onClick={() =>
              navigate("/studio/projects?new=1")
            }
          >
            {" "}
            <Plus size={15} /> New project
          </Action>
        }
      />
      <DemoNotice />
      <div className="stats-grid">
        <Stat
          label="ACTIVE PROJECTS"
          value={String(projects.filter((project) => project.status === "active").length).padStart(2, "0")}
          delta="Projects in your account"
        />
        <Stat
          label="ASSETS CREATED"
          value="128"
          delta="Across your workspace"
        />
        <Stat label="STORAGE USED" value="6.8 GB" delta="Of 20 GB available" />
        <Stat
          label="CURRENT STREAK"
          value="07 days"
          delta="Keep the momentum going"
        />
      </div>
      <div className="workspace-grid">
        <section className="workspace-primary">
          <SectionTitle eyebrow="RECENT WORK" title="Back in the frame." />
          <div className="project-grid">
            {projects.slice(0, 3).map((p) => (
              <ProjectTile project={p} key={p.id} />
            ))}
            {projectsStatus === "loading" && <p>Loading projects...</p>}
            {projectsStatus === "ready" && projects.length === 0 && <p>Create a project to start your production workflow.</p>}
          </div>
          <SectionTitle
            eyebrow="PRODUCTION OVERVIEW"
            title="Your pipeline at a glance."
          />
          <div className="pipeline-card">
            <div className="pipeline-header">
              <div>
                <b>
                  {projects.find((p) => p.id === active)?.name ||
                    "The Red Nomad"}
                </b>
                <span>Updated 2 hours ago</span>
              </div>
              <Status tone="active">IN PRODUCTION</Status>
            </div>
            <div className="pipeline-steps">
              {stages.map((s, i) => (
                <div
                  key={s}
                  className={
                    i < 7 ? "stage-done" : i === 7 ? "stage-current" : ""
                  }
                >
                  <i>{i < 7 ? <Check size={11} /> : i + 1}</i>
                  <span>{s}</span>
                </div>
              ))}
            </div>
            <div className="pipeline-footer">
              <span>OVERALL PROGRESS</span>
              <b>68%</b>
              <Progress value={68} />
              <button
                className="inline-link"
                onClick={() => notify(actionMessage)}
              >
                Open production <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>
        <aside className="workspace-aside">
          <section className="aside-card">
            <SectionTitle eyebrow="RECENT ACTIVITY" title="Studio log" />
            <div className="activity-list">
              {[
                ["3D model approved", "The Red Nomad - 2h ago"],
                ["Texture revision saved", "Quiet Tides - Yesterday"],
                ["New version created", "Paper City - Oct 28"],
                ["Rig validation complete", "Morrow - Oct 26"],
              ].map(([a, b], i) => (
                <div key={a}>
                  <i className={`activity-icon a${i}`}>
                    <Activity size={13} />
                  </i>
                  <span>
                    <b>{a}</b>
                    <small>{b}</small>
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="aside-card storage-card">
            <Eyebrow>WORKSPACE STORAGE</Eyebrow>
            <strong>
              6.8 <small>GB / 20 GB</small>
            </strong>
            <Progress value={34} />
            <p>Your project files and previews are stored in your workspace.</p>
            <Button to="/studio/billing" variant="outline">
              Manage plan
            </Button>
          </section>
          <section className="aside-card assistant-teaser">
            <Sparkles />
            <span>STUDIO ASSISTANT</span>
            <h3>
              Need a hand
              <br />
              with the next step?
            </h3>
            <Button to="/studio/assistant" variant="outline">
              Ask the assistant
            </Button>
          </section>
        </aside>
      </div>
    </>
  );
}
export function Projects() {
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreate, setShowCreate] = useState(searchParams.get("new") === "1");
  const [name, setName] = useState("");
  const [projectType, setProjectType] = useState("Character film");
  const [saving, setSaving] = useState(false);
  const notify = useStudioStore((s) => s.notify);
  const projects = useStudioStore((s) => s.projects);
  const projectsStatus = useStudioStore((s) => s.projectsStatus);
  const projectsError = useStudioStore((s) => s.projectsError);
  const loadProjects = useStudioStore((s) => s.loadProjects);
  const createProject = useStudioStore((s) => s.createProject);
  const visible = projects.filter((p) =>
    (filter === "All" || p.stage === filter) && p.name.toLowerCase().includes(query.toLowerCase()),
  );
  useEffect(() => { loadProjects().catch((error) => notify(error.message, "error")); }, [loadProjects, notify]);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createProject({ name: name.trim(), projectType });
      setName("");
      setShowCreate(false);
      setSearchParams({}, { replace: true });
      notify("Project created.", "success");
    } catch (error) {
      notify(error.message || "Could not create the project.", "error");
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="YOUR PRODUCTION FLOOR"
        title="Projects"
        description="Every world you're building, all in one place."
        action={<Action onClick={() => setShowCreate((value) => !value)}><Plus size={15} /> New project</Action>}
      />
      {showCreate && <form className="project-create-form" onSubmit={submit}>
        <label className="field-label">Project name<input autoFocus required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Name your project" /></label>
        <label className="field-label">Project type<select value={projectType} onChange={(event) => setProjectType(event.target.value)}><option>Character film</option><option>Environment study</option><option>World building</option><option>Character exploration</option></select></label>
        <button className="button" disabled={saving || name.trim().length < 2}>{saving ? "Creating..." : "Create project"}<ArrowUpRight size={14} /></button>
      </form>}
      <div className="toolbar">
        <div className="filter-tabs">
          {["All", "Animation", "Materials", "Rigging"].map((x) => <button className={filter === x ? "selected" : ""} key={x} onClick={() => setFilter(x)}>{x}</button>)}
        </div>
        <label className="local-search"><Search size={14} /><input placeholder="Find a project..." value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      </div>
      {projectsStatus === "loading" ? <p>Loading projects...</p> : projectsStatus === "error" ? <EmptyState title="Projects could not be loaded" description={projectsError || "Check that the backend is running, then retry."} action={<button className="button outline" onClick={() => loadProjects().catch((error) => notify(error.message, "error"))}>Retry<ArrowUpRight size={14}/></button>} /> : visible.length ? (
        <div className="project-grid project-grid-wide">{visible.map((p) => <ProjectTile project={p} key={p.id} />)}</div>
      ) : (
        <EmptyState title={query || filter !== "All" ? "No projects match" : "No projects yet"} description={query || filter !== "All" ? "Try another search or filter." : "Create your first project to begin."} />
      )}
    </>
  );
}
export function CharacterLab() {
  const notify = useStudioStore((s) => s.notify);
  const storedProject = useStudioStore((s) => s.activeProject);
  const setActiveProject = useStudioStore((s) => s.setActiveProject);
  const [searchParams] = useSearchParams();
  const routeProject = searchParams.get("projectId");
  const activeProject = routeProject || storedProject;
  const [tab, setTab] = useState("Reference");
  const [references, setReferences] = useState([]);
  const [busy, setBusy] = useState(false);
  const [generation, setGeneration] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [generatedModelUrl, setGeneratedModelUrl] = useState(null);
  const generationGuard = useRef(false);
  const isGenerating = generation && ["starting", "queued", "pending", "processing"].includes(generation.status);
  useEffect(() => {
    if (routeProject) setActiveProject(routeProject);
  }, [routeProject, setActiveProject]);
  useEffect(() => {
    setReferences([]);
    if (!activeProject) return;
    Promise.all([productionApi.characters(activeProject), assetsApi.list(activeProject)])
      .then(([characters, assets]) => {
        const savedIds = characters.data[0]?.referenceImages || [];
        const images = assets.data.filter((asset) => asset.assetType === "image");
        setReferences(savedIds.length ? images.filter((asset) => savedIds.includes(asset.id)) : images);
      })
      .catch((error) => notify(error.message, "error"));
  }, [activeProject, notify]);
  useEffect(() => {
    let cancelled = false;
    let objectUrl;
    const image = references[0];
    if (image?.id) {
      assetsApi.download(image.id).then((response) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(response);
        setImagePreview(objectUrl);
      }).catch((error) => notify(error.message || "Image preview could not be loaded.", "error"));
    } else if (!image) {
      setImagePreview(null);
    }
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [references, notify]);
  useEffect(() => () => {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);
  useEffect(() => () => {
    if (generatedModelUrl?.startsWith("blob:")) URL.revokeObjectURL(generatedModelUrl);
  }, [generatedModelUrl]);
  useEffect(() => {
    const jobId = generation?.jobId;
    if (!jobId || !["queued", "pending", "processing"].includes(generation.status)) return;
    let stopped = false;
    let reader;
    const consumeEvents = async () => {
      try {
        const token = getAccessToken();
        const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/events`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok || !response.body) throw new Error("Could not connect to generation progress.");
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!stopped) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let boundary;
          while ((boundary = buffer.indexOf("\n\n")) >= 0) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const dataLine = frame.split(/\r?\n/).find((line) => line.startsWith("data: "));
            if (!dataLine) continue;
            const job = JSON.parse(dataLine.slice(6));
            setGeneration({ jobId, status: job.status, progress: job.progress || 0, provider: job.provider === "adapter" ? null : job.provider, error: job.error?.message });
            if (["completed", "failed", "cancelled"].includes(job.status)) {
              stopped = true;
              generationGuard.current = false;
              if (job.status === "completed" && job.output?.assetId) {
                const file = await assetsApi.download(job.output.assetId);
                const url = URL.createObjectURL(file);
                setGeneratedModelUrl(url);
                setTab("Model preview");
                notify(`3D model generated with ${job.output.provider || "AI"}.`, "success");
              } else if (job.status === "failed") {
                notify(job.error?.message || "Model generation failed.", "error");
              }
              await reader.cancel();
              return;
            }
          }
        }
      } catch (error) {
        if (!stopped) {
          generationGuard.current = false;
          setGeneration({ jobId, status: "failed", progress: 0 });
          notify(error.message || "Could not read model generation progress.", "error");
        }
      }
    };
    consumeEvents();
    return () => { stopped = true; reader?.cancel(); };
  }, [generation?.jobId, notify]);
  const uploadReference = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      notify("Choose an image smaller than 20 MB.", "error");
      event.target.value = "";
      return;
    }
    setImagePreview(URL.createObjectURL(file));
    setGeneratedModelUrl(null);
    setGeneration(null);
    generationGuard.current = false;
    setBusy(true);
    try {
      const response = await assetsApi.upload(activeProject, file);
      const character = await ensureCharacter(activeProject, "Studio character");
      const next = [...new Set([...(character.referenceImages || []), ...references.map((asset) => asset.id), response.data.id])];
      await productionApi.updateCharacter(character.id, { referenceImages: next });
      setReferences((current) => [response.data, ...current]);
      notify("Reference image uploaded and linked to the character.", "success");
    }
    catch (error) { notify(error.message || "Reference upload failed.", "error"); }
    finally { event.target.value = ""; setBusy(false); }
  };
  const generateModel = async () => {
    if (generationGuard.current) return;
    if (!activeProject) return notify("Select a project first.", "error");
    if (!references.length) return notify("Upload a reference image before generating a model.", "error");
    generationGuard.current = true;
    setGeneratedModelUrl(null);
    setGeneration({ status: "starting", progress: 0 });
    try {
      const character = await ensureCharacter(activeProject, "Studio character");
      const response = await productionApi.generateModel(activeProject, { characterId: character.id, referenceAssetIds: references.map((asset) => asset.id) });
      setGeneration({ jobId: response.data.jobId, status: "queued", progress: 0 });
      notify("Model generation started.", "info");
    } catch (error) {
      generationGuard.current = false;
      setGeneration({ status: "failed", progress: 0 });
      notify(error.message || "Could not queue model generation.", "error");
    }
  };
  return (
    <>
      <PageTitle
        eyebrow="3D MODEL CREATION"
        title="Create a 3D model."
        description="Upload a reference image, then generate an editable 3D model for this project."
      />
      {!activeProject && <DemoNotice>Select a project before uploading references or generating a model.</DemoNotice>}
      {generation?.status === "failed" && generation.error && <DemoNotice>{generation.error}</DemoNotice>}
      <div className="lab-layout model-creation-layout">
        <aside className="lab-sidebar">
          <label className="upload-zone">
            {imagePreview ? <img className="upload-image-preview" src={imagePreview} alt="Uploaded reference preview" /> : <Upload size={18} />}
            <b>{busy ? "Uploading..." : references[0]?.fileName || "Upload reference image"}</b>
            <span>PNG, JPG - up to 20 MB</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={busy || isGenerating || !activeProject} onChange={uploadReference} />
          </label>
          <Action onClick={generateModel} disabled={busy || isGenerating || !references.length || !activeProject}>
            <Sparkles size={15} /> {isGenerating ? "Generating..." : "Generate model"}
          </Action>
        </aside>
        <section className="lab-main">
          <div className="lab-toolbar">
            <div className="filter-tabs">
              {["Reference", "Model preview"].map((x) => (
                <button
                  className={tab === x ? "selected" : ""}
                  onClick={() => setTab(x)}
                  key={x}
                >
                  {x}
                </button>
              ))}
            </div>
            <TinyAction onClick={() => notify(actionMessage)}>
              <RotateCcw size={14} /> Reset view
            </TinyAction>
          </div>
          <div className={`viewport ${isGenerating ? "model-generating" : ""}`}>
            <div className="viewport-grid" />
            {isGenerating && <div className="generation-overlay" role="status" aria-live="polite"><span className="generation-orb" /><b>{generation.status === "queued" ? "Waiting for the generation worker" : "Generating your 3D model"}</b><span>{generation.provider ? `Using ${generation.provider}` : generation.status === "queued" ? "Queued" : "Preparing AI providers"} · {generation.progress || 0}%</span><div className="generation-progress"><i style={{ width: `${generation.progress || 8}%` }} /></div></div>}
            <div className="viewport-axis">
              <i>X</i>
              <i>Y</i>
              <i>Z</i>
            </div>
            {tab === "Model preview" ? (
              <Suspense
                fallback={
                  <div className="viewport-loading">
                    Preparing 3D viewport...
                  </div>
                }
              >
                <CharacterViewport modelUrl={generatedModelUrl} />
              </Suspense>
            ) : imagePreview ? (
              <img className="viewport-reference-image" src={imagePreview} alt="Uploaded reference" />
            ) : (
              <CharacterPreview />
            )}
            <span className="viewport-label">
              {tab.toUpperCase()} / ORTHOGRAPHIC
            </span>
            <button
              className="viewport-corner"
              onClick={() => notify("Viewport controls are preview-only.")}
            >
              ?
            </button>
          </div>
          <div className="viewport-caption">
            <span>
              <i />{" "}
              {tab === "Reference"
                ? "REFERENCE IMAGE - NOMAD_REF_01.JPG"
                : "MODEL PREVIEW - NOMAD_V04"}
            </span>
            <span>100%</span>
          </div>
        </section>
      </div>
    </>
  );
}
function CharacterPreview() {
  return (
    <div className="viewport-character">
      <div className="preview-head" />
      <div className="preview-body" />
      <div className="preview-leg l" />
      <div className="preview-leg r" />
      <div className="preview-light" />
    </div>
  );
}
export function MeshLab() {
  const notify = useStudioStore((s) => s.notify);
  const activeProject = useStudioStore((s) => s.activeProject);
  const [mode, setMode] = useState("Solid");
  const [models, setModels] = useState([]);
  const [modelId, setModelId] = useState("");
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const refreshModels = () => activeProject ? assetsApi.models(activeProject).then((response) => { setModels(response.data); setModelId((current) => current || response.data[0]?.id || ""); }) : (setModels([]), setModelId(""), Promise.resolve([]));
  useEffect(() => { setModelId(""); refreshModels().catch((error) => notify(error.message, "error")); }, [activeProject]);
  const meshOperation = async (operation) => {
    if (!modelId) return notify("Generate or upload a model first.", "error");
    setBusy(true);
    try {
      const response = await productionApi.mesh(modelId, operation, {});
      notify(`${operation} queued: ${response.data.jobId}`, "success");
      if (operation === "validate") {
        const result = await productionApi.meshReport(modelId);
        setReport(result.data);
      }
    } catch (error) { notify(error.message || `Could not start ${operation}.`, "error"); }
    finally { setBusy(false); }
  };
  return (
    <>
      <PageTitle
        eyebrow="MESH LAB / PRJ-042"
        title="Geometry, in focus."
        description="Inspect topology and prepare a clean mesh for materials, rigging and animation."
        action={
          <Action onClick={() => meshOperation("validate")}>
            <ShieldCheck size={15} /> Validate mesh
          </Action>
        }
      />
      {!activeProject && <DemoNotice>Select a project with a generated or uploaded model to edit its mesh.</DemoNotice>}
      <div className="editor-layout">
        <aside className="editor-tools">
          <Eyebrow>TOOLS</Eyebrow>
          {[
            [Move3D, "Transform"],
            [Scan, "Inspect"],
            [Triangle, "Retopology"],
            [RotateCcw, "Repair"],
          ].map(([Icon, x]) => (
            <button
              key={x}
              onClick={() => meshOperation(x === "Retopology" ? "retopology" : x === "Repair" ? "repair" : "validate")}
            >
              <Icon size={16} />
              {x}
            </button>
          ))}
        </aside>
        <section className="editor-viewport">
          <div className="viewport-toolbar">
            <label className="field-label">MODEL <select value={modelId} onChange={(event) => setModelId(event.target.value)}><option value="">Select model</option>{models.map((model) => <option value={model.id} key={model.id}>{model.fileName}</option>)}</select></label>
            <span>
              <Grid2X2 size={14} /> VIEWPORT
            </span>
            <div>
              {["Solid", "Wireframe", "Material"].map((x) => (
                <button
                  className={mode === x ? "selected" : ""}
                  onClick={() => setMode(x)}
                  key={x}
                >
                  {x}
                </button>
              ))}
            </div>
            <TinyAction
              onClick={() =>
                notify("Viewport expanded in the connected editor.")
              }
            >
              ?
            </TinyAction>
          </div>
          <div className={`mesh-canvas mesh-${mode.toLowerCase()}`}>
            <div className="viewport-grid" />
            <CharacterPreview />
            <span className="mesh-count">68,420 VERTS - 136,812 FACES</span>
          </div>
          <div className="editor-timeline">
            <span>MODEL CHECK</span>
            <Progress value={92} />
            <b>92 / 100</b>
          </div>
        </section>
        <aside className="properties-panel">
          <Eyebrow>MESH REPORT</Eyebrow>
          <h3>Nomad / v04</h3>
          {[
            ["Meshes", report?.meshCount ?? "—"],
            ["Vertices", report?.vertices?.toLocaleString() ?? "—"],
            ["Polygons", report?.polygons?.toLocaleString() ?? "—"],
            ["Non-manifold edges", report?.nonManifoldEdges ?? "Run validation"],
            ["Last operation", report?.operation ?? "—"],
          ].map(([a, b]) => (
            <div className="property-row" key={a}>
              <span>{a}</span>
              <b>{b}</b>
            </div>
          ))}
          <hr />
          <Eyebrow>OPTIMIZATION</Eyebrow>
          <label className="range-label">
            Target polygon count <b>68k</b>
            <input type="range" defaultValue="68" />
          </label>
          <Button
            variant="outline"
            onClick={() => meshOperation("optimize")}
            disabled={busy || !modelId}
          >
            Optimize mesh
          </Button>
        </aside>
      </div>
    </>
  );
}
export function MaterialsLab() {
  const [rough, setRough] = useState(42);
  const [metal, setMetal] = useState(18);
  const [color, setColor] = useState("#9c5547");
  const notify = useStudioStore((s) => s.notify);
  const activeProject = useStudioStore((s) => s.activeProject);
  const [characterId, setCharacterId] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [materialName, setMaterialName] = useState("Weathered clay");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setCharacterId(""); setMaterialId("");
    if (activeProject) productionApi.characters(activeProject).then((response) => { const id = response.data[0]?.id; if (id) { setCharacterId(id); productionApi.materials(id).then((materials) => { const first = materials.data[0]; if (first) { setMaterialId(first.id); setMaterialName(first.name || "Material"); setColor(first.baseColor || "#9c5547"); setRough(Math.round((first.roughness ?? 0.42) * 100)); setMetal(Math.round((first.metallic ?? 0.18) * 100)); } }).catch((error) => notify(error.message, "error")); } }).catch((error) => notify(error.message, "error"));
  }, [activeProject, notify]);
  const saveMaterial = async () => {
    if (!activeProject) return notify("Select a project first.", "error");
    setSaving(true);
    try {
      const character = characterId ? { id: characterId } : await ensureCharacter(activeProject);
      const payload = { name: materialName, materialType: "surface", baseColor: color, roughness: rough / 100, metallic: metal / 100 };
      const response = materialId ? await productionApi.updateMaterial(materialId, payload) : await productionApi.createMaterial(character.id, payload);
      setCharacterId(character.id); setMaterialId(response.data.id); notify("Material saved.", "success");
    } catch (error) { notify(error.message || "Could not save material.", "error"); }
    finally { setSaving(false); }
  };
  const applyMaterial = async () => {
    if (!materialId) return notify("Save the material before applying it.", "error");
    try { await productionApi.applyMaterial(materialId); notify("Material applied.", "success"); }
    catch (error) { notify(error.message || "Could not apply material.", "error"); }
  };
  const generateTexture = async () => {
    if (!materialId) return notify("Save the material before generating a texture.", "error");
    try { const response = await productionApi.generateTexture(materialId, { prompt: materialName, baseColor: color }); notify(`Texture generation queued: ${response.data.jobId}`, "success"); }
    catch (error) { notify(error.message || "Could not generate a texture.", "error"); }
  };
  return (
    <>
      <PageTitle
        eyebrow="MATERIALS LAB / PRJ-042"
        title="Give it a surface."
        description="Tune surface properties and review a material preview before it moves into the scene."
        action={
          <Action onClick={saveMaterial}>
            <Save size={15} /> Save material
          </Action>
        }
      />
      {!activeProject && <DemoNotice>Select a project before saving materials.</DemoNotice>}
      <div className="materials-layout">
        <section
          className="material-preview"
          style={{ "--material-color": color }}
        >
          <div className="viewport-grid" />
          <div className="material-sphere" />
          <div className="preview-caption">
            <span>PREVIEW / STUDIO LIGHTING</span>
            <span>SPHERE</span>
          </div>
        </section>
        <aside className="material-controls">
          <div className="controls-head">
            <span>
              <Palette size={16} /> MATERIAL / 01
            </span>
            <TinyAction onClick={generateTexture}>
              ...
            </TinyAction>
          </div>
          <label className="field-label">
            Material name
            <input value={materialName} onChange={(event) => setMaterialName(event.target.value)} />
          </label>
          <div className="color-setting">
            <label>Base color</label>
            <input
              aria-label="Base color"
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
            <code>{color.toUpperCase()}</code>
          </div>
          <Range label="Roughness" value={rough} onChange={setRough} />
          <Range label="Metallic" value={metal} onChange={setMetal} />
          <div className="texture-slot">
            <Eyebrow>TEXTURE MAPS</Eyebrow>
            {["Base color", "Normal", "Roughness"].map((x, i) => (
              <button
                key={x}
                onClick={generateTexture}
              >
                <span>
                  {i === 0 ? <Image size={15} /> : <Layers3 size={15} />} {x}
                </span>
                <Upload size={14} />
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={applyMaterial} disabled={saving}>
            Apply to model
          </Button>
        </aside>
      </div>
      <div className="preset-row">
        <Eyebrow>MATERIAL PRESETS</Eyebrow>
        {[
          "Weathered clay",
          "Brushed metal",
          "Soft fabric",
          "Glazed ceramic",
          "Matte polymer",
        ].map((x, i) => (
          <button
            key={x}
            onClick={() => {
              setColor(
                ["#9c5547", "#77736a", "#60544d", "#b9a18a", "#3f3934"][i],
              );
              notify(`${x} preview selected.`);
            }}
          >
            <i
              style={{
                background: [
                  "#9c5547",
                  "#77736a",
                  "#60544d",
                  "#b9a18a",
                  "#3f3934",
                ][i],
              }}
            />
            {x}
          </button>
        ))}
      </div>
    </>
  );
}
function Range({ label, value, onChange }) {
  return (
    <label className="range-label">
      {label}
      <b>{value}%</b>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span>
        <small>0</small>
        <small>100</small>
      </span>
    </label>
  );
}
export function RiggingLab() {
  const notify = useStudioStore((s) => s.notify);
  const [showBones, setShowBones] = useState(true);
  const activeProject = useStudioStore((s) => s.activeProject);
  const [busy, setBusy] = useState(false);
  const runRigging = async (operation) => {
    if (!activeProject) return notify("Select a project first.", "error");
    setBusy(true);
    try {
      const character = await ensureCharacter(activeProject);
      const response = operation === "generate" ? await productionApi.generateRig(character.id, { type: "humanoid" }) : await productionApi.riggingOperation(character.id, operation, {});
      notify(operation === "generate" ? `Rig generation queued: ${response.data.jobId}` : `Rig ${operation} queued: ${response.data.jobId}`, "success");
    } catch (error) { notify(error.message || `Could not ${operation} rig.`, "error"); }
    finally { setBusy(false); }
  };
  return (
    <>
      <PageTitle
        eyebrow="RIGGING LAB / PRJ-042"
        title="Ready for a performance."
        description="Inspect the character skeleton and review rig settings before animation."
        action={
          <Action onClick={() => runRigging("generate")}>
            <Sparkles size={15} /> Generate rig
          </Action>
        }
      />
      {!activeProject && <DemoNotice>Select a project before generating or validating a rig.</DemoNotice>}
      <div className="rig-layout">
        <section className="rig-viewport">
          <div className="viewport-toolbar">
            <span>RIG PREVIEW / FRONT</span>
            <button
              className="switch"
              onClick={() => setShowBones(!showBones)}
              aria-pressed={showBones}
            >
              {showBones ? "Bones on" : "Bones off"}
            </button>
          </div>
          <div className="viewport mesh-canvas">
            <div className="viewport-grid" />
            <CharacterPreview />
            {showBones && (
              <div className="bone-overlay">
                <i />
                <i />
                <i />
                <i />
                <b />
                <b />
                <b />
              </div>
            )}
            <span className="viewport-label">HUMANOID / 56 BONES</span>
          </div>
          <div className="rig-controls">
            <button onClick={() => notify("Playback preview only.")}>
              <Play size={14} /> Test movement
            </button>
            <span>REST POSE</span>
            <button onClick={() => notify("Rig controls are preview-only.")}>
              <RotateCcw size={14} /> Reset pose
            </button>
          </div>
        </section>
        <aside className="properties-panel">
          <Eyebrow>SKELETON HIERARCHY</Eyebrow>
          <h3>Humanoid rig / v02</h3>
          <div className="hierarchy">
            {[
              "Root",
              "+- Hips",
              "  +- Spine",
              "  |-- Chest",
              "  |-- Neck",
              "  |   `-- Head",
              "  +- Left leg",
              "  +- Right leg",
              "  +- Left arm",
              "  +- Right arm",
            ].map((x, i) => (
              <div key={x} className={i === 0 ? "tree-root" : ""}>
                <span>{x}</span>
                <small>
                  {i === 0 ? "ROOT" : `BONE ${String(i).padStart(2, "0")}`}
                </small>
              </div>
            ))}
          </div>
          <div className="property-row">
            <span>Rig health</span>
            <b>94 / 100</b>
          </div>
          <Progress value={94} />
          <Button
            variant="outline"
            onClick={() => runRigging("validate")}
            disabled={busy || !activeProject}
          >
            Validate rig
          </Button>
        </aside>
      </div>
    </>
  );
}
export function AnimationLab() {
  const [playing, setPlaying] = useState(false);
  const [frame, setFrame] = useState(12);
  const notify = useStudioStore((s) => s.notify);
  const activeProject = useStudioStore((s) => s.activeProject);
  const [animationName, setAnimationName] = useState("Walk cycle");
  const [busy, setBusy] = useState(false);
  const generateMotion = async () => {
    if (!activeProject) return notify("Select a project first.", "error");
    setBusy(true);
    try { const character = await ensureCharacter(activeProject); const response = await productionApi.generateAnimation(character.id, { name: animationName, duration: 4, frameRate: 24 }); notify(`Motion generation queued: ${response.data.jobId}`, "success"); }
    catch (error) { notify(error.message || "Could not queue motion generation.", "error"); }
    finally { setBusy(false); }
  };
  const saveAnimation = async () => {
    if (!activeProject) return notify("Select a project first.", "error");
    try { const character = await ensureCharacter(activeProject); await productionApi.createAnimation(character.id, { name: animationName, animationType: "custom", duration: 4, frameRate: 24, configuration: { frame } }); notify("Animation saved.", "success"); }
    catch (error) { notify(error.message || "Could not save animation.", "error"); }
  };
  return (
    <>
      <PageTitle
        eyebrow="ANIMATION LAB / PRJ-042"
        title="Direct the movement."
        description="Review a motion preview, adjust a demo timeline and prepare a performance."
        action={
          <Action onClick={generateMotion} disabled={busy}>
            <Sparkles size={15} /> Generate motion
          </Action>
        }
      />
      {!activeProject && <DemoNotice>Select a project before generating or saving animation.</DemoNotice>}
      <div className="animation-screen">
        <section className="animation-viewport">
          <div className="viewport-toolbar">
            <span>VIEWPORT / CAMERA</span>
            <span>{animationName.toUpperCase()}</span>
          </div>
          <div className="viewport mesh-canvas">
            <div className="viewport-grid" />
            <CharacterPreview />
            <span className="viewport-label">
              FRAME {String(frame).padStart(3, "0")} / 096
            </span>
          </div>
          <div className="player-controls">
            <button onClick={() => setFrame(1)}>?</button>
            <button className="play-btn" onClick={() => setPlaying(!playing)}>
              {playing ? "?" : <Play size={15} />}
            </button>
            <button onClick={() => setFrame(Math.min(96, frame + 1))}>?</button>
            <span>
              {playing ? "PREVIEW PLAYING" : "PAUSED"} - {frame} / 96
            </span>
            <b>24 FPS</b>
          </div>
        </section>
        <section className="timeline-panel">
          <div className="timeline-head">
            <span>
              <AudioLines size={15} /> TIMELINE
            </span>
            <div>
              <button onClick={() => notify("Timeline zoom changed.")}>
                -
              </button>
              <span>100%</span>
              <button onClick={() => notify("Timeline zoom changed.")}>
                +
              </button>
            </div>
          </div>
          <div className="timeline-ruler">
            {[0, 12, 24, 36, 48, 60, 72, 84, 96].map((n) => (
              <span key={n}>{n}</span>
            ))}
          </div>
          <div className="timeline-track">
            <span>ROOT</span>
            <div className="key-track">
              <i style={{ left: "12%" }} />
              <i style={{ left: "26%" }} />
              <i style={{ left: "39%" }} />
              <i style={{ left: "52%" }} />
              <i style={{ left: "65%" }} />
              <i style={{ left: "78%" }} />
              <i style={{ left: "91%" }} />
            </div>
          </div>
          <div className="timeline-track">
            <span>BODY</span>
            <div className="key-track muted-track">
              <i style={{ left: "8%" }} />
              <i style={{ left: "33%" }} />
              <i style={{ left: "58%" }} />
              <i style={{ left: "83%" }} />
            </div>
          </div>
          <input
            aria-label="Animation frame"
            className="frame-slider"
            type="range"
            min="1"
            max="96"
            value={frame}
            onChange={(e) => setFrame(Number(e.target.value))}
          />
        </section>
        <div className="animation-bottom">
          <label>
            Animation clip
            <input value={animationName} onChange={(event) => setAnimationName(event.target.value)} />
          </label>
          <label>
            Duration
            <input defaultValue="4.0 sec" />
          </label>
          <label>
            Frame rate
            <select>
              <option>24 fps</option>
              <option>30 fps</option>
              <option>60 fps</option>
            </select>
          </label>
          <Action onClick={saveAnimation}>
            Save clip
          </Action>
        </div>
      </div>
    </>
  );
}
export function FilmLab() {
  const [shot, setShot] = useState(0);
  const [sceneId, setSceneId] = useState("");
  const [busy, setBusy] = useState(false);
  const notify = useStudioStore((s) => s.notify);
  const activeProject = useStudioStore((s) => s.activeProject);
  const shots = ["EXT. DUSK - WIDE", "INT. HALL - MEDIUM", "CLOSE - REACTION"];
  useEffect(() => {
    setSceneId("");
    if (activeProject) productionApi.scenes(activeProject).then((response) => setSceneId(response.data[0]?.id || "")).catch((error) => notify(error.message, "error"));
  }, [activeProject, notify]);
  const saveScene = async () => {
    if (!activeProject) throw new Error("Select a project first.");
    const payload = { name: shots[shot], description: "Director's notes from the film workspace.", sceneOrder: shot, duration: 8, cameraSettings: { lens: 35 }, lightingSettings: { preset: "dusk" } };
    const response = sceneId ? await productionApi.updateScene(sceneId, payload) : await productionApi.createScene(activeProject, payload);
    setSceneId(response.data.id);
    return response.data.id;
  };
  const saveSceneClick = async () => { setBusy(true); try { await saveScene(); notify("Scene saved.", "success"); } catch (error) { notify(error.message || "Could not save scene.", "error"); } finally { setBusy(false); } };
  const generateScene = async () => { setBusy(true); try { const id = await saveScene(); const response = await productionApi.generateScene(id, {}); notify(`Scene generation queued: ${response.data.jobId}`, "success"); } catch (error) { notify(error.message || "Could not generate scene.", "error"); } finally { setBusy(false); } };
  const renderScene = async () => { setBusy(true); try { const id = await saveScene(); const response = await productionApi.render(id, {}); notify(`Blender render queued: ${response.data.jobId}`, "success"); } catch (error) { notify(error.message || "Could not render scene.", "error"); } finally { setBusy(false); } };
  return (
    <>
      <PageTitle
        eyebrow="FILM PRODUCTION / QUIET TIDES"
        title="Build the scene."
        description="Compose a sequence, track character continuity and prepare camera direction."
        action={
          <Action onClick={generateScene} disabled={busy}>
            <Sparkles size={15} /> Generate scene
          </Action>
        }
      />
      {!activeProject && <DemoNotice>Select a project to save scenes and queue Blender renders.</DemoNotice>}
      <div className="film-layout">
        <section className="story-editor">
          <div className="sequence-toolbar">
            <span>
              <Clapperboard size={15} /> SEQUENCE 01 / STORYBOARD
            </span>
            <button onClick={saveSceneClick} disabled={busy || !activeProject}>
              <Plus size={14} /> Add shot
            </button>
          </div>
          <div className="shot-grid">
            {shots.map((s, i) => (
              <button
                key={s}
                className={`shot-card ${shot === i ? "shot-selected" : ""}`}
                onClick={() => setShot(i)}
              >
                <div className={`shot-illustration shot-${i}`}>
                  <div />
                  <i />
                </div>
                <span>SHOT 0{i + 1}</span>
                <b>{s}</b>
                <small>00:{["08", "14", "26"][i]}</small>
              </button>
            ))}
          </div>
          <div className="shot-notes">
            <Eyebrow>SHOT 0{shot + 1} / DIRECTOR'S NOTES</Eyebrow>
            <textarea
              key={shot}
              defaultValue={
                [
                  "Establish the landscape. The last light cuts through the ridge.",
                  "The character enters frame. Camera holds, then a slow push.",
                  "A beat of silence. She turns toward the horizon.",
                ][shot]
              }
            />
          </div>
        </section>
        <aside className="properties-panel">
          <Eyebrow>SCENE SETUP</Eyebrow>
          <h3>{shots[shot]}</h3>
          {[
            ["Environment", "Dusk ridge"],
            ["Characters", "The Red Nomad"],
            ["Camera", "35mm slow push"],
            ["Lighting", "Last light - warm"],
            ["Duration", "00:48"],
          ].map(([a, b]) => (
            <div className="property-row" key={a}>
              <span>{a}</span>
              <b>{b}</b>
            </div>
          ))}
          <div className="scene-consistency">
            <Check size={14} /> Character consistency active
          </div>
          <Button
            variant="outline"
            onClick={saveSceneClick}
            disabled={busy || !activeProject}
          >
            Save scene
          </Button>
          <Button onClick={renderScene} disabled={busy || !activeProject}>Render scene</Button>
        </aside>
      </div>
    </>
  );
}
export function WorkflowEditor() {
  const [selected, setSelected] = useState(0);
  const [workflow, setWorkflow] = useState([]);
  const [busy, setBusy] = useState(false);
  const notify = useStudioStore((s) => s.notify);
  const activeProject = useStudioStore((s) => s.activeProject);
  const stageNames = ["image_upload", "image_analysis", "model_generation", "mesh_editing", "materials", "rigging"];
  const loadWorkflow = () => activeProject ? productionApi.workflow(activeProject).then((response) => setWorkflow(response.data)) : (setWorkflow([]), Promise.resolve([]));
  useEffect(() => { loadWorkflow().catch((error) => notify(error.message, "error")); }, [activeProject]);
  const processStage = async (retry = false) => {
    if (!activeProject) return notify("Select a project first.", "error");
    setBusy(true);
    try {
      const stage = stageNames[selected];
      if (retry) await productionApi.retryStage(activeProject, stage);
      else await productionApi.approveStage(activeProject, stage);
      await loadWorkflow();
      notify(retry ? "Stage retry queued." : "Stage approved.", "success");
    } catch (error) { notify(error.message || "Workflow update failed.", "error"); }
    finally { setBusy(false); }
  };
  const nodeNames = ["Reference", "Analyze", "Generate model", "Mesh cleanup", "Character DNA", "Rig & animate"];
  return (
    <>
      <PageTitle
        eyebrow="VISUAL PRODUCTION GRAPH"
        title="Your workflow, in view."
        description="Explore stage relationships and keep the entire production path legible."
        action={<Action onClick={() => loadWorkflow().catch((error) => notify(error.message, "error"))}><RotateCcw size={15} /> Refresh workflow</Action>}
      />
      {!activeProject && <DemoNotice>Select a project to load its workflow stages.</DemoNotice>}
      <section className="workflow-editor">
        <div className="graph-toolbar">
          <span>
            <Workflow size={15} /> CHARACTER PIPELINE / V1
          </span>
          <div>
            <TinyAction onClick={() => notify("Graph zoom changed.")}>
              -
            </TinyAction>
            <span>100%</span>
            <TinyAction onClick={() => notify("Graph zoom changed.")}>
              +
            </TinyAction>
            <TinyAction onClick={() => notify("Workflow graph reset.")}>
              ?
            </TinyAction>
          </div>
        </div>
        <div className="graph-canvas">
          <svg
            className="graph-wires"
            viewBox="0 0 900 490"
            preserveAspectRatio="none"
          >
            <path d="M110 102 C170 102 155 180 210 180" />
            <path d="M340 180 C395 180 390 102 450 102" />
            <path d="M340 180 C395 180 390 260 450 260" />
            <path d="M580 102 C635 102 620 180 680 180" />
            <path d="M580 260 C635 260 620 180 680 180" />
            <path d="M810 180 C850 180 835 260 865 260" />
          </svg>
          {[
            ["Reference", 110, 102, "Image"],
            ["Analyze", 275, 180, "AI"],
            ["Generate model", 515, 102, "3D"],
            ["Mesh cleanup", 515, 260, "Geometry"],
            ["Character DNA", 745, 180, "Profile"],
            ["Rig & animate", 850, 260, "Motion"],
          ].map(([n, x, y, t], i) => (
            <button
              key={n}
              className={`graph-node ${selected === i ? "node-selected" : ""}`}
              style={{ left: `${x / 9}%`, top: `${y / 4.9}%` }}
              onClick={() => setSelected(i)}
            >
              <span>{t}</span>
              <b>{n}</b>
              <small>{workflow.find((stage) => stage.stageName === stageNames[i])?.status?.toUpperCase() || "PENDING"}</small>
            </button>
          ))}
        </div>
        <div className="graph-properties">
          <span>SELECTED STAGE</span>
          <b>
            {
              nodeNames[selected]
            }
          </b>
          <p>{workflow.find((stage) => stage.stageName === stageNames[selected])?.status || "pending"} — stage status is saved to this project.</p>
          <button onClick={() => processStage(false)} disabled={busy || !activeProject}>Approve stage <Check size={13} /></button>
          <button onClick={() => processStage(true)} disabled={busy || !activeProject}>Retry stage <RotateCcw size={13} /></button>
        </div>
      </section>
    </>
  );
}
export function Assistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Welcome to the studio. I can help you plan a workflow or find a tool. This demo assistant does not call an AI service.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const send = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setMessages((m) => [
      ...m,
      { role: "user", text: draft.trim() },
      {
        role: "assistant",
        text: "This assistant is a frontend preview, so it cannot generate a response yet. Your prompt has not been sent to a service.",
      },
    ]);
    setDraft("");
  };
  return (
    <>
      <PageTitle
        eyebrow="YOUR CREATIVE COPILOT"
        title="Studio Assistant"
        description="Plan a production step, find a tool or orient yourself in the workspace."
      />
      <DemoNotice>
        Assistant responses are sample UI. No prompt is sent to an AI provider.
      </DemoNotice>
      <div className="assistant-layout">
        <div className="assistant-chat">
          <div className="chat-head">
            <Sparkles size={17} />
            <span>STUDIO ASSISTANT</span>
            <Status>DEMO</Status>
          </div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-message ${m.role}`}>
                <span>{m.role === "assistant" ? "A" : "VN"}</span>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
          <div className="prompt-chips">
            {[
              "Plan my character workflow",
              "Where do I export a Blender file?",
              "How should I prepare a rig?",
            ].map((x) => (
              <button key={x} onClick={() => setDraft(x)}>
                {x}
              </button>
            ))}
          </div>
          <form className="chat-input" onSubmit={send}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about your production..."
            />
            <button aria-label="Send prompt">
              <ArrowUpRight size={16} />
            </button>
          </form>
        </div>
        <aside className="assistant-side">
          <Eyebrow>QUICK REFERENCE</Eyebrow>
          <h3>Connected stages</h3>
          {stages.slice(0, 6).map((x, i) => (
            <div className="reference-row" key={x}>
              <span>0{i + 1}</span>
              {x}
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
export function BlenderBridge() {
  const notify = useStudioStore((s) => s.notify);
  const projects = useStudioStore((s) => s.projects);
  const loadProjects = useStudioStore((s) => s.loadProjects);
  const activeProject = useStudioStore((s) => s.activeProject);
  const setActiveProject = useStudioStore((s) => s.setActiveProject);
  const [projectId, setProjectId] = useState(activeProject || "");
  const [format, setFormat] = useState("BLEND");
  const [assets, setAssets] = useState([]);
  const [sourceAssetId, setSourceAssetId] = useState("");
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { loadProjects().catch((error) => notify(error.message, "error")); }, [loadProjects, notify]);
  useEffect(() => { if (!projectId && activeProject) setProjectId(activeProject); }, [activeProject, projectId]);
  useEffect(() => {
    if (!projectId) { setAssets([]); return; }
    setActiveProject(projectId);
    assetsApi.list(projectId).then((response) => setAssets(response.data.filter((asset) => ["model", "blender_project"].includes(asset.assetType)))).catch((error) => notify(error.message, "error"));
  }, [projectId, setActiveProject, notify]);
  useEffect(() => {
    const jobId = job?.jobId || job?.id;
    if (!jobId || !["queued", "pending", "processing"].includes(job.status)) return;
    const timer = window.setInterval(() => jobsApi.get(jobId).then((response) => setJob(response.data)).catch((error) => notify(error.message, "error")), 2000);
    return () => window.clearInterval(timer);
  }, [job?.jobId, job?.id, job?.status, notify]);
  const startExport = async () => {
    if (!projectId) return notify("Create or select a project first.", "error");
    setBusy(true);
    try {
      const response = await exportsApi.create(projectId, { format, sourceAssetId: sourceAssetId || undefined });
      setJob(response.data);
      notify("Blender export queued.", "success");
    } catch (error) { notify(error.message || "Could not start Blender export.", "error"); }
    finally { setBusy(false); }
  };
  const downloadResult = async () => {
    if (!job?.output?.assetId) return;
    try {
      const blob = await assetsApi.download(job.output.assetId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = job.output.fileName || `export.${format.toLowerCase()}`; link.click(); URL.revokeObjectURL(url);
    } catch (error) { notify(error.message || "Could not download the export.", "error"); }
  };
  const selectedProject = projects.find((project) => project.id === projectId);
  return (
    <>
      <PageTitle
        eyebrow="BLENDER LIVE BRIDGE"
        title="Your scene. Your tools."
        description="Prepare an editable Blender handoff and keep track of linked production assets."
        action={
          <Action onClick={startExport}>
            <ArrowDownToLine size={15} /> Export project
          </Action>
        }
      />
      <p className="demo-notice">Exports run through the configured backend Blender worker. Job output is saved as a project asset.</p>
      <div className="blender-layout">
        <section className="blender-viewport">
          <div className="viewport-toolbar">
            <label>PROJECT <select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Select project</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            <span>{selectedProject?.name || "NO PROJECT SELECTED"}</span>
          </div>
          <div className="viewport mesh-canvas">
            <div className="viewport-grid" />
            <Suspense
              fallback={
                <div className="viewport-loading">Preparing 3D viewport...</div>
              }
            >
              <CharacterViewport />
            </Suspense>
            <span className="viewport-label">CAMERA / 35MM / FRAME 096</span>
          </div>
          <div className="export-settings">
            <span>EXPORT FORMAT</span>
            {["BLEND", "GLB", "GLTF", "FBX", "OBJ"].map((x) => (
              <button
                className={format === x ? "selected" : ""}
                onClick={() => setFormat(x)}
                key={x}
              >
                .{x.toLowerCase()}
              </button>
            ))}
            <label className="field-label">Source model<select value={sourceAssetId} onChange={(event) => setSourceAssetId(event.target.value)}><option value="">Use current Blender scene</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.fileName}</option>)}</select></label>
          </div>
        </section>
        <aside className="properties-panel">
          <Eyebrow>PROJECT PACKAGE</Eyebrow>
          <h3>{job?.output?.fileName || `${selectedProject?.name || "Project"}.${format.toLowerCase()}`}</h3>
          <p>Export a Blender scene or interchange model from the selected source asset.</p>
          <div className="bridge-status">
            <i /> Blender job <b>{job?.status || "Ready"}</b>
          </div>
          {job?.error?.message && <p role="alert">{job.error.message}</p>}
          {job?.progress > 0 && <Progress value={job.progress} />}
          {job?.output?.assetId ? <Button onClick={downloadResult}><Download size={14}/> Download export</Button> : <Button onClick={startExport} disabled={busy || !projectId}>{busy ? "Queuing..." : "Prepare export"}
          </Button>
          }
        </aside>
      </div>
    </>
  );
}
export function Assets() {
  const [kind, setKind] = useState("All assets");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const activeProject = useStudioStore((s) => s.activeProject);
  const projects = useStudioStore((s) => s.projects);
  const notify = useStudioStore((s) => s.notify);
  const refresh = () => activeProject ? assetsApi.list(activeProject).then((response) => setRows(response.data)) : (setRows([]), Promise.resolve([]));
  useEffect(() => { refresh().catch((error) => notify(error.message, "error")); }, [activeProject]);
  const upload = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    setBusy(true);
    try { await assetsApi.upload(activeProject, file); await refresh(); notify("Asset uploaded.", "success"); }
    catch (error) { notify(error.message || "Asset upload failed.", "error"); }
    finally { event.target.value = ""; setBusy(false); }
  };
  const visible = rows.filter((asset) => {
    const type = asset.assetType === "model" ? "3D Model" : asset.assetType === "texture" ? "Texture" : asset.assetType === "animation" ? "Animation" : asset.assetType === "render" ? "Render" : "Other";
    return (kind === "All assets" || type === kind) && asset.fileName.toLowerCase().includes(query.toLowerCase());
  });
  const download = async (asset) => {
    try { const blob = await assetsApi.download(asset.id); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = asset.fileName; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
    catch (error) { notify(error.message || "Asset download failed.", "error"); }
  };
  return (
    <>
      <PageTitle
        eyebrow="PROJECT LIBRARY"
        title="Assets"
        description="Find the source files and production outputs linked to your projects."
        action={
          <label className="button">{busy ? "Uploading..." : <><Upload size={15} /> Upload asset</>}<input type="file" hidden disabled={busy || !activeProject} onChange={upload} /></label>
        }
      />
      {!activeProject && <DemoNotice>Select a project before uploading or browsing its assets.</DemoNotice>}
      <div className="toolbar">
        <div className="filter-tabs">
          {["All assets", "3D Model", "Texture", "Animation", "Render"].map(
            (x) => (
              <button
                className={kind === x ? "selected" : ""}
                onClick={() => setKind(x)}
                key={x}
              >
                {x}
              </button>
            ),
          )}
        </div>
        <label className="local-search">
          <Search size={14} />
          <input
            placeholder="Search assets..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <Table
        columns={["ASSET", "TYPE", "FORMAT", "SIZE", "UPDATED", ""]}
        rows={visible.map((asset) => [
          <span className="asset-name">
            <FileImage size={16} />
            {asset.fileName}
          </span>,
          asset.assetType,
          <span className="format-tag">{asset.format}</span>,
          `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB`,
          asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : "—",
          <button
            className="table-icon"
            onClick={() => download(asset)}
          >
            <Download size={15} />
          </button>,
        ])}
      />
      <div className="table-foot">Showing {visible.length} assets <span>{projects.find((project) => project.id === activeProject)?.name || "NO PROJECT"}</span></div>
    </>
  );
}
export function Versions() {
  const [selected, setSelected] = useState(null);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const notify = useStudioStore((s) => s.notify);
  const activeProject = useStudioStore((s) => s.activeProject);
  const projects = useStudioStore((s) => s.projects);
  const refresh = () => activeProject ? productionApi.versions(activeProject).then((response) => { setRows(response.data); setSelected((current) => current || response.data[0]?.id || null); }) : (setRows([]), Promise.resolve([]));
  useEffect(() => { setSelected(null); refresh().catch((error) => notify(error.message, "error")); }, [activeProject]);
  const saveVersion = async () => { if (!activeProject) return notify("Select a project first.", "error"); setBusy(true); try { const response = await productionApi.createVersion(activeProject, { description: "Manual checkpoint" }); setRows((current) => [response.data, ...current]); setSelected(response.data.id); notify("Version saved.", "success"); } catch (error) { notify(error.message || "Could not save version.", "error"); } finally { setBusy(false); } };
  const restoreVersion = async () => { if (!selected) return; setBusy(true); try { await productionApi.restoreVersion(selected); notify("Project restored to the selected version.", "success"); } catch (error) { notify(error.message || "Could not restore version.", "error"); } finally { setBusy(false); } };
  const chosen = rows.find((version) => version.id === selected);
  return (
    <>
      <PageTitle
        eyebrow={`PROJECT HISTORY / ${projects.find((project) => project.id === activeProject)?.name || "NO PROJECT"}`}
        title="Versions"
        description="Review saved checkpoints and understand how a project has evolved."
        action={
          <Action onClick={saveVersion}>
            <Save size={15} /> Save version
          </Action>
        }
      />
      {!activeProject && <DemoNotice>Select a project to view and save its versions.</DemoNotice>}
      <div className="versions-layout">
        <div className="version-list">
          {rows.map((version) => (
            <button
              key={version.id}
              className={selected === version.id ? "version-selected" : ""}
              onClick={() => setSelected(version.id)}
            >
              <i className="version-dot" />
              <div>
                <b>
                  v{String(version.versionNumber).padStart(2, "0")}{" "}
                  <span>
                    {selected === version.id && <Status tone="good">SELECTED</Status>}
                  </span>
                </b>
                <small>{version.createdAt ? new Date(version.createdAt).toLocaleString() : ""}</small>
                <p>{version.description || "Project checkpoint"}</p>
              </div>
              <ArrowUpRight size={15} />
            </button>
          ))}
        </div>
        <aside className="version-preview">
          <Eyebrow>{chosen ? `VERSION ${String(chosen.versionNumber).padStart(2, "0")}` : "NO VERSION SELECTED"}</Eyebrow>
          <h3>{chosen?.description || "Project checkpoint"}</h3>
          <div className="version-art">
            <CharacterPreview />
          </div>
          <div className="property-row">
            <span>Project</span>
            <b>{projects.find((project) => project.id === activeProject)?.name || "—"}</b>
          </div>
          <div className="property-row">
            <span>Saved by</span>
            <b>Your account</b>
          </div>
          <div className="property-row">
            <span>Included assets</span>
            <b>{chosen?.assetIds?.length || 0} files</b>
          </div>
          <Button
            variant="outline"
            onClick={restoreVersion}
            disabled={!chosen || busy}
          >
            Restore this version
          </Button>
        </aside>
      </div>
    </>
  );
}
export function Billing() {
  const annual = useStudioStore((s) => s.billingAnnual),
    toggle = useStudioStore((s) => s.toggleBilling),
    notify = useStudioStore((s) => s.notify);
  return (
    <>
      <PageTitle
        eyebrow="WORKSPACE PLAN"
        title="Billing & usage"
        description="Understand your current workspace tier and resource usage."
      />
      <DemoNotice>
        Billing is a preview. No payment method or subscription is connected.
      </DemoNotice>
      <div className="billing-layout">
        <section className="billing-main">
          <div className="current-plan">
            <div>
              <Eyebrow>CURRENT PLAN</Eyebrow>
              <h2>
                Creator <Status tone="good">ACTIVE</Status>
              </h2>
              <p>Your current plan is represented as demo workspace data.</p>
            </div>
            <Button
              variant="outline"
              onClick={() => notify("Plan management is not connected.")}
            >
              Manage plan
            </Button>
          </div>
          <SectionTitle
            eyebrow="AVAILABLE PLANS"
            title="Choose room to grow."
          />
          <div className="billing-toggle">
            Monthly{" "}
            <button onClick={toggle} aria-pressed={annual}>
              <i />
            </button>{" "}
            Annual <small>2 months free</small>
          </div>
          <div className="billing-plans">
            {[
              ["Starter", "$0", "2 projects"],
              ["Creator", annual ? "$19" : "$24", "Unlimited projects"],
              ["Studio", "Custom", "Team workspace"],
            ].map(([n, p, d]) => (
              <article className={n === "Creator" ? "chosen" : ""} key={n}>
                <span>{n}</span>
                <b>
                  {p}
                  <small>
                    {p.startsWith("$") && p !== "$0" ? " / mo" : ""}
                  </small>
                </b>
                <p>{d}</p>
                <button
                  onClick={() =>
                    notify(
                      "Subscription changes are not available in this demo.",
                    )
                  }
                >
                  {n === "Creator" ? "Current plan" : "Select plan"}
                </button>
              </article>
            ))}
          </div>
          <div className="payment-card">
            <div>
              <Eyebrow>PAYMENT METHOD</Eyebrow>
              <p>No payment method on file</p>
            </div>
            <Button
              variant="outline"
              onClick={() => notify("Payment setup is not connected.")}
            >
              Add payment method
            </Button>
          </div>
        </section>
        <aside className="usage-card">
          <Eyebrow>PLAN USAGE</Eyebrow>
          <h3>This billing period</h3>
          {[
            ["Storage", "6.8 GB", "20 GB", 34],
            ["Active projects", "4", "Unlimited", 25],
            ["Generation credits", "72", "100 credits", 72],
          ].map(([a, b, c, v]) => (
            <div className="usage-item" key={a}>
              <div>
                <b>{a}</b>
                <span>
                  {b} <small>/ {c}</small>
                </span>
              </div>
              <Progress value={v} />
            </div>
          ))}
          <p>Usage values are illustrative demo data.</p>
        </aside>
      </div>
    </>
  );
}
export function Settings() {
  const [tab, setTab] = useState("Profile");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [security, setSecurity] = useState({ current_password: "", new_password: "" });
  const notify = useStudioStore((s) => s.notify);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const tabs = ["Profile", "Preferences", "Security", "Notifications"];
  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const form = new FormData(event.currentTarget);
      const updated = await usersApi.updateProfile({ name: form.get("name") });
      useAuthStore.getState().syncUser(updated.data);
      setSaved(true);
      notify("Profile saved.", "success");
    } catch (error) {
      notify(error.message || "Could not save profile.", "error");
    } finally {
      setSaving(false);
    }
  };
  const savePassword = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await usersApi.updatePassword(security);
      await logout();
      navigate("/login", { replace: true, state: { notice: "Password updated. Sign in again." } });
    } catch (error) {
      notify(error.message || "Could not update password.", "error");
    } finally {
      setSaving(false);
    }
  };
  const deleteAccount = async () => {
    if (!window.confirm("Deactivate your account? You will be signed out.")) return;
    setSaving(true);
    try {
      await usersApi.deleteAccount();
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      notify(error.message || "Could not deactivate account.", "error");
      setSaving(false);
    }
  };
  return (
    <>
      <PageTitle eyebrow="WORKSPACE CONTROL" title="Settings" description="Manage your profile, studio preferences and account controls." />
      <div className="settings-layout">
        <nav className="settings-tabs">{tabs.map((x) => <button className={tab === x ? "selected" : ""} key={x} onClick={() => setTab(x)}>{x}</button>)}</nav>
        <section className="settings-panel">
          <Eyebrow>{tab.toUpperCase()}</Eyebrow>
          {tab === "Profile" ? (
            <form onSubmit={saveProfile}>
              <h3>Profile details</h3><p>Update the information shown across your workspace.</p>
              <div className="profile-edit"><span className="avatar large">{(user?.name || "U").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span></div>
              <label className="field-label">Display name<input name="name" defaultValue={user?.name || ""} minLength={2} maxLength={80} required /></label>
              <label className="field-label">Email address<input value={user?.email || ""} type="email" disabled /></label>
              <button className="button" type="submit" disabled={saving}>{saving ? "Saving..." : "Save profile"}<ArrowUpRight size={14} /></button>
              {saved && <small className="saved-note">Profile saved to your account.</small>}
            </form>
          ) : tab === "Preferences" ? (
            <><h3>Studio preferences</h3><p>Set how your workspace is displayed.</p><label className="field-label">Interface density<select><option>Comfortable</option><option>Compact</option></select></label><label className="field-label">Default project view<select><option>Grid</option><option>List</option></select></label><ToggleRow title="Reduce motion" text="Limit interface movement and transitions."/><ToggleRow title="Show production tips" text="Display short workflow hints in the studio."/><button className="button" onClick={() => notify("Preferences are not saved because the account API does not support them yet.")}>Save preferences<ArrowUpRight size={14}/></button></>
          ) : tab === "Security" ? (
            <><h3>Sign-in &amp; security</h3><p>Change your password or deactivate your account.</p><form onSubmit={savePassword}><label className="field-label">Current password<input type="password" autoComplete="current-password" required value={security.current_password} onChange={(event) => setSecurity({ ...security, current_password: event.target.value })}/></label><label className="field-label">New password<input type="password" minLength={8} maxLength={128} autoComplete="new-password" required value={security.new_password} onChange={(event) => setSecurity({ ...security, new_password: event.target.value })}/></label><button className="button" type="submit" disabled={saving || security.new_password.length < 8}>{saving ? "Updating..." : "Update password"}<ArrowUpRight size={14}/></button></form><button className="button outline" onClick={deleteAccount} disabled={saving}>Deactivate account<ArrowUpRight size={14}/></button></>
          ) : (
            <><h3>Notifications</h3><p>Notification preferences are not available through the account API yet.</p><ToggleRow title="Production status" text="When a workflow stage changes status."/><ToggleRow title="Project activity" text="When collaborators update shared projects."/><ToggleRow title="Product updates" text="Occasional news about the studio."/></>
          )}
        </section>
      </div>
    </>
  );
}
function ToggleRow({ title, text }) {
  const [on, setOn] = useState(true);
  return (
    <div className="toggle-row">
      <span>
        <b>{title}</b>
        <small>{text}</small>
      </span>
      <button
        className={`switch ${on ? "switch-on" : ""}`}
        aria-pressed={on}
        onClick={() => setOn(!on)}
      >
        <i />
      </button>
    </div>
  );
}
