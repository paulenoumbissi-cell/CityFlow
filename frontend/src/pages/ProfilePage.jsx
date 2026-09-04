import { useState } from "react";
import {
  User,
  MapPin,
  Route,
  Clock,
  Settings,
  Mail,
  CalendarDays,
  ChevronRight,
  LogOut,
  Sparkles,
  ShieldCheck,
  Car,
  Siren,
  Shield,
  Save,
  CheckCircle2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./ProfilePage.css";

function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, updateProfile, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [editData, setEditData] = useState({
    name: user?.name || "",
    city: user?.city || "Yaoundé",
    role: user?.role || "citizen",
    vehicleType: user?.vehicleType || "Voiture particulière",
  });

  const handleLogout = () => {
    logout();
    navigate("/connexion");
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(editData);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Erreur lors de la mise à jour : " + err.message);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <main className="profile-page">
        <div className="profile-container" style={{ textAlign: "center", padding: "80px 20px" }}>
          <h2>Vous n'êtes pas encore connecté</h2>
          <p style={{ color: "#64748b", margin: "14px 0 24px" }}>
            Connectez-vous pour retrouver vos trajets favoris, votre historique et vos privilèges de rôle.
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
      departure: user.city === "Douala" ? "Akwa" : "Bastos",
      destination: user.city === "Douala" ? "Bonanjo" : "Centre-ville",
      distance: "6,8 km",
      duration: "22 min",
      date: "Aujourd'hui, 10:32",
    },
    {
      departure: user.city === "Douala" ? "Deido" : "Mvan",
      destination: user.city === "Douala" ? "Bépanda" : "Nsam",
      distance: "5,2 km",
      duration: "19 min",
      date: "Hier, 17:45",
    },
    {
      departure: user.city === "Douala" ? "Bonamoussadi" : "Odza",
      destination: user.city === "Douala" ? "Akwa" : "Bastos",
      distance: "9,4 km",
      duration: "31 min",
      date: "28 août, 08:15",
    },
  ];

  const getRoleIcon = () => {
    if (user.role === "emergency") return <Siren size={18} color="#dc2626" />;
    if (user.role === "traffic_manager") return <Shield size={18} color="#2563eb" />;
    return <Car size={18} color="#00875a" />;
  };

  const getRoleBadgeStyle = () => {
    if (user.role === "emergency") return { background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" };
    if (user.role === "traffic_manager") return { background: "#dbeafe", color: "#2563eb", border: "1px solid #bfdbfe" };
    return { background: "#e8f5e9", color: "#00875a", border: "1px solid #bbf7d0" };
  };

  return (
    <main className="profile-page">
      <div className="profile-container">
        {/* HEADER */}
        <div className="profile-header">
          <div>
            <span className="profile-label">MON ESPACE CITYFLOW</span>
            <h1>Mon profil & Préférences</h1>
            <p>
              Gérez vos informations, votre rôle et vos préférences de transport.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              type="button"
              className="edit-profile-button"
              onClick={() => {
                setEditData({
                  name: user.name,
                  city: user.city,
                  role: user.role,
                  vehicleType: user.vehicleType || "Voiture particulière",
                });
                setIsEditing(!isEditing);
              }}
              style={{ background: isEditing ? "#e8f5e9" : "#ffffff" }}
            >
              <Settings size={17} />
              {isEditing ? "Fermer l'édition" : "Modifier mon profil"}
            </button>
            <button
              type="button"
              className="edit-profile-button"
              onClick={handleLogout}
              style={{ background: "#fee2e2", color: "#dc2626", borderColor: "#fca5a5" }}
            >
              <LogOut size={17} />
              Déconnexion
            </button>
          </div>
        </div>

        {saveSuccess && (
          <div style={{ background: "#dcfce7", color: "#15803d", padding: "12px 18px", borderRadius: "12px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", fontWeight: "600", fontSize: "14px" }}>
            <CheckCircle2 size={18} /> Profil mis à jour avec succès sur le serveur !
          </div>
        )}

        {/* MODAL / FORMULAIRE D'ÉDITION */}
        {isEditing && (
          <section className="profile-card" style={{ marginBottom: "24px", display: "block" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "18px" }}>Modifier mes informations</h3>
            <form onSubmit={handleSaveProfile} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", display: "block", marginBottom: "6px" }}>Nom complet</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", display: "block", marginBottom: "6px" }}>Rôle / Fonction</label>
                <select
                  value={editData.role}
                  onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                >
                  <option value="citizen">🚗 Conducteur / Citoyen</option>
                  <option value="emergency">🚑 Services d'Urgence (SAMU / Pompiers)</option>
                  <option value="traffic_manager">🚦 Régulateur Urbain (Mairie)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", display: "block", marginBottom: "6px" }}>Moyen de transport</label>
                <select
                  value={editData.vehicleType}
                  onChange={(e) => setEditData({ ...editData, vehicleType: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                >
                  <option value="Voiture particulière">Voiture particulière</option>
                  <option value="Taxi urbain">Taxi urbain (Jaune)</option>
                  <option value="Moto-taxi (Bend-skin)">Moto-taxi (Bend-skin)</option>
                  <option value="Transport en commun / Bus">Transport en commun / Bus</option>
                  <option value="Ambulance / SAMU">Ambulance / SAMU</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: "700", display: "block", marginBottom: "6px" }}>Ville par défaut</label>
                <select
                  value={editData.city}
                  onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                >
                  <option value="Yaoundé">📍 Yaoundé (Centre)</option>
                  <option value="Douala">📍 Douala (Littoral)</option>
                </select>
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", marginTop: "10px" }}>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{ background: "#00875a", color: "white", padding: "10px 20px", borderRadius: "8px", border: "none", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Save size={16} /> {isLoading ? "Enregistrement..." : "Enregistrer les modifications"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{ background: "#f1f5f9", color: "#475569", padding: "10px 16px", borderRadius: "8px", border: "none", fontWeight: "600", cursor: "pointer" }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </section>
        )}

        {/* PROFIL PRINCIPAL */}
        <section className="profile-card">
          <div className="profile-main">
            <div className="profile-avatar">
              {user.initials || "PN"}
            </div>

            <div className="profile-identity">
              <h2>{user.name}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0 8px" }}>
                <span style={{ ...getRoleBadgeStyle(), padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  {getRoleIcon()} {user.roleLabel || "Conducteur / Citoyen"}
                </span>
                <span style={{ fontSize: "12px", color: "#64748b" }}>• Transport : <strong>{user.vehicleType || "Voiture"}</strong></span>
              </div>

              <div className="profile-location">
                <MapPin size={15} />
                {user.city || "Yaoundé"}, Cameroun
              </div>
            </div>
          </div>

          <div className="profile-status">
            <span></span>
            Compte actif (JWT sécurisé)
          </div>
        </section>

        {/* PRIVILÈGES LIÉS AU RÔLE */}
        {user.role === "emergency" && (
          <div style={{ background: "linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)", border: "1.5px solid #fca5a5", borderRadius: "16px", padding: "18px 22px", margin: "20px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#b91c1c", fontWeight: "800", fontSize: "15px" }}>
              <Siren size={20} />
              <span>Privilèges Services de Secours & SAMU Activés</span>
            </div>
            <p style={{ margin: "6px 0 12px", fontSize: "13px", color: "#7f1d1d" }}>
              Vous avez l'habilitation prioritaire pour déclencher l'onde verte et diffuser des alertes d'évacuation sur le réseau de Yaoundé et Douala.
            </p>
            <Link to="/urgences" style={{ background: "#dc2626", color: "white", padding: "8px 16px", borderRadius: "8px", fontWeight: "700", fontSize: "13px", textDecoration: "none", display: "inline-block" }}>
              Accéder au Poste de Contrôle des Urgences →
            </Link>
          </div>
        )}

        {user.role === "traffic_manager" && (
          <div style={{ background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)", border: "1.5px solid #bfdbfe", borderRadius: "16px", padding: "18px 22px", margin: "20px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "#1d4ed8", fontWeight: "800", fontSize: "15px" }}>
              <Shield size={20} />
              <span>Privilèges Régulateur Urbain / Communauté Urbaine</span>
            </div>
            <p style={{ margin: "6px 0 12px", fontSize: "13px", color: "#1e3a8a" }}>
              Accès complet à la matrice des capteurs géospatiaux, au recalibrage de l'IA et aux alertes d'anomalies en temps réel.
            </p>
            <Link to="/carte" style={{ background: "#2563eb", color: "white", padding: "8px 16px", borderRadius: "8px", fontWeight: "700", fontSize: "13px", textDecoration: "none", display: "inline-block" }}>
              Superviser la Carte du Trafic →
            </Link>
          </div>
        )}

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
                  <small>Indice de confiance CityFlow</small>
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
                <strong>{user.co2SavedKg || 14.2} kg</strong>
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