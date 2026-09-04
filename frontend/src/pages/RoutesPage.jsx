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
  Crosshair,
  MousePointerClick,
  Search,
  Building2,
  Hospital,
  Plane,
  ShoppingBag,
  GraduationCap,
  Volume2,
  VolumeX,
  FastForward,
  Pause,
  X,
  Maximize2,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Popup,
  useMap,
  useMapEvents,
  Marker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCity } from "../context/CityContext";
import { CITY_LANDMARKS } from "../data/cityData";
import "./RoutesPage.css";

const API_BASE = "http://localhost:3000/api";

const CATEGORY_ICONS = {
  all: Search,
  landmark: Building2,
  hospital: Hospital,
  transport: Plane,
  mall: ShoppingBag,
  hotel: Building2,
  university: GraduationCap,
};

const CATEGORY_LABELS = {
  all: "Tous les lieux",
  landmark: "Carrefours & Quartiers",
  hospital: "Hôpitaux & Urgences",
  transport: "Transports & Gares",
  mall: "Marchés & Malls",
  hotel: "Hôtels & Affaires",
  university: "Universités",
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

// Helper: Gestionnaire de clic sur la carte pour définir départ ou arrivée
function RouteMapClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick([parseFloat(e.latlng.lat.toFixed(5)), parseFloat(e.latlng.lng.toFixed(5))]);
      }
    },
  });
  return null;
}

// Helper: Synthèse vocale de guidage en français
function speakInstruction(text, voiceEnabled = true) {
  if (!voiceEnabled || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel(); // Annuler instruction précédente
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.rate = 1.05;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

export default function RoutesPage() {
  const { selectedCity, setSelectedCity } = useCity();
  const rawCityLandmarks = CITY_LANDMARKS[selectedCity] || CITY_LANDMARKS["Yaoundé"] || [];

  const [departure, setDeparture] = useState("Mvan (Gare Voyageurs)");
  const [destination, setDestination] = useState("Bastos (Ambassades)");
  const [departureCoords, setDepartureCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);

  // Suggestions Dropdown State
  const [activeDropdown, setActiveDropdown] = useState(null); // 'departure' | 'destination' | null
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all");

  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [multimodal, setMultimodal] = useState([]);
  const [activeMode, setActiveMode] = useState("car");
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Mode Navigation Pas-à-Pas (Google Maps HUD)
  const [isNavigating, setIsNavigating] = useState(false);
  const [navStepIndex, setNavStepIndex] = useState(0);
  const [navCompleted, setNavCompleted] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(42);

  const dropdownRef = useRef(null);
  const autoSimTimerRef = useRef(null);

  // Fermer le dropdown si on clique à l'extérieur
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Charger les itinéraires depuis le Backend
  const fetchRoutes = async (
    start = departure,
    end = destination,
    startPos = departureCoords,
    endPos = destinationCoords
  ) => {
    setIsLoading(true);
    setIsNavigating(false);
    setIsAutoSimulating(false);
    setNavStepIndex(0);
    setNavCompleted(false);

    try {
      const payload = {
        city: selectedCity === "all" ? "Yaoundé" : selectedCity,
        origin: start,
        destination: end,
      };

      if (startPos) payload.originCoords = startPos;
      if (endPos) payload.destinationCoords = endPos;

      const res = await fetch(`${API_BASE}/routes/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    const list = rawCityLandmarks;
    const startName = list[3]?.name || list[0]?.name || "Mvan (Gare Voyageurs)";
    const endName = list[1]?.name || list[1]?.name || "Bastos (Ambassades)";
    setDeparture(startName);
    setDestination(endName);
    setDepartureCoords(null);
    setDestinationCoords(null);
    fetchRoutes(startName, endName, null, null);
  }, [selectedCity]);

  // Géolocalisation GPS réelle de l'utilisateur pour le point de départ
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setDepartureCoords(coords);
        setDeparture("📍 Ma position GPS en direct");
        setIsLocating(false);
        setActiveDropdown(null);
        fetchRoutes("📍 Ma position GPS en direct", destination, coords, destinationCoords);
      },
      (err) => {
        setIsLocating(false);
        alert("Impossible d'obtenir votre position GPS. Veuillez autoriser l'accès à la position.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Sélection d'une suggestion depuis le dropdown
  const handleSelectLandmark = (item) => {
    if (activeDropdown === "departure") {
      setDeparture(item.name);
      setDepartureCoords(item.pos);
      fetchRoutes(item.name, destination, item.pos, destinationCoords);
    } else {
      setDestination(item.name);
      setDestinationCoords(item.pos);
      fetchRoutes(departure, item.name, departureCoords, item.pos);
    }
    setActiveDropdown(null);
    setSearchQuery("");
  };

  // Clic sur la carte pour définir un point
  const handleMapClick = (coords) => {
    setDestinationCoords(coords);
    const label = `Point GPS [${coords[0].toFixed(3)}, ${coords[1].toFixed(3)}]`;
    setDestination(label);
    fetchRoutes(departure, label, departureCoords, coords);
  };

  // Inverser Départ et Destination
  const handleSwap = () => {
    const tempName = departure;
    const tempCoords = departureCoords;

    setDeparture(destination);
    setDepartureCoords(destinationCoords);

    setDestination(tempName);
    setDestinationCoords(tempCoords);

    fetchRoutes(destination, tempName, destinationCoords, tempCoords);
  };

  // Démarrer la navigation Google Maps
  const handleStartNavigation = () => {
    if (!selectedRoute) return;
    setIsNavigating(true);
    setNavStepIndex(0);
    setNavCompleted(false);
    setIsAutoSimulating(true);

    const firstStep = selectedRoute.steps?.[0];
    if (firstStep) {
      speakInstruction(firstStep.spokenText || firstStep.instruction, voiceEnabled);
    }
  };

  // Simulation automatique du véhicule le long du trajet
  useEffect(() => {
    if (isNavigating && isAutoSimulating && selectedRoute && !navCompleted) {
      autoSimTimerRef.current = setInterval(() => {
        setNavStepIndex((prev) => {
          const next = prev + 1;
          if (next >= selectedRoute.steps.length) {
            setNavCompleted(true);
            setIsAutoSimulating(false);
            speakInstruction("Vous êtes arrivé à votre destination. Trajet terminé avec succès.", voiceEnabled);
            return prev;
          } else {
            const nextStep = selectedRoute.steps[next];
            if (nextStep) {
              speakInstruction(nextStep.spokenText || nextStep.instruction, voiceEnabled);
            }
            // Vitesse aléatoire réaliste
            setCurrentSpeed(Math.floor(35 + Math.random() * 20));
            return next;
          }
        });
      }, 4000); // 4 secondes par étape de démonstration
    } else {
      if (autoSimTimerRef.current) clearInterval(autoSimTimerRef.current);
    }

    return () => {
      if (autoSimTimerRef.current) clearInterval(autoSimTimerRef.current);
    };
  }, [isNavigating, isAutoSimulating, selectedRoute, navCompleted, voiceEnabled]);

  // Étape suivante manuelle
  const handleNextStep = () => {
    if (!selectedRoute) return;
    if (navStepIndex < selectedRoute.steps.length - 1) {
      const next = navStepIndex + 1;
      setNavStepIndex(next);
      const nextStep = selectedRoute.steps[next];
      if (nextStep) {
        speakInstruction(nextStep.spokenText || nextStep.instruction, voiceEnabled);
      }
    } else {
      setNavCompleted(true);
      speakInstruction("Vous êtes arrivé à destination.", voiceEnabled);
    }
  };

  // Filtrage des suggestions pour le Dropdown
  const filteredLandmarks = rawCityLandmarks.filter((item) => {
    const matchesCategory = activeCategoryFilter === "all" || item.category === activeCategoryFilter;
    const matchesQuery =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.district?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const currentModeInfo = multimodal.find((m) => m.mode === activeMode) || multimodal[0];

  // Calcul du temps restant estimé en navigation
  const remainingSteps = selectedRoute ? selectedRoute.steps.length - navStepIndex : 1;
  const remainingMinutes = Math.max(1, Math.round((selectedRoute?.durationMinutes || 15) * (remainingSteps / (selectedRoute?.steps.length || 1))));
  const arrivalDate = new Date(Date.now() + remainingMinutes * 60 * 1000);
  const arrivalTimeStr = arrivalDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="routes-page">
      {/* HEADER */}
      <div className="routes-header">
        <div>
          <div className="routes-eyebrow">
            <Sparkles size={16} />
            <span>NAVIGATION SMART CITY & TRACÉ DE CONGESTION YANGO</span>
          </div>
          <h1>Calculateur d'Itinéraires & Guidage GPS</h1>
          <p>
            Recherchez vos destinations à {selectedCity}, visualisez la congestion en temps réel sur la route
            et laissez-vous guider avec la synthèse vocale virage par virage.
          </p>
        </div>
        <div className="routes-header-icon">
          <Route size={30} />
        </div>
      </div>

      {/* RECHERCHE ET SUGGESTIONS GOOGLE MAPS */}
      <div className="route-search-card" ref={dropdownRef} style={{ position: "relative" }}>
        <div className="route-search-inputs-grid">
          {/* CHAMP DÉPART */}
          <div className="route-input-group" style={{ position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label>Point de départ</label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="btn-link-gps"
              >
                <Crosshair size={13} className={isLocating ? "spin-icon" : ""} />
                <span>{isLocating ? "Localisation..." : "Ma position GPS"}</span>
              </button>
            </div>

            <div
              className={`input-with-icon ${activeDropdown === "departure" ? "focused" : ""}`}
              onClick={() => {
                setActiveDropdown("departure");
                setSearchQuery("");
              }}
            >
              <span className="dot-icon start"></span>
              <input
                type="text"
                value={activeDropdown === "departure" ? searchQuery : departure}
                placeholder="Rechercher un point de départ..."
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setActiveDropdown("departure")}
              />
              {departure && activeDropdown !== "departure" && (
                <button
                  className="btn-clear-input"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeparture("");
                    setDepartureCoords(null);
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* BOUTON INVERSER */}
          <button className="swap-btn" onClick={handleSwap} title="Inverser départ et destination">
            <ArrowUpDown size={18} />
          </button>

          {/* CHAMP DESTINATION */}
          <div className="route-input-group" style={{ position: "relative" }}>
            <label>Destination</label>
            <div
              className={`input-with-icon ${activeDropdown === "destination" ? "focused" : ""}`}
              onClick={() => {
                setActiveDropdown("destination");
                setSearchQuery("");
              }}
            >
              <span className="dot-icon end"></span>
              <input
                type="text"
                value={activeDropdown === "destination" ? searchQuery : destination}
                placeholder="Où souhaitez-vous aller ?"
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setActiveDropdown("destination")}
              />
              {destination && activeDropdown !== "destination" && (
                <button
                  className="btn-clear-input"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDestination("");
                    setDestinationCoords(null);
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <button
            className="calc-route-btn"
            onClick={() => fetchRoutes(departure, destination, departureCoords, destinationCoords)}
            disabled={isLoading}
          >
            {isLoading ? <Zap className="spin-icon" size={18} /> : <Navigation size={18} />}
            <span>Calculer</span>
          </button>
        </div>

        {/* DROPDOWN DE SUGGESTIONS GOOGLE MAPS */}
        {activeDropdown && (
          <div className="google-suggestions-dropdown">
            <div className="dropdown-header">
              <div className="category-filter-pills">
                {Object.keys(CATEGORY_LABELS).map((cat) => {
                  const Icon = CATEGORY_ICONS[cat] || Search;
                  const isActive = activeCategoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`cat-pill ${isActive ? "active" : ""}`}
                      onClick={() => setActiveCategoryFilter(cat)}
                    >
                      <Icon size={13} />
                      <span>{CATEGORY_LABELS[cat]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* OPTION POSITION GPS IMMÉDIATE */}
            <div className="suggestions-list">
              <div className="suggestion-item gps-item" onClick={handleUseCurrentLocation}>
                <div className="sug-icon gps">
                  <Crosshair size={18} />
                </div>
                <div className="sug-info">
                  <strong>Utiliser votre position actuelle</strong>
                  <span>Localisation GPS précise du navigateur</span>
                </div>
              </div>

              {/* LISTE DES LIEUX FILTRÉS */}
              {filteredLandmarks.map((item) => {
                const Icon = CATEGORY_ICONS[item.category] || Building2;
                return (
                  <div
                    key={item.name}
                    className="suggestion-item"
                    onClick={() => handleSelectLandmark(item)}
                  >
                    <div className={`sug-icon ${item.category}`}>
                      <Icon size={17} />
                    </div>
                    <div className="sug-info">
                      <div className="sug-title-row">
                        <strong>{item.name}</strong>
                        <span className="sug-district">{item.district}</span>
                      </div>
                      <span className="sug-desc">{item.desc}</span>
                    </div>
                  </div>
                );
              })}

              {filteredLandmarks.length === 0 && (
                <div className="no-suggestions">
                  <Search size={24} />
                  <p>Aucun résultat trouvé pour "{searchQuery}". Cliquez sur la carte pour pointer cet endroit.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COMPARATEUR MULTI-MODAL */}
        {multimodal.length > 0 && !activeDropdown && (
          <div className="multimodal-bar" style={{ marginTop: "18px" }}>
            <span className="multimodal-label">Modes de déplacement :</span>
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

      {/* BANDEAU COCKPIT DE NAVIGATION GOOGLE MAPS ACTIVE */}
      {isNavigating && selectedRoute && (
        <div className="gmaps-navigation-hud">
          <div className="gmaps-top-banner">
            <div className="gmaps-maneuver-box">
              <div className="maneuver-icon-large">
                <Compass size={36} className="compass-icon" />
              </div>
              <div className="maneuver-text-box">
                <span className="maneuver-dist">
                  Dans {selectedRoute.steps[navStepIndex]?.distance || "150 m"}
                </span>
                <strong className="maneuver-instruction">
                  {selectedRoute.steps[navStepIndex]?.instruction || "Suivez la direction indiquée"}
                </strong>
                {selectedRoute.steps[navStepIndex + 1] && (
                  <span className="maneuver-next-hint">
                    Puis : {selectedRoute.steps[navStepIndex + 1]?.instruction}
                  </span>
                )}
              </div>
            </div>

            <div className="gmaps-actions-right">
              {/* BOUTON VOIX AUDIO */}
              <button
                className={`gmaps-voice-btn ${voiceEnabled ? "active" : "muted"}`}
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                title={voiceEnabled ? "Désactiver la voix" : "Activer la voix"}
              >
                {voiceEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
              </button>

              {/* SIMULATION AUTO */}
              <button
                className="gmaps-sim-btn"
                onClick={() => setIsAutoSimulating(!isAutoSimulating)}
                title={isAutoSimulating ? "Mettre en pause la simulation" : "Reprendre la conduite simulée"}
              >
                {isAutoSimulating ? <Pause size={18} /> : <Play size={18} />}
                <span>{isAutoSimulating ? "Pause" : "Auto"}</span>
              </button>

              {/* QUITTER */}
              <button
                className="gmaps-exit-btn"
                onClick={() => {
                  setIsNavigating(false);
                  setIsAutoSimulating(false);
                  setNavStepIndex(0);
                  setNavCompleted(false);
                  window.speechSynthesis?.cancel();
                }}
              >
                <X size={18} />
                <span>Quitter</span>
              </button>
            </div>
          </div>

          {/* BARRE D'ÉTAT INFÉRIEURE : ETA, DISTANCE ET VITESSE */}
          <div className="gmaps-bottom-bar">
            <div className="eta-stat-block">
              <span className="eta-time-big">{remainingMinutes} min</span>
              <div className="eta-sub-meta">
                <span>{selectedRoute.distanceKm} km</span> • <span>Arrivée {arrivalTimeStr}</span>
              </div>
            </div>

            {/* SPEEDOMETER */}
            <div className="gmaps-speedometer">
              <div className="speed-circle">
                <strong>{currentSpeed}</strong>
                <span>km/h</span>
              </div>
              <div className="speed-limit-badge">50</div>
            </div>

            <div className="gmaps-step-controls">
              <button className="btn-manual-next" onClick={handleNextStep}>
                <span>Étape suivante</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRILLE PRINCIPALE : ITINÉRAIRES & CARTE */}
      <div className="routes-main-grid">
        {/* COLONNE GAUCHE : OPTIONS D'ITINÉRAIRES */}
        <div className="routes-list-col">
          <div className="routes-list-header">
            <h3>{routes.length} Itinéraires suggérés</h3>
            <span className="traffic-live-tag" style={{ background: "#e8f5e9", color: "#00875A", border: "1px solid #a7f3d0" }}>
              ● Segments Trafic Yango en direct
            </span>
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

                {/* BARRE DE SEGMENTS DE TRAFIC (YANGO PREVIEW) */}
                {route.trafficSegments && route.trafficSegments.length > 0 && (
                  <div className="traffic-segments-bar-preview">
                    {route.trafficSegments.map((seg, sIdx) => (
                      <div
                        key={sIdx}
                        className="seg-bar-chunk"
                        style={{
                          background: seg.color,
                          flex: seg.coordinates?.length || 1,
                        }}
                        title={`${seg.status === "fluid" ? "Fluide" : seg.status === "moderate" ? "Ralentissement" : "Bouchon"} (~${seg.speedKmh} km/h)`}
                      />
                    ))}
                  </div>
                )}

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

          {/* DÉMARRER LA NAVIGATION GOOGLE MAPS */}
          {selectedRoute && !isNavigating && (
            <div className="start-navigation-card">
              <div className="start-nav-info">
                <div>
                  <strong>Guidage vocal & GPS en temps réel</strong>
                  <p>Navigation assistée virage par virage avec synthèse vocale en français.</p>
                </div>
                <button className="start-nav-btn" onClick={handleStartNavigation}>
                  <Play size={18} fill="white" />
                  <span>Démarrer le guidage</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* COLONNE DROITE : CARTE LEAFLET TACTIQUE STYLE YANGO */}
        <div className="routes-map-col">
          <div className="routes-map-wrapper" style={{ position: "relative" }}>
            <MapContainer
              center={selectedRoute?.coordinates?.[0] || [3.848, 11.502]}
              zoom={13}
              style={{ width: "100%", height: "100%", borderRadius: "18px" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <RouteMapClickHandler onMapClick={handleMapClick} />
              {selectedRoute?.coordinates && <FitRouteBounds coords={selectedRoute.coordinates} />}

              {/* TRACÉS SECONDAIRES NON SÉLECTIONNÉS AVEC PASTILLES CLIQUABLES */}
              {routes
                .filter((r) => r.id !== selectedRoute?.id)
                .map((r) => (
                  <React.Fragment key={r.id}>
                    <Polyline
                      positions={r.coordinates}
                      pathOptions={{
                        color: "#94A3B8",
                        weight: 5,
                        opacity: 0.65,
                        dashArray: "6, 8",
                      }}
                      eventHandlers={{
                        click: () => setSelectedRoute(r),
                      }}
                    />
                    {/* PASTILLE SUR CARTE CLIQUABLE */}
                    {r.coordinates?.[Math.floor(r.coordinates.length / 2)] && (
                      <CircleMarker
                        center={r.coordinates[Math.floor(r.coordinates.length / 2)]}
                        radius={6}
                        pathOptions={{ color: "#64748B", fillColor: "#ffffff", fillOpacity: 1, weight: 2 }}
                        eventHandlers={{ click: () => setSelectedRoute(r) }}
                      >
                        <Popup>
                          <div style={{ padding: "4px", fontSize: "12px", cursor: "pointer" }} onClick={() => setSelectedRoute(r)}>
                            <strong>{r.title}</strong>
                            <div>⏱️ {r.durationMinutes} min ({r.distanceKm} km)</div>
                            <button style={{ marginTop: "4px", background: "#00875A", color: "#fff", border: "none", borderRadius: "4px", padding: "3px 8px", fontSize: "11px", cursor: "pointer" }}>
                              Choisir cet itinéraire
                            </button>
                          </div>
                        </Popup>
                      </CircleMarker>
                    )}
                  </React.Fragment>
                ))}

              {/* TRACÉ DE L'ITINÉRAIRE SÉLECTIONNÉ AVEC SEGMENTS DE TRAFIC YANGO (Vert, Orange, Rouge) */}
              {selectedRoute && (
                <>
                  {/* FOND DE LIGNE BRILLANTE */}
                  <Polyline
                    positions={selectedRoute.coordinates}
                    pathOptions={{
                      color: "#ffffff",
                      weight: 10,
                      opacity: 0.9,
                    }}
                  />

                  {/* SEGMENTS DE TRAFIC MULTI-COULEURS */}
                  {selectedRoute.trafficSegments && selectedRoute.trafficSegments.length > 0 ? (
                    selectedRoute.trafficSegments.map((seg, idx) => (
                      <Polyline
                        key={`traffic_seg_${idx}`}
                        positions={seg.coordinates}
                        pathOptions={{
                          color: seg.color,
                          weight: 7,
                          opacity: 0.95,
                          lineCap: "round",
                          lineJoin: "round",
                        }}
                      />
                    ))
                  ) : (
                    <Polyline
                      positions={selectedRoute.coordinates}
                      pathOptions={{
                        color: selectedRoute.color || "#00875A",
                        weight: 7,
                        opacity: 0.95,
                      }}
                    />
                  )}

                  {/* MARQUEUR DE DÉPART */}
                  <CircleMarker
                    center={selectedRoute.coordinates[0]}
                    radius={10}
                    pathOptions={{ fillColor: "#00875A", color: "#ffffff", weight: 3, fillOpacity: 1 }}
                  >
                    <Popup>
                      <strong>Départ : {departure}</strong>
                    </Popup>
                  </CircleMarker>

                  {/* MARQUEUR DE DESTINATION */}
                  <CircleMarker
                    center={selectedRoute.coordinates[selectedRoute.coordinates.length - 1]}
                    radius={10}
                    pathOptions={{ fillColor: "#EF4444", color: "#ffffff", weight: 3, fillOpacity: 1 }}
                  >
                    <Popup>
                      <strong>Arrivée : {destination}</strong>
                    </Popup>
                  </CircleMarker>

                  {/* VÉHICULE EN MOUVEMENT PENDANT LA NAVIGATION GPS HUD */}
                  {isNavigating && selectedRoute.coordinates[navStepIndex] && (
                    <>
                      <CircleMarker
                        center={selectedRoute.coordinates[navStepIndex]}
                        radius={22}
                        pathOptions={{
                          color: "#3B82F6",
                          fillColor: "#60A5FA",
                          fillOpacity: 0.3,
                          weight: 1,
                          className: "radar-marker-pulse",
                        }}
                      />
                      <CircleMarker
                        center={selectedRoute.coordinates[navStepIndex]}
                        radius={11}
                        pathOptions={{
                          fillColor: "#2563EB",
                          color: "#ffffff",
                          weight: 3.5,
                          fillOpacity: 1,
                        }}
                      >
                        <Popup>
                          <strong>🚗 Votre véhicule en déplacement</strong>
                          <div>Vitesse : {currentSpeed} km/h</div>
                        </Popup>
                      </CircleMarker>
                    </>
                  )}
                </>
              )}
            </MapContainer>

            {/* LÉGENDE DU TRAFIC YANGO SUR CARTE */}
            <div className="map-traffic-legend-yango">
              <div className="leg-item">
                <span className="dot green"></span>
                <span>Fluide</span>
              </div>
              <div className="leg-item">
                <span className="dot orange"></span>
                <span>Ralentissement</span>
              </div>
              <div className="leg-item">
                <span className="dot red"></span>
                <span>Bouchon</span>
              </div>
            </div>

            {/* OVERLAY D'INFORMATIONS FLOTTANT */}
            {selectedRoute && !isNavigating && (
              <div className="map-floating-overlay">
                <div className="overlay-stat">
                  <span>Temps estimé</span>
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