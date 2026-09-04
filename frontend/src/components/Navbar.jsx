import { useState, useEffect, useRef } from "react";
import { 
  Menu, 
  X, 
  Bell, 
  MapPin, 
  Siren, 
  LogIn, 
  Settings, 
  ChevronDown, 
  Map, 
  Route, 
  Sparkles, 
  Users, 
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const dropdownRef = useRef(null);
  let closeTimeoutRef = useRef(null);

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

  // Fermer lors d'un clic extérieur ou appui sur Escape
  useEffect(() => {
    function handleOutsideInteraction(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideInteraction);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideInteraction);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Gestion du survol avec délai de sécurité (pour ne jamais fermer brusquement)
  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    setDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 220); // 220ms de tolérance pour un confort maximal
  };

  const closeAllMenus = () => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
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

      {/* NAVIGATION CENTRALE : ERGONOMIQUE AVEC MENU DÉROULANT FLUIDE */}
      <nav className={`desktop-nav ${mobileMenuOpen ? "mobile-open" : ""}`}>
        {/* ACCUEIL */}
        <Link
          to="/"
          className={`nav-link ${location.pathname === "/" ? "active" : ""}`}
          onClick={closeAllMenus}
        >
          Accueil
        </Link>

        {/* MENU DÉROULANT : MOBILITÉ & TRAFIC (Accès direct par clic ou survol doux) */}
        <div 
          className="nav-dropdown-wrapper"
          ref={dropdownRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <button 
            type="button"
            className={`nav-dropdown-trigger ${isMobilityActive ? "active-route" : ""} ${dropdownOpen ? "open" : ""}`}
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <span>Mobilité & Trafic</span>
            <ChevronDown size={15} className={`dropdown-chevron ${dropdownOpen ? "rotated" : ""}`} />
          </button>

          {dropdownOpen && (
            <div 
              className="nav-dropdown-menu"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
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
                  <span>Navigation multimodale & guidage vocal</span>
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
            title={`Connecté : ${user.name || user.username || user.email || "Utilisateur"}`}
            onClick={closeAllMenus}
          >
            {user.avatar ? (
              <img src={user.avatar} alt="Avatar" className="navbar-avatar-img" />
            ) : (
              <span>{user.initials || "PN"}</span>
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