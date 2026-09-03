import { useState } from "react";
import { Link, NavLink } from "react-router-dom";

const MAIN_LINKS = [
  { to: "/wardrobe", label: "Garderobe" },
  { to: "/outfits", label: "Outfits" },
  { to: "/account", label: "Konto" },
  { to: "/privacy", label: "Datenschutz" },
  { to: "/imprint", label: "Impressum" },
];

const AUTH_LINKS = [
  { to: "/login", label: "Login" },
  { to: "/register", label: "Registrieren" },
];

function NavItem({ to, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
    >
      {label}
    </NavLink>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-brand" onClick={() => setOpen(false)}>
          Glamour Closet
        </Link>
        <button
          type="button"
          className="navbar-toggle"
          aria-label={open ? "Menü schließen" : "Menü öffnen"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="navbar-toggle-bar" />
          <span className="navbar-toggle-bar" />
          <span className="navbar-toggle-bar" />
        </button>
        <nav className={`navbar-links ${open ? "open" : ""}`}>
          {MAIN_LINKS.map((link) => (
            <NavItem key={link.to} to={link.to} label={link.label} />
          ))}
          <span className="navbar-separator" />
          {AUTH_LINKS.map((link) => (
            <NavItem key={link.to} to={link.to} label={link.label} />
          ))}
        </nav>
      </div>
    </header>
  );
}
