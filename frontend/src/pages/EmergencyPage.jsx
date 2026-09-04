import React, { useState, useEffect, useRef } from "react";
import {
  Siren,
  Flame,
  Shield,
  Zap,
  Clock,
  Radio,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  ArrowRight,
  Route,
  Volume2,
  StopCircle,
  Play,
  RotateCcw,
  Navigation,
  Activity,
  Car,
} from "lucide-react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCity } from "../context/CityContext";
import wsService from "../services/websocketService";
import "./EmergencyPage.css";

const API_BASE = "http://localhost:3000/api";

const VEHICLE_TYPES = [
  {
    id: "ambulance",
    name: "Ambulance / SAMU 119",
    badge: "Urgence médicale vitale",
    icon: Siren,
    color: "#ef4444",
    bg: "#fee2e2",
  },
  {
    id: "firefighters",
    name: "Sapeurs-Pompiers 118",
    badge: "Secours & Incendie",
    icon: Flame,
    color: "#ea580c",
    bg: "#ffedd5",
  },
  {
    id: "police",
    name: "Police Secours 117",
    badge: "Intervention d'Urgence",
    icon: Shield,
    color: "#2563eb",
    bg: "#dbeafe",
  },
  {
    id: "convoy",
    name: "Convoi Sécurisé",
    badge: "Priorité absolue",
    icon: Sparkles,
    color: "#7c3aed",
    bg: "#ede9fe",
  },
];

// Helper to auto-center map on active route
function ChangeMapView({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [coords, map]);
  return null;
}

export default function EmergencyPage() {
  const { selectedCity } = useCity();
  const [selectedVehicle, setSelectedVehicle] = useState(VEHICLE_TYPES[0]);
  const [corridors, setCorridors] = useState([]);
  const [selectedCorridor, setSelectedCorridor] = useState(null);
  const [activeMission, setActiveMission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoSimulate, setAutoSimulate] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  const timerRef = useRef(null);

  // Charger la mission active ou les corridors disponibles
  const fetchEmergencyStatus = async () => {
    try {
      const cityQuery = selectedCity && selectedCity !== "all" ? `?city=${encodeURIComponent(selectedCity)}` : "";
      const res = await fetch(`${API_BASE}/emergency/active${cityQuery}`);
      if (res.ok) {
        const data = await res.json();
        if (data.active && data.mission) {
          setActiveMission(data.mission);
          setElapsedTime(data.elapsedSeconds || 0);
          const v = VEHICLE_TYPES.find((v) => v.id === data.mission.vehicleType) || VEHICLE_TYPES[0];
          setSelectedVehicle(v);
        } else {
          setActiveMission(null);
          if (data.corridorsAvailable && data.corridorsAvailable.length > 0) {
            setCorridors(data.corridorsAvailable);
            setSelectedCorridor(data.corridorsAvailable[0]);
          }
        }
      }
    } catch (err) {
      console.error("Erreur chargement mode urgence", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencyStatus();

    // Écoute temps réel des missions d'urgence
    const unsubUpdate = wsService.on("EMERGENCY_MISSION_UPDATE", (data) => {
      if (data?.mission) {
        if (!selectedCity || selectedCity === "all" || data.mission.city === selectedCity) {
          setActiveMission(data.mission);
          setElapsedTime(data.elapsedSeconds || 0);
          const v = VEHICLE_TYPES.find((v) => v.id === data.mission.vehicleType) || VEHICLE_TYPES[0];
          setSelectedVehicle(v);
        }
      }
    });

    const unsubCancel = wsService.on("EMERGENCY_MISSION_CANCELLED", (data) => {
      if (!selectedCity || selectedCity === "all" || data?.city === selectedCity) {
        setActiveMission(null);
        setAutoSimulate(false);
        fetchEmergencyStatus();
      }
    });

    return () => {
      unsubUpdate();
      unsubCancel();
    };
  }, [selectedCity]);

  // Timer pour la durée écoulée lors d'une mission active
  useEffect(() => {
    let interval = null;
    if (activeMission) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [activeMission]);

  // Déclencher une mission de secours
  const handleDispatchMission = async () => {
    if (!selectedCorridor) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/emergency/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleType: selectedVehicle.id,
          city: selectedCity === "all" ? "Yaoundé" : selectedCity,
          corridorId: selectedCorridor.id,
          origin: selectedCorridor.origin,
          destination: selectedCorridor.destination,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveMission(data.mission);
        setAutoSimulate(true);
      }
    } catch (err) {
      console.error("Erreur dispatch mission", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Avancer le véhicule d'un carrefour (Onde verte)
  const handleStepMission = async () => {
    try {
      const res = await fetch(`${API_BASE}/emergency/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.missionCompleted) {
          setActiveMission(null);
          setAutoSimulate(false);
          fetchEmergencyStatus();
        } else {
          setActiveMission(data.mission);
        }
      }
    } catch (err) {
      console.error("Erreur step mission", err);
    }
  };

  // Annuler / Clôturer la mission
  const handleCancelMission = async () => {
    try {
      const res = await fetch(`${API_BASE}/emergency/cancel`, {
        method: "POST",
      });
      if (res.ok) {
        setActiveMission(null);
        setAutoSimulate(false);
        fetchEmergencyStatus();
      }
    } catch (err) {
      console.error("Erreur annulation mission", err);
    }
  };

  // Auto-simulation progressive de l'onde verte
  useEffect(() => {
    if (autoSimulate && activeMission) {
      timerRef.current = setInterval(() => {
        handleStepMission();
      }, 5000);
    }
    return () => clearInterval(timerRef.current);
  }, [autoSimulate, activeMission]);

  // Coordonnées courantes à afficher sur la carte
  const currentCoords = activeMission ? activeMission.coordinates : selectedCorridor ? selectedCorridor.coordinates : [[3.8480, 11.5021], [3.8820, 11.5170]];
  const currentIntersections = activeMission ? activeMission.intersections : selectedCorridor ? selectedCorridor.intersections : [];
  const currentVehiclePos = activeMission && activeMission.coordinates[activeMission.currentStepIndex]
    ? activeMission.coordinates[activeMission.currentStepIndex]
    : currentCoords[0];

  const mapCenter = currentCoords[0] || [3.8480, 11.5021];

  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <main className="emergency-page">
      {/* BANNIÈRE D'URGENCE ACTIVE (SI MISSION EN COURS) */}
      {activeMission && (
        <div className="emergency-active-banner animate-pulse-emergency">
          <div className="banner-left">
            <div className="siren-spinning-box">
              <Siren size={28} className="text-white" />
            </div>
            <div>
              <div className="badge-live-mission">🚨 MISSION PRIORITAIRE EN COURS</div>
              <h2 className="banner-mission-title">
                {activeMission.vehicleName} • <span>{activeMission.corridorName}</span>
              </h2>
              <p className="banner-sub">
                Onde verte active sur {activeMission.intersections.filter((i) => i.state === "cleared").length + 1} / {activeMission.intersections.length} carrefours
              </p>
            </div>
          </div>

          <div className="banner-right">
            <div className="timer-badge">
              <Clock size={16} />
              <span>Chrono : {formatSeconds(elapsedTime)}</span>
            </div>
            <button className="btn-cancel-mission" onClick={handleCancelMission}>
              <StopCircle size={18} />
              <span>Terminer la mission</span>
            </button>
          </div>
        </div>
      )}

      {/* HEADER HERO */}
      <section className="emergency-hero">
        <div className="emergency-hero-content">
          <div className="hero-tag-emergency">
            <Siren size={16} />
            <span>Régulation de Priorité & Onde Verte</span>
          </div>
          <h1>
            Couloirs d'Urgence <span>& Secours</span>
          </h1>
          <p>
            Système d'ouverture automatique en cascade des feux tricolores pour le SAMU, les Sapeurs-Pompiers et la Police, avec alertes de dégagement aux automobilistes.
          </p>
        </div>
      </section>

      {/* GRILLE PRINCIPALE */}
      <div className="emergency-main-grid">
        {/* COLONNE GAUCHE : CONSOLE DE CONTRÔLE */}
        <div className="emergency-console-col">
          {/* SÉLECTEUR DE VÉHICULE D'URGENCE */}
          <div className="emergency-card">
            <h3 className="card-heading">
              <Zap size={18} className="heading-icon text-red-500" />
              <span>Unité d'Intervention</span>
            </h3>
            <div className="vehicle-selector-grid">
              {VEHICLE_TYPES.map((v) => {
                const isSel = selectedVehicle.id === v.id;
                const IconComponent = v.icon;
                return (
                  <div
                    key={v.id}
                    className={`vehicle-card ${isSel ? "selected" : ""}`}
                    onClick={() => !activeMission && setSelectedVehicle(v)}
                    style={{ borderColor: isSel ? v.color : undefined }}
                  >
                    <div className="vehicle-icon-box" style={{ backgroundColor: v.bg, color: v.color }}>
                      <IconComponent size={22} />
                    </div>
                    <div className="vehicle-info">
                      <h4>{v.name}</h4>
                      <span className="vehicle-badge" style={{ color: v.color }}>{v.badge}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SÉLECTEUR DE CORRIDOR D'URGENCE (SI PAS DE MISSION ACTIVE) */}
          {!activeMission && corridors.length > 0 && (
            <div className="emergency-card">
              <h3 className="card-heading">
                <Route size={18} className="heading-icon text-blue-500" />
                <span>Corridors Prioritaires ({selectedCity})</span>
              </h3>
              <div className="corridors-list">
                {corridors.map((c) => {
                  const isSel = selectedCorridor?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      className={`corridor-card ${isSel ? "selected" : ""}`}
                      onClick={() => setSelectedCorridor(c)}
                    >
                      <div className="corridor-card-header">
                        <h4>{c.name}</h4>
                        <span className="time-gain-tag">-{c.timeSavedMinutes} min</span>
                      </div>
                      <div className="corridor-route-text">
                        <MapPin size={14} className="text-red-500" />
                        <span>{c.origin} ➔ <strong>{c.destination}</strong></span>
                      </div>
                      <div className="corridor-metrics">
                        <span>Distance : <strong>{c.distanceKm} km</strong></span>
                        <span>Temps nominal : <strong>{c.nominalDurationMinutes} min</strong></span>
                        <span>Prioritaire : <strong className="text-green-600">{c.priorityDurationMinutes} min</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* BOUTON ENCLENCHER L'ONDE VERTE */}
              <button
                className="btn-dispatch-emergency pulse-red"
                onClick={handleDispatchMission}
                disabled={isLoading || !selectedCorridor}
              >
                <Siren size={20} />
                <span>ENCLENCHER L'ONDE VERTE PRIORITAIRE</span>
              </button>
            </div>
          )}

          {/* TIMELINE DES FEUX ASSERVIS & TÉLÉMÉTRIE (SI MISSION ACTIVE) */}
          {activeMission && (
            <div className="emergency-card">
              <div className="card-header-flex">
                <h3 className="card-heading">
                  <Activity size={18} className="heading-icon text-green-500" />
                  <span>Feux Tricolores Synchronisés</span>
                </h3>
                <span className="live-pill">ONDE VERTE ACTIVE</span>
              </div>

              {/* Timeline des intersections */}
              <div className="intersections-timeline">
                {activeMission.intersections.map((int, idx) => {
                  const isCleared = int.state === "cleared";
                  const isGreenWave = int.state === "green_wave";
                  return (
                    <div key={int.id} className={`timeline-step ${int.state}`}>
                      <div className="step-indicator">
                        {isCleared ? (
                          <div className="light-icon cleared">✓</div>
                        ) : isGreenWave ? (
                          <div className="light-icon green-wave-pulse">🟢</div>
                        ) : (
                          <div className="light-icon pending">⏳</div>
                        )}
                      </div>
                      <div className="step-content">
                        <div className="step-name">{int.name}</div>
                        <div className="step-status">
                          {isCleared && <span className="text-gray-500">Carrefour franchi (Feu remis au cycle)</span>}
                          {isGreenWave && <span className="text-green-600 font-bold">FEU VERT FORCÉ • Transversale au ROUGE 🔴</span>}
                          {!isCleared && !isGreenWave && <span className="text-yellow-600">En attente d'onde verte</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CONTRÔLES MANUELS DE LA MISSION */}
              <div className="mission-controls-grid">
                <button className="btn-step-action" onClick={handleStepMission}>
                  <Play size={16} />
                  <span>Avancer au prochain feu</span>
                </button>
                <button
                  className={`btn-auto-sim ${autoSimulate ? "active" : ""}`}
                  onClick={() => setAutoSimulate(!autoSimulate)}
                >
                  <RotateCcw size={16} />
                  <span>Auto-Simulation : {autoSimulate ? "ON" : "OFF"}</span>
                </button>
              </div>

              {/* BROADCAST ALERT PREVIEW */}
              <div className="broadcast-box">
                <div className="broadcast-header">
                  <Radio size={16} className="text-red-500 animate-pulse" />
                  <span>Alerte diffusée aux automobilistes (Rayon 2.5 km)</span>
                </div>
                <p className="broadcast-msg">{activeMission.broadcastAlert.message}</p>
                <div className="broadcast-action">
                  <Volume2 size={14} />
                  <span>Consigne : <strong>{activeMission.broadcastAlert.advisedAction}</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COLONNE DROITE : CARTE LEAFLET TEMPS RÉEL */}
        <div className="emergency-map-col">
          <div className="emergency-map-card">
            <div className="map-card-header">
              <div className="map-title-box">
                <MapPin size={18} className="text-red-500" />
                <span>Vue Tactique du Corridor • {selectedCity}</span>
              </div>
              <div className="map-legend-items">
                <span className="legend-item"><span className="legend-dot green"></span> Onde Verte</span>
                <span className="legend-item"><span className="legend-dot red"></span> Voies Bloquées</span>
                <span className="legend-item"><span className="legend-dot vehicle"></span> Véhicule Urgence</span>
              </div>
            </div>

            <div className="leaflet-emergency-wrapper">
              <MapContainer
                center={mapCenter}
                zoom={13.2}
                scrollWheelZoom={true}
                className="emergency-leaflet-container"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <ChangeMapView coords={currentCoords} />

                {/* Tracé du corridor d'urgence */}
                <Polyline
                  positions={currentCoords}
                  pathOptions={{
                    color: activeMission ? "#22c55e" : "#ef4444",
                    weight: 6,
                    dashArray: activeMission ? undefined : "8, 8",
                    opacity: 0.9,
                  }}
                />

                {/* Marqueur du véhicule de secours */}
                {activeMission && (
                  <CircleMarker
                    center={currentVehiclePos}
                    radius={14}
                    pathOptions={{
                      fillColor: selectedVehicle.color,
                      fillOpacity: 1,
                      color: "#ffffff",
                      weight: 3,
                    }}
                  >
                    <Popup>
                      <div className="popup-emergency">
                        <strong>{activeMission.vehicleName}</strong>
                        <p>Vitesse : 74 km/h • Onde Verte Active</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                )}

                {/* Carrefours à feux tricolores */}
                {currentIntersections.map((int) => {
                  const isGreenWave = int.state === "green_wave";
                  const isCleared = int.state === "cleared";
                  return (
                    <CircleMarker
                      key={int.id}
                      center={int.position}
                      radius={isGreenWave ? 10 : 7}
                      pathOptions={{
                        fillColor: isCleared ? "#64748b" : isGreenWave ? "#22c55e" : "#f59e0b",
                        fillOpacity: 0.9,
                        color: "#ffffff",
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="popup-emergency">
                          <strong>{int.name}</strong>
                          <p>
                            Statut : {isGreenWave ? "🟢 Onde Verte Active" : isCleared ? "✅ Franchi" : "⏳ En attente"}
                          </p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
