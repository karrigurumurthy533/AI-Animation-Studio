import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Activity, Bell, Menu, Search, Settings2, X } from "lucide-react";
import { Brand } from "./PublicLayout";
import { Toast } from "../components/ui";
import { useStudioStore } from "../store/useStudioStore";
import { useAuthStore } from "../store/useAuthStore";

const sidebarLinks = [
  ["Dashboard", "/studio"],
  ["Projects", "/studio/projects"],
  ["Billing", "/studio/billing"],
  ["Settings", "/studio/settings"],
];

export function StudioLayout() {
  const [search, setSearch] = useState("");
  const sidebarOpen = useStudioStore((state) => state.sidebarOpen);
  const toggleSidebar = useStudioStore((state) => state.toggleSidebar);
  const notify = useStudioStore((state) => state.notify);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="studio-shell">
      <aside className={`studio-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <Brand />
          <button onClick={toggleSidebar} aria-label="Close sidebar">
            <X size={17} />
          </button>
        </div>
        <nav className="studio-nav">
          <div className="nav-group">
            <span>WORKSPACE</span>
            {sidebarLinks.map(([label, to]) => (
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
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-row">
            <span className="avatar">{(user?.name || "U").slice(0, 1).toUpperCase()}</span>
            <span>
              <b>{user?.name || "Studio user"}</b>
              <small>{user?.email || "Account"}</small>
            </span>
            <Settings2 size={15} />
          </div>
          <button className="signout-button" onClick={signOut}>Sign out</button>
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
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your studio..."
                aria-label="Search your studio"
              />
              <kbd>Ctrl K</kbd>
            </div>
          </div>
          <div className="topbar-right">
            <span className="connection"><i /> ALL SYSTEMS NORMAL</span>
            <button
              className="icon-button"
              aria-label="Notifications"
              onClick={() => notify("You are all caught up.")}
            >
              <Bell size={17} />
              <i />
            </button>
            <Link className="help-button" to="/contact">
              <Activity size={14} /> Help center
            </Link>
            <span className="top-avatar">{(user?.name || "U").slice(0, 1).toUpperCase()}</span>
          </div>
        </header>
        <div className="studio-content">
          <Outlet />
        </div>
      </div>
      <Toast />
    </div>
  );
}
