import { useState, useEffect, useRef } from "react";
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
  VolumeX,
  Hospital,
  Activity,
} from "lucide-react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useCity } from "../context/CityContext";
import "./EmergencyPage.css";

const emergencyVehicles = [
  {
    id: "ambulance",
    name: "Ambulance / SAMU 119",
    badge: "Urgence médicale critique",
    icon: Siren,
    color: "#ef4444",
    bg: "#fee2e2",
  },
  {
    id: "firefighters",
    name: "Sapeurs-Pompiers (118)",
    badge: "Secours & Incendie",
    icon: Flame,
    color: "#ea580c",
    bg: "#ffedd5",
  },
  {
    id: "police",
    name: "Police / Secours (117)",
    badge: "Intervention rapide",
    icon: Shield,
    color: "#2563eb",
    bg: "#dbeafe",
  },
  {
    id: "convoy",
    name: "Convoi Officiel / Sécurité",
    badge: "Itinéraire protégé",
    icon: Sparkles,
    color: "#7c3aed",
    bg: "#ede9fe",
  },
];

const emergencyCorridors = {
  Yaoundé: [
    {
      id: "yde-1",
      name: "Corridor Est - Centre Hospitalier Universitaire (CHU)",
      origin: "Caserne Mimboman",
      destination: "CHU de Yaoundé (Centre)",
      distance: "7.8 km",
      normalTime: "29 min",
      priorityTime: "9 min",
      gain: "-68%",
      signalsCount: 7,
      status: "Disponibilité optimale",
      intersections: [
        { name: "Carrefour Emombo", status: "forced_green" },
        { name: "Carrefour Mvog-Mbi", status: "forced_green" },
        { name: "Poste Centrale", status: "forced_green" },
        { name: "Avenue Monseigneur Vogt", status: "forced_green" },
      ],
      coords: [
        [3.875, 11.558],
        [3.872, 11.539],
        [3.867, 11.523],
        [3.865, 11.508],
      ],
    },
    {
      id: "yde-2",
      name: "Corridor Sud - Hôpital Général de Yaoundé",
      origin: "Mvan (Axe Sud)",
      destination: "Hôpital Général de Yaoundé (Ngousso)",
      distance: "11.2 km",
      normalTime: "42 min",
      priorityTime: "14 min",
      gain: "-66%",
      signalsCount: 11,
      status: "Onde verte synchronisée",
      intersections: [
        { name: "Carrefour Nsam", status: "forced_green" },
        { name: "Carrefour Trois Statues", status: "forced_green" },
        { name: "Carrefour Nlongkak", status: "forced_green" },
        { name: "Rond-point Ngousso", status: "forced_green" },
      ],
      coords: [
        [3.822, 11.523],
        [3.845, 11.518],
        [3.87, 11.528],
        [3.898, 11.543],
      ],
    },
    {
      id: "yde-3",
      name: "Corridor Nord - Hôpital Central",
      origin: "Bastos (Ambassades)",
      destination: "Hôpital Central de Yaoundé",
      distance: "5.4 km",
      normalTime: "24 min",
      priorityTime: "7 min",
      gain: "-71%",
      signalsCount: 5,
      status: "Voie dégagée",
      intersections: [
        { name: "Rond-point Bastos", status: "forced_green" },
        { name: "Carrefour Ministère de la Santé", status: "forced_green" },
        { name: "Hôpital Central", status: "forced_green" },
      ],
      coords: [
        [3.889, 11.512],
        [3.878, 11.515],
        [3.865, 11.508],
      ],
    },
  ],
  Douala: [
    {
      id: "dla-1",
      name: "Corridor Ouest - Hôpital Laquintinie",
      origin: "Base Bonanjo",
      destination: "Hôpital Laquintinie (Akwa)",
      distance: "4.8 km",
      normalTime: "26 min",
      priorityTime: "8 min",
      gain: "-69%",
      signalsCount: 6,
      status: "Onde verte synchronisée",
      intersections: [
        { name: "Place du Gouvernement", status: "forced_green" },
        { name: "Boulevard de la Liberté", status: "forced_green" },
        { name: "Carrefour Salle des Fêtes Akwa", status: "forced_green" },
      ],
      coords: [
        [4.043, 9.691],
        [4.049, 9.7],
        [4.055, 9.702],
      ],
    },
    {
      id: "dla-2",
      name: "Corridor Nord - Hôpital Général Douala",
      origin: "Rond-point Deido",
      destination: "Hôpital Général de Douala",
      distance: "8.6 km",
      normalTime: "38 min",
      priorityTime: "12 min",
      gain: "-68%",
      signalsCount: 9,
      status: "Disponibilité optimale",
      intersections: [
        { name: "Rond-point 4 Étages Deido", status: "forced_green" },
        { name: "Carrefour Bépanda Omnisports", status: "forced_green" },
        { name: "Carrefour Ndokoti", status: "forced_green" },
      ],
      coords: [
        [4.0667, 9.7006],
        [4.061, 9.725],
        [4.062, 9.748],
      ],
    },
  ],
};

function ChangeMapCenter({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      map.flyTo(coords[0], 13, { duration: 1 });
    }
  }, [coords, map]);
  return null;
}

function EmergencyPage() {
  const { selectedCity, setSelectedCity } = useCity();
  const [selectedVehicle, setSelectedVehicle] = useState(emergencyVehicles[0]);
  const corridors = emergencyCorridors[selectedCity] || emergencyCorridors["Yaoundé"];
  const [activeCorridor, setActiveCorridor] = useState(corridors[0]);
  const [isEngaged, setIsEngaged] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  // Simulation de progression du véhicule en direct
  const [progressIndex, setProgressIndex] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [missionComplete, setMissionComplete] = useState(false);

  const audioCtxRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  // Gestion du synthétiseur de sirène audio (Web Audio API)
  const startSirenAudio = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      let high = true;
      sirenIntervalRef.current = setInterval(() => {
        if (!soundEnabled) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(high ? 580 : 440, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.38);
        high = !high;
      }, 400);
    } catch (e) {
      console.warn("Web Audio non disponible:", e);
    }
  };

  const stopSirenAudio = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
  };

  // Activation du corridor d'urgence
  const handleActivate = () => {
    setIsEngaged(true);
    setBroadcastMessage(true);
    setMissionComplete(false);
    setProgressIndex(0);

    // Initialiser le décompte en secondes d'après le temps prioritaire (ex: 9 min -> 540 sec / démo accélérée)
    const priorityMinutes = parseInt(activeCorridor.priorityTime) || 8;
    setRemainingSeconds(priorityMinutes * 60);

    if (soundEnabled) {
      startSirenAudio();
    }

    setTimeout(() => {
      setBroadcastMessage(false);
    }, 6000);
  };

  const handleDeactivate = () => {
    setIsEngaged(false);
    stopSirenAudio();
    setProgressIndex(0);
    setCurrentPosition(null);
    setMissionComplete(false);
  };

  // Animation de déplacement pas-à-pas du véhicule
  useEffect(() => {
    if (!isEngaged) return;

    const coords = activeCorridor.coords;
    setCurrentPosition(coords[0]);

    const stepInterval = setInterval(() => {
      setProgressIndex((prev) => {
        if (prev < coords.length - 1) {
          const next = prev + 1;
          setCurrentPosition(coords[next]);
          return next;
        } else {
          // Arrivée à destination
          setMissionComplete(true);
          setIsEngaged(false);
          stopSirenAudio();
          clearInterval(stepInterval);
          return prev;
        }
      });

      setRemainingSeconds((s) => Math.max(0, s - 30));
    }, 3500);

    return () => {
      clearInterval(stepInterval);
    };
  }, [isEngaged, activeCorridor]);

  // Formatage du décompte mm:ss
  const formatTimeRemaining = (secs) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins} min ${s < 10 ? "0" : ""}${s} s`;
  };

  return (
    <main className="emergency-page">
      <div className="emergency-container">
        {/* HEADER */}
        <section className="emergency-header">
          <div>
            <span className="emergency-eyebrow">
              <Siren size={16} /> GESTION DES ITINÉRAIRES PRIORITAIRES
            </span>
            <h1>Couloirs d'Urgence & Véhicules Prioritaires</h1>
            <p>
              Régulation intelligente des feux, onde verte synchronisée et libération dynamique des axes de secours à Yaoundé et Douala.
            </p>
          </div>

          <div className="emergency-city-switch">
            <label>Ville active :</label>
            <select
              value={selectedCity}
              onChange={(e) => {
                const newCity = e.target.value;
                setSelectedCity(newCity);
                setActiveCorridor(emergencyCorridors[newCity][0]);
                handleDeactivate();
              }}
            >
              <option value="Yaoundé">📍 Yaoundé</option>
              <option value="Douala">📍 Douala</option>
            </select>
          </div>
        </section>

        {/* CHOIX DU TYPE DE VÉHICULE */}
        <section className="vehicle-selection">
          <h2>1. Sélectionnez l'unité prioritaire</h2>
          <div className="vehicle-grid">
            {emergencyVehicles.map((veh) => {
              const Icon = veh.icon;
              const isSelected = selectedVehicle.id === veh.id;
              return (
                <button
                  key={veh.id}
                  type="button"
                  className={`vehicle-card ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedVehicle(veh)}
                  style={{
                    borderColor: isSelected ? veh.color : "transparent",
                  }}
                >
                  <div
                    className="vehicle-icon-box"
                    style={{ backgroundColor: veh.bg, color: veh.color }}
                  >
                    <Icon size={24} />
                  </div>
                  <div>
                    <strong>{veh.name}</strong>
                    <span className="vehicle-badge">{veh.badge}</span>
                  </div>
                  {isSelected && <span className="selection-dot" style={{ backgroundColor: veh.color }}></span>}
                </button>
              );
            })}
          </div>
        </section>

        {/* CORRIDORS & GESTION ACTIVE */}
        <div className="corridor-layout">
          {/* GAUCHE : CHOIX DU COULOIR */}
          <section className="corridor-sidebar">
            <div className="sidebar-title">
              <h2>2. Couloirs d'urgence prédéfinis</h2>
              <span>{corridors.length} corridors disponibles</span>
            </div>

            <div className="corridor-list">
              {corridors.map((corr) => {
                const isSelected = activeCorridor.id === corr.id;
                return (
                  <article
                    key={corr.id}
                    className={`corridor-card ${isSelected ? "active" : ""}`}
                    onClick={() => {
                      setActiveCorridor(corr);
                      handleDeactivate();
                    }}
                  >
                    <div className="corridor-card-header">
                      <h3>{corr.name}</h3>
                      <span className="corridor-gain">{corr.gain} de temps</span>
                    </div>

                    <div className="corridor-endpoints">
                      <div className="endpoint">
                        <span className="dot origin"></span>
                        <div>
                          <small>Origine</small>
                          <strong>{corr.origin}</strong>
                        </div>
                      </div>
                      <div className="endpoint">
                        <span className="dot dest"></span>
                        <div>
                          <small>Destination Hospitalière</small>
                          <strong>{corr.destination}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="corridor-metrics">
                      <div>
                        <span>Temps standard</span>
                        <strong>{corr.normalTime}</strong>
                      </div>
                      <ArrowRight size={16} className="metric-arrow" />
                      <div>
                        <span>Temps prioritaire</span>
                        <strong className="priority-text">{corr.priorityTime}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* ACTION D'ENGAGEMENT ET CONTRÔLE SIRÈNE */}
            <div className="engagement-panel">
              <div style={{ display: "flex", gap: "10px", marginBottom: "12px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => {
                    const newSound = !soundEnabled;
                    setSoundEnabled(newSound);
                    if (isEngaged) {
                      if (newSound) startSirenAudio();
                      else stopSirenAudio();
                    }
                  }}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    background: soundEnabled ? "#fee2e2" : "#ffffff",
                    color: soundEnabled ? "#dc2626" : "#64748b",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  {soundEnabled ? "Sirène Audio Active" : "Activer Son Sirène"}
                </button>
              </div>

              {!isEngaged ? (
                <button className="engage-button" onClick={handleActivate}>
                  <Zap size={20} />
                  Activer le Corridor Prioritaire
                </button>
              ) : (
                <button className="disengage-button" onClick={handleDeactivate}>
                  <CheckCircle2 size={20} />
                  Désactiver / Fin de Mission
                </button>
              )}
              <small className="engagement-note">
                ⚡ Force les feux au vert et diffuse une alerte aux conducteurs civils.
              </small>
            </div>
          </section>

          {/* DROITE : CARTE ET STATUT EN TEMPS RÉEL */}
          <section className="corridor-preview-panel">
            {/* BANDEAU DE STATUT D'ENGAGEMENT */}
            <div className={`status-banner ${isEngaged ? "engaged" : "ready"}`}>
              <div className="status-indicator">
                <span className="pulse-circle"></span>
                <div>
                  <strong>
                    {isEngaged
                      ? `MISSION ACTIVE : ${selectedVehicle.name}`
                      : missionComplete
                      ? "MISSION ACCOMPLIE AVEC SUCCÈS"
                      : "Corridor en attente d'activation"}
                  </strong>
                  <span>
                    {isEngaged
                      ? `Onde verte synchronisée sur ${activeCorridor.signalsCount} carrefours clés.`
                      : missionComplete
                      ? `Le véhicule est arrivé à destination (${activeCorridor.destination}).`
                      : "Prêt à être déployé par le centre de régulation."}
                  </span>
                </div>
              </div>

              {isEngaged && (
                <div className="live-speed-box" style={{ background: "#dc2626" }}>
                  <span>ETA Hôpital</span>
                  <strong>{formatTimeRemaining(remainingSeconds)}</strong>
                </div>
              )}
            </div>

            {/* ALERTE BROADCAST EN DIRECT */}
            {broadcastMessage && (
              <div className="broadcast-toast">
                <Radio size={20} className="broadcast-icon" />
                <div>
                  <strong>Alerte d'Urgence Diffusée :</strong>
                  <p>
                    Notification push envoyée aux véhicules circulant sur l'axe{" "}
                    <b>{activeCorridor.origin} ➔ {activeCorridor.destination}</b> : « Dégagez le couloir de droite ».
                  </p>
                </div>
              </div>
            )}

            {/* CARTE LEAFLET INTERACTIVE */}
            <div className="emergency-map-card">
              <MapContainer
                center={activeCorridor.coords[0]}
                zoom={13}
                scrollWheelZoom={true}
                className="emergency-leaflet-map"
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ChangeMapCenter coords={activeCorridor.coords} />

                {/* TRACÉ DU COULOIR */}
                <Polyline
                  positions={activeCorridor.coords}
                  pathOptions={{
                    color: isEngaged ? selectedVehicle.color : "#087f5b",
                    weight: isEngaged ? 8 : 5,
                    opacity: 0.95,
                    dashArray: isEngaged ? undefined : "6, 8",
                  }}
                />

                {/* VÉHICULE D'URGENCE EN MOUVEMENT RÉEL */}
                {isEngaged && currentPosition && (
                  <>
                    {/* HALO GYROPHARE EXTÉRIEUR */}
                    <CircleMarker
                      center={currentPosition}
                      radius={22}
                      pathOptions={{
                        color: "#ef4444",
                        fillColor: "#3b82f6",
                        fillOpacity: 0.35,
                        weight: 2,
                        className: "radar-marker-pulse",
                      }}
                    />
                    {/* VÉHICULE */}
                    <CircleMarker
                      center={currentPosition}
                      radius={12}
                      pathOptions={{
                        color: "#ffffff",
                        weight: 3,
                        fillColor: selectedVehicle.color,
                        fillOpacity: 1,
                      }}
                    >
                      <Popup>
                        <strong>🚨 {selectedVehicle.name} EN COURSE</strong>
                        <p style={{ margin: "4px 0 0", fontSize: "11px" }}>
                          Vitesse prioritaire forcée • Feux au vert
                        </p>
                      </Popup>
                    </CircleMarker>
                  </>
                )}

                {/* POINT DE DÉPART */}
                <CircleMarker
                  center={activeCorridor.coords[0]}
                  radius={10}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 3,
                    fillColor: selectedVehicle.color,
                    fillOpacity: 1,
                  }}
                >
                  <Popup>
                    <strong>Départ d'Urgence</strong>
                    <br />
                    {activeCorridor.origin}
                  </Popup>
                </CircleMarker>

                {/* DESTINATION HOSPITALIÈRE */}
                <CircleMarker
                  center={activeCorridor.coords[activeCorridor.coords.length - 1]}
                  radius={12}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 3,
                    fillColor: "#10b981",
                    fillOpacity: 1,
                  }}
                >
                  <Popup>
                    <strong>🏥 Destination Sécurisée</strong>
                    <br />
                    {activeCorridor.destination}
                  </Popup>
                </CircleMarker>
              </MapContainer>

              {/* LÉGENDE RAPIDE */}
              <div className="emergency-map-legend">
                <span>
                  <i style={{ backgroundColor: selectedVehicle.color }}></i>
                  Couloir réservé ({selectedVehicle.name})
                </span>
                <span>
                  <i style={{ backgroundColor: "#10b981" }}></i>
                  Destination hospitalière
                </span>
                <span>
                  <Zap size={14} color="#f59e0b" />
                  {activeCorridor.signalsCount} Feux synchronisés
                </span>
              </div>
            </div>

            {/* ÉTAT DES CARREFOURS & ONDE VERTE */}
            {isEngaged && activeCorridor.intersections && (
              <div style={{ background: "#ffffff", border: "1px solid #bbf7d0", borderRadius: "14px", padding: "14px 18px", margin: "16px 0", boxShadow: "0 4px 12px rgba(0,0,0,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#065f46", fontWeight: "700", fontSize: "13px", marginBottom: "8px" }}>
                  <Sparkles size={16} />
                  <span>Synchronisation Onde Verte en Direct :</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "8px" }}>
                  {activeCorridor.intersections.map((inter, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "8px 12px",
                        borderRadius: "8px",
                        background: "#f0fdf4",
                        border: "1px solid #86efac",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontWeight: "600", color: "#1e293b" }}>{inter.name}</span>
                      <span style={{ color: "#16a34a", fontWeight: "800", fontSize: "11px" }}>🟢 VERT (0s)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STATISTIQUES D'INTERVENTION */}
            <div className="emergency-kpis">
              <div className="kpi-box">
                <Clock size={20} className="kpi-icon" />
                <div>
                  <span>Temps prioritaire</span>
                  <strong>{activeCorridor.priorityTime}</strong>
                </div>
              </div>

              <div className="kpi-box">
                <Route size={20} className="kpi-icon" />
                <div>
                  <span>Distance corridor</span>
                  <strong>{activeCorridor.distance}</strong>
                </div>
              </div>

              <div className="kpi-box">
                <Zap size={20} className="kpi-icon" />
                <div>
                  <span>Carrefours régulés</span>
                  <strong>{activeCorridor.signalsCount} feux</strong>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default EmergencyPage;
