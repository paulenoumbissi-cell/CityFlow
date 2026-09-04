import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { Sparkles, Activity, Clock3, TrendingUp, MapPin, Zap } from "lucide-react";

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
import CommunityPage from "./pages/CommunityPage";
import { CityProvider, useCity } from "./context/CityContext";
import { AuthProvider } from "./context/AuthContext";
import { apiService, fetchTrafficNodes, calculateRoute } from "./services/api";
import "./index.css";

function Home() {
  const navigate = useNavigate();
  const { selectedCity, setSelectedCity } = useCity();
  const [startPoint, setStartPoint] = useState("");
  const [endPoint, setEndPoint] = useState("");

  // Live state from backend
  const [trafficNodes, setTrafficNodes] = useState([]);
  const [aiForecast, setAiForecast] = useState(null);
  const [routePreview, setRoutePreview] = useState(null);
  const [isLiveApi, setIsLiveApi] = useState(false);

  // 1. Polling temps réel du trafic et des prévisions IA depuis le backend
  useEffect(() => {
    let isMounted = true;

    const fetchLiveData = async () => {
      try {
        const [nodesData, forecastData] = await Promise.all([
          apiService.getTrafficNodes(selectedCity),
          apiService.getAiForecast({ city: selectedCity, weather: "dry" }),
        ]);

        if (isMounted) {
          if (nodesData && nodesData.nodes && nodesData.nodes.length > 0) {
            setTrafficNodes(nodesData.nodes);
            setIsLiveApi(true);
          }
          if (forecastData) {
            setAiForecast(forecastData);
          }
        }
      } catch (err) {
        console.warn("[CityFlow Live Sync] Polling error:", err);
      }
    };

    fetchLiveData();
    const interval = setInterval(fetchLiveData, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedCity]);

  // 2. Calcul automatique d'itinéraire dynamique en fonction des entrées ou valeurs par défaut
  useEffect(() => {
    let isMounted = true;
    const origin = startPoint.trim() || (selectedCity === "Douala" ? "Akwa" : "Bastos");
    const destination = endPoint.trim() || (selectedCity === "Douala" ? "Bonanjo" : "Centre-ville");

    apiService.calculateRoute({ origin, destination }).then((res) => {
      if (isMounted && res && res.routes && res.routes.length > 0) {
        setRoutePreview(res.routes[0]);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedCity, startPoint, endPoint]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate("/routes");
  };

  // Calculs dynamiques basés sur les données réelles du backend
  const avgCongestion = trafficNodes.length > 0
    ? Math.round(
        trafficNodes.reduce(
          (acc, n) => acc + (n.congestionValue || (n.currentCongestion === "jammed" ? 85 : n.currentCongestion === "heavy" ? 75 : n.currentCongestion === "moderate" ? 50 : 25)),
          0
        ) / trafficNodes.length
      )
    : 50;

  const fluidityPercentage = Math.max(10, Math.min(95, 100 - avgCongestion));

  const trafficStatusLabel =
    avgCongestion >= 75 ? "Trafic dense / saturé" : avgCongestion >= 45 ? "Trafic modéré" : "Trafic fluide";

  const trafficStatusDesc =
    avgCongestion >= 75
      ? "Circulation ralentie sur les principaux carrefours. Itinéraires secondaires recommandés."
      : avgCongestion >= 45
      ? "La circulation est globalement normale avec quelques ralentissements localisés."
      : "Circulation fluide sur l'ensemble du réseau urbain.";

  const dynamicForecasts = aiForecast?.globalForecast || [
    { horizon: "+15 min", congestionPercentage: Math.min(95, avgCongestion + 6), status: "Modéré" },
    { horizon: "+30 min", congestionPercentage: Math.min(98, avgCongestion + 14), status: "Dense" },
    { horizon: "+1 heure", congestionPercentage: Math.max(25, avgCongestion - 8), status: "Modéré" },
    { horizon: "+2 heures", congestionPercentage: Math.max(20, avgCongestion - 20), status: "Fluide" },
  ];

  const topMonitoredNodes = trafficNodes.slice(0, 3).length > 0
    ? trafficNodes.slice(0, 3)
    : [
        { id: "1", name: selectedCity === "Douala" ? "Akwa" : "Centre-ville", congestionValue: 82, currentCongestion: "heavy" },
        { id: "2", name: selectedCity === "Douala" ? "Deido" : "Bastos", congestionValue: 55, currentCongestion: "moderate" },
        { id: "3", name: selectedCity === "Douala" ? "Bonanjo" : "Mvan", congestionValue: 32, currentCongestion: "fluid" },
      ];

  return (
    <>
      {/* HERO */}
      <main className="home">
        <section className="hero">
          <div className="hero-content">
            <span className="hero-badge">
              🚦 Mobilité intelligente {isLiveApi ? "• Données en direct" : "• Mode Local"}
            </span>

            <h1>
              Votre trajet,
              <span> plus simple et plus intelligent.</span>
            </h1>

            <p>
              CityFlow analyse les flux urbains en continu, anticipe les
              congestions par intelligence artificielle et optimise vos déplacements à Yaoundé
              et Douala.
            </p>

            {/* RECHERCHE DYNAMIQUE */}
            <form className="search-card" onSubmit={handleSearchSubmit}>
              <div className="location-input">
                <span className="input-icon start">●</span>
                <div>
                  <label>Départ</label>
                  <input
                    type="text"
                    value={startPoint}
                    onChange={(e) => setStartPoint(e.target.value)}
                    placeholder={selectedCity === "Douala" ? "Ex: Akwa, Deido..." : "Ex: Bastos, Mvan..."}
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
                    placeholder={selectedCity === "Douala" ? "Ex: Bonanjo, Port..." : "Ex: Centre-ville, Nlongkak..."}
                  />
                </div>
              </div>

              <button type="submit" className="search-button">
                Rechercher →
              </button>
            </form>
          </div>

          {/* MINI STATISTIQUES DYNAMIQUES */}
          <div className="hero-stats">
            <div
              className="stat-card clickable-card"
              onClick={() => navigate("/carte")}
              title="Cliquer pour voir la carte interactive"
            >
              <span className="stat-icon">{avgCongestion > 70 ? "🔴" : avgCongestion > 40 ? "🟡" : "🟢"}</span>
              <div>
                <strong>Trafic ({fluidityPercentage}% fluidité)</strong>
                <span>{trafficStatusLabel} (Voir carte →)</span>
              </div>
            </div>

            <div
              className="stat-card clickable-card"
              onClick={() => setSelectedCity(selectedCity === "Yaoundé" ? "Douala" : "Yaoundé")}
              title="Cliquer pour basculer de ville"
            >
              <span className="stat-icon">📍</span>
              <div>
                <strong>Ville active</strong>
                <span>{selectedCity} (Basculer ⇄)</span>
              </div>
            </div>

            <div
              className="stat-card clickable-card"
              onClick={() => navigate("/prediction")}
              title="Cliquer pour voir les prédictions IA"
            >
              <span className="stat-icon">🔮</span>
              <div>
                <strong>Prévision IA (+30 min)</strong>
                <span>{dynamicForecasts[1]?.congestionPercentage || 75}% congestion (Analyser →)</span>
              </div>
            </div>
          </div>
        </section>

        {/* CARTE & TRAFIC EN DIRECT */}
        <section className="dashboard-grid">
          <div className="map-card">
            <CityMap />
          </div>

          {/* TRAFIC TEMPS RÉEL CALCULÉ AUTOMATIQUEMENT */}
          <div className="traffic-card">
            <div className="section-header">
              <div>
                <span className="section-label">ANALYSE EN TEMPS RÉEL</span>
                <h2>État du trafic à {selectedCity}</h2>
              </div>
              <span className="live-badge" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", display: "inline-block", animation: "pulseDot 1.2s infinite" }}></span>
                LIVE
              </span>
            </div>

            <div className="traffic-status">
              <div
                className="traffic-circle"
                style={{
                  background: fluidityPercentage > 60 ? "linear-gradient(135deg, #10b981 0%, #059669 100%)" : fluidityPercentage > 35 ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                }}
              >
                <span>{fluidityPercentage}%</span>
                <small>fluidité</small>
              </div>

              <div className="traffic-info">
                <h3>{trafficStatusLabel}</h3>
                <p>{trafficStatusDesc}</p>
              </div>
            </div>

            <div className="traffic-bars">
              {topMonitoredNodes.map((node) => {
                const cong = node.congestionValue || (node.currentCongestion === "jammed" ? 85 : node.currentCongestion === "heavy" ? 75 : node.currentCongestion === "moderate" ? 50 : 25);
                const levelText = cong >= 75 ? "Dense" : cong >= 45 ? "Modéré" : "Fluide";
                const barColor = cong >= 75 ? "#ef4444" : cong >= 45 ? "#f59e0b" : "#10b981";

                return (
                  <div key={node.id} className="traffic-bar-item">
                    <div>
                      <span>{node.name}</span>
                      <strong style={{ color: barColor }}>
                        {levelText} ({cong}%)
                      </strong>
                    </div>
                    <div className="progress">
                      <span
                        style={{
                          width: `${cong}%`,
                          background: barColor,
                          transition: "width 0.8s ease, background 0.5s ease"
                        }}
                      ></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* PRÉDICTIONS DYNAMIQUES DU MOTEUR IA */}
        <section className="prediction-section">
          <div className="prediction-header">
            <div>
              <span className="section-label">INTELLIGENCE CITYFLOW</span>
              <h2>Anticipez le trafic à {selectedCity}</h2>
              <p>
                Évolution estimée par le modèle neuronal en fonction des flux en direct et de la météo.
              </p>
            </div>

            <div className="prediction-icon">🔮</div>
          </div>

          <div className="prediction-grid">
            {dynamicForecasts.slice(0, 4).map((fc, index) => {
              const val = fc.congestionPercentage;
              const isDense = val >= 75;
              const isMod = val >= 40 && val < 75;
              const levelClass = isDense ? "dense" : isMod ? "moderate" : "fluid";
              const levelText = isDense ? "Dense" : isMod ? "Modéré" : "Fluide";

              return (
                <div
                  key={index}
                  className={`prediction-card clickable-card ${levelClass}`}
                  onClick={() => navigate("/prediction")}
                  title="Consulter la simulation complète"
                >
                  <span>{fc.horizon}</span>
                  <strong>{val}%</strong>
                  <div className={`prediction-status ${levelClass}`}>
                    ● {levelText}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ITINÉRAIRE INTELLIGENT AUTOMATIQUE */}
        <section className="route-section">
          <div className="route-title">
            <span className="section-label">CALCUL D'ITINÉRAIRE AUTOMATIQUE</span>
            <h2>Votre itinéraire optimisé en temps réel</h2>
            <p>
              Calculé à partir de la vitesse moyenne observée sur chaque segment routier.
            </p>
          </div>

          <div className="route-card">
            <div className="route-point">
              <span className="route-dot start-dot"></span>
              <div>
                <small>Départ</small>
                <strong>{startPoint || (selectedCity === "Douala" ? "Akwa (Centre)" : "Bastos (Ambassades)")}</strong>
              </div>
            </div>

            <div className="route-line">
              <span>{routePreview?.distanceKm || 6.8} km</span>
            </div>

            <div className="route-point">
              <span className="route-dot end-dot"></span>
              <div>
                <small>Destination</small>
                <strong>{endPoint || (selectedCity === "Douala" ? "Bonanjo (Affaires)" : "Poste Centrale (Centre)")}</strong>
              </div>
            </div>

            <div className="route-result">
              <div>
                <strong>{routePreview?.durationMinutes || 22} min</strong>
                <span>Temps estimé</span>
              </div>

              <div>
                <strong>{routePreview?.distanceKm || 6.8} km</strong>
                <span>Distance</span>
              </div>

              {routePreview?.delaySavedMinutes && (
                <div>
                  <strong style={{ color: "#00875A" }}>-{routePreview.delaySavedMinutes} min</strong>
                  <span>Temps économisé</span>
                </div>
              )}

              <button
                type="button"
                className="action-link-btn"
                onClick={() => navigate("/routes")}
              >
                Détails de l'itinéraire →
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
              <Route path="/communaute" element={<CommunityPage />} />
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