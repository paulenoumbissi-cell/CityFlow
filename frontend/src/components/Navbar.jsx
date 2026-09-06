import { useState, useEffect } from "react";
import { 
  Menu, 
  X, 
  Bell, 
  MapPin, 
  Siren, 
  LogIn, 
  Settings, 
  Map, 
  Route, 
  Sparkles, 
  Users, 
  Info,
  Sun,
  Moon
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useCity } from "../context/CityContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import wsService from "../services/websocketService";
import "../index.css";

function Navbar() {
  const location = useLocation();
  const { selectedCity, setSelectedCity } = useCity();
  const { user, isAuthenticated } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [wsStatus, setWsStatus] = useState("disconnected");

  useEffect(() => {
    wsService.connect();
    const unsub = wsService.onStatusChange((s) => setWsStatus(s));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedCity) {
      wsService.subscribeCity(selectedCity);
    }
  }, [selectedCity]);

  const closeAllMenus = () => {
    setMobileMenuOpen(false);
  };


  return (
    <header className="navbar">
      {/* GAUCHE : LOGO & MENU MOBILE */}
      <div className="navbar-left">
        <button
          className="menu-button"
          aria-label="Ouvrir le menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <Link to="/" className="brand" onClick={closeAllMenus}>
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

      {/* NAVIGATION CENTRALE : ACCÈS DIRECT ET VISIBLE À TOUTES LES RUBRIQUES */}
      <nav className={`desktop-nav ${mobileMenuOpen ? "mobile-open" : ""}`}>
        {/* ACCUEIL */}
        <Link
          to="/"
          className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
          onClick={closeAllMenus}
        >
          Accueil
        </Link>

        {/* CARTE */}
        <Link
          to="/carte"
          className={`nav-link ${location.pathname === "/carte" ? "active" : ""}`}
          onClick={closeAllMenus}
        >
          <span className="nav-link-with-icon">
            <Map size={16} />
            Carte
          </span>
        </Link>

        {/* ITINÉRAIRES (DIRECTEMENT VISIBLE) */}
        <Link
          to="/routes"
          className={`nav-link ${location.pathname === "/routes" ? "active" : ""}`}
          onClick={closeAllMenus}
        >
          <span className="nav-link-with-icon">
            <Route size={16} />
            Itinéraires
          </span>
        </Link>

        {/* PRÉDICTIONS IA */}
        <Link
          to="/prediction"
          className={`nav-link ${location.pathname === "/prediction" ? "active" : ""}`}
          onClick={closeAllMenus}
        >
          <span className="nav-link-with-icon">
            <Sparkles size={16} />
            Prédictions
          </span>
        </Link>

        {/* COMMUNAUTÉ */}
        <Link
          to="/communaute"
          className={`nav-link ${location.pathname === "/communaute" ? "active" : ""}`}
          onClick={closeAllMenus}
        >
          <span className="nav-link-with-icon">
            <Users size={16} />
            Communauté
          </span>
        </Link>

        {/* À PROPOS */}
        <Link
          to="/a-propos"
          className={`nav-link ${location.pathname === "/a-propos" ? "active" : ""}`}
          onClick={closeAllMenus}
        >
          <span className="nav-link-with-icon">
            <Info size={16} />
            À propos
          </span>
        </Link>

        {/* URGENCES */}
        <Link
          to="/urgences"
          className={`nav-emergency-btn ${location.pathname === "/urgences" ? "active" : ""}`}
          onClick={closeAllMenus}
        >
          <Siren size={16} />
          Urgences
        </Link>
      </nav>

      {/* DROITE : VILLE, NOTIFICATIONS, PARAMÈTRES (PETITE ICÔNE) & PROFIL */}
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

        {/* BOUTON MODE SOMBRE / CLAIR */}
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={isDark ? "Activer le mode clair" : "Activer le mode sombre"}
          title={isDark ? "Mode sombre activé (Cliquer pour passer en clair)" : "Mode clair activé (Cliquer pour passer en sombre)"}
        >
          {isDark ? (
            <Sun size={20} className="theme-icon sun-icon" />
          ) : (
            <Moon size={20} className="theme-icon moon-icon" />
          )}
        </button>

        {/* NOTIFICATIONS (ICÔNE) */}
        <Link
          to="/notifications"
          className={`icon-nav-btn ${location.pathname === "/notifications" ? "active" : ""}`}
          aria-label="Notifications"
          title="Notifications & Alertes"
          onClick={closeAllMenus}
        >
          <Bell size={20} />
          <span className="notification-dot"></span>
        </Link>

        {/* PARAMÈTRES (PETITE ICÔNE ERGONOMIQUE) */}
        <Link
          to="/parametres"
          className={`icon-nav-btn ${location.pathname === "/parametres" ? "active" : ""}`}
          aria-label="Paramètres"
          title="Paramètres de configuration"
          onClick={closeAllMenus}
        >
          <Settings size={20} className="settings-gear-icon" />
        </Link>

        {/* PROFIL OU CONNEXION */}
        {isAuthenticated && user ? (
          <Link
            to="/profil"
            className={`profile-button ${location.pathname === "/profil" ? "active" : ""}`}
            aria-label="Profil utilisateur"
            title={`Mon Profil (${user.name || user.username || user.email || "Utilisateur"})`}
            onClick={closeAllMenus}
          >
            {user.avatar ? (
              <img src={user.avatar} alt="Avatar" className="navbar-avatar-img" />
            ) : (
              <span>{user.initials || "PA"}</span>
            )}
          </Link>
        ) : (
          <Link
            to="/connexion"
            className="login-navbar-btn"
            onClick={closeAllMenus}
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