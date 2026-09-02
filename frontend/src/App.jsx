import { useState } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import CityMap from "./components/CityMap";

import MapPage from "./pages/MapPage";
import RoutesPage from "./pages/RoutesPage";
import PredictionPage from "./pages/PredictionPage";
import EmergencyPage from "./pages/EmergencyPage";
import NotificationsPage from "./pages/NotificationsPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import AuthPage from "./pages/AuthPage";
import AboutPage from "./pages/AboutPage";
import { CityProvider, useCity } from "./context/CityContext";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

function Home() {
  const navigate = useNavigate();
  const { selectedCity } = useCity();
  const [startPoint, setStartPoint] = useState("");
  const [endPoint, setEndPoint] = useState("");

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate("/routes");
  };

  return (
    <>
      {/* HERO */}
      <main className="home">
        <section className="hero">
          <div className="hero-content">
            <span className="hero-badge">
              🚦 Mobilité intelligente
            </span>

            <h1>
              Votre trajet,
              <span> plus simple et plus intelligent.</span>
            </h1>

            <p>
              CityFlow vous aide à comprendre le trafic, anticiper les
              congestions et choisir les meilleurs itinéraires à Yaoundé
              et Douala.
            </p>

            {/* RECHERCHE */}
            <form className="search-card" onSubmit={handleSearchSubmit}>
              <div className="location-input">
                <span className="input-icon start">●</span>
                <div>
                  <label>Départ</label>
                  <input
                    type="text"
                    value={startPoint}
                    onChange={(e) => setStartPoint(e.target.value)}
                    placeholder="Votre position actuelle (ex: Bastos)"
                  />
                </div>
              </div>

              <div className="search-line"></div>

              <div className="location-input">
                <span className="input-icon destination">●</span>
                <div>
                  <label>Destination</label>
                  <input
                    type="text"
                    value={endPoint}
                    onChange={(e) => setEndPoint(e.target.value)}
                    placeholder="Où souhaitez-vous aller ? (ex: Centre-ville)"
                  />
                </div>
              </div>

              <button type="submit" className="search-button">
                Rechercher →
              </button>
            </form>
          </div>

          {/* MINI STATISTIQUES */}
          <div className="hero-stats">
            <div
              className="stat-card clickable-card"
              onClick={() => navigate("/carte")}
              title="Cliquer pour voir la carte"
            >
              <span className="stat-icon">🟢</span>
              <div>
                <strong>Trafic actuel</strong>
                <span>Modéré (Voir la carte →)</span>
              </div>
            </div>

            <div
              className="stat-card clickable-card"
              onClick={() => navigate("/carte")}
              title="Cliquer pour changer de ville"
            >
              <span className="stat-icon">📍</span>
              <div>
                <strong>Ville active</strong>
                <span>{selectedCity} (Changer →)</span>
              </div>
            </div>

            <div
              className="stat-card clickable-card"
              onClick={() => navigate("/prediction")}
              title="Cliquer pour voir les prédictions"
            >
              <span className="stat-icon">🔮</span>
              <div>
                <strong>Prévision IA</strong>
                <span>Dans 30 min (Analyser →)</span>
              </div>
            </div>
          </div>
        </section>

        {/* CARTE */}

        <section className="dashboard-grid">

          <div className="map-card">

             <CityMap />

          </div>

          {/* TRAFIC */}

          <div className="traffic-card">

            <div className="section-header">

              <div>

                <span className="section-label">
                  ANALYSE
                </span>

                <h2>
                  État du trafic
                </h2>

              </div>

              <span className="live-badge">
                ● LIVE
              </span>

            </div>


            <div className="traffic-status">

              <div className="traffic-circle">

                <span>
                  68%
                </span>

                <small>
                  fluidité
                </small>

              </div>


              <div className="traffic-info">

                <h3>
                  Trafic modéré
                </h3>

                <p>
                  La circulation est globalement normale,
                  avec quelques ralentissements.
                </p>

              </div>

            </div>


            <div className="traffic-bars">

              <div className="traffic-bar-item">

                <div>

                  <span>
                    Centre-ville
                  </span>

                  <strong>
                    Dense
                  </strong>

                </div>

                <div className="progress">

                  <span
                    style={{
                      width: "82%"
                    }}
                  ></span>

                </div>

              </div>


              <div className="traffic-bar-item">

                <div>

                  <span>
                    Bastos
                  </span>

                  <strong>
                    Modéré
                  </strong>

                </div>

                <div className="progress">

                  <span
                    style={{
                      width: "55%"
                    }}
                  ></span>

                </div>

              </div>


              <div className="traffic-bar-item">

                <div>

                  <span>
                    Mvan
                  </span>

                  <strong>
                    Fluide
                  </strong>

                </div>

                <div className="progress">

                  <span
                    style={{
                      width: "32%"
                    }}
                  ></span>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* PREDICTION */}

        <section className="prediction-section">

          <div className="prediction-header">

            <div>

              <span className="section-label">
                INTELLIGENCE CITYFLOW
              </span>

              <h2>
                Anticipez le trafic
              </h2>

              <p>
                Consultez l'évolution estimée de la circulation
                pour mieux planifier votre déplacement.
              </p>

            </div>

            <div className="prediction-icon">
              🔮
            </div>

          </div>


          <div className="prediction-grid">
            <div
              className="prediction-card clickable-card"
              onClick={() => navigate("/prediction")}
              title="Consulter la prédiction détaillée"
            >
              <span>Maintenant</span>
              <strong>68%</strong>
              <div className="prediction-status moderate">● Modéré</div>
            </div>

            <div
              className="prediction-card clickable-card"
              onClick={() => navigate("/prediction")}
              title="Consulter la prédiction détaillée"
            >
              <span>Dans 15 min</span>
              <strong>74%</strong>
              <div className="prediction-status moderate">● Modéré</div>
            </div>

            <div
              className="prediction-card clickable-card"
              onClick={() => navigate("/prediction")}
              title="Consulter la prédiction détaillée"
            >
              <span>Dans 30 min</span>
              <strong>86%</strong>
              <div className="prediction-status dense">● Dense</div>
            </div>

            <div
              className="prediction-card clickable-card"
              onClick={() => navigate("/prediction")}
              title="Consulter la prédiction détaillée"
            >
              <span>Dans 60 min</span>
              <strong>61%</strong>
              <div className="prediction-status moderate">● Modéré</div>
            </div>
          </div>
        </section>


        {/* ITINERAIRE */}
        <section className="route-section">
          <div className="route-title">
            <span className="section-label">MOBILITÉ</span>
            <h2>Votre itinéraire intelligent</h2>
            <p>
              CityFlow prend en compte l'état du trafic pour
              vous proposer une route adaptée.
            </p>
          </div>

          <div className="route-card">
            <div className="route-point">
              <span className="route-dot start-dot"></span>
              <div>
                <small>Départ</small>
                <strong>{startPoint || "Bastos"}</strong>
              </div>
            </div>

            <div className="route-line">
              <span>6,8 km</span>
            </div>

            <div className="route-point">
              <span className="route-dot end-dot"></span>
              <div>
                <small>Destination</small>
                <strong>{endPoint || "Centre-ville"}</strong>
              </div>
            </div>

            <div className="route-result">
              <div>
                <strong>22 min</strong>
                <span>Temps estimé</span>
              </div>

              <div>
                <strong>6,8 km</strong>
                <span>Distance</span>
              </div>

              <button
                type="button"
                className="action-link-btn"
                onClick={() => navigate("/routes")}
              >
                Voir l'itinéraire →
              </button>
            </div>
          </div>
        </section>

      </main>


      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-container" style={{ maxWidth: "1280px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "32px", padding: "40px 24px" }}>
          <div style={{ maxWidth: "420px" }}>
            <strong style={{ fontSize: "20px", color: "var(--cityflow-primary)", display: "block", marginBottom: "8px" }}>
              CityFlow
            </strong>
            <p style={{ color: "#64748b", fontSize: "14px", lineHeight: "1.6" }}>
              Plateforme intelligente de prédiction du trafic et de gestion des itinéraires prioritaires pour Yaoundé et Douala.
            </p>
          </div>

          <div style={{ display: "flex", gap: "40px", flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: "12px" }}>Navigation</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
                <Link to="/" style={{ color: "#475569" }}>Accueil</Link>
                <Link to="/carte" style={{ color: "#475569" }}>Carte du trafic</Link>
                <Link to="/routes" style={{ color: "#475569" }}>Itinéraires</Link>
                <Link to="/prediction" style={{ color: "#475569" }}>Prédictions</Link>
              </div>
            </div>

            <div>
              <span style={{ fontSize: "12px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", display: "block", marginBottom: "12px" }}>Services</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
                <Link to="/urgences" style={{ color: "#dc2626", fontWeight: "600" }}>Couloirs d'urgence 🚨</Link>
                <Link to="/notifications" style={{ color: "#475569" }}>Centre d'alertes</Link>
                <Link to="/a-propos" style={{ color: "#475569" }}>À propos du projet</Link>
                <Link to="/parametres" style={{ color: "#475569" }}>Paramètres</Link>
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #e2e8f0", padding: "20px", textAlign: "center", fontSize: "13px", color: "#94a3b8" }}>
          © 2026 CityFlow — Yaoundé & Douala, Cameroun. Tous droits réservés.
        </div>
      </footer>
    </>
  );
}

function App() {
  return (
    <CityProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="app">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/carte" element={<MapPage />} />
              <Route path="/routes" element={<RoutesPage />} />
              <Route path="/prediction" element={<PredictionPage />} />
              <Route path="/urgences" element={<EmergencyPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profil" element={<ProfilePage />} />
              <Route path="/parametres" element={<SettingsPage />} />
              <Route path="/connexion" element={<AuthPage />} />
              <Route path="/a-propos" element={<AboutPage />} />
            </Routes>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </CityProvider>
  );
}

export default App;