import { lazy, Suspense, useState } from "react";
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
import { assets, features, fmt, projects, stages } from "../data";
import { useStudioStore } from "../store/useStudioStore";
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
function Action({ children, onClick, secondary = false }) {
  return (
    <button
      className={`button ${secondary ? "outline" : ""}`}
      onClick={onClick}
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
  return (
    <button className="project-tile" onClick={() => setProject(project.id)}>
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
export function Dashboard() {
  const notify = useStudioStore((s) => s.notify);
  const active = useStudioStore((s) => s.activeProject);
  return (
    <>
      <PageTitle
        eyebrow="MONDAY, NOVEMBER 3, 2026"
        title="Good morning, Vedhas."
        description="Your production floor is ready. Pick up where the frame left off."
        action={
          <Action
            onClick={() =>
              notify("Project creation is a demo. No project was created.")
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
          value="04"
          delta="2 currently in production"
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
  const notify = useStudioStore((s) => s.notify);
  const visible = projects.filter(
    (p) =>
      (filter === "All" || p.stage === filter) &&
      p.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        eyebrow="YOUR PRODUCTION FLOOR"
        title="Projects"
        description="Every world you're building, all in one place."
        action={
          <Action
            onClick={() =>
              notify("Project creation is a demo. No project was created.")
            }
          >
            <Plus size={15} /> New project
          </Action>
        }
      />
      <div className="toolbar">
        <div className="filter-tabs">
          {["All", "Animation", "Materials", "Rigging"].map((x) => (
            <button
              className={filter === x ? "selected" : ""}
              key={x}
              onClick={() => setFilter(x)}
            >
              {x}
            </button>
          ))}
        </div>
        <label className="local-search">
          <Search size={14} />
          <input
            placeholder="Find a project..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {visible.length ? (
        <div className="project-grid project-grid-wide">
          {visible.map((p) => (
            <ProjectTile project={p} key={p.id} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No projects match"
          description="Try another search or filter."
        />
      )}
      <DemoNotice />
    </>
  );
}
export function CharacterLab() {
  const notify = useStudioStore((s) => s.notify);
  const [tab, setTab] = useState("Reference");
  return (
    <>
      <PageTitle
        eyebrow="CHARACTER LAB / PRJ-042"
        title="Shape a character."
        description="Move from reference to editable model while keeping the character's defining features in view."
        action={
          <Action
            onClick={() =>
              notify(
                "This demo cannot generate a 3D model. Your reference remains unchanged.",
              )
            }
          >
            <Sparkles size={15} /> Generate model
          </Action>
        }
      />
      <DemoNotice />
      <div className="lab-layout">
        <aside className="lab-sidebar">
          <Eyebrow>PRODUCTION STAGES</Eyebrow>
          {stages.slice(0, 5).map((x, i) => (
            <div className={`lab-stage ${i === 0 ? "current" : ""}`} key={x}>
              <span>{i < 2 ? <Check size={12} /> : `0${i + 1}`}</span>
              <b>{x}</b>
              {i === 0 && <small>ACTIVE</small>}
            </div>
          ))}
          <button
            className="upload-zone"
            onClick={() =>
              notify("Reference upload is not connected in this demo.")
            }
          >
            <Upload size={18} />
            <b>Add reference image</b>
            <span>PNG, JPG - up to 20 MB</span>
          </button>
        </aside>
        <section className="lab-main">
          <div className="lab-toolbar">
            <div className="filter-tabs">
              {["Reference", "Model preview", "Character DNA"].map((x) => (
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
          <div className="viewport">
            <div className="viewport-grid" />
            <div className="viewport-axis">
              <i>X</i>
              <i>Y</i>
              <i>Z</i>
            </div>
            {tab === "Character DNA" ? (
              <DnaPanel />
            ) : tab === "Model preview" ? (
              <Suspense
                fallback={
                  <div className="viewport-loading">
                    Preparing 3D viewport...
                  </div>
                }
              >
                <CharacterViewport />
              </Suspense>
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
        <aside className="properties-panel">
          <Eyebrow>CHARACTER DNA</Eyebrow>
          <h3>The Red Nomad</h3>
          <p>Appearance settings carry across production stages.</p>
          {[
            ["Silhouette", "Athletic"],
            ["Body proportions", "Long torso"],
            ["Primary palette", "Ember / clay"],
            ["Signature detail", "Left cheek mark"],
            ["Reference fidelity", "High"],
          ].map(([k, v]) => (
            <div className="property-row" key={k}>
              <span>{k}</span>
              <b>{v}</b>
            </div>
          ))}
          <div className="swatches">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <Button
            variant="outline"
            onClick={() =>
              notify("Character settings saved locally for this demo session.")
            }
          >
            Save changes
          </Button>
        </aside>
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
function DnaPanel() {
  return (
    <div className="dna-panel">
      {[
        ["SILHOUETTE", "ATHLETIC"],
        ["PROPORTIONS", "LONG TORSO"],
        ["COLOR PALETTE", "EMBER / CLAY"],
        ["DISTINCTIVE FEATURE", "CHEEK MARK"],
        ["REFERENCE FIDELITY", "HIGH"],
      ].map(([x, y]) => (
        <div key={x}>
          <span>{x}</span>
          <b>{y}</b>
        </div>
      ))}
    </div>
  );
}
export function MeshLab() {
  const notify = useStudioStore((s) => s.notify);
  const [mode, setMode] = useState("Solid");
  return (
    <>
      <PageTitle
        eyebrow="MESH LAB / PRJ-042"
        title="Geometry, in focus."
        description="Inspect topology and prepare a clean mesh for materials, rigging and animation."
        action={
          <Action
            onClick={() =>
              notify("Mesh validation is a preview. No processing was started.")
            }
          >
            <ShieldCheck size={15} /> Validate mesh
          </Action>
        }
      />
      <DemoNotice />
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
              onClick={() => notify(`${x} tool is preview-only.`)}
            >
              <Icon size={16} />
              {x}
            </button>
          ))}
        </aside>
        <section className="editor-viewport">
          <div className="viewport-toolbar">
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
            ["Vertices", "68,420"],
            ["Faces", "136,812"],
            ["Watertight", "Yes"],
            ["Manifold edges", "0"],
            ["UV coverage", "94%"],
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
            onClick={() =>
              notify("Mesh repair and optimization are not connected.")
            }
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
  return (
    <>
      <PageTitle
        eyebrow="MATERIALS LAB / PRJ-042"
        title="Give it a surface."
        description="Tune surface properties and review a material preview before it moves into the scene."
        action={
          <Action
            onClick={() =>
              notify("Material settings saved in this demo session.")
            }
          >
            <Save size={15} /> Save material
          </Action>
        }
      />
      <DemoNotice />
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
            <TinyAction onClick={() => notify("Material menu is a preview.")}>
              ...
            </TinyAction>
          </div>
          <label className="field-label">
            Material name
            <input defaultValue="Nomad - Weathered clay" />
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
                onClick={() => notify("Texture upload is not connected.")}
              >
                <span>
                  {i === 0 ? <Image size={15} /> : <Layers3 size={15} />} {x}
                </span>
                <Upload size={14} />
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() =>
              notify("Applying materials to the model is not connected.")
            }
          >
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
  return (
    <>
      <PageTitle
        eyebrow="RIGGING LAB / PRJ-042"
        title="Ready for a performance."
        description="Inspect the character skeleton and review rig settings before animation."
        action={
          <Action
            onClick={() =>
              notify("Rig generation is not connected. No rig was created.")
            }
          >
            <Sparkles size={15} /> Generate rig
          </Action>
        }
      />
      <DemoNotice />
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
            onClick={() => notify("Rig validation is not connected.")}
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
  return (
    <>
      <PageTitle
        eyebrow="ANIMATION LAB / PRJ-042"
        title="Direct the movement."
        description="Review a motion preview, adjust a demo timeline and prepare a performance."
        action={
          <Action
            onClick={() =>
              notify(
                "Motion generation is unavailable in this frontend preview.",
              )
            }
          >
            <Sparkles size={15} /> Generate motion
          </Action>
        }
      />
      <DemoNotice />
      <div className="animation-screen">
        <section className="animation-viewport">
          <div className="viewport-toolbar">
            <span>VIEWPORT / CAMERA</span>
            <span>WALK CYCLE - TAKE 03</span>
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
            <select>
              <option>Walk cycle - Take 03</option>
              <option>Idle - Take 01</option>
              <option>Turn - Take 02</option>
            </select>
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
          <Action onClick={() => notify("Animation clip saved in demo state.")}>
            Save clip
          </Action>
        </div>
      </div>
    </>
  );
}
export function FilmLab() {
  const [shot, setShot] = useState(0);
  const notify = useStudioStore((s) => s.notify);
  const shots = ["EXT. DUSK - WIDE", "INT. HALL - MEDIUM", "CLOSE - REACTION"];
  return (
    <>
      <PageTitle
        eyebrow="FILM PRODUCTION / QUIET TIDES"
        title="Build the scene."
        description="Compose a sequence, track character continuity and prepare camera direction."
        action={
          <Action
            onClick={() =>
              notify("Scene generation is not connected. No scene was created.")
            }
          >
            <Sparkles size={15} /> Generate scene
          </Action>
        }
      />
      <DemoNotice />
      <div className="film-layout">
        <section className="story-editor">
          <div className="sequence-toolbar">
            <span>
              <Clapperboard size={15} /> SEQUENCE 01 / STORYBOARD
            </span>
            <button onClick={() => notify("New shot is a demo action.")}>
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
            onClick={() => notify("Scene settings saved locally.")}
          >
            Save scene
          </Button>
        </aside>
      </div>
    </>
  );
}
export function WorkflowEditor() {
  const [selected, setSelected] = useState(0);
  const notify = useStudioStore((s) => s.notify);
  return (
    <>
      <PageTitle
        eyebrow="VISUAL PRODUCTION GRAPH"
        title="Your workflow, in view."
        description="Explore stage relationships and keep the entire production path legible."
        action={
          <Action
            onClick={() => notify("Workflow node creation is a demo action.")}
          >
            <Plus size={15} /> Add stage
          </Action>
        }
      />
      <DemoNotice />
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
              <small>
                {i < 2 ? "READY" : i === 2 ? "IN PROGRESS" : "UP NEXT"}
              </small>
            </button>
          ))}
        </div>
        <div className="graph-properties">
          <span>SELECTED STAGE</span>
          <b>
            {
              [
                "Reference",
                "Analyze",
                "Generate model",
                "Mesh cleanup",
                "Character DNA",
                "Rig & animate",
              ][selected]
            }
          </b>
          <p>
            Stages remain reviewable. Processing and workflow persistence are
            not connected.
          </p>
          <button onClick={() => notify("Stage settings are a demo.")}>
            Configure stage <ArrowUpRight size={13} />
          </button>
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
  return (
    <>
      <PageTitle
        eyebrow="BLENDER LIVE BRIDGE"
        title="Your scene. Your tools."
        description="Prepare an editable Blender handoff and keep track of linked production assets."
        action={
          <Action
            onClick={() =>
              notify("Blender is not connected. No project was exported.")
            }
          >
            <ArrowDownToLine size={15} /> Export project
          </Action>
        }
      />
      <DemoNotice>
        Blender integration is a workflow preview. No local Blender process is
        started.
      </DemoNotice>
      <div className="blender-layout">
        <section className="blender-viewport">
          <div className="viewport-toolbar">
            <span>SCENE / THE RED NOMAD</span>
            <span>BLENDER PROJECT - V04</span>
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
            {[".blend", ".glb", ".fbx", ".obj"].map((x, i) => (
              <button
                className={i === 0 ? "selected" : ""}
                onClick={() => notify(`${x} selected for demo export.`)}
                key={x}
              >
                {x}
              </button>
            ))}
          </div>
        </section>
        <aside className="properties-panel">
          <Eyebrow>PROJECT PACKAGE</Eyebrow>
          <h3>Scene_03.blend</h3>
          <p>Editable scene with linked model, material and camera settings.</p>
          {[
            ["Character model", "nomad_character_v04.glb"],
            ["Material set", "skin_clay_v02"],
            ["Animation", "walk_cycle_take03.fbx"],
            ["Camera", "scene_03_camera"],
            ["Scene setup", "scene_03_lighting"],
          ].map(([a, b]) => (
            <div className="property-row file-property" key={a}>
              <span>{a}</span>
              <b>{b}</b>
            </div>
          ))}
          <div className="bridge-status">
            <i /> Local Blender connection <b>Not connected</b>
          </div>
          <Button
            onClick={() =>
              notify(
                "No export was made. Connect a backend Blender worker to enable this action.",
              )
            }
          >
            Prepare export
          </Button>
        </aside>
      </div>
    </>
  );
}
export function Assets() {
  const [kind, setKind] = useState("All assets");
  const [query, setQuery] = useState("");
  const visible = assets.filter(
    (a) =>
      (kind === "All assets" || a.kind === kind) &&
      a.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        eyebrow="PROJECT LIBRARY"
        title="Assets"
        description="Find the source files and production outputs linked to your projects."
        action={
          <Action
            onClick={() =>
              useStudioStore.getState().notify("Asset upload is not connected.")
            }
          >
            <Upload size={15} /> Upload asset
          </Action>
        }
      />
      <DemoNotice />
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
        rows={visible.map((a) => [
          <span className="asset-name">
            <FileImage size={16} />
            {a.name}
          </span>,
          a.kind,
          <span className="format-tag">{a.format}</span>,
          a.size,
          a.date,
          <button
            className="table-icon"
            onClick={() =>
              useStudioStore
                .getState()
                .notify("Asset download is not connected.")
            }
          >
            <Download size={15} />
          </button>,
        ])}
      />
      <div className="table-foot">
        Showing {visible.length} assets <span>STORAGE USED: 6.8 GB</span>
      </div>
    </>
  );
}
export function Versions() {
  const [selected, setSelected] = useState("v04");
  const notify = useStudioStore((s) => s.notify);
  const rows = [
    ["v04", "Oct 30, 2026 at 14:32", "Texture approved", "Current"],
    ["v03", "Oct 29, 2026 at 17:10", "Rig validation", "Saved"],
    ["v02", "Oct 28, 2026 at 11:04", "Mesh cleanup", "Saved"],
    ["v01", "Oct 26, 2026 at 09:22", "Initial model", "Saved"],
  ];
  return (
    <>
      <PageTitle
        eyebrow="PROJECT HISTORY / PRJ-042"
        title="Versions"
        description="Review saved checkpoints and understand how a project has evolved."
        action={
          <Action
            onClick={() =>
              notify("Version snapshot saved to the demo activity.")
            }
          >
            <Save size={15} /> Save version
          </Action>
        }
      />
      <DemoNotice />
      <div className="versions-layout">
        <div className="version-list">
          {rows.map(([v, date, note, status]) => (
            <button
              key={v}
              className={selected === v ? "version-selected" : ""}
              onClick={() => setSelected(v)}
            >
              <i className="version-dot" />
              <div>
                <b>
                  {v}{" "}
                  <span>
                    {status === "Current" && (
                      <Status tone="good">CURRENT</Status>
                    )}
                  </span>
                </b>
                <small>{date}</small>
                <p>{note}</p>
              </div>
              <ArrowUpRight size={15} />
            </button>
          ))}
        </div>
        <aside className="version-preview">
          <Eyebrow>VERSION {selected.toUpperCase()}</Eyebrow>
          <h3>{rows.find((x) => x[0] === selected)?.[2]}</h3>
          <div className="version-art">
            <CharacterPreview />
          </div>
          <div className="property-row">
            <span>Project</span>
            <b>The Red Nomad</b>
          </div>
          <div className="property-row">
            <span>Saved by</span>
            <b>Vedhas N.</b>
          </div>
          <div className="property-row">
            <span>Included assets</span>
            <b>18 files</b>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              notify(
                "Restore is a demo action. Your current project was not changed.",
              )
            }
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
  const notify = useStudioStore((s) => s.notify);
  const tabs = ["Profile", "Preferences", "Security", "Notifications"];
  return (
    <>
      <PageTitle
        eyebrow="WORKSPACE CONTROL"
        title="Settings"
        description="Manage your profile, studio preferences and account controls."
      />
      <DemoNotice />
      <div className="settings-layout">
        <nav className="settings-tabs">
          {tabs.map((x) => (
            <button
              className={tab === x ? "selected" : ""}
              key={x}
              onClick={() => setTab(x)}
            >
              {x}
            </button>
          ))}
        </nav>
        <section className="settings-panel">
          <Eyebrow>{tab.toUpperCase()}</Eyebrow>
          {tab === "Profile" ? (
            <>
              <h3>Profile details</h3>
              <p>Update the information shown across your workspace.</p>
              <div className="profile-edit">
                <span className="avatar large">VN</span>
                <button
                  onClick={() =>
                    notify("Profile photo upload is not connected.")
                  }
                >
                  Change photo
                </button>
              </div>
              <label className="field-label">
                Display name
                <input defaultValue="Vedhas N." />
              </label>
              <label className="field-label">
                Email address
                <input defaultValue="vedhas@example.com" type="email" />
              </label>
              <label className="field-label">
                Workspace name
                <input defaultValue="Atelier North" />
              </label>
            </>
          ) : tab === "Preferences" ? (
            <>
              <h3>Studio preferences</h3>
              <p>Set how your workspace is displayed.</p>
              <label className="field-label">
                Interface density
                <select>
                  <option>Comfortable</option>
                  <option>Compact</option>
                </select>
              </label>
              <label className="field-label">
                Default project view
                <select>
                  <option>Grid</option>
                  <option>List</option>
                </select>
              </label>
              <ToggleRow
                title="Reduce motion"
                text="Limit interface movement and transitions."
              />
              <ToggleRow
                title="Show production tips"
                text="Display short workflow hints in the studio."
              />
            </>
          ) : tab === "Security" ? (
            <>
              <h3>Sign-in & security</h3>
              <p>Authentication controls are not connected in this preview.</p>
              <label className="field-label">
                Current password
                <input
                  type="password"
                  placeholder="Not available in demo"
                  disabled
                />
              </label>
              <label className="field-label">
                New password
                <input
                  type="password"
                  placeholder="Not available in demo"
                  disabled
                />
              </label>
              <ToggleRow
                title="Two-factor authentication"
                text="Add an extra verification step to sign in."
              />
            </>
          ) : (
            <>
              <h3>Notifications</h3>
              <p>Choose which studio updates you would receive.</p>
              <ToggleRow
                title="Production status"
                text="When a workflow stage changes status."
              />
              <ToggleRow
                title="Project activity"
                text="When collaborators update shared projects."
              />
              <ToggleRow
                title="Product updates"
                text="Occasional news about the studio."
              />
            </>
          )}
          <button
            className="button"
            onClick={() => {
              setSaved(true);
              notify("Settings saved locally for this demo session.");
            }}
          >
            Save changes <ArrowUpRight size={14} />
          </button>
          {saved && (
            <small className="saved-note">
              Preferences saved for this session.
            </small>
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
