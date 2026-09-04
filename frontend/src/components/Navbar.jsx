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
  Home
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useCity } from "../context/CityContext";
import { useAuth } from "../context/AuthContext";
import wsService from "../services/websocketService";
import "../index.css";

function Navbar() {
  const location = useLocation();
  const { selectedCity, setSelectedCity } = useCity();
  const { user, isAuthenticated } = useAuth();
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

  const closeMenu = () => {
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

      {/* NAVIGATION CENTRALE : ACCÈS DIRECT ET FLUIDE À TOUTES LES INTERFACES */}
      <nav className={`desktop-nav ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <Link
          to="/"
          className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
          onClick={closeMenu}
        >
          Accueil
        </Link>

        <Link
          to="/carte"
          className={`nav-link ${location.pathname === "/carte" ? "active" : ""}`}
          onClick={closeMenu}
        >
          Carte
        </Link>

        <Link
          to="/routes"
          className={`nav-link ${location.pathname === "/routes" ? "active" : ""}`}
          onClick={closeMenu}
        >
          Itinéraires
        </Link>

        <Link
          to="/prediction"
          className={`nav-link ${location.pathname === "/prediction" ? "active" : ""}`}
          onClick={closeMenu}
        >
          Prédiction
        </Link>

        <Link
          to="/communaute"
          className={`nav-link ${location.pathname === "/communaute" ? "active" : ""}`}
          onClick={closeMenu}
        >
          Communauté
        </Link>

        <Link
          to="/a-propos"
          className={`nav-link ${location.pathname === "/a-propos" ? "active" : ""}`}
          onClick={closeMenu}
        >
          À propos
        </Link>

        <Link
          to="/urgences"
          className={`nav-emergency-btn ${location.pathname === "/urgences" ? "active" : ""}`}
          onClick={closeMenu}
        >
          <Siren size={16} />
          Urgences
        </Link>
      </nav>

      {/* DROITE : OUTILS, LIVE WS, VILLE, NOTIFICATIONS, PARAMÈTRES (PETITE ICÔNE) & PROFIL */}
      <div className="navbar-right">
        {/* INDICATEUR LIVE WEBSOCKET */}
        <div
          className="live-ws-pill"
          title={
            wsStatus === "connected"
              ? "Connecté au flux push temps réel WebSockets (<20ms)"
              : wsStatus === "connecting"
              ? "Connexion au flux temps réel..."
              : "Mode déconnecté"
          }
        >
          <span
            className={`ws-dot ${
              wsStatus === "connected" ? "online" : wsStatus === "connecting" ? "connecting" : "offline"
            }`}
          ></span>
          <span className="ws-text">
            {wsStatus === "connected" ? "Live WS" : wsStatus === "connecting" ? "Connexion..." : "Offline"}
          </span>
        </div>

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

        {/* NOTIFICATIONS (ICÔNE) */}
        <Link
          to="/notifications"
          className={`icon-nav-btn ${location.pathname === "/notifications" ? "active" : ""}`}
          aria-label="Notifications"
          title="Notifications & Alertes"
          onClick={closeMenu}
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
          onClick={closeMenu}
        >
          <Settings size={20} className="settings-gear-icon" />
        </Link>

        {/* PROFIL OU CONNEXION */}
        {isAuthenticated && user ? (
          <Link
            to="/profil"
            className={`profile-button ${location.pathname === "/profil" ? "active" : ""}`}
            aria-label="Profil utilisateur"
            title={`Connecté : ${user.name || user.email || "Utilisateur"}`}
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