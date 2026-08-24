import { Menu, Bell, MapPin } from "lucide-react";
import "../index.css";

function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="menu-button" aria-label="Ouvrir le menu">
          <Menu size={24} />
        </button>

        <div className="brand">
          <img
            src="public/logo.png"
            alt="Logo CityFlow"
            className="brand-logo"
          />

          <div className="brand-text">
            <span className="brand-name">CityFlow</span>
            <span className="brand-slogan">Circuler mieux, vivre mieux</span>
          </div>
        </div>
      </div>

      <nav className="desktop-nav">
        <a href="/">Accueil</a>
        <a href="/map">Carte</a>
        <a href="/routes">Itinéraires</a>
        <a href="/prediction">Prédiction</a>
      </nav>

      <div className="navbar-right">
        <div className="city-indicator">
          <MapPin size={18} />
          <span>Yaoundé</span>
        </div>

        <button className="notification-button" aria-label="Notifications">
          <Bell size={21} />
          <span className="notification-dot"></span>
        </button>

        <button className="profile-button" aria-label="Profil">
          <span>PN</span>
        </button>
      </div>
    </header>
  );
}

export default Navbar;