import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  ChevronDown,
  Menu,
  PanelLeftClose,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { assets, navGroups, projects } from "../data";
import { Brand } from "./PublicLayout";
import { Toast } from "../components/ui";
import { useStudioStore } from "../store/useStudioStore";
import { useAuthStore } from "../store/useAuthStore";

export function StudioLayout() {
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState(false);
  const sidebarOpen = useStudioStore((s) => s.sidebarOpen);
  const toggleSidebar = useStudioStore((s) => s.toggleSidebar);
  const notify = useStudioStore((s) => s.notify);
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const loc = useLocation();
  const query = search.trim().toLowerCase();
  const results = query
    ? [
        ...projects
          .filter((item) => item.name.toLowerCase().includes(query))
          .map((item) => ({
            label: item.name,
            meta: "Project",
            to: "/studio/projects",
          })),
        ...assets
          .filter((item) => item.name.toLowerCase().includes(query))
          .map((item) => ({
            label: item.name,
            meta: "Asset",
            to: "/studio/assets",
          })),
      ].slice(0, 5)
    : [];

  return (
    <div className="studio-shell">
      <aside className={`studio-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <Brand />
          <button onClick={toggleSidebar} aria-label="Close sidebar">
            <PanelLeftClose size={17} />
          </button>
        </div>
        <div className="workspace-switch">
          <div className="workspace-icon">A</div>
          <div>
            <b>Atelier North</b>
            <span>CREATOR WORKSPACE</span>
          </div>
          <ChevronDown size={14} />
        </div>
        <nav className="studio-nav">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span>{group.label}</span>
              {group.items.map(([label, to]) => (
                <NavLink
                  end={to === "/studio"}
                  to={to}
                  key={to}
                  onClick={() => sidebarOpen && toggleSidebar()}
                >
                  <i className="nav-icon">{label.slice(0, 1)}</i>
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="usage-mini">
            <div>
              <span>STORAGE</span>
              <b>6.8 / 20 GB</b>
            </div>
            <div className="usage-bar">
              <i />
            </div>
            <NavLink to="/studio/billing">
              Manage plan <ChevronDown size={13} />
            </NavLink>
          </div>
          <button className="profile-row" onClick={() => setProfile(!profile)}>
            <span className="avatar">VN</span>
            <span>
              <b>{user?.name || "Studio user"}</b>
              <small>{user?.email || "Account"}</small>
            </span>
            <Settings2 size={15} />
          </button>
          {profile && (
            <div className="profile-pop">
              <NavLink to="/studio/settings">Account settings</NavLink>
              <NavLink to="/studio/billing">Billing &amp; plan</NavLink>
              <button onClick={async () => { await logout(); navigate("/", { replace: true }); }}>Sign out</button>
            </div>
          )}
        </div>
      </aside>
      <div className="studio-main">
        <header className="studio-topbar">
          <button
            className="mobile-menu studio-menu"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X /> : <Menu />}
          </button>
          <div className="studio-search-shell">
            <div className="studio-search">
              <Search size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search projects and assets..."
                aria-label="Search projects and assets"
              />
              <kbd>Ctrl K</kbd>
            </div>
            {query && (
              <div className="search-results">
                {results.length ? (
                  results.map((result) => (
                    <Link
                      key={`${result.meta}-${result.label}`}
                      to={result.to}
                      onClick={() => setSearch("")}
                    >
                      <span>{result.label}</span>
                      <small>{result.meta}</small>
                    </Link>
                  ))
                ) : (
                  <span className="search-empty">
                    No matching projects or assets.
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="topbar-right">
            <span className="connection">
              <i /> ALL SYSTEMS NORMAL
            </span>
            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() =>
                notify("You are all caught up in this demo workspace.")
              }
            >
              <Bell size={17} />
              <i />
            </button>
            <Link className="help-button" to="/contact">
              <Activity size={14} /> Help center
            </Link>
            <span className="top-avatar">VN</span>
          </div>
        </header>
        <div className="studio-content" key={loc.pathname}>
          <Outlet />
        </div>
      </div>
      <Toast />
    </div>
  );
}
