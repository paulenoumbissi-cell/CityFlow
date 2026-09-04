import { useState, useEffect, useRef } from "react";
import { 
  Menu, 
  X, 
  Bell, 
  MapPin, 
  Siren, 
  LogIn, 
  Users, 
  Settings, 
  ChevronDown, 
  Map, 
  Route, 
  Sparkles, 
  Info
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
  const [mobilityDropdownOpen, setMobilityDropdownOpen] = useState(false);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const dropdownRef = useRef(null);

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

  // Fermer le dropdown lors d'un clic extérieur
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMobilityDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const closeAllMenus = () => {
    setMobileMenuOpen(false);
    setMobilityDropdownOpen(false);
  };

  const isMobilityActive = ["/carte", "/routes", "/prediction"].includes(location.pathname);

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

      {/* NAVIGATION CENTRALE ERGONOMIQUE & REGROUPÉE */}
      <nav className={`desktop-nav ${mobileMenuOpen ? "mobile-open" : ""}`}>
        {/* ACCUEIL */}
        <Link
          to="/"
          className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
          onClick={closeAllMenus}
        >
          Accueil
        </Link>

        {/* GROUPE 1 : MOBILITÉ & TRAFIC (MENU DÉROULANT ERGONOMIQUE) */}
        <div 
          className={`nav-dropdown-wrapper ${isMobilityActive ? "active-parent" : ""}`}
          ref={dropdownRef}
          onMouseEnter={() => setMobilityDropdownOpen(true)}
          onMouseLeave={() => setMobilityDropdownOpen(false)}
        >
          <button 
            type="button"
            className={`nav-dropdown-trigger ${isMobilityActive ? "active" : ""}`}
            onClick={() => setMobilityDropdownOpen(!mobilityDropdownOpen)}
            aria-expanded={mobilityDropdownOpen}
          >
            <span>Mobilité & Trafic</span>
            <ChevronDown size={15} className={`dropdown-chevron ${mobilityDropdownOpen ? "open" : ""}`} />
          </button>

          {mobilityDropdownOpen && (
            <div className="nav-dropdown-menu">
              <Link
                to="/carte"
                className={`dropdown-item ${location.pathname === "/carte" ? "active" : ""}`}
                onClick={closeAllMenus}
              >
                <div className="dropdown-item-icon map-icon">
                  <Map size={18} />
                </div>
                <div className="dropdown-item-text">
                  <strong>Carte Interactive</strong>
                  <span>Flux temps réel, carrefours & caméras</span>
                </div>
              </Link>

              <Link
                to="/routes"
                className={`dropdown-item ${location.pathname === "/routes" ? "active" : ""}`}
                onClick={closeAllMenus}
              >
                <div className="dropdown-item-icon route-icon">
                  <Route size={18} />
                </div>
                <div className="dropdown-item-text">
                  <strong>Itinéraires & GPS</strong>
                  <span>Navigation intelligente & guidage vocal</span>
                </div>
              </Link>

              <Link
                to="/prediction"
                className={`dropdown-item ${location.pathname === "/prediction" ? "active" : ""}`}
                onClick={closeAllMenus}
              >
                <div className="dropdown-item-icon ai-icon">
                  <Sparkles size={18} />
                </div>
                <div className="dropdown-item-text">
                  <strong>Prédictions IA</strong>
                  <span>Anticipation des bouchons & météo</span>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* GROUPE 2 : COMMUNAUTÉ & CITOYENS */}
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

        {/* GROUPE 3 : À PROPOS */}
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

        {/* GROUPE 4 : COULOIR D'URGENCE (BOUTON DISTINCTIF ERGONOMIQUE) */}
        <Link
          to="/urgences"
          className={`nav-emergency-btn ${location.pathname === "/urgences" ? "active" : ""}`}
          onClick={closeAllMenus}
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
          title="Paramètres de l'application"
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
            title={`Connecté : ${user.name || user.email || "Utilisateur"}`}
            onClick={closeAllMenus}
          >
            <span>{user.initials || "PN"}</span>
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