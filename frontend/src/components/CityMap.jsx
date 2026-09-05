import { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CITIES, YAOUNDE_NODES, DOUALA_NODES, CongestionLevels } from "../data/cityData";
import { apiService } from "../services/api";
import { useCity } from "../context/CityContext";
import { useTheme } from "../context/ThemeContext";
import wsService from "../services/websocketService";
import { Navigation, Crosshair, MapPin, Radio, AlertCircle, ArrowRight } from "lucide-react";

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

// Contrôleur de déplacement de caméra
function ChangeCityView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || 13, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
}

// Gestionnaire d'événements de clic sur la carte
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick([parseFloat(e.latlng.lat.toFixed(5)), parseFloat(e.latlng.lng.toFixed(5))]);
      }
    },
  });
  return null;
}

export default function CityMap({ customRoute, height = "480px", onPointSelect, allowClickToSelect = true }) {
  const { selectedCity, setSelectedCity } = useCity();
  const { isDark } = useTheme();
  const [nodes, setNodes] = useState(selectedCity === "Douala" ? DOUALA_NODES : YAOUNDE_NODES);
  const [activeFilter, setActiveFilter] = useState("all");
  const [wsOnline, setWsOnline] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [clickedPoint, setClickedPoint] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date().toLocaleTimeString());

  // 1. Abonnement direct aux flux WebSocket temps réel (TRAFFIC_PULSE)
  useEffect(() => {
    let isMounted = true;

    // Écouteur WebSocket direct
    const handleWsPulse = (data) => {
      if (!isMounted || !data || !data.nodes) return;
      if (data.city && data.city.toLowerCase() === selectedCity.toLowerCase()) {
        setNodes(data.nodes);
        setLastUpdateTime(new Date().toLocaleTimeString());
      }
    };

    const unsubPulse = wsService.on("TRAFFIC_PULSE", handleWsPulse);
    const unsubStatus = wsService.onStatusChange((status) => {
      if (isMounted) setWsOnline(status === "connected");
    });

    // Requête HTTP initiale pour charger les nœuds
    apiService.getTrafficNodes(selectedCity).then((res) => {
      if (isMounted && res && res.nodes) {
        setNodes(res.nodes);
        setLastUpdateTime(new Date().toLocaleTimeString());
      }
    });

    // Polling de sécurité (si WebSocket hors-ligne)
    const fallbackInterval = setInterval(() => {
      if (wsService.status !== "connected") {
        apiService.getTrafficNodes(selectedCity).then((res) => {
          if (isMounted && res && res.nodes) {
            setNodes(res.nodes);
            setLastUpdateTime(new Date().toLocaleTimeString());
          }
        });
      }
    }, 4000);

    return () => {
      isMounted = false;
      unsubPulse();
      unsubStatus();
      clearInterval(fallbackInterval);
    };
  }, [selectedCity]);

  // 2. Géolocalisation GPS du navigateur en direct
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      setGpsError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setGpsError("Impossible d'obtenir votre position GPS (autorisation refusée ou signal faible).");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  };

  const handleMapClick = (coords) => {
    setClickedPoint(coords);
    if (onPointSelect) {
      onPointSelect(coords);
    }
  };

  const currentCityConfig = selectedCity === "Douala" ? CITIES.Douala : CITIES.Yaounde;

  const filteredNodes = nodes.filter((node) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "critical")
      return (
        node.currentCongestion === CongestionLevels.JAMMED ||
        node.currentCongestion === CongestionLevels.HEAVY ||
        node.currentCongestion === "dense"
      );
    if (activeFilter === "moderate")
      return (
        node.currentCongestion === CongestionLevels.MODERATE ||
        node.currentCongestion === "moderate"
      );
    if (activeFilter === "fluid")
      return (
        node.currentCongestion === CongestionLevels.FLUID ||
        node.currentCongestion === "fluid"
      );
    return true;
  });

  return (
    <div className="city-map-wrapper">
      {/* HEADER DE CONTRÔLE */}
      <div className="map-topbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <span className="section-label" style={{ fontSize: "11px", fontWeight: "700", color: "#00875A", letterSpacing: "0.08em" }}>
            SURVEILLANCE GÉOSPATIALE TEMPS RÉEL
          </span>
          <h2 style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: "700" }}>
            Situation du trafic en direct
          </h2>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* BOUTON GPS */}
          <button
            onClick={handleLocateUser}
            disabled={isLocating}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              background: userLocation ? "#e8f5e9" : "#f1f5f9",
              border: `1px solid ${userLocation ? "#00875A" : "#cbd5e1"}`,
              borderRadius: "10px",
              color: userLocation ? "#00875A" : "#334155",
              fontWeight: "600",
              fontSize: "12px",
              cursor: "pointer",
            }}
            title="Activer la position GPS réelle du navigateur"
          >
            <Crosshair size={15} className={isLocating ? "spin-icon" : ""} />
            <span>{isLocating ? "Recherche GPS..." : userLocation ? "GPS Actif" : "Me géolocaliser"}</span>
          </button>

          {/* SÉLECTEUR DE VILLE */}
          <select
            value={selectedCity}
            onChange={(event) => setSelectedCity(event.target.value)}
            className="city-select"
            style={{
              padding: "7px 12px",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              fontWeight: "600",
              fontSize: "13px",
              background: "#ffffff",
              cursor: "pointer",
            }}
          >
            <option value="Yaoundé">📍 Yaoundé (7 collines)</option>
            <option value="Douala">📍 Douala (Wouri)</option>
          </select>
        </div>
      </div>

      {gpsError && (
        <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c", padding: "8px 12px", borderRadius: "8px", fontSize: "12px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertCircle size={15} />
          <span>{gpsError}</span>
        </div>
      )}

      {/* CARTE LEAFLET */}
      <div
        className="real-map"
        style={{
          height,
          width: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
        }}
      >
        <MapContainer
          center={userLocation || currentCityConfig.center}
          zoom={currentCityConfig.zoom}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%" }}
        >
          <ChangeCityView center={userLocation || currentCityConfig.center} zoom={currentCityConfig.zoom} />
          {allowClickToSelect && <MapClickHandler onMapClick={handleMapClick} />}

          {isDark ? (
            <TileLayer
              key="dark-tile"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
          ) : (
            <TileLayer
              key="light-tile"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}

          {/* MARQUEUR DE POSITION GPS RÉELLE */}
          {userLocation && (
            <>
              <CircleMarker
                center={userLocation}
                radius={22}
                pathOptions={{
                  color: "#2563EB",
                  fillColor: "#3B82F6",
                  fillOpacity: 0.2,
                  weight: 1.5,
                  className: "radar-marker-pulse",
                }}
              />
              <CircleMarker
                center={userLocation}
                radius={9}
                pathOptions={{
                  color: "#ffffff",
                  fillColor: "#2563EB",
                  fillOpacity: 1,
                  weight: 3,
                }}
              >
                <Popup>
                  <div style={{ padding: "4px", fontSize: "12px", color: "#1e293b" }}>
                    <strong>📍 Votre position GPS en direct</strong>
                    <div style={{ color: "#64748b", marginTop: "2px" }}>
                      Lat: {userLocation[0].toFixed(4)}, Lng: {userLocation[1].toFixed(4)}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            </>
          )}

          {/* POINT CLIQUE SUR LA CARTE */}
          {clickedPoint && (
            <CircleMarker
              center={clickedPoint}
              radius={8}
              pathOptions={{
                color: "#7C3AED",
                fillColor: "#8B5CF6",
                fillOpacity: 0.9,
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ padding: "4px", fontSize: "12px" }}>
                  <strong>Point sélectionné</strong>
                  <p style={{ margin: "4px 0", color: "#64748b" }}>
                    [{clickedPoint[0]}, {clickedPoint[1]}]
                  </p>
                </div>
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
                  color: (trafficStyles[node.currentCongestion] || trafficStyles[CongestionLevels.MODERATE]).color,
                  weight: 4,
                  opacity: 0.65,
                  dashArray:
                    node.currentCongestion === CongestionLevels.JAMMED || node.currentCongestion === "jammed"
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
              node.currentCongestion === "jammed";

            return (
              <div key={node.id}>
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
                      {node.averageSpeedKmh !== undefined && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "12px" }}>
                          <span>Vitesse moyenne :</span>
                          <strong style={{ color: "#00875A" }}>{node.averageSpeedKmh} km/h</strong>
                        </div>
                      )}
                      {node.estimatedDelayMinutes !== undefined && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
                          <span>Retard estimé :</span>
                          <strong style={{ color: style.color }}>+{node.estimatedDelayMinutes} min</strong>
                        </div>
                      )}
                      {node.vehicleCountPerHour !== undefined && (
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "11px", color: "#64748b" }}>
                          <span>Débit :</span>
                          <span>{node.vehicleCountPerHour} véh/h</span>
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

        {/* BADGE LIVE CLIGNOTANT AVEC HEURE REELLE */}
        <div
          className="map-live"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            background: wsOnline ? "rgba(16, 185, 129, 0.92)" : "rgba(30, 41, 59, 0.9)",
            color: "#ffffff",
            padding: "6px 12px",
            borderRadius: "20px",
            fontSize: "11px",
            fontWeight: "700",
            backdropFilter: "blur(6px)",
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              background: "#ffffff",
              animation: "pulseDot 1.2s infinite",
            }}
          ></span>
          <span>{wsOnline ? `FLUX LIVE TEMPS RÉEL (${lastUpdateTime})` : `MODE LOCAL (${lastUpdateTime})`}</span>
        </div>
      </div>
    </div>
  );
}