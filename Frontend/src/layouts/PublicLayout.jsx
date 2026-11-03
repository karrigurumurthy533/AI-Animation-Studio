import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { Button } from "../components/ui";
const links = [
  ["Home", "/"],
  ["Features", "/features"],
  ["How it works", "/how-it-works"],
  ["AI tools", "/ai-tools"],
  ["Pricing", "/pricing"],
  ["About", "/about"],
];
export function Brand() {
  return (
    <Link className="brand" to="/">
      <span className="brand-mark">
        <i />
        <i />
        <i />
      </span>
      <span>
        ANIMATION<span className="brand-light">STUDIO</span>
      </span>
    </Link>
  );
}
export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="public-header">
      <div className="public-nav">
        <Brand />
        <nav className={open ? "public-links open" : "public-links"}>
          {links.map(([label, to]) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="public-actions">
          <Link to="/login">Log in</Link>
          <Button to="/register">Get started</Button>
        </div>
        <button
          className="mobile-menu"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}
export function PublicFooter() {
  return (
    <footer className="public-footer">
      <div className="footer-grid">
        <div>
          <Brand />
          <p>
            A connected creative studio for character, animation and cinematic
            worlds.
          </p>
        </div>
        <div>
          <b>EXPLORE</b>
          <Link to="/features">Features</Link>
          <Link to="/ai-tools">AI tools</Link>
          <Link to="/pricing">Pricing</Link>
        </div>
        <div>
          <b>STUDIO</b>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/login">Log in</Link>
        </div>
        <div className="footer-cta">
          <span className="eyebrow">YOUR NEXT FRAME</span>
          <h3>
            Make something
            <br />
            worth seeing.
          </h3>
          <Button to="/register">Start creating</Button>
        </div>
      </div>
      <div className="footer-legal">
        <span>Copyright 2026 AI Animation Studio</span>
        <span>Privacy and Terms</span>
      </div>
    </footer>
  );
}
export function PublicLayout() {
  return (
    <>
      <PublicHeader />
      <main>
        <Outlet />
      </main>
      <PublicFooter />
    </>
  );
}
