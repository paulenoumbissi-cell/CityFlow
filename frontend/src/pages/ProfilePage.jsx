import {
  User,
  MapPin,
  Route,
  Clock,
  Settings,
  Edit3,
  Mail,
  CalendarDays,
  ChevronRight,
  LogOut,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./ProfilePage.css";

function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/connexion");
  };

  if (!isAuthenticated || !user) {
    return (
      <main className="profile-page">
        <div className="profile-container" style={{ textAlign: "center", padding: "80px 20px" }}>
          <h2>Vous n'êtes pas encore connecté</h2>
          <p style={{ color: "#64748b", margin: "14px 0 24px" }}>
            Connectez-vous pour retrouver vos trajets favoris, votre historique et vos statistiques.
          </p>
          <Link
            to="/connexion"
            style={{
              background: "#087f5b",
              color: "#ffffff",
              padding: "12px 28px",
              borderRadius: "20px",
              fontWeight: "700",
              display: "inline-block",
            }}
          >
            Se connecter / Créer un compte
          </Link>
        </div>
      </main>
    );
  }

  const recentTrips = [
    {
      departure: "Bastos",
      destination: "Centre-ville",
      distance: "6,8 km",
      duration: "22 min",
      date: "Aujourd'hui, 10:32",
    },
    {
      departure: "Mvan",
      destination: "Nsam",
      distance: "5,2 km",
      duration: "19 min",
      date: "Hier, 17:45",
    },
    {
      departure: "Odza",
      destination: "Bastos",
      distance: "9,4 km",
      duration: "31 min",
      date: "28 août, 08:15",
    },
  ];

  return (
    <main className="profile-page">
      <div className="profile-container">
        {/* HEADER */}
        <div className="profile-header">
          <div>
            <span className="profile-label">MON ESPACE CITYFLOW</span>
            <h1>Mon profil</h1>
            <p>
              Gérez vos informations et consultez votre activité sur CityFlow.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <Link to="/parametres" className="edit-profile-button">
              <Settings size={17} />
              Paramètres
            </Link>
            <button
              className="edit-profile-button"
              onClick={handleLogout}
              style={{ background: "#fee2e2", color: "#dc2626", borderColor: "#fca5a5" }}
            >
              <LogOut size={17} />
              Déconnexion
            </button>
          </div>
        </div>

        {/* PROFIL PRINCIPAL */}
        <section className="profile-card">
          <div className="profile-main">
            <div className="profile-avatar">
              {user.initials || "PN"}
            </div>

            <div className="profile-identity">
              <h2>{user.name}</h2>
              <p>{user.role || "Utilisateur CityFlow"}</p>

              <div className="profile-location">
                <MapPin size={15} />
                {user.city || "Yaoundé"}, Cameroun
              </div>
            </div>
          </div>

          <div className="profile-status">
            <span></span>
            Compte actif
          </div>
        </section>

        {/* INFORMATIONS & STATS */}
        <section className="profile-grid">
          {/* COORDONNÉES */}
          <div className="profile-section-card">
            <h3>Informations du compte</h3>

            <div className="profile-info-list">
              <div className="info-row">
                <Mail size={16} />
                <div>
                  <small>Adresse e-mail</small>
                  <strong>{user.email}</strong>
                </div>
              </div>

              <div className="info-row">
                <CalendarDays size={16} />
                <div>
                  <small>Membre depuis</small>
                  <strong>Août 2026</strong>
                </div>
              </div>

              <div className="info-row">
                <ShieldCheck size={16} />
                <div>
                  <small>Niveau de confiance</small>
                  <strong>Vérifié (Score : {user.score || 92}%)</strong>
                </div>
              </div>
            </div>
          </div>

          {/* STATISTIQUES MOBILITÉ */}
          <div className="profile-section-card">
            <h3>Statistiques de mobilité</h3>

            <div className="profile-stats-grid">
              <div className="profile-stat-box">
                <Route size={20} className="stat-icon-color" />
                <strong>{user.tripsCount || 47}</strong>
                <span>Trajets calculés</span>
              </div>

              <div className="profile-stat-box">
                <Clock size={20} className="stat-icon-color" />
                <strong>{user.timeSavedMin || 184} min</strong>
                <span>Temps gagné</span>
              </div>

              <div className="profile-stat-box">
                <Sparkles size={20} className="stat-icon-color" />
                <strong>18.4 kg</strong>
                <span>CO₂ économisé</span>
              </div>
            </div>
          </div>
        </section>

        {/* HISTORIQUE */}
        <section className="history-card">
          <div className="history-header">
            <div>
              <span className="profile-label">ACTIVITÉ RÉCENTE</span>
              <h2>Mes derniers trajets</h2>
            </div>

            <Link to="/routes" className="history-link">
              Nouveau trajet
              <ChevronRight size={17} />
            </Link>
          </div>

          <div className="trip-list">
            {recentTrips.map((trip, index) => (
              <div className="trip-item" key={index}>
                <div className="trip-route">
                  <div className="trip-point">
                    <span className="trip-dot start"></span>
                    <strong>{trip.departure}</strong>
                  </div>

                  <div className="trip-line"></div>

                  <div className="trip-point">
                    <span className="trip-dot destination"></span>
                    <strong>{trip.destination}</strong>
                  </div>
                </div>

                <div className="trip-details">
                  <strong>{trip.duration}</strong>
                  <span>{trip.distance}</span>
                  <small>{trip.date}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

export default ProfilePage;