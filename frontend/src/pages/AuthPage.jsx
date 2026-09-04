import { useState } from "react";
import {
  Mail,
  Lock,
  User,
  MapPin,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Siren,
  Shield,
  Car,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AuthPage.css";

const DEMO_ACCOUNTS = [
  {
    label: "Conducteur / Citoyen",
    email: "conducteur@cityflow.cm",
    role: "citizen",
    icon: Car,
    badge: "Usage Quotidien",
    color: "#00875a",
  },
  {
    label: "Services d'Urgence / SAMU",
    email: "samu@cityflow.cm",
    role: "emergency",
    icon: Siren,
    badge: "Onde Verte Prioritaire",
    color: "#dc2626",
  },
  {
    label: "Régulateur Urbain (Mairie)",
    email: "regulateur@cityflow.cm",
    role: "traffic_manager",
    icon: Shield,
    badge: "Supervision du Réseau",
    color: "#2563eb",
  },
];

function AuthPage() {
  const navigate = useNavigate();
  const { login, register, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "conducteur@cityflow.cm",
    password: "password123",
    city: "Yaoundé",
    role: "citizen",
    vehicleType: "Voiture particulière",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage("");
  };

  const handleSelectDemo = (demo) => {
    setFormData({
      ...formData,
      email: demo.email,
      password: "password123",
      role: demo.role,
    });
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        setSuccessMessage("Connexion réussie ! Heureux de vous revoir.");
      } else {
        await register(formData);
        setSuccessMessage("Compte créé avec succès ! Bienvenue sur CityFlow.");
      }

      setTimeout(() => {
        navigate("/profil");
      }, 900);
    } catch (err) {
      setErrorMessage(err.message || "Impossible de se connecter au serveur.");
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        {/* EN-TÊTE DU FORMULAIRE */}
        <div className="auth-header">
          <span className="auth-badge">CITYFLOW AUTHENTIFICATION</span>
          <h1>{isLogin ? "Accédez à votre espace" : "Rejoignez CityFlow"}</h1>
          <p>
            {isLogin
              ? "Connectez-vous pour piloter vos itinéraires, alertes et préférences de mobilité."
              : "Créez votre compte pour optimiser vos trajets à Yaoundé et Douala."}
          </p>
        </div>

        {/* ACCÈS RAPIDE COMPTES DÉMO */}
        {isLogin && (
          <div className="demo-accounts-box">
            <span className="demo-title">
              <Sparkles size={14} color="#00875a" /> Accès Rapide Démo / Profils :
            </span>
            <div className="demo-chips">
              {DEMO_ACCOUNTS.map((demo) => {
                const Icon = demo.icon;
                const isSelected = formData.email === demo.email;
                return (
                  <button
                    key={demo.email}
                    type="button"
                    className={`demo-chip ${isSelected ? "selected" : ""}`}
                    onClick={() => handleSelectDemo(demo)}
                  >
                    <Icon size={14} color={demo.color} />
                    <span>{demo.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* MESSAGE DE SUCCÈS */}
        {successMessage && (
          <div className="auth-alert success">
            <CheckCircle2 size={18} />
            {successMessage}
          </div>
        )}

        {/* MESSAGE D'ERREUR */}
        {errorMessage && (
          <div className="auth-alert error">
            <AlertTriangle size={18} />
            {errorMessage}
          </div>
        )}

        {/* SÉLECTEUR CONNEXION / INSCRIPTION */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${isLogin ? "active" : ""}`}
            onClick={() => {
              setIsLogin(true);
              setErrorMessage("");
            }}
          >
            Se connecter
          </button>
          <button
            type="button"
            className={`auth-tab ${!isLogin ? "active" : ""}`}
            onClick={() => {
              setIsLogin(false);
              setErrorMessage("");
            }}
          >
            Créer un compte
          </button>
        </div>

        {/* FORMULAIRE */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="name">Nom complet</label>
                <div className="input-wrapper">
                  <User size={18} className="input-icon" />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Ex: Paule Noumbissi"
                    value={formData.name}
                    onChange={handleChange}
                    required={!isLogin}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="role">Type de profil / Fonction</label>
                <div className="input-wrapper">
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                  >
                    <option value="citizen">🚗 Conducteur / Citoyen</option>
                    <option value="emergency">🚑 Services d'Urgence (SAMU / Pompiers)</option>
                    <option value="traffic_manager">🚦 Régulateur Urbain / Mairie</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="vehicleType">Moyen de transport principal</label>
                <div className="input-wrapper">
                  <select
                    id="vehicleType"
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleChange}
                  >
                    <option value="Voiture particulière">Voiture particulière</option>
                    <option value="Taxi urbain">Taxi urbain (Jaune)</option>
                    <option value="Moto-taxi (Bend-skin)">Moto-taxi (Bend-skin)</option>
                    <option value="Transport en commun / Bus">Transport en commun / Bus</option>
                    <option value="Véhicule d'urgence">Véhicule d'urgence officiel</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="email">Adresse e-mail</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                id="email"
                name="email"
                placeholder="votre.email@cityflow.cm"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="city">Ville de résidence principale</label>
              <div className="input-wrapper">
                <MapPin size={18} className="input-icon" />
                <select
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                >
                  <option value="Yaoundé">📍 Yaoundé (Centre)</option>
                  <option value="Douala">📍 Douala (Littoral)</option>
                </select>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Afficher ou masquer le mot de passe"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? "Vérification..." : isLogin ? "Se connecter" : "Créer mon compte"}
            <ArrowRight size={18} />
          </button>
        </form>

        {/* PIED DE CARTE */}
        <div className="auth-footer">
          <p>
            {isLogin ? "Pas encore de compte ?" : "Vous avez déjà un compte ?"}
            <button
              type="button"
              className="switch-mode-btn"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMessage("");
              }}
            >
              {isLogin ? "Inscrivez-vous" : "Connectez-vous"}
            </button>
          </p>
          <Link to="/" className="back-home-link">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </main>
  );
}

export default AuthPage;