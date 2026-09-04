import { useState, useEffect } from "react";
import {
  Map,
  Activity,
  MapPin,
  Navigation,
  Clock3,
  Wifi,
  Sparkles,
  Zap,
} from "lucide-react";
import CityMap from "../components/CityMap";
import { useCity } from "../context/CityContext";
import { apiService } from "../services/api";
import "./MapPage.css";

function MapPage() {
  const { selectedCity, setSelectedCity } = useCity();
  const [nodes, setNodes] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchNodes = async () => {
      try {
        const res = await apiService.getTrafficNodes(selectedCity);
        if (isMounted && res && res.nodes) {
          setNodes(res.nodes);
          setLastUpdated(new Date());
          setIsLive(true);
        }
      } catch (err) {
        if (isMounted) setIsLive(false);
      }
    };

    fetchNodes();
    const interval = setInterval(fetchNodes, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedCity]);

  // Statistiques en direct calculées depuis l'API
  const fluidCount = nodes.filter(
    (n) => n.currentCongestion === "fluid" || n.congestionValue < 40
  ).length;

  const moderateCount = nodes.filter(
    (n) =>
      n.currentCongestion === "moderate" ||
      (n.congestionValue >= 40 && n.congestionValue < 75)
  ).length;

  const denseCount = nodes.filter(
    (n) =>
      n.currentCongestion === "dense" ||
      n.currentCongestion === "heavy" ||
      n.currentCongestion === "jammed" ||
      n.congestionValue >= 75
  ).length;

  const avgSpeed = nodes.length > 0
    ? Math.round(
        nodes.reduce((acc, n) => acc + (n.averageSpeedKmh || 25), 0) / nodes.length
      )
    : 28;

  return (
    <main className="map-page">
      {/* HEADER */}
      <section className="map-page-header">
        <div className="map-page-title">
          <span className="map-page-eyebrow">
            <Activity size={16} />
            SURVEILLANCE GÉOSPATIALE EN DIRECT
          </span>

          <h1>Carte du trafic urbain</h1>

          <p>
            Surveillance en temps réel des carrefours et artères stratégiques de {selectedCity}.
          </p>
        </div>

        <div className="map-page-status" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span className="status-dot" style={{ background: isLive ? "#22c55e" : "#f59e0b", animation: "pulseDot 1.2s infinite" }}></span>
          <strong>{isLive ? "API Temps Réel Active" : "Mode Simulation"}</strong>
          <span style={{ fontSize: "11px", color: "#64748b" }}>({nodes.length || 8} nœuds surveillés)</span>
        </div>
      </section>

      {/* CARTE */}
      <section className="map-page-card">
        <div className="map-page-card-header">
          <div>
            <div className="map-card-icon">
              <Map size={20} />
            </div>

            <div>
              <h2>Situation du trafic à {selectedCity}</h2>
              <p>
                Cliquez sur n'importe quel carrefour pour voir sa vitesse moyenne et ses prévisions.
              </p>
            </div>
          </div>

          <div className="map-update">
            <Clock3 size={16} />
            Mis à jour à {lastUpdated.toLocaleTimeString()}
          </div>
        </div>

        <div className="map-page-content">
          <CityMap />
        </div>
      </section>

      {/* INDICATEURS DYNAMIQUES DU TRAFIC RÉEL */}
      <section className="map-info-grid">
        <article className="map-info-card">
          <div className="map-info-icon fluid-icon">
            <Navigation size={20} />
          </div>

          <div>
            <span>Circulation fluide</span>
            <strong style={{ color: "#10b981" }}>
              {fluidCount} zones (🟢)
            </strong>
          </div>

          <p>
            Axes dégagés avec circulation libre et vitesse moyenne &gt; 35 km/h.
          </p>
        </article>

        <article className="map-info-card">
          <div className="map-info-icon moderate-icon">
            <Activity size={20} />
          </div>

          <div>
            <span>Circulation modérée</span>
            <strong style={{ color: "#f59e0b" }}>
              {moderateCount} zones (🟠)
            </strong>
          </div>

          <p>
            Ralentissements réguliers observés aux heures d'affluence.
          </p>
        </article>

        <article className="map-info-card">
          <div className="map-info-icon dense-icon">
            <MapPin size={20} />
          </div>

          <div>
            <span>Circulation dense</span>
            <strong style={{ color: "#ef4444" }}>
              {denseCount} zones (🔴)
            </strong>
          </div>

          <p>
            Forte saturation. Voies de délestage et itinéraires alternatifs conseillés.
          </p>
        </article>
      </section>
    </main>
  );
}

export default MapPage;