import { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CITIES, YAOUNDE_NODES, DOUALA_NODES, CongestionLevels } from "../data/cityData";
import { apiService } from "../services/api";
import { useCity } from "../context/CityContext";

const trafficStyles = {
  [CongestionLevels.JAMMED]: {
    color: "#dc2626",
    fillColor: "#dc2626",
    fillOpacity: 0.85,
    radius: 12,
    badgeText: "Saturé",
    badgeClass: "badge-dense",
  },
  [CongestionLevels.HEAVY]: {
    color: "#ef4444",
    fillColor: "#ef4444",
    fillOpacity: 0.8,
    radius: 10,
    badgeText: "Dense",
    badgeClass: "badge-dense",
  },
  [CongestionLevels.MODERATE]: {
    color: "#f59e0b",
    fillColor: "#f59e0b",
    fillOpacity: 0.8,
    radius: 9,
    badgeText: "Modéré",
    badgeClass: "badge-moderate",
  },
  [CongestionLevels.FLUID]: {
    color: "#10b981",
    fillColor: "#10b981",
    fillOpacity: 0.8,
    radius: 8,
    badgeText: "Fluide",
    badgeClass: "badge-fluid",
  },
  dense: {
    color: "#ef4444",
    fillColor: "#ef4444",
    fillOpacity: 0.8,
    radius: 10,
  },
  moderate: {
    color: "#f59e0b",
    fillColor: "#f59e0b",
    fillOpacity: 0.8,
    radius: 9,
  },
  fluid: {
    color: "#10b981",
    fillColor: "#10b981",
    fillOpacity: 0.8,
    radius: 8,
  },
};

function ChangeCityView({ center, zoom }) {
  const map = useMap();
  map.flyTo(center, zoom, { duration: 1.2 });
  return null;
}

export default function CityMap({ customRoute, height = "480px" }) {
  const { selectedCity, setSelectedCity } = useCity();
  const [nodes, setNodes] = useState(selectedCity === "Douala" ? DOUALA_NODES : YAOUNDE_NODES);
  const [activeFilter, setActiveFilter] = useState("all");
  const [pulseCount, setPulseCount] = useState(0);

  // Boucle de synchronisation temps réel (3 secondes)
  useEffect(() => {
    let isMounted = true;

    const fetchLiveTraffic = async () => {
      try {
        const res = await apiService.getTrafficNodes(selectedCity);
        if (isMounted && res && res.nodes) {
          setNodes(res.nodes);
        }
      } catch (_) {
        // En cas d'erreur ou hors-ligne, simuler les micro-fluctuations locales
        if (isMounted) {
          setNodes((prevNodes) =>
            prevNodes.map((node) => {
              const delta = (Math.random() * 2.4) - 1.2;
              const newSpeed = Math.min(55, Math.max(4, parseFloat((node.averageSpeedKmh + delta).toFixed(1))));
              return {
                ...node,
                averageSpeedKmh: newSpeed,
                vehicleCountPerHour: Math.max(400, node.vehicleCountPerHour + Math.floor(Math.random() * 40 - 20)),
              };
            })
          );
        }
      }
      if (isMounted) {
        setPulseCount((c) => c + 1);
      }
    };

    fetchLiveTraffic();
    const interval = setInterval(fetchLiveTraffic, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedCity]);

  const currentCityConfig = selectedCity === "Douala" ? CITIES.Douala : CITIES.Yaounde;

  const filteredNodes = nodes.filter((node) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "critical") return node.currentCongestion === CongestionLevels.JAMMED || node.currentCongestion === CongestionLevels.HEAVY || node.currentCongestion === "dense";
    if (activeFilter === "moderate") return node.currentCongestion === CongestionLevels.MODERATE || node.currentCongestion === "moderate";
    if (activeFilter === "fluid") return node.currentCongestion === CongestionLevels.FLUID || node.currentCongestion === "fluid";
    return true;
  });

  return (
    <div className="city-map-wrapper">
      {/* HEADER DE CONTRÔLE */}
      <div className="map-topbar">
        <div>
          <span className="section-label">SURVEILLANCE GÉOSPATIALE TEMPS RÉEL</span>
          <h2>Situation du trafic en direct</h2>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <select
            value={selectedCity}
            onChange={(event) => setSelectedCity(event.target.value)}
            className="city-select"
          >
            <option value="Yaoundé">📍 Yaoundé (7 collines)</option>
            <option value="Douala">📍 Douala (Wouri)</option>
          </select>
        </div>
      </div>

      {/* CARTE LEAFLET */}
      <div className="real-map" style={{ height, width: "100%", borderRadius: "16px", overflow: "hidden", position: "relative" }}>
        <MapContainer
          center={currentCityConfig.center}
          zoom={currentCityConfig.zoom}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <ChangeCityView center={currentCityConfig.center} zoom={currentCityConfig.zoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* TRACÉ D'ITINÉRAIRE PERSONNALISÉ OU D'URGENCE */}
          {customRoute && customRoute.coordinates && (
            <Polyline
              positions={customRoute.coordinates}
              pathOptions={{
                color: customRoute.color || "#00875A",
                weight: 6,
                opacity: 0.9,
              }}
            />
          )}

          {/* TRACÉ DES SEGMENTS CONNECTÉS */}
          {filteredNodes.map((node) =>
            node.connectedSegments && node.connectedSegments.length > 1 ? (
              <Polyline
                key={`segment_${node.id}`}
                positions={node.connectedSegments}
                pathOptions={{
                  color: (trafficStyles[node.currentCongestion] || trafficStyles[CongestionLevels.MODERATE]).color,
                  weight: 4,
                  opacity: 0.65,
                  dashArray: node.currentCongestion === CongestionLevels.JAMMED || node.currentCongestion === "jammed" ? "6, 6" : undefined,
                }}
              />
            ) : null
          )}

          {/* MARQUEURS DES NŒUDS AVEC HALO RADAR */}
          {filteredNodes.map((node) => {
            const style = trafficStyles[node.currentCongestion] || trafficStyles[CongestionLevels.MODERATE] || trafficStyles.moderate;
            const isCritical = node.currentCongestion === CongestionLevels.JAMMED || node.currentCongestion === CongestionLevels.HEAVY || node.currentCongestion === "jammed";

            return (
              <div key={node.id}>
                {/* HALO RADAR EXTÉRIEUR POUR NŒUDS CRITIQUES */}
                {isCritical && (
                  <CircleMarker
                    center={node.position}
                    radius={style.radius ? style.radius + 8 : 18}
                    pathOptions={{
                      color: style.color,
                      fillColor: style.fillColor,
                      fillOpacity: 0.25,
                      weight: 1,
                      className: "radar-marker-pulse",
                    }}
                  />
                )}

                {/* MARQUEUR CENTRAL */}
                <CircleMarker
                  center={node.position}
                  radius={style.radius || 9}
                  pathOptions={{
                    color: style.color,
                    fillColor: style.fillColor,
                    fillOpacity: style.fillOpacity || 0.85,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div style={{ padding: "4px", minWidth: "190px", color: "#0a2540" }}>
                      <h3 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: "700" }}>{node.name}</h3>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                        <span>Congestion :</span>
                        <strong>{node.congestionValue || node.value || 50}%</strong>
                      </div>
                      {node.averageSpeedKmh && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                          <span>Vitesse moyenne :</span>
                          <strong style={{ color: "#00875A" }}>{node.averageSpeedKmh} km/h</strong>
                        </div>
                      )}
                      {node.estimatedDelayMinutes && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
                          <span>Retard estimé :</span>
                          <strong style={{ color: style.color }}>+{node.estimatedDelayMinutes} min</strong>
                        </div>
                      )}
                      {node.predictions && node.predictions.length > 0 && (
                        <div style={{ fontSize: "11px", color: "#475569", borderTop: "1px solid #e2e8f0", paddingTop: "4px" }}>
                          Prévision +1h : {node.predictions[0].congestionPercentage}% ({node.predictions[0].weatherInfluence})
                        </div>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              </div>
            );
          })}
        </MapContainer>

        {/* LÉGENDE */}
        <div className="map-legend-real">
          <span>
            <i className="legend-green"></i>
            Fluide (&lt; 40%)
          </span>
          <span>
            <i className="legend-orange"></i>
            Modéré (40 - 75%)
          </span>
          <span>
            <i className="legend-red"></i>
            Dense / Saturé (&gt; 75%)
          </span>
        </div>

        {/* BADGE LIVE CLIGNOTANT */}
        <div className="map-live" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ animation: "pulseDot 1.2s infinite" }}></span>
          LIVE IA TEMPS RÉEL
        </div>
      </div>
    </div>
  );
}