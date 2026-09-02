import { useState } from "react";
import { Mail, Lock, User, MapPin, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import "./AuthPage.css";

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    city: "Yaoundé",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(isLogin ? "Connexion:" : "Inscription:", formData);
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        {/* EN-TÊTE DU FORMULAIRE */}
        <div className="auth-header">
          <span className="auth-badge">CITYFLOW COMPTE</span>
          <h1>{isLogin ? "Ravi de vous revoir" : "Rejoignez CityFlow"}</h1>
          <p>
            {isLogin
              ? "Accédez à vos trajets favoris et alertes en temps réel."
              : "Optimisez vos trajets à Yaoundé et Douala dès aujourd'hui."}
          </p>
        </div>

        {/* SÉLECTEUR CONNEXION / INSCRIPTION */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${isLogin ? "active" : ""}`}
            onClick={() => setIsLogin(true)}
          >
            Se connecter
          </button>
          <button
            type="button"
            className={`auth-tab ${!isLogin ? "active" : ""}`}
            onClick={() => setIsLogin(false)}
          >
            Créer un compte
          </button>
        </div>

        {/* FORMULAIRE */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
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
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Adresse e-mail</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                id="email"
                name="email"
                placeholder="votre.email@exemple.cm"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="city">Ville de résidence</label>
              <div className="input-wrapper">
                <MapPin size={18} className="input-icon" />
                <select
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                >
                  <option value="Yaoundé">Yaoundé</option>
                  <option value="Douala">Douala</option>
                </select>
              </div>
            </div>
          )}

          <div className="form-group">
            <div className="password-header">
              <label htmlFor="password">Mot de passe</label>
              {isLogin && (
                <a href="#forgot" className="forgot-link">
                  Mot de passe oublié ?
                </a>
              )}
            </div>
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

          <button type="submit" className="auth-submit-btn">
            {isLogin ? "Se connecter" : "Créer mon compte"}
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
              onClick={() => setIsLogin(!isLogin)}
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