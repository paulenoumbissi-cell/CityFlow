import { Menu, Bell, MapPin } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import "../index.css";

function Navbar() {
  const location = useLocation();

  return (
    <header className="navbar">

      {/* GAUCHE */}
      <div className="navbar-left">
        <button
          className="menu-button"
          aria-label="Ouvrir le menu"
        >
          <Menu size={24} />
        </button>

        <Link to="/" className="brand">
          <img
            src="/logo.png"
            alt="Logo CityFlow"
            className="brand-logo"
          />
          <div className="brand-text"></div>
        </Link>
      </div>

      {/* NAVIGATION CENTRALE */}
      <nav className="desktop-nav">
        <Link
          to="/"
          className={location.pathname === "/" ? "active" : ""}
        >
          Accueil
        </Link>

        <Link
          to="/carte"
          className={location.pathname === "/carte" ? "active" : ""}
        >
          Carte
        </Link>

        <Link
          to="/routes"
          className={location.pathname === "/routes" ? "active" : ""}
        >
          Itinéraires
        </Link>

        <Link
          to="/prediction"
          className={location.pathname === "/prediction" ? "active" : ""}
        >
          Prédiction
        </Link>

        <Link
          to="/parametres"
          className={location.pathname === "/parametres" ? "active" : ""}
        >
          Paramètres
        </Link>
      </nav>

      {/* DROITE */}
      <div className="navbar-right">
        <div className="city-indicator">
          <MapPin size={18} />
          <span>Yaoundé</span>
        </div>

        {/* NOTIFICATIONS */}
        <Link
          to="/notifications"
          className={`notification-button ${location.pathname === "/notifications" ? "active" : ""}`}
          aria-label="Notifications"
        >
          <Bell size={21} />
          <span className="notification-dot"></span>
        </Link>

        {/* PROFIL */}
        <Link
          to="/profil"
          className={`profile-button ${location.pathname === "/profil" ? "active" : ""}`}
          aria-label="Profil"
        >
          <span>PN</span>
        </Link>
      </div>

    </header>
  );
}

export default Navbar;