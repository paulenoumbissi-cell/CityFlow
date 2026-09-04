import { useState, useEffect } from "react";
import {
  Map,
  Activity,
  MapPin,
  Navigation,
  Clock3,
  Radio,
  Sparkles,
} from "lucide-react";
import CityMap from "../components/CityMap";
import { useCity } from "../context/CityContext";
import wsService from "../services/websocketService";
import "./MapPage.css";

function MapPage() {
  const { selectedCity } = useCity();
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    wsService.connect();
    const unsub = wsService.onStatusChange((s) => setWsStatus(s));
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  const isLive = wsStatus === "connected";

  return (
    <main className="map-page">
      {/* HEADER */}
      <section className="map-page-header">
        <div className="map-page-title">
          <span className="map-page-eyebrow">
            <Activity size={16} />
            SURVEILLANCE DU TRAFIC EN DIRECT
          </span>
          <h1>Carte du trafic {selectedCity}</h1>
          <p>
            Surveillance géospatiale dynamique des flux, ralentissements et carrefours stratégiques
            avec recalibrage automatique toutes les 3 secondes.
          </p>
        </div>

        <div className="map-page-status" style={{ border: isLive ? "1px solid #86efac" : "1px solid #e2e8f0", background: isLive ? "#f0fdf4" : "#f8fafc" }}>
          <span
            className="status-dot"
            style={{
              background: isLive ? "#22c55e" : "#94a3b8",
              boxShadow: isLive ? "0 0 0 4px rgba(34, 197, 94, 0.2)" : "none",
            }}
          ></span>
          <span style={{ color: isLive ? "#15803d" : "#64748b", fontWeight: "700" }}>
            {isLive ? "Flux temps réel synchronisé (WebSockets)" : "Mode local / Hors-ligne"}
          </span>
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
                Cliquez sur n'importe quel carrefour ou zone pour inspecter la vitesse moyenne et les retards calculés.
              </p>
            </div>
          </div>

          <div className="map-update">
            <Clock3 size={16} />
            <span>Dernière synchro : {currentTime}</span>
          </div>
        </div>

        <div className="map-page-content">
          <CityMap height="520px" />
        </div>
      </section>

      {/* INDICATEURS */}
      <section className="map-info-grid">
        <article className="map-info-card">
          <div className="map-info-icon fluid-icon">
            <Navigation size={20} />
          </div>
          <div>
            <span>Circulation fluide (&lt; 40%)</span>
            <strong>🟢</strong>
          </div>
          <p>
            Trafic faible et vitesse optimale (35 - 55 km/h). Déplacements sans ralentissement notable.
          </p>
        </article>

        <article className="map-info-card">
          <div className="map-info-icon moderate-icon">
            <Activity size={20} />
          </div>
          <div>
            <span>Circulation modérée (40 - 75%)</span>
            <strong>🟠</strong>
          </div>
          <p>
            Ralentissements présents sur les carrefours clés. Prévoir +5 à +15 min de temps de trajet.
          </p>
        </article>

        <article className="map-info-card">
          <div className="map-info-icon dense-icon">
            <MapPin size={20} />
          </div>
          <div>
            <span>Circulation dense / saturée (&gt; 75%)</span>
            <strong>🔴</strong>
          </div>
          <p>
            Forte congestion ou incident détecté. Retards supérieurs à 20 min : évitement fortement conseillé.
          </p>
        </article>
      </section>
    </main>
  );
}

export default MapPage;