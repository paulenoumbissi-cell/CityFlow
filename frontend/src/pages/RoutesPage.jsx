import React, { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  ArrowUpDown,
  Car,
  Bike,
  Bus,
  Footprints,
  Clock3,
  MapPin,
  Navigation,
  Route,
  Sparkles,
  Zap,
  Leaf,
  ShieldCheck,
  CheckCircle2,
  Play,
  RotateCcw,
  Compass,
  TrendingDown,
  Coins,
  ChevronRight,
  Flame,
  AlertCircle,
} from "lucide-react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCity } from "../context/CityContext";
import "./RoutesPage.css";

const API_BASE = "http://localhost:3000/api";

const PRESET_LOCATIONS = {
  Yaoundé: [
    "Poste Centrale",
    "Bastos",
    "Mvan (Gare)",
    "Nsam",
    "Nlongkak",
    "Mokolo",
    "Odza",
    "Ahala",
    "Hôpital Général",
    "Hôpital Central (CHU)",
  ],
  Douala: [
    "Akwa",
    "Deido (Rond-point)",
    "Bonanjo",
    "Bonabéri",
    "Bépanda",
    "Bonamoussadi",
    "Logbessou",
    "Hôpital Laquintinie",
    "Hôpital Général de Douala",
    "Aéroport International",
  ],
};

// Helper: Auto-fit map to coordinates
function FitRouteBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [coords, map]);
  return null;
}

export default function RoutesPage() {
  const { selectedCity, setSelectedCity } = useCity();
  const presets = PRESET_LOCATIONS[selectedCity] || PRESET_LOCATIONS["Yaoundé"];

  const [departure, setDeparture] = useState(presets[2] || "Mvan (Gare)");
  const [destination, setDestination] = useState(presets[1] || "Bastos");
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [multimodal, setMultimodal] = useState([]);
  const [activeMode, setActiveMode] = useState("car"); // 'car' | 'mototaxi' | 'taxi' | 'walking'
  const [isLoading, setIsLoading] = useState(false);

  // Mode Navigation Pas-à-Pas (GPS HUD)
  const [isNavigating, setIsNavigating] = useState(false);
  const [navStepIndex, setNavStepIndex] = useState(0);
  const [navCompleted, setNavCompleted] = useState(false);

  // Charger les itinéraires depuis le Backend
  const fetchRoutes = async (start = departure, end = destination) => {
    setIsLoading(true);
    setIsNavigating(false);
    setNavStepIndex(0);
    setNavCompleted(false);

    try {
      const res = await fetch(`${API_BASE}/routes/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: selectedCity === "all" ? "Yaoundé" : selectedCity,
          origin: start,
          destination: end,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRoutes(data.routes || []);
        setMultimodal(data.multimodal || []);
        if (data.routes && data.routes.length > 0) {
          setSelectedRoute(data.routes[0]);
        }
      }
    } catch (err) {
      console.error("Erreur calcul d'itinéraire", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const list = PRESET_LOCATIONS[selectedCity] || PRESET_LOCATIONS["Yaoundé"];
    setDeparture(list[2] || list[0]);
    setDestination(list[1] || list[1]);
    fetchRoutes(list[2] || list[0], list[1] || list[1]);
  }, [selectedCity]);

  // Inverser Départ et Destination
  const handleSwap = () => {
    const temp = departure;
    setDeparture(destination);
    setDestination(temp);
    fetchRoutes(destination, temp);
  };

  // Progression de la simulation de navigation
  const handleNextStep = () => {
    if (!selectedRoute) return;
    if (navStepIndex < selectedRoute.steps.length - 1) {
      setNavStepIndex((prev) => prev + 1);
    } else {
      setNavCompleted(true);
    }
  };

  const currentModeInfo = multimodal.find((m) => m.mode === activeMode) || multimodal[0];

  return (
    <div className="routes-page">
      {/* HEADER */}
      <div className="routes-header">
        <div>
          <div className="routes-eyebrow">
            <Sparkles size={16} />
            <span>INTELLIGENCE DE NAVIGATION MULTI-CRITÈRES</span>
          </div>
          <h1>Calculateur d'Itinéraires & Éco-Mobilité</h1>
          <p>
            Optimisez vos trajets à {selectedCity} avec les prévisions d'embouteillages en direct, l'estimation
            d'empreinte carbone et la comparaison multimodale (Voiture, Moto-taxi, Taxi collectif).
          </p>
        </div>
        <div className="routes-header-icon">
          <Route size={30} />
        </div>
      </div>

      {/* RECHERCHE ET PRESETS */}
      <div className="route-search-card">
        <div className="route-search-inputs-grid">
          <div className="route-input-group">
            <label>Point de départ</label>
            <div className="input-with-icon">
              <span className="dot-icon start"></span>
              <select
                value={departure}
                onChange={(e) => {
                  setDeparture(e.target.value);
                  fetchRoutes(e.target.value, destination);
                }}
              >
                {presets.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button className="swap-btn" onClick={handleSwap} title="Inverser les points">
            <ArrowUpDown size={18} />
          </button>

          <div className="route-input-group">
            <label>Destination</label>
            <div className="input-with-icon">
              <span className="dot-icon end"></span>
              <select
                value={destination}
                onChange={(e) => {
                  setDestination(e.target.value);
                  fetchRoutes(departure, e.target.value);
                }}
              >
                {presets.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button className="calc-route-btn" onClick={() => fetchRoutes()} disabled={isLoading}>
            {isLoading ? <Zap className="spin-icon" size={18} /> : <Navigation size={18} />}
            <span>Calculer l'itinéraire</span>
          </button>
        </div>

        {/* COMPARATEUR MULTI-MODAL */}
        {multimodal.length > 0 && (
          <div className="multimodal-bar">
            <span className="multimodal-label">Modes de transport :</span>
            <div className="multimodal-pills">
              {multimodal.map((m) => {
                const isActive = activeMode === m.mode;
                return (
                  <button
                    key={m.mode}
                    className={`multimodal-pill ${isActive ? "active" : ""}`}
                    onClick={() => setActiveMode(m.mode)}
                  >
                    {m.mode === "car" && <Car size={16} />}
                    {m.mode === "mototaxi" && <Bike size={16} />}
                    {m.mode === "taxi" && <Bus size={16} />}
                    {m.mode === "walking" && <Footprints size={16} />}
                    <div className="pill-text">
                      <span className="pill-name">{m.label}</span>
                      <span className="pill-meta">
                        <strong>{m.durationMinutes} min</strong> • {m.costLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* GRILLE PRINCIPALE : ITINÉRAIRES & CARTE */}
      <div className="routes-main-grid">
        {/* COLONNE GAUCHE : OPTIONS D'ITINÉRAIRES */}
        <div className="routes-list-col">
          <div className="routes-list-header">
            <h3>{routes.length} Itinéraires suggérés par l'IA</h3>
            <span className="traffic-live-tag">● Trafic direct pris en compte</span>
          </div>

          {routes.map((route) => {
            const isSelected = selectedRoute?.id === route.id;
            return (
              <div
                key={route.id}
                className={`route-card-item ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  setSelectedRoute(route);
                  setNavStepIndex(0);
                  setNavCompleted(false);
                }}
              >
                <div className="route-card-header">
                  <div className="route-badge-container">
                    <span className="route-type-badge" style={{ borderColor: route.color, color: route.color }}>
                      {route.badge}
                    </span>
                    {route.type === "eco" && (
                      <span className="eco-score-pill">
                        <Leaf size={13} /> Eco-Score {route.ecoScore}
                      </span>
                    )}
                  </div>
                  <div className="route-time-duration">
                    <strong>{route.durationMinutes} min</strong>
                    <span>{route.distanceKm} km</span>
                  </div>
                </div>

                <h4>{route.title}</h4>

                <div className="route-kpi-chips">
                  {route.delaySavedMinutes > 0 && (
                    <span className="chip-kpi saved">
                      <Zap size={13} /> -{route.delaySavedMinutes} min d'attente
                    </span>
                  )}
                  {route.co2SavedKg > 0 && (
                    <span className="chip-kpi eco">
                      <Leaf size={13} /> -{route.co2SavedKg} kg CO₂
                    </span>
                  )}
                  <span className={`chip-kpi fluid-${route.fluidityLevel}`}>
                    ● {route.fluidityLevel === "fluid" ? "Circulation fluide" : "Ralentissements modérés"}
                  </span>
                </div>

                <div className="route-highlights-list">
                  {route.highlights?.map((h, i) => (
                    <div key={i} className="highlight-item">
                      <CheckCircle2 size={14} color={route.color} />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* DÉMARRER LA NAVIGATION GPS HUD */}
          {selectedRoute && !isNavigating && (
            <div className="start-navigation-card">
              <div className="start-nav-info">
                <div>
                  <strong>Guidage pas-à-pas</strong>
                  <p>Suivez les étapes de bifurcation et gagnez des points éco-citoyens.</p>
                </div>
                <button className="start-nav-btn" onClick={() => setIsNavigating(true)}>
                  <Play size={16} fill="white" />
                  <span>Démarrer le guidage</span>
                </button>
              </div>
            </div>
          )}

          {/* BANDEAU HUD DE GUIDAGE GPS ACTIF */}
          {isNavigating && selectedRoute && (
            <div className="gps-hud-card">
              <div className="gps-hud-header">
                <div className="gps-indicator">
                  <span className="gps-pulse"></span>
                  <strong>NAVIGATION GPS ACTIVE</strong>
                </div>
                <button
                  className="gps-exit-btn"
                  onClick={() => {
                    setIsNavigating(false);
                    setNavStepIndex(0);
                    setNavCompleted(false);
                  }}
                >
                  Quitter
                </button>
              </div>

              {!navCompleted ? (
                <div className="gps-step-content">
                  <div className="gps-step-arrow">
                    <Compass size={32} className="compass-spin" />
                  </div>
                  <div className="gps-step-text">
                    <span className="gps-step-dist">
                      Étape {navStepIndex + 1}/{selectedRoute.steps.length} •{" "}
                      {selectedRoute.steps[navStepIndex].distance}
                    </span>
                    <strong className="gps-step-instr">
                      {selectedRoute.steps[navStepIndex].instruction}
                    </strong>
                  </div>

                  <button className="gps-next-step-btn" onClick={handleNextStep}>
                    <span>Étape suivante</span>
                    <ChevronRight size={18} />
                  </button>
                </div>
              ) : (
                <div className="gps-arrival-success">
                  <CheckCircle2 size={36} color="#10B981" />
                  <div>
                    <strong>Vous êtes arrivé à destination !</strong>
                    <p>Trajet accompli avec succès (+15 points éco-mobilité crédités).</p>
                  </div>
                  <button
                    className="gps-reset-btn"
                    onClick={() => {
                      setIsNavigating(false);
                      setNavStepIndex(0);
                      setNavCompleted(false);
                    }}
                  >
                    Nouveau trajet
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* COLONNE DROITE : CARTE LEAFLET TACTIQUE */}
        <div className="routes-map-col">
          <div className="routes-map-wrapper">
            <MapContainer
              center={selectedRoute?.coordinates?.[0] || [3.848, 11.502]}
              zoom={13}
              style={{ width: "100%", height: "100%", borderRadius: "18px" }}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {selectedRoute?.coordinates && <FitRouteBounds coords={selectedRoute.coordinates} />}

              {/* Tracés non sélectionnés en filigrane */}
              {routes
                .filter((r) => r.id !== selectedRoute?.id)
                .map((r) => (
                  <Polyline
                    key={r.id}
                    positions={r.coordinates}
                    pathOptions={{ color: "#94A3B8", weight: 4, opacity: 0.5, dashArray: "6, 8" }}
                  />
                ))}

              {/* Tracé de l'itinéraire sélectionné */}
              {selectedRoute?.coordinates && (
                <>
                  <Polyline
                    positions={selectedRoute.coordinates}
                    pathOptions={{
                      color: selectedRoute.color || "#00875A",
                      weight: 7,
                      opacity: 0.9,
                    }}
                  />

                  {/* Marqueur de Départ */}
                  <CircleMarker
                    center={selectedRoute.coordinates[0]}
                    radius={10}
                    pathOptions={{ fillColor: "#00875A", color: "#ffffff", weight: 3, fillOpacity: 1 }}
                  >
                    <Popup>
                      <strong>Départ : {departure}</strong>
                    </Popup>
                  </CircleMarker>

                  {/* Marqueur de Destination */}
                  <CircleMarker
                    center={selectedRoute.coordinates[selectedRoute.coordinates.length - 1]}
                    radius={10}
                    pathOptions={{ fillColor: "#EF4444", color: "#ffffff", weight: 3, fillOpacity: 1 }}
                  >
                    <Popup>
                      <strong>Arrivée : {destination}</strong>
                    </Popup>
                  </CircleMarker>

                  {/* Marqueur de position active lors de la navigation */}
                  {isNavigating && selectedRoute.coordinates[navStepIndex + 1] && (
                    <CircleMarker
                      center={selectedRoute.coordinates[navStepIndex + 1]}
                      radius={12}
                      pathOptions={{ fillColor: "#3B82F6", color: "#ffffff", weight: 4, fillOpacity: 1 }}
                    >
                      <Popup>
                        <strong>Votre position estimée (Étape {navStepIndex + 1})</strong>
                      </Popup>
                    </CircleMarker>
                  )}
                </>
              )}
            </MapContainer>

            {/* Overlays d'informations sur la carte */}
            {selectedRoute && (
              <div className="map-floating-overlay">
                <div className="overlay-stat">
                  <span>Temps de trajet</span>
                  <strong>{selectedRoute.durationMinutes} min</strong>
                </div>
                <div className="overlay-stat">
                  <span>Distance</span>
                  <strong>{selectedRoute.distanceKm} km</strong>
                </div>
                <div className="overlay-stat">
                  <span>Mode actif</span>
                  <strong style={{ textTransform: "capitalize" }}>
                    {currentModeInfo?.label || "Voiture"}
                  </strong>
                </div>
                <div className="overlay-stat">
                  <span>Coût estimé</span>
                  <strong style={{ color: "#00875A" }}>{currentModeInfo?.costLabel}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}