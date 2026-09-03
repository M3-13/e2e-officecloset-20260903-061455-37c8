import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import WardrobePage from "./pages/WardrobePage.jsx";
import OutfitPage from "./pages/OutfitPage.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import PrivacyPage from "./pages/PrivacyPage.jsx";
import ImprintPage from "./pages/ImprintPage.jsx";

function HomePage() {
  return (
    <section className="hero">
      <h1>Ihr glamouröser Kleiderschrank</h1>
      <p>
        Verwalten Sie Ihre Garderobe mit Bildern und Kategorien und kombinieren
        Sie Lieblingsstücke zu Outfits – im eleganten Red-Carpet-Look.
      </p>
      <div className="hero-actions">
        <Link to="/register" className="btn btn-primary">
          Jetzt registrieren
        </Link>
        <Link to="/login" className="btn btn-secondary">
          Anmelden
        </Link>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <main className="container">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/wardrobe" element={<WardrobePage />} />
            <Route path="/outfits" element={<OutfitPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/imprint" element={<ImprintPage />} />
          </Routes>
        </main>
        <footer className="site-footer">
          <div className="container footer-links">
            <Link to="/privacy">Datenschutz</Link>
            <Link to="/imprint">Impressum</Link>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
