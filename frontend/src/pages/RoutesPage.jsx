import React, { useState, useEffect, useRef, useMemo } from "react";
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
  Layers,
  Eye,
  EyeOff,
  Activity,
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
import { useTheme } from "../context/ThemeContext";
import { CITY_LANDMARKS, YAOUNDE_NODES, DOUALA_NODES, CongestionLevels } from "../data/cityData";
import EmergencyAlertOverlay from "../components/EmergencyAlertOverlay";
import wsService from "../services/websocketService";
import apiService from "../services/api";
import "./RoutesPage.css";

const API_BASE = "http://localhost:3000/api";

const trafficStyles = {
  [CongestionLevels.JAMMED]: {
    color: "#dc2626",
    fillColor: "#dc2626",
    fillOpacity: 0.85,
    radius: 12,
  },
  [CongestionLevels.HEAVY]: {
    color: "#ef4444",
    fillColor: "#ef4444",
    fillOpacity: 0.8,
    radius: 10,
  },
  [CongestionLevels.MODERATE]: {
    color: "#f59e0b",
    fillColor: "#f59e0b",
    fillOpacity: 0.8,
    radius: 9,
  },
  [CongestionLevels.FLUID]: {
    color: "#10b981",
    fillColor: "#10b981",
    fillOpacity: 0.8,
    radius: 8,
  },
  jammed: { color: "#dc2626", fillColor: "#dc2626", radius: 12 },
  heavy: { color: "#ef4444", fillColor: "#ef4444", radius: 10 },
  dense: { color: "#ef4444", fillColor: "#ef4444", radius: 10 },
  moderate: { color: "#f59e0b", fillColor: "#f59e0b", radius: 9 },
  fluid: { color: "#10b981", fillColor: "#10b981", radius: 8 },
};

function createZoneDivIcon(name, congestion = "fluid", speed = null) {
  let statusClass = "fluid";
  if (congestion === CongestionLevels.JAMMED || congestion === CongestionLevels.HEAVY || congestion === "dense" || congestion === "jammed") {
    statusClass = "jammed";
  } else if (congestion === CongestionLevels.MODERATE || congestion === "moderate") {
    statusClass = "moderate";
  }

  const speedText = speed !== null ? `<span class="zone-district-speed">${speed} km/h</span>` : "";

  return L.divIcon({
    className: "zone-district-badge",
    html: `
      <div class="zone-district-pill">
        <span class="zone-status-dot ${statusClass}"></span>
        <span class="zone-district-name">${name}</span>
        ${speedText}
      </div>
    `,
    iconSize: null,
  });
}

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
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.rate = 1.05;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

export default function RoutesPage() {
  const { selectedCity, setSelectedCity } = useCity();
  const { isDark } = useTheme();
  const rawCityLandmarks = CITY_LANDMARKS[selectedCity] || CITY_LANDMARKS["Yaoundé"] || [];

  const dropdownRef = useRef(null);
  const autoSimTimerRef = useRef(null);

  const [departure, setDeparture] = useState("Mvan (Gare Voyageurs)");
  const [destination, setDestination] = useState("Bastos (Ambassades)");
  const [departureCoords, setDepartureCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);

  // Suggestions Dropdown State
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("all");

  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [multimodal, setMultimodal] = useState([]);
  const [activeMode, setActiveMode] = useState("car");
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Live Traffic Nodes
  const [trafficNodes, setTrafficNodes] = useState(selectedCity === "Douala" ? DOUALA_NODES : YAOUNDE_NODES);
  const [showZoneNames, setShowZoneNames] = useState(true);
  const [showTrafficLayer, setShowTrafficLayer] = useState(true);
  const [wsOnline, setWsOnline] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date().toLocaleTimeString());

  // Calques de fond de carte
  const [activeTileProvider, setActiveTileProvider] = useState(isDark ? "osmDark" : "osmFrance");
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Mode Navigation Pas-à-Pas (Google Maps HUD)
  const [isNavigating, setIsNavigating] = useState(false);
  const [navStepIndex, setNavStepIndex] = useState(0);

  const [navCompleted, setNavCompleted] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(42);

  const [emergencyMission, setEmergencyMission] = useState(null);
  const dropdownRef = useRef(null);

  // Synchronisation du fond de carte avec le thème
  useEffect(() => {
    if (activeTileProvider === "osmDark" || activeTileProvider === "osmFrance" || activeTileProvider === "osmStandard") {
      setActiveTileProvider(isDark ? "osmDark" : "osmFrance");
    }
  }, [isDark]);

  // Abonnement aux flux WebSocket temps réel du trafic
  useEffect(() => {
    let isMounted = true;
    const handleWsPulse = (data) => {
      if (!isMounted || !data || !data.nodes) return;
      if (data.city && data.city.toLowerCase() === selectedCity.toLowerCase()) {
        setTrafficNodes(data.nodes);
        setLastSyncTime(new Date().toLocaleTimeString());
      }
    };

    const unsubPulse = wsService.on("TRAFFIC_PULSE", handleWsPulse);
    const unsubStatus = wsService.onStatusChange((s) => {
      if (isMounted) setWsOnline(s === "connected");
    });

    apiService.getTrafficNodes(selectedCity).then((res) => {
      if (isMounted && res && res.nodes) {
        setTrafficNodes(res.nodes);
        setLastSyncTime(new Date().toLocaleTimeString());
      }
    });

    return () => {
      isMounted = false;
      unsubPulse();
      unsubStatus();
    };
  }, [selectedCity]);

  // Abonnement aux missions d'urgence pour avertir le conducteur
  useEffect(() => {
    let isMounted = true;
    apiService.getEmergencyStatus(selectedCity).then((res) => {
      if (isMounted && res?.active && res?.mission) {
        setEmergencyMission(res.mission);
      } else if (isMounted) {
        setEmergencyMission(null);
      }
    });

    const unsubEmUpdate = wsService.on("EMERGENCY_MISSION_UPDATE", (data) => {
      if (isMounted && data?.mission) setEmergencyMission(data.mission);
    });
    const unsubEmCancel = wsService.on("EMERGENCY_MISSION_CANCELLED", () => {
      if (isMounted) setEmergencyMission(null);
    });

    return () => {
      isMounted = false;
      unsubEmUpdate();
      unsubEmCancel();
    };
  }, [selectedCity]);

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

  // Fonds de carte 100% Gratuits et Sans Clé API
  const tileProviders = {
    osmDark: {
      url: "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> France (Mode Nuit HD)',
      label: "🌙 Mode Nuit (OSM Dark)",
      isDarkFilter: true,
    },
    osmFrance: {
      url: "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> France (Rues en Français)',
      label: "🇫🇷 Rues & Quartiers (OSM)",
      isDarkFilter: false,
    },
    osmStandard: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributeurs',
      label: "🗺️ Standard OpenStreetMap",
      isDarkFilter: false,
    },
    esriStreet: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri &mdash; Sources: DeLorme, NAVTEQ, USGS",
      label: "🛣️ Esri Rues Urbaines",
      isDarkFilter: false,
    },
    esriSatellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, IGN",
      label: "🛰️ Satellite (Esri Imagery)",
      isDarkFilter: false,
    },
  };

  const currentTile = tileProviders[activeTileProvider] || tileProviders.osmFrance;

  // Liste consolidée des zones et carrefours pour la ville sélectionnée
  const cityZoneList = useMemo(() => {
    const list = [];
    const knownNames = new Set();

    trafficNodes.forEach((n) => {
      const cleanName = n.name
        .replace(/^(Carrefour|Rond-point|Marché|Échangeur d'|Boulevard de la Liberté \(|\))/gi, "")
        .replace(/\(.*?\)/g, "")
        .trim();
      list.push({
        id: n.id,
        name: cleanName || n.name,
        fullName: n.name,
        position: n.position,
        congestion: n.currentCongestion,
        speed: n.averageSpeedKmh,
        delay: n.estimatedDelayMinutes,
        isNode: true,
      });
      knownNames.add(cleanName.toLowerCase());
    });

    const landmarks = CITY_LANDMARKS[selectedCity] || [];
    landmarks.forEach((lm, idx) => {
      const cleanName = lm.name
        .replace(/^(Carrefour|Rond-point|Marché|Hôpital|Université de Yaoundé I \(|Quartier |\))/gi, "")
        .replace(/\(.*?\)/g, "")
        .trim();
      if (!knownNames.has(cleanName.toLowerCase()) && lm.category === "landmark") {
        list.push({
          id: `lm_${idx}`,
          name: cleanName || lm.name,
          fullName: lm.name,
          position: lm.pos,
          congestion: "fluid",
          speed: null,
          delay: null,
          isNode: false,
        });
        knownNames.add(cleanName.toLowerCase());
      }
    });

    return list;
  }, [trafficNodes, selectedCity]);

  const currentModeInfo = multimodal.find((m) => m.mode === activeMode) || multimodal[0];

  // Calcul du temps restant estimé en navigation
  const remainingSteps = selectedRoute ? selectedRoute.steps.length - navStepIndex : 1;
  const remainingMinutes = Math.max(1, Math.round((selectedRoute?.durationMinutes || 15) * (remainingSteps / (selectedRoute?.steps.length || 1))));
  const arrivalDate = new Date(Date.now() + remainingMinutes * 60 * 1000);
  const arrivalTimeStr = arrivalDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`routes-page ${currentTile.isDarkFilter ? "cityflow-dark-tiles" : ""}`}>
      {/* HEADER PRINCIPAL */}
      <div className="routes-header">
        <div>
          <span className="routes-eyebrow">
            <Compass size={16} />
            CARTE INTERACTIVE & CALCULATEUR D'ITINÉRAIRES MULTIMODAL
          </span>
          <h1>Itinéraires & Carte du Trafic • {selectedCity}</h1>
          <p>
            Explorez le trafic en direct, comparez les itinéraires les plus rapides et lancez la navigation GPS avec guidage vocal.
          </p>
        </div>

        <div className="routes-header-icon" style={{ background: wsOnline ? "#e8f5e9" : "#f1f5f9", color: wsOnline ? "#00875A" : "#64748b" }}>
          <Route size={28} />
        </div>
      </div>

      {/* FORMULAIRE DE RECHERCHE D'ITINÉRAIRE */}
      <div className="route-search-card">
        <div className="route-search-inputs-grid">
          {/* CHAMP DÉPART */}
          <div className="route-input-group" ref={activeDropdown === "departure" ? dropdownRef : null} style={{ position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label>Point de départ</label>
              <button
                type="button"
                className="btn-link-gps"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                title="Utiliser ma position GPS"
              >
                <Crosshair size={13} className={isLocating ? "spin-icon" : ""} />
                <span>{isLocating ? "GPS..." : "Ma position"}</span>
              </button>
            </div>
            <div className="input-with-icon">
              <MapPin size={18} color="#00875A" />
              <input
                type="text"
                value={departure}
                placeholder="Ex: Mvan, Poste Centrale, Bastos..."
                onChange={(e) => {
                  setDeparture(e.target.value);
                  setSearchQuery(e.target.value);
                  setActiveDropdown("departure");
                }}
                onFocus={() => {
                  setSearchQuery("");
                  setActiveDropdown("departure");
                }}
              />
              {departure && (
                <button
                  type="button"
                  className="btn-clear-input"
                  onClick={() => {
                    setDeparture("");
                    setDepartureCoords(null);
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* POPUP DROPDOWN DES SUGGESTIONS DÉPART */}
            {activeDropdown === "departure" && (
              <div className="places-autocomplete-dropdown">
                <div className="category-filter-chips">
                  {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => (
                    <button
                      key={catKey}
                      type="button"
                      className={`cat-chip ${activeCategoryFilter === catKey ? "active" : ""}`}
                      onClick={() => setActiveCategoryFilter(catKey)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="places-list-scroll">
                  {filteredLandmarks.length > 0 ? (
                    filteredLandmarks.map((lm, idx) => {
                      const IconComponent = CATEGORY_ICONS[lm.category] || Building2;
                      return (
                        <div
                          key={idx}
                          className="place-suggestion-item"
                          onClick={() => handleSelectLandmark(lm, "departure")}
                        >
                          <div className="suggestion-icon">
                            <IconComponent size={16} />
                          </div>
                          <div className="suggestion-text">
                            <strong>{lm.name}</strong>
                            <span>{lm.district} &bull; {CATEGORY_LABELS[lm.category]}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-suggestions">Aucun lieu trouvé pour "{searchQuery}"</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* BOUTON D'INVERSION */}
          <button
            type="button"
            className="btn-swap-locations"
            onClick={handleSwapLocations}
            title="Inverser départ et arrivée"
          >
            <ArrowUpDown size={18} />
          </button>

          {/* CHAMP DESTINATION */}
          <div className="route-input-group" ref={activeDropdown === "destination" ? dropdownRef : null} style={{ position: "relative" }}>
            <label>Destination</label>
            <div className="input-with-icon">
              <Navigation size={18} color="#EF4444" />
              <input
                type="text"
                value={destination}
                placeholder="Ex: Hôpital Général, Bastos, Mokolo..."
                onChange={(e) => {
                  setDestination(e.target.value);
                  setSearchQuery(e.target.value);
                  setActiveDropdown("destination");
                }}
                onFocus={() => {
                  setSearchQuery("");
                  setActiveDropdown("destination");
                }}
              />
              {destination && (
                <button
                  type="button"
                  className="btn-clear-input"
                  onClick={() => {
                    setDestination("");
                    setDestinationCoords(null);
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* POPUP DROPDOWN DES SUGGESTIONS DESTINATION */}
            {activeDropdown === "destination" && (
              <div className="places-autocomplete-dropdown">
                <div className="category-filter-chips">
                  {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => (
                    <button
                      key={catKey}
                      type="button"
                      className={`cat-chip ${activeCategoryFilter === catKey ? "active" : ""}`}
                      onClick={() => setActiveCategoryFilter(catKey)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="places-list-scroll">
                  {filteredLandmarks.length > 0 ? (
                    filteredLandmarks.map((lm, idx) => {
                      const IconComponent = CATEGORY_ICONS[lm.category] || Building2;
                      return (
                        <div
                          key={idx}
                          className="place-suggestion-item"
                          onClick={() => handleSelectLandmark(lm, "destination")}
                        >
                          <div className="suggestion-icon">
                            <IconComponent size={16} />
                          </div>
                          <div className="suggestion-text">
                            <strong>{lm.name}</strong>
                            <span>{lm.district} &bull; {CATEGORY_LABELS[lm.category]}</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-suggestions">Aucun lieu trouvé pour "{searchQuery}"</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* BOUTON CALCULER */}
          <button
            type="button"
            className="btn-calculate-route"
            onClick={() => fetchRoutes()}
            disabled={isLoading}
          >
            {isLoading ? (
              <span>Calcul en cours...</span>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Calculer l'itinéraire</span>
              </>
            )}
          </button>
        </div>

        {/* BARRE DES MODES DE TRANSPORT (MULTIMODAL) */}
        {multimodal.length > 0 && (
          <div className="multimodal-modes-bar">
            {multimodal.map((m) => {
              const Icon = MODE_ICONS[m.mode] || Car;
              const isSelected = activeMode === m.mode;
              return (
                <button
                  key={m.mode}
                  type="button"
                  className={`mode-btn ${isSelected ? "active" : ""}`}
                  onClick={() => setActiveMode(m.mode)}
                >
                  <Icon size={18} />
                  <span className="mode-name">{m.label}</span>
                  <span className="mode-time">{m.durationMinutes} min</span>
                  <span className="mode-cost">{m.costLabel}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* HUD DE NAVIGATION PAS-À-PAS EN COURS (STYLE GOOGLE MAPS HUD) */}
      {isNavigating && selectedRoute && (
        <div className="navigation-hud-banner">
          <div className="nav-hud-left">
            <div className="nav-step-icon">
              <Navigation size={28} />
            </div>
            <div className="nav-instruction-block">
              <span className="nav-step-tag">
                Étape {navStepIndex + 1} sur {selectedRoute.steps?.length || 1}
              </span>
              <h3>
                {selectedRoute.steps?.[navStepIndex] || "Poursuivez sur votre itinéraire"}
              </h3>
              <div className="nav-step-subinfo">
                <span>Vitesse instantanée : <strong>{currentSpeed} km/h</strong></span>
                <span>&bull; Arrivée estimée dans <strong>{Math.max(1, selectedRoute.durationMinutes - Math.floor(navStepIndex * 3))} min</strong></span>
              </div>
            </div>
          </div>

          <div className="nav-hud-actions">
            {/* BOUTON SYNTHÈSE VOCALE */}
            <button
              type="button"
              className={`nav-ctrl-btn ${voiceEnabled ? "active" : ""}`}
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              title={voiceEnabled ? "Guidage vocal activé" : "Guidage vocal muet"}
            >
              {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {/* BOUTON SIMULATION AUTOMATIQUE */}
            <button
              type="button"
              className={`nav-ctrl-btn ${isAutoSimulating ? "active" : ""}`}
              onClick={handleToggleAutoSimulate}
              title={isAutoSimulating ? "Mettre en pause la simulation" : "Avancer automatiquement"}
            >
              {isAutoSimulating ? <Pause size={18} /> : <FastForward size={18} />}
            </button>

            {/* ÉTAPE SUIVANTE */}
            <button
              type="button"
              className="btn-next-step"
              onClick={handleNextStep}
              disabled={navCompleted}
            >
              {navCompleted ? "Destination atteinte" : "Étape suivante"}
              <ChevronRight size={18} />
            </button>

            {/* QUITTER LE GUIDAGE */}
            <button
              type="button"
              className="btn-stop-nav"
              onClick={handleStopNavigation}
              title="Arrêter la navigation"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* GRILLE PRINCIPALE : ITINÉRAIRES & CARTE EN DIRECT */}
      <div className="routes-main-grid">
        {/* COLONNE GAUCHE : OPTIONS D'ITINÉRAIRES */}
        <div className="routes-list-col">
          <div className="routes-list-header">
            <h3>{routes.length} Itinéraires suggérés</h3>
            <span className="traffic-live-tag" style={{ background: wsOnline ? "#e8f5e9" : "#f1f5f9", color: wsOnline ? "#00875A" : "#64748b", border: "1px solid #a7f3d0" }}>
              ● {wsOnline ? "Trafic en temps réel synchronisé" : "Mode local"}
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

                {/* BARRE DE SEGMENTS DE TRAFIC EN TEMPS RÉEL */}
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

        {/* COLONNE DROITE : CARTE LEAFLET TACTIQUE ET TRAFIC EN DIRECT */}
        <div className="routes-map-col">
          {/* BARRE DE CONTRÔLE SUR LA CARTE (Noms des zones, Couche trafic, Calque de carte, Heure) */}
          <div
            className="routes-map-top-bar"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {/* BOUTON NOMS DES ZONES */}
              <button
                type="button"
                onClick={() => setShowZoneNames(!showZoneNames)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 10px",
                  background: showZoneNames ? (isDark ? "#1e3a8a" : "#eff6ff") : isDark ? "#1e293b" : "#f1f5f9",
                  border: `1px solid ${showZoneNames ? "#3b82f6" : isDark ? "#334155" : "#cbd5e1"}`,
                  borderRadius: "8px",
                  color: showZoneNames ? "#2563eb" : "inherit",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
                title="Afficher/masquer les badges des quartiers"
              >
                {showZoneNames ? <Eye size={13} /> : <EyeOff size={13} />}
                <span>{showZoneNames ? "Noms des zones" : "Zones masquées"}</span>
              </button>

              {/* BOUTON COUCHE TRAFIC LIVE */}
              <button
                type="button"
                onClick={() => setShowTrafficLayer(!showTrafficLayer)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 10px",
                  background: showTrafficLayer ? (isDark ? "#064e3b" : "#f0fdf4") : isDark ? "#1e293b" : "#f1f5f9",
                  border: `1px solid ${showTrafficLayer ? "#22c55e" : isDark ? "#334155" : "#cbd5e1"}`,
                  borderRadius: "8px",
                  color: showTrafficLayer ? "#15803d" : "inherit",
                  fontSize: "11.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
                title="Afficher/masquer les nœuds de trafic en temps réel"
              >
                <Activity size={13} />
                <span>{showTrafficLayer ? "Trafic actif" : "Trafic masqué"}</span>
              </button>

              {/* SÉLECTEUR DE CALQUES */}
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setShowLayerMenu(!showLayerMenu)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "6px 10px",
                    background: isDark ? "#1e293b" : "#f1f5f9",
                    border: isDark ? "1px solid #334155" : "1px solid #cbd5e1",
                    borderRadius: "8px",
                    color: "inherit",
                    fontSize: "11.5px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                  title="Changer le calque cartographique"
                >
                  <Layers size={13} />
                  <span>Calque</span>
                </button>

                {showLayerMenu && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "100%",
                      marginTop: "4px",
                      background: isDark ? "#1e293b" : "#ffffff",
                      border: isDark ? "1px solid #334155" : "1px solid #cbd5e1",
                      borderRadius: "10px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                      zIndex: 1000,
                      minWidth: "210px",
                      padding: "4px 0",
                    }}
                  >
                    {Object.entries(tileProviders).map(([key, provider]) => (
                      <div
                        key={key}
                        onClick={() => {
                          setActiveTileProvider(key);
                          setShowLayerMenu(false);
                        }}
                        style={{
                          padding: "7px 12px",
                          cursor: "pointer",
                          fontSize: "11.5px",
                          fontWeight: activeTileProvider === key ? "700" : "500",
                          color: activeTileProvider === key ? "#2563EB" : "inherit",
                          background: activeTileProvider === key ? (isDark ? "rgba(37,99,235,0.15)" : "#eff6ff") : "transparent",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>{provider.label}</span>
                        {activeTileProvider === key && <CheckCircle2 size={13} color="#2563EB" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* BADGE SYNCHRO EN DIRECT */}
            <div style={{ fontSize: "11px", color: wsOnline ? "#15803d" : "#64748b", fontWeight: "700", display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: wsOnline ? "#22c55e" : "#94a3b8" }}></span>
              <span>{wsOnline ? `Synchro ${lastSyncTime}` : "Hors-ligne"}</span>
            </div>
          </div>

          <div className="routes-map-wrapper" style={{ position: "relative" }}>
            {/* POP-UP D'ALERTE CONDUCTEUR / VÉHICULE EN APPROCHE */}
            <EmergencyAlertOverlay currentRouteCoords={selectedRoute?.coordinates} />

            <MapContainer
              center={selectedRoute?.coordinates?.[0] || (selectedCity === "Douala" ? [4.0511, 9.7679] : [3.848, 11.502])}
              zoom={13}
              style={{ width: "100%", height: "100%", borderRadius: "18px" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution={currentTile.attribution}
                url={currentTile.url}
              />

              <RouteMapClickHandler onMapClick={handleMapClick} />
              {selectedRoute?.coordinates && <FitRouteBounds coords={selectedRoute.coordinates} />}

              {/* CORRIDOR D'URGENCE ACTIF AVEC ONDE VERTE */}
              {emergencyMission && emergencyMission.coordinates && (
                <>
                  <Polyline
                    positions={emergencyMission.coordinates}
                    pathOptions={{ color: "#22c55e", weight: 7, opacity: 0.95 }}
                  />
                  <CircleMarker
                    center={emergencyMission.coordinates[emergencyMission.currentStepIndex || 0] || emergencyMission.coordinates[0]}
                    radius={14}
                    pathOptions={{ fillColor: emergencyMission.color || "#ef4444", color: "#ffffff", weight: 3, fillOpacity: 1 }}
                  >
                    <Popup>
                      <div style={{ padding: "6px", fontSize: "12px" }}>
                        <strong>🚨 {emergencyMission.vehicleName}</strong>
                        <p style={{ margin: "2px 0 0", color: "#64748b" }}>Couloir d'urgence prioritaire</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                </>
              )}

              {/* BADGES PROMINENTS DES NOMS DES ZONES & QUARTIERS */}
              {showZoneNames &&
                cityZoneList.map((zone) => (
                  <Marker
                    key={`zone_label_${zone.id}`}
                    position={zone.position}
                    icon={createZoneDivIcon(zone.name, zone.congestion, zone.speed)}
                  >
                    <Popup>
                      <div className="map-popup-card" style={{ minWidth: "180px", padding: "4px" }}>
                        <h4 style={{ margin: "0 0 4px", fontSize: "13px", color: "#0A2540" }}>📍 {zone.fullName}</h4>
                        {zone.speed !== null && (
                          <div style={{ fontSize: "12px", display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
                            <span>Vitesse :</span>
                            <strong style={{ color: "#00875A" }}>{zone.speed} km/h</strong>
                          </div>
                        )}
                        {zone.delay !== null && (
                          <div style={{ fontSize: "12px", display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
                            <span>Retard :</span>
                            <strong style={{ color: "#EF4444" }}>+{zone.delay} min</strong>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setDeparture(zone.fullName);
                              setDepartureCoords(zone.position);
                              fetchRoutes(zone.fullName, destination, zone.position, destinationCoords);
                            }}
                            style={{ flex: 1, padding: "4px 8px", background: "#00875A", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: "700" }}
                          >
                            Partir d'ici
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDestination(zone.fullName);
                              setDestinationCoords(zone.position);
                              fetchRoutes(departure, zone.fullName, departureCoords, zone.position);
                            }}
                            style={{ flex: 1, padding: "4px 8px", background: "#2563EB", color: "#fff", border: "none", borderRadius: "6px", fontSize: "11px", cursor: "pointer", fontWeight: "700" }}
                          >
                            Aller ici
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

              {/* SEGMENTS DE TRAFIC CONNECTÉS SUR LE RÉSEAU URBAIN */}
              {showTrafficLayer &&
                trafficNodes.map((node) =>
                  node.connectedSegments && node.connectedSegments.length > 1 ? (
                    <Polyline
                      key={`connected_seg_${node.id}`}
                      positions={node.connectedSegments}
                      pathOptions={{
                        color: (trafficStyles[node.currentCongestion] || trafficStyles.moderate).color,
                        weight: 4,
                        opacity: 0.65,
                      }}
                    />
                  ) : null
                )}

              {/* NŒUDS DE TRAFIC EN DIRECT AVEC PULSATION */}
              {showTrafficLayer &&
                trafficNodes.map((node) => {
                  const style = trafficStyles[node.currentCongestion] || trafficStyles.moderate;
                  const isCritical = node.currentCongestion === "jammed" || node.currentCongestion === "heavy";

                  return (
                    <React.Fragment key={`node_marker_${node.id}`}>
                      {isCritical && (
                        <CircleMarker
                          center={node.position}
                          radius={16}
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
                          fillOpacity: 0.85,
                          weight: 2,
                        }}
                      >
                        <Popup>
                          <div style={{ padding: "4px", minWidth: "170px" }}>
                            <strong style={{ fontSize: "12.5px" }}>{node.name}</strong>
                            <div style={{ fontSize: "11.5px", margin: "4px 0" }}>
                              Congestion : <strong>{node.congestionValue || 50}%</strong>
                            </div>
                            <div style={{ fontSize: "11.5px", margin: "2px 0", color: "#00875A" }}>
                              Vitesse : <strong>{node.averageSpeedKmh} km/h</strong>
                            </div>
                            <div style={{ fontSize: "11.5px", margin: "2px 0", color: "#EF4444" }}>
                              Retard estimé : <strong>+{node.estimatedDelayMinutes || 5} min</strong>
                            </div>
                            <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeparture(node.name);
                                  setDepartureCoords(node.position);
                                  fetchRoutes(node.name, destination, node.position, destinationCoords);
                                }}
                                style={{ flex: 1, padding: "3px 6px", background: "#00875A", color: "#fff", border: "none", borderRadius: "5px", fontSize: "10.5px", cursor: "pointer", fontWeight: "700" }}
                              >
                                Partir d'ici
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDestination(node.name);
                                  setDestinationCoords(node.position);
                                  fetchRoutes(departure, node.name, departureCoords, node.position);
                                }}
                                style={{ flex: 1, padding: "3px 6px", background: "#2563EB", color: "#fff", border: "none", borderRadius: "5px", fontSize: "10.5px", cursor: "pointer", fontWeight: "700" }}
                              >
                                Aller ici
                              </button>
                            </div>
                          </div>
                        </Popup>
                      </CircleMarker>
                    </React.Fragment>
                  );
                })}

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

              {/* TRACÉ DE L'ITINÉRAIRE SÉLECTIONNÉ AVEC SEGMENTS DE TRAFIC (Vert, Orange, Rouge) */}
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

            {/* LÉGENDE DU TRAFIC SUR CARTE */}
            <div className="map-traffic-legend">
              <div className="leg-item">
                <span className="dot green"></span>
                <span>Fluide (&lt; 40%)</span>
              </div>
              <div className="leg-item">
                <span className="dot orange"></span>
                <span>Modéré (40 - 75%)</span>
              </div>
              <div className="leg-item">
                <span className="dot red"></span>
                <span>Dense / Saturé (&gt; 75%)</span>
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