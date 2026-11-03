import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout.jsx";
import { StudioLayout } from "./layouts/StudioLayout.jsx";
import { useAuthStore } from "./store/useAuthStore";
import { About, AITools, Contact, Features, Home, HowItWorks, Pricing } from "./pages/PublicPages.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import { ForgotPassword, ResetPassword } from "./pages/PasswordPages.jsx";
import { Assistant, AnimationLab, Assets, Billing, BlenderBridge, CharacterLab, Dashboard, FilmLab, MaterialsLab, MeshLab, Projects, RiggingLab, Settings, Versions, WorkflowEditor } from "./pages/StudioPages.jsx";

function AuthBootstrap() {
  const restore = useAuthStore((s) => s.restore);
  const expire = useAuthStore((s) => s.expire);
  useEffect(() => {
    restore();
    window.addEventListener("auth:expired", expire);
    return () => window.removeEventListener("auth:expired", expire);
  }, [restore, expire]);
  return null;
}

function ProtectedStudio({ children }) {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (status === "loading") return <div className="auth-loading">Opening your studio...</div>;
  if (status !== "authenticated") return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function ScrollReset() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [pathname]);
  return null;
}

export default function App() {
  return <><AuthBootstrap/><ScrollReset/><Routes>
    <Route element={<PublicLayout/>}>
      <Route path="/" element={<Home/>}/><Route path="/features" element={<Features/>}/><Route path="/how-it-works" element={<HowItWorks/>}/><Route path="/ai-tools" element={<AITools/>}/><Route path="/pricing" element={<Pricing/>}/><Route path="/about" element={<About/>}/><Route path="/contact" element={<Contact/>}/><Route path="/login" element={<AuthPage/>}/><Route path="/register" element={<AuthPage register/>}/><Route path="/forgot-password" element={<ForgotPassword/>}/><Route path="/reset-password" element={<ResetPassword/>}/>
    </Route>
    <Route path="/studio" element={<ProtectedStudio><StudioLayout/></ProtectedStudio>}>
      <Route index element={<Dashboard/>}/><Route path="projects" element={<Projects/>}/><Route path="character" element={<CharacterLab/>}/><Route path="mesh" element={<MeshLab/>}/><Route path="materials" element={<MaterialsLab/>}/><Route path="rigging" element={<RiggingLab/>}/><Route path="animation" element={<AnimationLab/>}/><Route path="film" element={<FilmLab/>}/><Route path="workflow" element={<WorkflowEditor/>}/><Route path="assets" element={<Assets/>}/><Route path="versions" element={<Versions/>}/><Route path="blender" element={<BlenderBridge/>}/><Route path="assistant" element={<Assistant/>}/><Route path="billing" element={<Billing/>}/><Route path="settings" element={<Settings/>}/>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></>;
}
