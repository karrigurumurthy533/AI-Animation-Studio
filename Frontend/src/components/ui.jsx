import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Check,
  ChevronRight,
  CircleHelp,
  Sparkles,
} from "lucide-react";
import { useStudioStore } from "../store/useStudioStore";
export function Eyebrow({ children }) {
  return (
    <div className="eyebrow">
      <i />
      {children}
    </div>
  );
}
export function Button({
  to,
  children,
  variant = "",
  onClick,
  type = "button",
  disabled = false,
}) {
  const cls = `button ${variant}`;
  return to ? (
    <Link className={cls} to={to}>
      {children}
      <ArrowUpRight size={15} />
    </Link>
  ) : (
    <button className={cls} type={type} onClick={onClick} disabled={disabled}>
      {children}
      <ArrowUpRight size={15} />
    </button>
  );
}
export function PageTitle({ eyebrow, title, description, action }) {
  return (
    <div className="page-title">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function SectionTitle({ eyebrow, title, description }) {
  return (
    <div className="section-title">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2>{title}</h2>
      </div>
      {description && <p>{description}</p>}
    </div>
  );
}
export function Toast() {
  const toast = useStudioStore((s) => s.toast);
  return toast ? (
    <div className={`toast toast-${toast.tone}`} role="status">
      <Sparkles size={16} />
      {toast.message}
    </div>
  ) : null;
}
export function EmptyState({ icon: Icon = Boxes, title, description, action }) {
  return (
    <div className="empty-state">
      <Icon size={26} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Status({ children, tone = "neutral" }) {
  return (
    <span className={`status status-${tone}`}>
      <i />
      {children}
    </span>
  );
}
export function Breadcrumb({ items = [] }) {
  return (
    <div className="breadcrumb">
      {items.map((item, i) => (
        <span key={item}>
          {i > 0 && <ChevronRight size={12} />} {item}
        </span>
      ))}
    </div>
  );
}
export function DemoNotice({
  children = "Demo workspace - processing services are not connected",
}) {
  return (
    <div className="demo-notice">
      <CircleHelp size={14} />
      {children}
    </div>
  );
}
export function PageFooter() {
  return (
    <div className="page-footer">
      <span>AI ANIMATION STUDIO - WORKSPACE</span>
      <span>All work is saved locally in this demo interface.</span>
    </div>
  );
}
export function InlineLink({ to, children }) {
  return (
    <Link className="inline-link" to={to}>
      {children}
      <ArrowRight size={14} />
    </Link>
  );
}
export function CheckList({ items }) {
  return (
    <ul className="check-list">
      {items.map((x) => (
        <li key={x}>
          <Check size={15} />
          {x}
        </li>
      ))}
    </ul>
  );
}
