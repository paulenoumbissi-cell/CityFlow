import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
  Polyline,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CITIES, YAOUNDE_NODES, DOUALA_NODES, CongestionLevels } from "../data/cityData";
import { apiService } from "../services/api";

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
};

function ChangeMapView({ coords, zoom }) {
  const map = useMap();
  map.setView(coords, zoom);
  return null;
}

export default function CityMap() {
  const [selectedCity, setSelectedCity] = useState("Yaounde");
  const [nodes, setNodes] = useState(YAOUNDE_NODES);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    let isMounted = true;
    apiService.getTrafficNodes(selectedCity === "Yaounde" ? "Yaoundé" : "Douala").then((res) => {
      if (isMounted && res && res.nodes) {
        setNodes(res.nodes);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  const currentCityConfig = CITIES[selectedCity] || CITIES.Yaounde;

  const filteredNodes = nodes.filter((node) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "critical") return node.currentCongestion === CongestionLevels.JAMMED || node.currentCongestion === CongestionLevels.HEAVY;
    if (activeFilter === "moderate") return node.currentCongestion === CongestionLevels.MODERATE;
    if (activeFilter === "fluid") return node.currentCongestion === CongestionLevels.FLUID;
    return true;
  });

  return (
    <div className="citymap-container">
      {/* HEADER DE CONTRÔLE */}
      <div className="citymap-header">
        <div className="citymap-city-buttons">
          <button
            type="button"
            className={selectedCity === "Yaounde" ? "active" : ""}
            onClick={() => {
              setSelectedCity("Yaounde");
              setNodes(YAOUNDE_NODES);
            }}
          >
            Yaoundé (7 collines)
          </button>
          <button
            type="button"
            className={selectedCity === "Douala" ? "active" : ""}
            onClick={() => {
              setSelectedCity("Douala");
              setNodes(DOUALA_NODES);
            }}
          >
            Douala (Wouri)
          </button>
        </div>

        <div className="citymap-filters">
          <button
            type="button"
            className={activeFilter === "all" ? "active" : ""}
            onClick={() => setActiveFilter("all")}
          >
            Tous ({nodes.length})
          </button>
          <button
            type="button"
            className={activeFilter === "critical" ? "active" : ""}
            onClick={() => setActiveFilter("critical")}
          >
            Critique / Dense
          </button>
          <button
            type="button"
            className={activeFilter === "fluid" ? "active" : ""}
            onClick={() => setActiveFilter("fluid")}
          >
            Fluide
          </button>
        </div>
      </div>

      {/* CARTE LEAFLET */}
      <div className="citymap-wrapper" style={{ height: "420px", width: "100%", borderRadius: "16px", overflow: "hidden" }}>
        <MapContainer
          center={currentCityConfig.center}
          zoom={currentCityConfig.zoom}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <ChangeMapView coords={currentCityConfig.center} zoom={currentCityConfig.zoom} />
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CartoDB</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />

          {/* TRACÉ DES SEGMENTS CONNECTÉS */}
          {filteredNodes.map((node) =>
            node.connectedSegments && node.connectedSegments.length > 1 ? (
              <Polyline
                key={`segment_${node.id}`}
                positions={node.connectedSegments}
                pathOptions={{
                  color: (trafficStyles[node.currentCongestion] || trafficStyles[CongestionLevels.MODERATE]).color,
                  weight: 4,
                  opacity: 0.6,
                  dashArray: node.currentCongestion === CongestionLevels.JAMMED ? "6, 6" : undefined,
                }}
              />
            ) : null
          )}

          {/* MARQUEURS DES NŒUDS */}
          {filteredNodes.map((node) => {
            const style = trafficStyles[node.currentCongestion] || trafficStyles[CongestionLevels.MODERATE];
            return (
              <CircleMarker
                key={node.id}
                center={node.position}
                radius={style.radius}
                pathOptions={{
                  color: style.color,
                  fillColor: style.fillColor,
                  fillOpacity: style.fillOpacity,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () => setSelectedNode(node),
                }}
              >
                <Popup>
                  <div style={{ padding: "4px", minWidth: "180px", color: "#0a2540" }}>
                    <h3 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: "700" }}>{node.name}</h3>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                      <span>Congestion :</span>
                      <strong>{node.congestionValue}%</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                      <span>Vitesse moyenne :</span>
                      <strong>{node.averageSpeedKmh} km/h</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
                      <span>Retard estimé :</span>
                      <strong style={{ color: style.color }}>+{node.estimatedDelayMinutes} min</strong>
                    </div>
                    {node.predictions && node.predictions.length > 0 && (
                      <div style={{ fontSize: "11px", color: "#475569", borderTop: "1px solid #e2e8f0", paddingTop: "4px" }}>
                        Prévision +1h : {node.predictions[0].congestionPercentage}% ({node.predictions[0].weatherInfluence})
                      </div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* LÉGENDE RAPIDE */}
      <div className="citymap-legend" style={{ display: "flex", gap: "16px", marginTop: "12px", fontSize: "13px", color: "#475569" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span> Fluide (&gt; 35 km/h)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b", display: "inline-block" }}></span> Modéré (20-35 km/h)
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444", display: "inline-block" }}></span> Dense / Saturé
        </span>
      </div>
    </div>
  );
}