import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Box,
  Check,
  ChevronDown,
  Clapperboard,
  Layers3,
  Palette,
  Scan,
  Sparkles,
  Workflow,
} from "lucide-react";
import { Button, CheckList, Eyebrow, SectionTitle } from "../components/ui";
import { features, stages } from "../data";
import { useStudioStore } from "../store/useStudioStore";

function CharacterArt({ compact = false }) {
  return (
    <div
      className={`character-art ${compact ? "compact" : ""}`}
      aria-label="Stylized cinematic character preview"
    >
      <div className="art-ring ring-a" />
      <div className="art-ring ring-b" />
      <div className="art-light" />
      <div className="figure">
        <div className="figure-head" />
        <div className="figure-neck" />
        <div className="figure-torso" />
        <div className="figure-arm arm-a" />
        <div className="figure-arm arm-b" />
        <div className="figure-leg leg-a" />
        <div className="figure-leg leg-b" />
      </div>
      <div className="art-ident">
        CHARACTER STUDY / 001 <span>FIG.01</span>
      </div>
    </div>
  );
}
function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-copy">
          <Eyebrow>THE CREATIVE ENGINE FOR WHAT'S NEXT</Eyebrow>
          <h1>
            FROM A SINGLE IMAGE TO AN <em>ENTIRE 3D WORLD.</em>
          </h1>
          <p>
            Create characters, build 3D worlds, direct animations and produce
            cinematic experiences with one intelligent creative studio.
          </p>
          <div className="hero-actions">
            <Button to="/register">Start creating</Button>
            <a href="#studio-intro" className="text-link">
              Explore the studio <ArrowDownRight size={16} />
            </a>
          </div>
          <div className="hero-meta">
            <span>01 - 10</span>
            <span>IMAGE TO CINEMA</span>
            <span>SCROLL TO EXPLORE</span>
          </div>
        </div>
        <CharacterArt />
        <div className="hero-index">
          01{" "}
          <span>
            CREATION
            <br />
            WITHOUT
            <br />
            COMPROMISE
          </span>
          <i />
        </div>
      </section>
      <section className="intro-section" id="studio-intro">
        <div className="eyebrow">IDEA ? ASSET ? PERFORMANCE</div>
        <div className="intro-grid">
          <div>
            <h2>
              From first reference
              <br />
              to <em>final frame.</em>
            </h2>
            <p>
              A considered workflow keeps artists in control while every
              production stage stays connected.
            </p>
            <Link className="inline-link" to="/how-it-works">
              See the workflow <ArrowRight size={15} />
            </Link>
          </div>
          <div className="showcase-board">
            <div className="board-label">
              <span>CHARACTER / 001</span>
              <span>PIPELINE PREVIEW</span>
            </div>
            <div className="showcase-stages">
              {[
                ["01", "Reference", "Original concept"],
                ["02", "3D model", "Editable geometry"],
                ["03", "Final character", "Ready for the scene"],
              ].map((x, i) => (
                <div className="showcase-stage" key={x[0]}>
                  <div className={`stage-art art-${i}`}>
                    <div className="stage-silhouette" />
                    <span>0{x[0]}</span>
                  </div>
                  <b>{x[1]}</b>
                  <small>{x[2]}</small>
                </div>
              ))}
            </div>
            <div className="board-label board-foot">
              <span>? DEMO PIPELINE PREVIEW</span>
              <span>01 / 03 ?</span>
            </div>
          </div>
        </div>
      </section>
      <FeatureGrid />
      <section className="split-section motion-feature">
        <div className="motion-art">
          <div className="motion-grid" />
          <div className="skeleton">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="motion-label">WALK CYCLE / 24 FRAMES</div>
        </div>
        <div className="split-copy">
          <Eyebrow>RIGGING & ANIMATION</Eyebrow>
          <h2>
            Give your characters a <em>point of view.</em>
          </h2>
          <p>
            Build a performance from the inside out. Establish a rig, direct
            motion and refine timing along an intuitive production timeline.
          </p>
          <CheckList
            items={[
              "Automatic skeleton generation",
              "Motion generation and editing",
              "Character continuity across scenes",
            ]}
          />
          <Button to="/features" variant="outline">
            Explore animation
          </Button>
        </div>
      </section>
      <section className="film-feature">
        <div className="split-copy">
          <Eyebrow>AI FILM PRODUCTION</Eyebrow>
          <h2>
            Think in scenes.
            <br />
            <em>Work in worlds.</em>
          </h2>
          <p>
            Bring storyboards, characters, camera language and lighting into one
            creative space for building a film from the ground up.
          </p>
          <Button to="/features" variant="outline">
            Discover film tools
          </Button>
        </div>
        <div className="storyboard">
          <div className="board-label">
            <span>SEQUENCE 01 / STORYBOARD</span>
            <span>SCENE 03 - EXT. DUSK</span>
          </div>
          <div className="story-frames">
            <div />
            <div />
            <div />
          </div>
          <div className="board-label board-foot">
            <span>? CHARACTER CONSISTENCY ACTIVE</span>
            <span>24 FPS / 00:48</span>
          </div>
        </div>
      </section>
      <WorkflowStrip />
      <section className="blender-feature">
        <div className="split-copy">
          <Eyebrow>MADE TO LEAVE THE STUDIO</Eyebrow>
          <h2>
            Keep the craft.
            <br />
            Own the <em>source.</em>
          </h2>
          <p>
            Take your work into Blender as an editable project. Your geometry,
            materials and scene setup stay accessible to the tools you already
            trust.
          </p>
          <Button to="/studio/blender">Explore Blender workflow</Button>
        </div>
        <div className="blender-preview">
          <div className="viewport-head">
            <span>PROJECT / THE RED NOMAD</span>
            <span>BLENDER PROJECT</span>
          </div>
          <CharacterArt compact />
          <div className="file-rows">
            <span>
              ? MESH character_v04.glb <Check size={13} />
            </span>
            <span>
              ? MATERIALS skin_clay_v02 <Check size={13} />
            </span>
            <span>
              ? SCENE scene_03_camera <Check size={13} />
            </span>
          </div>
        </div>
      </section>
      <section className="home-cta">
        <Eyebrow>THE NEXT FRAME IS YOURS</Eyebrow>
        <h2>
          YOUR CREATIVE WORLD
          <br />
          <em>STARTS HERE.</em>
        </h2>
        <p>Make the first move. The rest of the world is yours to build.</p>
        <Button to="/register">Create your first project</Button>
      </section>
    </>
  );
}
function FeatureGrid() {
  return (
    <section className="feature-grid-section">
      <SectionTitle
        eyebrow="A CONNECTED CREATIVE STACK"
        title={
          <>
            Everything the frame
            <br />
            needs to come alive.
          </>
        }
        description="Move through a modern production pipeline with a toolkit built around creative control, consistency and editable outcomes."
      />
      <div className="feature-grid">
        {features.map(([title, desc, Icon], i) => {
          const Comp =
            { Scan, Layers3, Palette, Sparkles, Workflow, Clapperboard }[
              Icon
            ] || Box;
          return (
            <Link to="/ai-tools" className="feature-card" key={title}>
              <div className="feature-card-head">
                <Comp size={19} />
                <span>0{i + 1}</span>
              </div>
              <small>STUDIO TOOL</small>
              <h3>{title}</h3>
              <p>{desc}</p>
              <ArrowUpRight className="feature-arrow" size={16} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
function WorkflowStrip() {
  return (
    <section className="workflow-strip">
      <SectionTitle
        eyebrow="THE PRODUCTION PIPELINE"
        title="One idea. Ten connected stages."
        description="A clear path from reference to editable output. Review, refine and approve work as it moves through production."
      />
      <div className="workflow-track">
        {stages.map((s, i) => (
          <div className="workflow-step" key={s}>
            <span>0{i + 1}</span>
            <i />
            <b>{s.toUpperCase()}</b>
          </div>
        ))}
      </div>
      <Link className="inline-link" to="/how-it-works">
        Walk through the process <ArrowRight size={15} />
      </Link>
    </section>
  );
}
function PageHero({ eyebrow, title, copy, action }) {
  return (
    <section className="page-hero">
      <div className="page-hero-art">
        <CharacterArt compact />
      </div>
      <div className="page-hero-copy">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <p>{copy}</p>
        {action && <Button to={action.to}>{action.label}</Button>}
      </div>
    </section>
  );
}
function Features() {
  return (
    <>
      <PageHero
        eyebrow="THE CREATIVE TOOLKIT"
        title={
          <>
            A studio that
            <br />
            <em>thinks in 3D.</em>
          </>
        }
        copy="From the first character reference to the final export, every capability belongs to one connected production environment."
        action={{ to: "/register", label: "Start creating" }}
      />
      <FeatureGrid />
      <section className="split-section">
        <div className="split-copy">
          <Eyebrow>EDITABLE BY DESIGN</Eyebrow>
          <h2>
            Keep control at every <em>stage.</em>
          </h2>
          <p>
            Preview, revise, regenerate and approve your work stage by stage.
            Keep source assets accessible while your production grows.
          </p>
          <Button to="/studio">Explore the studio</Button>
        </div>
        <WorkflowStrip />
      </section>
      <HomeCTA />
    </>
  );
}
function HowItWorks() {
  return (
    <>
      <PageHero
        eyebrow="FROM FIRST PIXEL TO FINAL FRAME"
        title={
          <>
            Make the whole
            <br />
            <em>journey yours.</em>
          </>
        }
        copy="A transparent, editable workflow gives you room to direct every stage of production."
      />
      <section className="how-steps">
        {stages.map((stage, i) => (
          <article key={stage}>
            <span>0{i + 1}</span>
            <div>
              <Eyebrow>STAGE {String(i + 1).padStart(2, "0")}</Eyebrow>
              <h2>{stage}</h2>
              <p>
                {
                  [
                    "Bring a visual reference into the production workspace.",
                    "Review details, silhouette and visual attributes before modeling.",
                    "Develop an editable character model from the approved direction.",
                    "Inspect topology, validate and refine geometry.",
                    "Shape surface identity with materials and texture maps.",
                    "Create a skeleton and prepare the model for movement.",
                    "Direct motion, keyframes and performance timing.",
                    "Set environment, camera and light for the intended mood.",
                    "Review render configuration and prepare a final preview.",
                    "Package editable project and production assets for handoff.",
                  ][i]
                }
              </p>
            </div>
            <span className="step-arrow">?</span>
          </article>
        ))}
      </section>
      <HomeCTA />
    </>
  );
}
function AITools() {
  return (
    <>
      <PageHero
        eyebrow="A TOOL FOR EVERY STAGE"
        title={
          <>
            Built for the
            <br />
            <em>creative process.</em>
          </>
        }
        copy="Explore the capabilities shaping a new kind of character and film production studio."
      />
      <FeatureGrid />
      <div className="notice-block">
        <Sparkles />
        <div>
          <b>Generation stays under your direction.</b>
          <p>
            This preview illustrates the creative tools. AI services are not
            connected and no generation is launched from this site.
          </p>
        </div>
      </div>
      <HomeCTA />
    </>
  );
}
const plans = [
  {
    name: "Starter",
    price: "Free",
    text: "Explore the pipeline and shape your first idea.",
    perks: ["2 active projects", "Core creative tools", "Community resources"],
  },
  {
    name: "Creator",
    price: "$24",
    text: "A focused workspace for independent creators.",
    perks: [
      "Unlimited projects",
      "Expanded generation credits",
      "Editable exports",
      "Priority processing",
    ],
    featured: true,
  },
  {
    name: "Studio",
    price: "Let's talk",
    text: "Production capacity for teams and studios.",
    perks: [
      "Team workspaces",
      "Shared asset library",
      "Advanced collaboration",
      "Studio support",
    ],
  },
];
function Pricing() {
  const annual = useStudioStore((s) => s.billingAnnual),
    toggle = useStudioStore((s) => s.toggleBilling);
  return (
    <>
      <PageHero
        eyebrow="PLANS FOR THE PROCESS"
        title={
          <>
            Room to make
            <br />
            <em>something real.</em>
          </>
        }
        copy="Choose a place to start. Your creative workflow can grow with your ambitions."
      />
      <section className="pricing-page">
        <div className="billing-toggle">
          Monthly{" "}
          <button onClick={toggle} aria-pressed={annual}>
            <i />
          </button>{" "}
          Annual <small>2 months free</small>
        </div>
        <div className="plans-grid">
          {plans.map((p) => (
            <article
              className={`plan-card ${p.featured ? "featured" : ""}`}
              key={p.name}
            >
              {p.featured && <small className="popular">MOST POPULAR</small>}
              <span>{p.name}</span>
              <h2>
                {p.price.startsWith("$") ? `$${annual ? "19" : "24"}` : p.price}
                {p.price.startsWith("$") && <small> / month</small>}
              </h2>
              <p>{p.text}</p>
              <ul>
                {p.perks.map((x) => (
                  <li key={x}>
                    <Check size={15} />
                    {x}
                  </li>
                ))}
              </ul>
              <Button
                to={p.price === "Let's talk" ? "/contact" : "/register"}
                variant={p.featured ? "" : "outline"}
              >
                {p.price === "Let's talk" ? "Talk to our team" : "Get started"}
              </Button>
            </article>
          ))}
        </div>
        <p className="demo-caption">
          Plans shown are a product direction preview. Billing services are not
          connected.
        </p>
      </section>
      <Faq />
      <HomeCTA />
    </>
  );
}
function Faq() {
  const [active, setActive] = useState(0);
  const qa = [
    [
      "What can I create?",
      "Develop characters and production assets, build scenes, shape animation and prepare editable outputs through one connected creative workflow.",
    ],
    [
      "Do I need 3D experience?",
      "The product is designed to make complex stages more approachable while preserving control for experienced artists.",
    ],
    [
      "Can I continue working in Blender?",
      "Yes. Blender integration is designed around editable project files so your scene, models and materials can move into a familiar production environment.",
    ],
    [
      "Are AI generations connected here?",
      "No. This site is a frontend preview. Processing will connect to production services as the platform develops.",
    ],
  ];
  return (
    <section className="faq-section">
      <div>
        <Eyebrow>GOOD TO KNOW</Eyebrow>
        <h2>
          Questions before
          <br />
          the first frame?
        </h2>
      </div>
      <div>
        {qa.map(([q, a], i) => (
          <div className="faq-row" key={q}>
            <button
              onClick={() => setActive(active === i ? -1 : i)}
              aria-expanded={active === i}
            >
              <span>0{i + 1}</span>
              <b>{q}</b>
              <ChevronDown
                className={active === i ? "rotated" : ""}
                size={16}
              />
            </button>
            {active === i && <p>{a}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
function About() {
  return (
    <>
      <PageHero
        eyebrow="OUR POINT OF VIEW"
        title={
          <>
            More than a tool.
            <br />
            <em>A new medium.</em>
          </>
        }
        copy="AI Animation Studio is being built for artists and storytellers who want the speed of intelligent tools and the freedom of editable 3D craft."
      />
      <section className="manifesto">
        <Eyebrow>THE PRINCIPLE</Eyebrow>
        <h2>
          Technology should widen
          <br />
          the frame for creativity.
        </h2>
        <p>
          A great production environment makes complex work feel clear, keeps
          people in control and leaves room for happy accidents. Every stage
          should be visible, revisable and yours.
        </p>
      </section>
      <FeatureGrid />
      <HomeCTA />
    </>
  );
}
function Contact() {
  const [sent, setSent] = useState(false);
  return (
    <>
      <PageHero
        eyebrow="LET'S START A CONVERSATION"
        title={
          <>
            Every great world
            <br />
            <em>starts somewhere.</em>
          </>
        }
        copy="Tell us what you're making, ask a question or share what you'd like to see in the studio."
      />
      <section className="contact-page">
        <div>
          <Eyebrow>STUDIO INBOX</Eyebrow>
          <h2>
            Tell us what's
            <br />
            on your mind.
          </h2>
          <p>
            We're interested in the people and ideas shaping the future of 3D
            storytelling.
          </p>
          <a href="mailto:hello@aianimation.studio">
            hello@aianimation.studio <ArrowUpRight size={15} />
          </a>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <label>
            Your name
            <input required placeholder="Name" />
          </label>
          <label>
            Email address
            <input type="email" required placeholder="you@example.com" />
          </label>
          <label>
            What would you like to talk about?
            <select>
              <option>General inquiry</option>
              <option>Studio plans</option>
              <option>Partnership</option>
              <option>Product feedback</option>
            </select>
          </label>
          <label>
            Your message
            <textarea
              rows="4"
              required
              placeholder="A little context goes a long way..."
            />
          </label>
          <button className="button">
            Send message <ArrowUpRight size={15} />
          </button>
          {sent && (
            <small>
              Thanks for reaching out. This demo form did not send your message.
            </small>
          )}
        </form>
      </section>
    </>
  );
}
function HomeCTA() {
  return (
    <section className="home-cta">
      <Eyebrow>THE NEXT FRAME IS YOURS</Eyebrow>
      <h2>
        YOUR CREATIVE WORLD
        <br />
        <em>STARTS HERE.</em>
      </h2>
      <p>Make the first move. The rest of the world is yours to build.</p>
      <Button to="/register">Create your first project</Button>
    </section>
  );
}
export { Home, Features, HowItWorks, AITools, Pricing, About, Contact };
