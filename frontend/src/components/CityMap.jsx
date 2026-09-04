import { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import {
  Search,
  Layers,
  Crosshair,
  Activity,
  Navigation,
  Sparkles,
  MapPin,
  Clock,
  Gauge,
  Car,
} from "lucide-react";
import { CITIES, YAOUNDE_NODES, DOUALA_NODES, CongestionLevels } from "../data/cityData";
import { useCity } from "../context/CityContext";
import { fetchTrafficNodes } from "../services/api";

const MAP_LAYERS = {
  standard: {
    name: "Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  dark: {
    name: "Mode Nuit / Sombre",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  },
  satellite: {
    name: "Satellite / Relief",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  },
};

const trafficStyles = {
  [CongestionLevels.JAMMED]: {
    color: "#dc2626",
    fillColor: "#dc2626",
    fillOpacity: 0.85,
    radius: 12,
    badgeText: "Saturé",
  },
  [CongestionLevels.HEAVY]: {
    color: "#ef4444",
    fillColor: "#ef4444",
    fillOpacity: 0.8,
    radius: 10,
    badgeText: "Dense",
  },
  [CongestionLevels.MODERATE]: {
    color: "#f59e0b",
    fillColor: "#f59e0b",
    fillOpacity: 0.8,
    radius: 9,
    badgeText: "Modéré",
  },
  [CongestionLevels.FLUID]: {
    color: "#10b981",
    fillColor: "#10b981",
    fillOpacity: 0.8,
    radius: 8,
    badgeText: "Fluide",
  },
  dense: { color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.8, radius: 10 },
  moderate: { color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.8, radius: 9 },
  fluid: { color: "#10b981", fillColor: "#10b981", fillOpacity: 0.8, radius: 8 },
};

function ChangeCityView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 13, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function CityMap({ customRoute, height = "520px" }) {
  const { selectedCity, setSelectedCity } = useCity();
  const defaultNodes = selectedCity === "Douala" ? DOUALA_NODES : YAOUNDE_NODES;
  const [nodes, setNodes] = useState(defaultNodes);
  const [isLiveApi, setIsLiveApi] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedLayer, setSelectedLayer] = useState("standard");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [mapTargetCenter, setMapTargetCenter] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchLiveTraffic = async () => {
      try {
        const data = await fetchTrafficNodes(selectedCity);
        if (isMounted && data && data.nodes && data.nodes.length > 0) {
          setNodes(data.nodes);
          setIsLiveApi(true);
        }
      } catch (_) {
        if (isMounted) {
          setNodes(selectedCity === "Douala" ? DOUALA_NODES : YAOUNDE_NODES);
        }
      }
    };

    fetchLiveTraffic();
    const interval = setInterval(fetchLiveTraffic, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedCity]);

  const currentCityConfig = (selectedCity === "Douala" ? CITIES.Douala : CITIES.Yaounde) || {
    center: [3.848, 11.502],
    zoom: 13,
  };

  const handleLocateMe = () => {
    // Simuler le positionnement GPS de l'utilisateur dans la ville active
    const userPos = selectedCity === "Douala" ? [4.051, 9.704] : [3.875, 11.518];
    setUserLocation(userPos);
    setMapTargetCenter(userPos);
  };

  const handleSearchSelect = (node) => {
    setSearchQuery(node.name);
    setSelectedNode(node);
    setMapTargetCenter(node.position);
  };

  const filteredNodes = nodes.filter((node) => {
    // Filtre de recherche texte
    if (searchQuery.trim() && !node.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) {
      return false;
    }
    // Filtre de criticité
    if (activeFilter === "all") return true;
    if (activeFilter === "critical") {
      return (
        node.currentCongestion === CongestionLevels.JAMMED ||
        node.currentCongestion === CongestionLevels.HEAVY ||
        node.currentCongestion === "dense" ||
        node.currentCongestion === "jammed" ||
        (node.congestionValue && node.congestionValue >= 75)
      );
    }
    if (activeFilter === "moderate") {
      return (
        node.currentCongestion === CongestionLevels.MODERATE ||
        node.currentCongestion === "moderate" ||
        (node.congestionValue && node.congestionValue >= 40 && node.congestionValue < 75)
      );
    }
    if (activeFilter === "fluid") {
      return (
        node.currentCongestion === CongestionLevels.FLUID ||
        node.currentCongestion === "fluid" ||
        (node.congestionValue && node.congestionValue < 40)
      );
    }
    return true;
  });

  return (
    <div className="city-map-wrapper">
      {/* BARRE D'OUTILS ET CONTRÔLES SUPÉRIEURS */}
      <div className="map-topbar" style={{ flexWrap: "wrap", gap: "12px", paddingBottom: "14px" }}>
        <div>
          <span className="section-label">
            SURVEILLANCE GÉOSPATIALE MULTI-COUCHES {isLiveApi ? "• API BACKEND EN DIRECT" : "• SIMULATION"}
          </span>
          <h2>Situation du trafic en direct — {selectedCity}</h2>
        </div>

        {/* OUTILS : SÉLECTION VILLE + RECHERCHE + COUCHE */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* RECHERCHE RAPIDE */}
          <div style={{ position: "relative", minWidth: "180px" }}>
            <input
              type="text"
              placeholder="Rechercher carrefour..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 12px 8px 32px",
                borderRadius: "10px",
                border: "1.5px solid #cbd5e1",
                fontSize: "12px",
                width: "100%",
                background: "#ffffff",
              }}
            />
            <Search size={14} style={{ position: "absolute", left: "10px", top: "10px", color: "#64748b" }} />
          </div>

          {/* SÉLECTEUR DE COUCHE */}
          <select
            value={selectedLayer}
            onChange={(e) => setSelectedLayer(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1.5px solid #cbd5e1",
              fontSize: "12px",
              fontWeight: "600",
              background: "#ffffff",
              cursor: "pointer",
            }}
          >
            <option value="standard">🗺️ Standard</option>
            <option value="dark">🌙 Mode Nuit</option>
            <option value="satellite">🛰️ Satellite</option>
          </select>

          {/* SÉLECTEUR DE VILLE */}
          <select
            value={selectedCity}
            onChange={(event) => {
              setSelectedCity(event.target.value);
              setMapTargetCenter(null);
              setUserLocation(null);
            }}
            className="city-select"
          >
            <option value="Yaoundé">📍 Yaoundé (7 collines)</option>
            <option value="Douala">📍 Douala (Wouri)</option>
          </select>

          {/* BOUTON GPS */}
          <button
            type="button"
            onClick={handleLocateMe}
            title="Localiser ma position"
            style={{
              padding: "8px 12px",
              background: userLocation ? "#00875a" : "#f1f5f9",
              color: userLocation ? "#ffffff" : "#0f172a",
              border: "none",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <Crosshair size={14} /> Ma Position
          </button>
        </div>
      </div>

      {/* FILTRES DE FLUIDITÉ */}
      <div style={{ display: "flex", gap: "8px", margin: "8px 0 14px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "12px", fontWeight: "700", color: "#475569" }}>Filtre :</span>
        {[
          { key: "all", label: `Tous (${nodes.length})` },
          { key: "critical", label: "🔴 Zones denses / saturées" },
          { key: "moderate", label: "🟠 Zones modérées" },
          { key: "fluid", label: "🟢 Zones fluides" },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActiveFilter(f.key)}
            style={{
              padding: "5px 12px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: "700",
              border: "1px solid",
              borderColor: activeFilter === f.key ? "#00875a" : "#e2e8f0",
              background: activeFilter === f.key ? "#00875a" : "#ffffff",
              color: activeFilter === f.key ? "#ffffff" : "#475569",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* CARTE LEAFLET */}
      <div
        className="real-map"
        style={{
          height,
          width: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
        }}
      >
        <MapContainer
          center={mapTargetCenter || currentCityConfig.center}
          zoom={currentCityConfig.zoom}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <ChangeCityView center={mapTargetCenter || currentCityConfig.center} zoom={currentCityConfig.zoom} />
          <TileLayer
            key={selectedLayer}
            attribution={MAP_LAYERS[selectedLayer].attribution}
            url={MAP_LAYERS[selectedLayer].url}
          />

          {/* POSITION GPS SIMULÉE */}
          {userLocation && (
            <CircleMarker
              center={userLocation}
              radius={11}
              pathOptions={{
                color: "#ffffff",
                fillColor: "#2563eb",
                fillOpacity: 1,
                weight: 3,
              }}
            >
              <Popup>
                <strong>📍 Votre position actuelle</strong>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#64748b" }}>
                  Signal GPS actif (Précision : 5 mètres)
                </p>
              </Popup>
            </CircleMarker>
          )}

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
                  color: (
                    trafficStyles[node.currentCongestion] ||
                    trafficStyles[CongestionLevels.MODERATE] ||
                    trafficStyles.moderate
                  ).color,
                  weight: 4,
                  opacity: 0.65,
                  dashArray:
                    node.currentCongestion === CongestionLevels.JAMMED ||
                    node.currentCongestion === "jammed"
                      ? "6, 6"
                      : undefined,
                }}
              />
            ) : null
          )}

          {/* MARQUEURS DES NŒUDS AVEC HALO RADAR */}
          {filteredNodes.map((node) => {
            const style =
              trafficStyles[node.currentCongestion] ||
              trafficStyles[CongestionLevels.MODERATE] ||
              trafficStyles.moderate;
            const isCritical =
              node.currentCongestion === CongestionLevels.JAMMED ||
              node.currentCongestion === CongestionLevels.HEAVY ||
              node.currentCongestion === "jammed" ||
              node.currentCongestion === "dense" ||
              (node.congestionValue && node.congestionValue >= 75);

            return (
              <div key={node.id}>
                {isCritical && (
                  <CircleMarker
                    center={node.position}
                    radius={(style.radius || 9) + 8}
                    pathOptions={{
                      color: style.color,
                      fillColor: style.fillColor,
                      fillOpacity: 0.25,
                      weight: 1,
                      className: "radar-marker-pulse",
                    }}
                  />
                )}
                <CircleMarker
                  center={node.position}
                  radius={style.radius || 9}
                  eventHandlers={{
                    click: () => setSelectedNode(node),
                  }}
                  pathOptions={{
                    color: style.color,
                    fillColor: style.fillColor,
                    fillOpacity: isCritical ? 0.9 : style.fillOpacity || 0.8,
                    weight: isCritical ? 3 : 2,
                  }}
                >
                  <Popup>
                    <div style={{ padding: "6px", minWidth: "210px", color: "#0a2540" }}>
                      <h3 style={{ margin: "0 0 6px", fontSize: "14px", fontWeight: "700" }}>
                        {node.name}
                      </h3>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: "4px",
                          fontSize: "12px",
                        }}
                      >
                        <span>Niveau de congestion :</span>
                        <strong style={{ color: style.color }}>{node.congestionValue || 50}%</strong>
                      </div>
                      {node.averageSpeedKmh && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "4px",
                            fontSize: "12px",
                          }}
                        >
                          <span>Vitesse moyenne :</span>
                          <strong style={{ color: "#00875A" }}>{node.averageSpeedKmh} km/h</strong>
                        </div>
                      )}
                      {node.estimatedDelayMinutes && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "6px",
                            fontSize: "12px",
                          }}
                        >
                          <span>Retard estimé :</span>
                          <strong style={{ color: style.color }}>
                            +{node.estimatedDelayMinutes} min
                          </strong>
                        </div>
                      )}
                      {node.predictions && node.predictions.length > 0 && (
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#475569",
                            borderTop: "1px solid #e2e8f0",
                            paddingTop: "6px",
                            marginTop: "6px",
                          }}
                        >
                          🔮 Prévision IA (+1h) : <strong>{node.predictions[0].congestionPercentage}%</strong>
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

        {/* BADGE LIVE */}
        <div className="map-live" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ animation: "pulseDot 1.2s infinite alternate" }}></span>
          {isLiveApi ? "CityFlow Live Matrix (Port 3000)" : "LIVE IA TEMPS RÉEL"}
        </div>
      </div>

      {/* INSPECTEUR DE CARREFOUR SÉLECTIONNÉ */}
      {selectedNode && (
        <div
          style={{
            marginTop: "16px",
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
            border: "1.5px solid #e2e8f0",
            borderRadius: "16px",
            padding: "18px 22px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: selectedNode.congestionValue >= 75 ? "#fee2e2" : selectedNode.congestionValue >= 40 ? "#fef3c7" : "#dcfce7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Gauge size={24} color={selectedNode.congestionValue >= 75 ? "#dc2626" : selectedNode.congestionValue >= 40 ? "#d97706" : "#15803d"} />
            </div>
            <div>
              <span style={{ fontSize: "11px", fontWeight: "800", color: "#00875a", textTransform: "uppercase" }}>
                Carrefour Inspecté
              </span>
              <h3 style={{ margin: "2px 0 0", fontSize: "17px", color: "#0f172a" }}>{selectedNode.name}</h3>
            </div>
          </div>

          <div style={{ display: "flex", gap: "24px", alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Congestion</span>
              <strong style={{ fontSize: "16px", color: selectedNode.congestionValue >= 75 ? "#dc2626" : "#0f172a" }}>
                {selectedNode.congestionValue || 50}%
              </strong>
            </div>

            <div>
              <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Vitesse moyenne</span>
              <strong style={{ fontSize: "16px", color: "#00875a" }}>
                {selectedNode.averageSpeedKmh || 28} km/h
              </strong>
            </div>

            <div>
              <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>Véhicules / heure</span>
              <strong style={{ fontSize: "16px", color: "#0f172a" }}>
                {selectedNode.vehicleCountPerHour || 1450} v/h
              </strong>
            </div>

            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              style={{
                padding: "6px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}