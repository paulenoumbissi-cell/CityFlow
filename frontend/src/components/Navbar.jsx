import { useState } from "react";
import { Menu, X, Bell, MapPin, Siren, User, LogIn } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useCity } from "../context/CityContext";
import { useAuth } from "../context/AuthContext";
import "../index.css";

function Navbar() {
  const location = useLocation();
  const { selectedCity, setSelectedCity } = useCity();
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <header className="navbar">
      {/* GAUCHE */}
      <div className="navbar-left">
        <button
          className="menu-button"
          aria-label="Ouvrir le menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <Link to="/" className="brand" onClick={closeMenu}>
          <img
            src="/logo.png"
            alt="Logo CityFlow"
            className="brand-logo"
          />
          <div className="brand-text">
            <span className="brand-name">CityFlow</span>
            <span className="brand-slogan">Yaoundé & Douala</span>
          </div>
        </Link>
      </div>

      {/* NAVIGATION CENTRALE */}
      <nav className={`desktop-nav ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <Link
          to="/"
          className={location.pathname === "/" ? "active" : ""}
          onClick={closeMenu}
        >
          Accueil
        </Link>

        <Link
          to="/carte"
          className={location.pathname === "/carte" ? "active" : ""}
          onClick={closeMenu}
        >
          Carte
        </Link>

        <Link
          to="/routes"
          className={location.pathname === "/routes" ? "active" : ""}
          onClick={closeMenu}
        >
          Itinéraires
        </Link>

        <Link
          to="/prediction"
          className={location.pathname === "/prediction" ? "active" : ""}
          onClick={closeMenu}
        >
          Prédiction
        </Link>

        <Link
          to="/urgences"
          className={`nav-emergency-btn ${location.pathname === "/urgences" ? "active" : ""}`}
          onClick={closeMenu}
        >
          <Siren size={16} />
          Urgences
        </Link>

        <Link
          to="/parametres"
          className={location.pathname === "/parametres" ? "active" : ""}
          onClick={closeMenu}
        >
          Paramètres
        </Link>

        <Link
          to="/a-propos"
          className={location.pathname === "/a-propos" ? "active" : ""}
          onClick={closeMenu}
        >
          À propos
        </Link>
      </nav>

      {/* DROITE */}
      <div className="navbar-right">
        {/* SÉLECTEUR DE VILLE */}
        <div className="city-indicator">
          <MapPin size={18} />
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="navbar-city-dropdown"
          >
            <option value="Yaoundé">Yaoundé</option>
            <option value="Douala">Douala</option>
          </select>
        </div>

        {/* NOTIFICATIONS */}
        <Link
          to="/notifications"
          className={`notification-button ${location.pathname === "/notifications" ? "active" : ""}`}
          aria-label="Notifications"
          onClick={closeMenu}
        >
          <Bell size={21} />
          <span className="notification-dot"></span>
        </Link>

        {/* PROFIL OU CONNEXION */}
        {isAuthenticated && user ? (
          <Link
            to="/profil"
            className={`profile-button ${location.pathname === "/profil" ? "active" : ""}`}
            aria-label="Profil"
            onClick={closeMenu}
          >
            <span>{user.initials || "PN"}</span>
          </Link>
        ) : (
          <Link
            to="/connexion"
            className="login-navbar-btn"
            onClick={closeMenu}
          >
            <LogIn size={16} />
            <span>Connexion</span>
          </Link>
        )}
      </div>
    </header>
  );
}

export default Navbar;