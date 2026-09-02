import { useState } from "react";
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
} from "lucide-react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useCity } from "../context/CityContext";
import "./EmergencyPage.css";

const emergencyVehicles = [
  {
    id: "ambulance",
    name: "Ambulance / SAMU",
    badge: "Urgence médicale",
    icon: Siren,
    color: "#ef4444",
    bg: "#fee2e2",
  },
  {
    id: "firefighters",
    name: "Sapeurs-Pompiers",
    badge: "Secours & Incendie",
    icon: Flame,
    color: "#ea580c",
    bg: "#ffedd5",
  },
  {
    id: "police",
    name: "Police / Gendarmerie",
    badge: "Intervention rapide",
    icon: Shield,
    color: "#2563eb",
    bg: "#dbeafe",
  },
  {
    id: "convoy",
    name: "Convoi Officiel",
    badge: "Itinéraire sécurisé",
    icon: Sparkles,
    color: "#7c3aed",
    bg: "#ede9fe",
  },
];

const emergencyCorridors = {
  Yaoundé: [
    {
      id: "yde-1",
      name: "Corridor Est - Centre Hospitalier",
      origin: "Caserne Mimboman",
      destination: "CHU de Yaoundé (Centre)",
      distance: "7.8 km",
      normalTime: "29 min",
      priorityTime: "9 min",
      gain: "-68%",
      signalsCount: 7,
      status: "Disponibilité optimale",
      coords: [
        [3.875, 11.558],
        [3.872, 11.539],
        [3.867, 11.523],
        [3.865, 11.508],
      ],
    },
    {
      id: "yde-2",
      name: "Corridor Sud - Hôpital Général",
      origin: "Mvan (Axe Sud)",
      destination: "Hôpital Général de Yaoundé",
      distance: "11.2 km",
      normalTime: "42 min",
      priorityTime: "14 min",
      gain: "-66%",
      signalsCount: 11,
      status: "Onde verte synchronisée",
      coords: [
        [3.822, 11.523],
        [3.845, 11.518],
        [3.870, 11.528],
        [3.898, 11.543],
      ],
    },
    {
      id: "yde-3",
      name: "Corridor Nord - Bastos / Présidence",
      origin: "Bastos (Ambassades)",
      destination: "Hôpital Central de Yaoundé",
      distance: "5.4 km",
      normalTime: "24 min",
      priorityTime: "7 min",
      gain: "-71%",
      signalsCount: 5,
      status: "Voie dégagée",
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
      coords: [
        [4.043, 9.691],
        [4.049, 9.700],
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
  if (coords && coords.length > 0) {
    map.flyTo(coords[0], 13, { duration: 1 });
  }
  return null;
}

function EmergencyPage() {
  const { selectedCity, setSelectedCity } = useCity();
  const [selectedVehicle, setSelectedVehicle] = useState(emergencyVehicles[0]);
  const corridors = emergencyCorridors[selectedCity] || emergencyCorridors["Yaoundé"];
  const [activeCorridor, setActiveCorridor] = useState(corridors[0]);
  const [isEngaged, setIsEngaged] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState(false);

  const handleActivate = () => {
    setIsEngaged(true);
    setBroadcastMessage(true);
    setTimeout(() => {
      setBroadcastMessage(false);
    }, 6000);
  };

  const handleDeactivate = () => {
    setIsEngaged(false);
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
              Régulation intelligente des feux et libération dynamique des axes pour
              les secours d'urgence à Yaoundé et Douala.
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
                setIsEngaged(false);
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
                      setIsEngaged(false);
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
                          <small>Destination</small>
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

            {/* ACTION D'ENGAGEMENT */}
            <div className="engagement-panel">
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
                ⚡ Synchronise instantanément les feux de circulation et alerte les usagers.
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
                      : "Corridor en attente d'activation"}
                  </strong>
                  <span>
                    {isEngaged
                      ? `Onde verte activée sur ${activeCorridor.signalsCount} carrefours clés.`
                      : "Prêt à être déployé par le centre de régulation."}
                  </span>
                </div>
              </div>

              {isEngaged && (
                <div className="live-speed-box">
                  <span>Gain estimé</span>
                  <strong>{activeCorridor.gain}</strong>
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
                    weight: isEngaged ? 7 : 5,
                    opacity: 0.9,
                    dashArray: isEngaged ? undefined : "6, 8",
                  }}
                />

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

                {/* DESTINATION */}
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
                    <strong>Établissement / Destination</strong>
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
                  Destination sécurisée
                </span>
                <span>
                  <Zap size={14} color="#f59e0b" />
                  {activeCorridor.signalsCount} Feux synchronisés
                </span>
              </div>
            </div>

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
