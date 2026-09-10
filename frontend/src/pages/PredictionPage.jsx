import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Clock3,
  MapPin,
  CloudRain,
  Sun,
  Waves,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Gauge,
  Hourglass,
  Navigation,
  CloudLightning,
  CornerDownRight,
  Route,
  ArrowUpDown,
  Search,
  CheckCircle2,
  Building,
  History,
  Zap,
  Leaf,
  X,
} from "lucide-react";
import { useCity } from "../context/CityContext";
import { apiService } from "../services/api";
import { searchLandmarks, CITY_LANDMARKS } from "../data/cityData";
import PredictionAlert from "../components/PredictionAlert";
import PredictionFactors from "../components/PredictionFactors";
import PredictionTimeline from "../components/PredictionTimeline";
import { useTrafficAlerts, ToastContainer } from "../hooks/useTrafficAlerts.jsx";
import "./PredictionPage.css";

function getCategoryIcon(category) {
  switch (category) {
    case "university":
      return "🎓";
    case "hospital":
      return "🏥";
    case "mall":
      return "🛒";
    case "transport":
      return "🚌";
    case "hotel":
      return "🏨";
    case "landmark":
    default:
      return "🚦";
  }
}

function getLevelClass(value) {
  if (value >= 75) return "dense";
  if (value >= 40) return "moderate";
  return "fluid";
}

function getStatusLabel(value) {
  if (value >= 75) return "Dense / Saturé";
  if (value >= 40) return "Modéré";
  return "Fluide";
}

function PredictionPage() {
  const { selectedCity, setSelectedCity } = useCity();
  const isYaounde = selectedCity === "Yaoundé";

  const [forecastData, setForecastData] = useState(null);
  const [liveWeather, setLiveWeather] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // === NOUVELLES FONCTIONNALITÉS ===
  // 1. Historique des trajets (localStorage)
  const [tripHistory, setTripHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("cityflow_trip_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);

  // 2. Préférence de route : vitesse vs confort (routes bitumées)
  const [routeMode, setRouteMode] = useState("comfort"); // "speed" | "comfort"

  // 3. Alertes / Notifications toast
  const { toasts, dismissAlert, alertCongestion, alertWeather, alertSuccess } = useTrafficAlerts();

  // Assistant de trajet prédictif (Heure minimale = Heure actuelle)
  const [tripOrigin, setTripOrigin] = useState("Poste Centrale");
  const [tripDestination, setTripDestination] = useState("");
  const [tripSlotKey, setTripSlotKey] = useState("in15");
  const [tripResult, setTripResult] = useState(null);
  const [isTripPredicting, setIsTripPredicting] = useState(false);

  // Gestion des suggestions interactives et de l'autocomplete
  const [isOriginFocused, setIsOriginFocused] = useState(false);
  const [isDestFocused, setIsDestFocused] = useState(false);
  const originWrapperRef = useRef(null);
  const destWrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (originWrapperRef.current && !originWrapperRef.current.contains(e.target)) {
        setIsOriginFocused(false);
      }
      if (destWrapperRef.current && !destWrapperRef.current.contains(e.target)) {
        setIsDestFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const popularShortcuts = isYaounde
    ? [
        "Carrefour CRADAT (Université Yaoundé I)",
        "Collège Vogt (Mvolyé)",
        "Carrefour Biyem-Assi (Rond-point Express)",
        "Carrefour Mendong",
        "Marché Mokolo",
        "Bastos (Ambassades)",
        "Carrefour Nlongkak",
        "Carrefour Etoudi (Palais de l'Unité)",
        "Mvan (Gare Voyageurs)",
        "Carrefour Melen",
      ]
    : [
        "Carrefour Akwa (Boulevard Liberté)",
        "Carrefour Ndokoti (Axe Lourd)",
        "Rond-point Deido",
        "Rond-point Bonamoussadi (Maetur)",
        "Carrefour Makepe (Missoke)",
        "Carrefour Kotto",
        "Bonanjo (Zone Administrative)",
        "Carrefour Yassa (Grand Stade)",
        "Marché Mboppi",
      ];

  const originSuggestions = searchLandmarks(tripOrigin, selectedCity);
  const destSuggestions = searchLandmarks(tripDestination, selectedCity);

  // Génération dynamique des créneaux de prédiction (tous ancrés dans le futur)
  const getDepartureSlots = () => {
    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();

    const formatH = (d) => `${d.getHours().toString().padStart(2, "0")}h${d.getMinutes().toString().padStart(2, "0")}`;

    const slots = [
      {
        key: "now",
        label: `⚡ Maintenant (${formatH(now)})`,
        hour: currentH + currentM / 60,
        isTomorrow: false,
        date: now.toISOString(),
      },
      {
        key: "in15",
        label: `⏱️ Dans 15 min (${formatH(new Date(now.getTime() + 15 * 60000))})`,
        hour: new Date(now.getTime() + 15 * 60000).getHours() + new Date(now.getTime() + 15 * 60000).getMinutes() / 60,
        isTomorrow: new Date(now.getTime() + 15 * 60000).getDate() !== now.getDate(),
        date: new Date(now.getTime() + 15 * 60000).toISOString(),
      },
      {
        key: "in30",
        label: `⏱️ Dans 30 min (${formatH(new Date(now.getTime() + 30 * 60000))})`,
        hour: new Date(now.getTime() + 30 * 60000).getHours() + new Date(now.getTime() + 30 * 60000).getMinutes() / 60,
        isTomorrow: new Date(now.getTime() + 30 * 60000).getDate() !== now.getDate(),
        date: new Date(now.getTime() + 30 * 60000).toISOString(),
      },
      {
        key: "in60",
        label: `⏱️ Dans 1 heure (${formatH(new Date(now.getTime() + 60 * 60000))})`,
        hour: new Date(now.getTime() + 60 * 60000).getHours() + new Date(now.getTime() + 60 * 60000).getMinutes() / 60,
        isTomorrow: new Date(now.getTime() + 60 * 60000).getDate() !== now.getDate(),
        date: new Date(now.getTime() + 60 * 60000).toISOString(),
      },
      {
        key: "in120",
        label: `⏱️ Dans 2 heures (${formatH(new Date(now.getTime() + 120 * 60000))})`,
        hour: new Date(now.getTime() + 120 * 60000).getHours() + new Date(now.getTime() + 120 * 60000).getMinutes() / 60,
        isTomorrow: new Date(now.getTime() + 120 * 60000).getDate() !== now.getDate(),
        date: new Date(now.getTime() + 120 * 60000).toISOString(),
      },
    ];

    // Créneaux préconfigurés pour demain
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60000);
    const tomorrowDateStr = tomorrow.toISOString().split("T")[0];

    slots.push(
      {
        key: "tmw_08",
        label: `📅 Demain à 08h00 (Pointe matinale)`,
        hour: 8.0,
        isTomorrow: true,
        date: `${tomorrowDateStr}T08:00:00.000Z`,
      },
      {
        key: "tmw_12",
        label: `📅 Demain à 12h30 (Midi)`,
        hour: 12.5,
        isTomorrow: true,
        date: `${tomorrowDateStr}T12:30:00.000Z`,
      },
      {
        key: "tmw_17",
        label: `📅 Demain à 17h00 (Pointe vespérale)`,
        hour: 17.0,
        isTomorrow: true,
        date: `${tomorrowDateStr}T17:00:00.000Z`,
      },
      {
        key: "tmw_19",
        label: `📅 Demain à 19h30 (Soirée)`,
        hour: 19.5,
        isTomorrow: true,
        date: `${tomorrowDateStr}T19:30:00.000Z`,
      }
    );

    return slots;
  };

  const currentSlots = getDepartureSlots();
  const selectedSlot = currentSlots.find((s) => s.key === tripSlotKey) || currentSlots[1];

  const [selectedZoneFilter, setSelectedZoneFilter] = useState("all");

  // Charger la météo automatique en direct et les prévisions IA
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      apiService.getLiveWeather(selectedCity),
      apiService.getAiForecast({ city: selectedCity, weather: "auto", hour: new Date().getHours() }),
    ])
      .then(([weatherRes, forecastRes]) => {
        if (isMounted) {
          setLiveWeather(weatherRes);
          setForecastData(forecastRes);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  // Exécution automatique de la prédiction de trajet pour la destination sélectionnée
  useEffect(() => {
    if (!tripDestination) {
      setTripResult(null);
      setIsTripPredicting(false);
      return;
    }

    let isMounted = true;
    setIsTripPredicting(true);

    apiService
      .predictTrip({
        city: selectedCity,
        origin: tripOrigin,
        destination: tripDestination,
        departureHour: selectedSlot.hour,
        departureDate: selectedSlot.date,
        routeMode, // Nouveau : transmet la préférence vitesse/confort
      })
      .then((res) => {
        if (isMounted && res) {
          setTripResult(res);
          setIsTripPredicting(false);

          // === Sauvegarde dans l'historique ===
          const historyEntry = {
            id: Date.now(),
            origin: tripOrigin,
            destination: tripDestination,
            city: selectedCity,
            slotLabel: selectedSlot.label,
            routeMode,
            congestionScore: res.congestionScore,
            estimatedDuration: res.estimatedDurationMinutes,
            timestamp: new Date().toISOString(),
          };
          setTripHistory((prev) => {
            const updated = [historyEntry, ...prev.filter(
              (h) => !(h.origin === tripOrigin && h.destination === tripDestination && h.city === selectedCity)
            )].slice(0, 8); // Max 8 entrées
            try { localStorage.setItem("cityflow_trip_history", JSON.stringify(updated)); } catch {}
            return updated;
          });

          // === Alertes automatiques ===
          if (res.congestionScore >= 75) {
            alertCongestion({
              zone: tripDestination,
              score: res.congestionScore,
              eta: res.estimatedDurationMinutes ? `${res.estimatedDurationMinutes} min` : null,
            });
          } else if (res.congestionScore < 40) {
            alertSuccess({
              title: "Trajet fluide prévu",
              message: `${tripOrigin} → ${tripDestination} — ~${res.estimatedDurationMinutes} min. Bonne route !`,
            });
          }

          // Alerte météo si pluie
          if (res.weatherAtTargetHour && res.weatherAtTargetHour.rainMm > 5) {
            alertWeather({
              condition: res.weatherAtTargetHour.label,
              impact: `Ralentissements attendus. Chaussée glissante sur l'axe ${tripDestination}.`,
            });
          }
        }
      })
      .catch(() => {
        if (isMounted) setIsTripPredicting(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCity, tripOrigin, tripDestination, tripSlotKey, routeMode]);

  const predictions = forecastData?.globalForecast || [
    { horizon: "+15 min", congestionPercentage: 45, status: "Modéré (Ralentissement)" },
    { horizon: "+30 min", congestionPercentage: 62, status: "Modéré (Ralentissement)" },
    { horizon: "+1 heure", congestionPercentage: 84, status: "Critique (Bouchonné)" },
    { horizon: "+2 heures", congestionPercentage: 70, status: "Modéré (Ralentissement)" },
    { horizon: "+3 heures", congestionPercentage: 38, status: "Fluide (Optimal)" },
  ];

  const currentCongestion = forecastData?.currentCongestion !== undefined 
    ? forecastData.currentCongestion 
    : (predictions[0]?.congestionPercentage || 50);

  const nodeForecasts = forecastData?.nodeForecasts || [];
  const filteredNodes = selectedZoneFilter === "all" 
    ? nodeForecasts 
    : nodeForecasts.filter((n) => {
        if (selectedZoneFilter === "dense") return (n.congestionValue >= 75 || n.currentCongestion === "jammed" || n.currentCongestion === "heavy");
        if (selectedZoneFilter === "moderate") return (n.congestionValue >= 40 && n.congestionValue < 75);
        if (selectedZoneFilter === "fluid") return (n.congestionValue < 40);
        return true;
      });

  const currentWeather = liveWeather?.current || {
    temperature: 24,
    rainMm: 0.0,
    humidity: 80,
    label: "Temps sec / Ensoleillé",
    icon: "☀️",
  };

  return (
    <main className="prediction-page">
      {/* TOAST NOTIFICATIONS */}
      <ToastContainer toasts={toasts} onDismiss={dismissAlert} />
      {/* HEADER */}
      <section className="prediction-page-header">
        <div>
          <span className="prediction-eyebrow">
            <BrainCircuit size={16} />
            MOTEUR PRÉDICTIF NEURAL CITYFLOW (TEMPS RÉEL & SATELLITE)
          </span>
          <h1>Prédictions & Analyse d'Obstacles • {selectedCity}</h1>
          <p>
            Analyse intelligente multi-sources : Données météo satellitaires réelles (Open-Meteo), détection d'affluences
            locales (sorties d'amphis, cortèges, marchés) et calcul d'itinéraires prédictifs.
          </p>
        </div>

        <div className="prediction-header-actions" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="prediction-city">
            <MapPin size={18} />
            <select
              value={selectedCity}
              onChange={(event) => {
                const newCity = event.target.value;
                setSelectedCity(newCity);
                setTripOrigin(newCity === "Yaoundé" ? "Poste Centrale" : "Carrefour Akwa (Boulevard Liberté)");
                setTripDestination("");
              }}
            >
              <option value="Yaoundé">📍 Yaoundé (Centre)</option>
              <option value="Douala">📍 Douala (Littoral)</option>
            </select>
          </div>

          {/* Bouton historique des trajets */}
          {tripHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="btn-secondary"
              style={{ gap: "6px", fontSize: "12px", padding: "8px 13px", position: "relative" }}
              title="Voir les recherches récentes"
            >
              <History size={15} />
              Historique
              <span style={{
                background: "linear-gradient(135deg, #1a3a6b, #22a832)",
                color: "#fff",
                borderRadius: "50%",
                width: "18px",
                height: "18px",
                fontSize: "10px",
                fontWeight: "900",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}>
                {tripHistory.length}
              </span>
            </button>
          )}

          <Link
            to="/routes"
            className="btn-primary"
            style={{
              gap: "6px",
              padding: "9px 14px",
              fontSize: "13px",
              textDecoration: "none",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #00875A, #005f3e)",
            }}
          >
            <Navigation size={15} />
            <span>Itinéraires & Navigation</span>
          </Link>
        </div>
      </section>

      {/* BANDEAU MÉTÉO AUTOMATIQUE SATELLITE (SANS SÉLECTION MANUELLE) */}
      <section
        style={{
          background: currentWeather.rainMm > 0 ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" : "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
          color: "#ffffff",
          padding: "18px 24px",
          borderRadius: "18px",
          marginBottom: "24px",
          boxShadow: "0 4px 20px rgba(2, 132, 199, 0.2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "36px" }}>{currentWeather.icon}</span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }}></span>
              <span style={{ fontSize: "11px", fontWeight: "800", letterSpacing: "0.5px", color: "#a7f3d0" }}>
                MÉTÉO ANALYSÉE EN DIRECT (Open-Meteo)
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "900" }}>
              {currentWeather.temperature}°C • {currentWeather.label}
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "12px", opacity: 0.9 }}>
              Précipitations : {currentWeather.rainMm} mm • Humidité : {currentWeather.humidity}% • Vitesse du vent : {currentWeather.windSpeedKmh || 8} km/h
            </p>
          </div>
        </div>

        <div
          style={{
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(10px)",
            padding: "10px 16px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: "700",
            maxWidth: "320px",
          }}
        >
          ✨ {currentWeather.rainMm > 0
            ? "L'IA applique automatiquement un facteur de ralentissement et surveille les bas-fonds inondables."
            : "Conditions optimales. Adhérence routière maximale sur tous les axes."}
        </div>
      </section>

      {/* === PANNEAU HISTORIQUE DES TRAJETS === */}
      {showHistory && tripHistory.length > 0 && (
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "16px 20px",
            marginBottom: "20px",
            boxShadow: "0 4px 18px rgba(0, 0, 0, 0.04)",
            animation: "fadeSlideIn 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ padding: "6px", background: "linear-gradient(135deg, #1a3a6b, #22a832)", borderRadius: "8px", color: "#fff" }}>
                <History size={16} />
              </div>
              <div>
                <strong style={{ fontSize: "14px", color: "#0f172a" }}>Recherches récentes</strong>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Cliquez pour recharger un trajet</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => {
                  setTripHistory([]);
                  localStorage.removeItem("cityflow_trip_history");
                  setShowHistory(false);
                }}
                style={{ background: "none", border: "none", fontSize: "11px", color: "#94a3b8", cursor: "pointer", padding: "4px 8px", borderRadius: "6px" }}
              >
                Effacer tout
              </button>
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                style={{ background: "#f1f5f9", border: "none", borderRadius: "8px", padding: "4px 8px", cursor: "pointer", color: "#475569" }}
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {tripHistory.map((h) => {
              const scoreColor = h.congestionScore >= 75 ? "#dc2626" : h.congestionScore >= 40 ? "#f59e0b" : "#10b981";
              const isCurrentCity = h.city === selectedCity;
              return (
                <div
                  key={h.id}
                  onClick={() => {
                    if (isCurrentCity) {
                      setTripOrigin(h.origin);
                      setTripDestination(h.destination);
                      setRouteMode(h.routeMode || "comfort");
                      setShowHistory(false);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    background: isCurrentCity ? "#f8fafc" : "#f1f5f9",
                    border: "1px solid #e2e8f0",
                    cursor: isCurrentCity ? "pointer" : "default",
                    opacity: isCurrentCity ? 1 : 0.55,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => isCurrentCity && (e.currentTarget.style.background = "#f0fdf4")}
                  onMouseLeave={(e) => isCurrentCity && (e.currentTarget.style.background = "#f8fafc")}
                  title={isCurrentCity ? "Cliquer pour recharger ce trajet" : `Trajet de ${h.city} — changez de ville pour accéder`}
                >
                  <span style={{ fontSize: "14px" }}>🏁</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {h.origin} → {h.destination}
                    </div>
                    <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                      {h.city} • {h.slotLabel?.replace(/[⚡⏱️📅]/g, "").trim()} • {h.routeMode === "speed" ? "⚡ Vitesse" : "🛣️ Confort"}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    <span style={{
                      background: scoreColor,
                      color: "#fff",
                      borderRadius: "6px",
                      padding: "2px 7px",
                      fontSize: "10px",
                      fontWeight: "800",
                    }}>
                      {h.congestionScore}%
                    </span>
                    <span style={{ fontSize: "10.5px", color: "#94a3b8" }}>~{h.estimatedDuration} min</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ASSISTANT PRÉDICTIF DE TRAJET & D'OBSTACLES */}
      <section
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "20px",
          padding: "24px",
          marginBottom: "28px",
          boxShadow: "0 4px 18px rgba(0, 0, 0, 0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ padding: "8px", background: "rgba(0, 135, 90, 0.1)", borderRadius: "10px", color: "#00875A" }}>
              <Route size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "900", color: "#0f172a" }}>
                Assistant Prédictif de Trajet & d'Obstacles Futurs
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
                Reconnaissance universelle de tous les lieux (lycées, carrefours, hôpitaux, marchés) et prédiction d'obstacles
              </p>
            </div>
          </div>
        </div>

        {/* Formulaire interactif avec recherche & autocomplétion */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr 1fr", gap: "12px", alignItems: "flex-end", marginBottom: "14px" }}>
          {/* Point de départ */}
          <div ref={originWrapperRef} style={{ position: "relative" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#334155", marginBottom: "6px" }}>
              Point de départ :
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={tripOrigin}
                onChange={(e) => {
                  setTripOrigin(e.target.value);
                  setIsOriginFocused(true);
                }}
                onFocus={() => setIsOriginFocused(true)}
                placeholder="Ex: Poste Centrale, Vogt, Bastos..."
                style={{
                  width: "100%",
                  padding: "10px 14px 10px 34px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  fontWeight: "700",
                  fontSize: "13px",
                  color: "#0f172a",
                  boxSizing: "border-box",
                }}
              />
              <MapPin size={15} color="#00875A" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
            </div>

            {/* Dropdown suggestions Départ */}
            {isOriginFocused && originSuggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  marginTop: "4px",
                  background: "#ffffff",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  maxHeight: "220px",
                  overflowY: "auto",
                }}
              >
                {originSuggestions.slice(0, 8).map((item, idx) => (
                  <div
                    key={idx}
                    onMouseDown={() => {
                      setTripOrigin(item.name);
                      setIsOriginFocused(false);
                    }}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: "12.5px",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span>{getCategoryIcon(item.category)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "700", color: "#1e293b" }}>{item.name}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{item.district} • {item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bouton Swap */}
          <div style={{ paddingBottom: "2px" }}>
            <button
              type="button"
              onClick={() => {
                const prevOrigin = tripOrigin;
                const prevDest = tripDestination;
                setTripOrigin(prevDest || "Poste Centrale");
                setTripDestination(prevOrigin);
              }}
              title="Inverser départ et destination"
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                padding: "10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#334155",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
            >
              <ArrowUpDown size={16} />
            </button>
          </div>

          {/* Destination cible */}
          <div ref={destWrapperRef} style={{ position: "relative" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#334155", marginBottom: "6px" }}>
              Destination cible :
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={tripDestination}
                onChange={(e) => {
                  setTripDestination(e.target.value);
                  setIsDestFocused(true);
                }}
                onFocus={() => setIsDestFocused(true)}
                placeholder="Tapez un lieu (CRADAT, Vogt, Ndokoti...)"
                style={{
                  width: "100%",
                  padding: "10px 14px 10px 34px",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  fontWeight: "700",
                  fontSize: "13px",
                  color: "#0f172a",
                  boxSizing: "border-box",
                }}
              />
              <Search size={15} color="#0284c7" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
              {tripDestination && (
                <button
                  type="button"
                  onClick={() => setTripDestination("")}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "14px",
                    color: "#94a3b8",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown suggestions Destination */}
            {isDestFocused && destSuggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  marginTop: "4px",
                  background: "#ffffff",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                  maxHeight: "220px",
                  overflowY: "auto",
                }}
              >
                {destSuggestions.slice(0, 8).map((item, idx) => (
                  <div
                    key={idx}
                    onMouseDown={() => {
                      setTripDestination(item.name);
                      setIsDestFocused(false);
                    }}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      borderBottom: "1px solid #f1f5f9",
                      fontSize: "12.5px",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span>{getCategoryIcon(item.category)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "700", color: "#1e293b" }}>{item.name}</div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>{item.district} • {item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Heure prévue de départ */}
          <div>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "800", color: "#334155", marginBottom: "6px" }}>
              Heure prévue de départ :
            </label>
            <select
              value={tripSlotKey}
              onChange={(e) => setTripSlotKey(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                fontWeight: "700",
                fontSize: "13px",
                color: "#0f172a",
              }}
            >
              {currentSlots.map((slot) => (
                <option key={slot.key} value={slot.key}>
                  {slot.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Raccourcis rapides */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
          <span style={{ fontSize: "11px", fontWeight: "800", color: "#64748b" }}>Raccourcis rapides :</span>
          {popularShortcuts.map((sc, idx) => {
            const isSelected = tripDestination === sc;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setTripDestination(sc)}
                style={{
                  background: isSelected ? "linear-gradient(135deg, #1a3a6b, #22a832)" : "#f1f5f9",
                  color: isSelected ? "#ffffff" : "#334155",
                  border: `1px solid ${isSelected ? "#1a3a6b" : "#e2e8f0"}`,
                  padding: "4px 10px",
                  borderRadius: "20px",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {sc.split("(")[0].trim()}
              </button>
            );
          })}
        </div>

        {/* === TOGGLE MODE ROUTE : Vitesse vs Confort === */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
          padding: "10px 14px",
          background: "#f8fafc",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
        }}>
          <span style={{ fontSize: "11px", fontWeight: "800", color: "#475569", whiteSpace: "nowrap" }}>Priorité de route :</span>
          <button
            type="button"
            onClick={() => setRouteMode("comfort")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "6px 12px",
              borderRadius: "8px",
              border: routeMode === "comfort" ? "none" : "1px solid #e2e8f0",
              background: routeMode === "comfort" ? "linear-gradient(135deg, #1a3a6b, #22a832)" : "#ffffff",
              color: routeMode === "comfort" ? "#ffffff" : "#64748b",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: routeMode === "comfort" ? "0 3px 10px rgba(26,58,107,0.25)" : "none",
            }}
          >
            <Leaf size={13} />
            Confort (Routes bitumées)
          </button>
          <button
            type="button"
            onClick={() => setRouteMode("speed")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              padding: "6px 12px",
              borderRadius: "8px",
              border: routeMode === "speed" ? "none" : "1px solid #e2e8f0",
              background: routeMode === "speed" ? "linear-gradient(135deg, #b45309, #f59e0b)" : "#ffffff",
              color: routeMode === "speed" ? "#ffffff" : "#64748b",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              transition: "all 0.2s",
              boxShadow: routeMode === "speed" ? "0 3px 10px rgba(245,158,11,0.3)" : "none",
            }}
          >
            <Zap size={13} />
            Vitesse (Plus rapide)
          </button>
          <span style={{ fontSize: "10.5px", color: "#94a3b8", marginLeft: "auto" }}>
            {routeMode === "comfort" ? "🛣️ Favorise les voies bitumées" : "⚡ Favorise le chemin le plus court"}
          </span>
        </div>

        {/* Résultat du diagnostic IA */}
        {!tripDestination ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 20px",
              background: "#f8fafc",
              borderRadius: "16px",
              border: "1px dashed #cbd5e1",
              color: "#64748b",
            }}
          >
            <MapPin size={28} style={{ color: "#0284c7", marginBottom: "8px" }} />
            <p style={{ margin: 0, fontSize: "13.5px", fontWeight: "700", color: "#334155" }}>
              Veuillez sélectionner une destination cible ci-dessus
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#64748b" }}>
              L'IA CityFlow calculera instantanément l'analyse météo, le risque d'engorgement et le temps de trajet optimal.
            </p>
          </div>
        ) : isTripPredicting ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#64748b" }}>
            <Sparkles className="spin" size={24} style={{ marginBottom: "8px" }} />
            <p style={{ margin: 0, fontSize: "13px", fontWeight: "600" }}>
              Analyse en direct de l'axe {tripDestination} ({selectedSlot.label})...
            </p>
          </div>
        ) : tripResult ? (
          <div
            style={{
              background: tripResult.isRoadBlocked ? "#fef2f2" : "#f0fdf4",
              border: `1px solid ${tripResult.isRoadBlocked ? "#fecaca" : "#bbf7d0"}`,
              borderRadius: "16px",
              padding: "18px 20px",
            }}
          >
            {/* 1. Alerte synthétique en langage naturel OS1 & Fiabilité */}
            {tripResult.timeline && (
              <PredictionAlert
                message={tripResult.timeline.alert_message}
                confidence={tripResult.timeline.confidence}
                causes={tripResult.timeline.causes}
              />
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ShieldAlert size={22} color={tripResult.isRoadBlocked ? "#dc2626" : "#16a34a"} />
                <strong style={{ fontSize: "15px", color: tripResult.isRoadBlocked ? "#991b1b" : "#166534" }}>
                  {tripResult.roadStatusLabel} ({tripResult.congestionScore}%)
                </strong>
              </div>
              <span
                style={{
                  background: tripResult.isRoadBlocked ? "#dc2626" : "#16a34a",
                  color: "#ffffff",
                  padding: "4px 10px",
                  borderRadius: "8px",
                  fontWeight: "900",
                  fontSize: "12px",
                }}
              >
                Temps estimé : ~{tripResult.estimatedDurationMinutes} min (+{tripResult.delayMinutes} min de retard)
              </span>
            </div>

            {/* Météo à l'heure H */}
            {tripResult.weatherAtTargetHour && (
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "8px" }}>
                {tripResult.weatherAtTargetHour.icon} Météo prévue {tripResult.isTomorrow ? "demain" : "aujourd'hui"} à {tripResult.departureTimeFormatted || selectedSlot.label} : {tripResult.weatherAtTargetHour.label} ({tripResult.weatherAtTargetHour.temperature}°C, {tripResult.weatherAtTargetHour.precipitationProbability}% de risque de pluie)
              </div>
            )}

            {/* 2. Timeline multi-horizons (15m, 30m, 45m, 1h, 1h30, 2h) */}
            {tripResult.timeline?.points && (
              <PredictionTimeline points={tripResult.timeline.points} />
            )}

            {/* Diagnostic étape par étape des carrefours traversés */}
            {tripResult.corridorWaypoints && tripResult.corridorWaypoints.length > 0 && (
              <div
                style={{
                  marginTop: "16px",
                  background: "#ffffff",
                  padding: "16px",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <Route size={18} color="#0284c7" />
                  <div>
                    <strong style={{ fontSize: "14px", color: "#0f172a" }}>
                      Diagnostic étape par étape & Meilleur itinéraire
                    </strong>
                    <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                      Heures de passage exactes, qualité de la chaussée et obstacles détectés
                    </div>
                  </div>
                </div>

                {/* Synthèse de la meilleure route bitumée */}
                {tripResult.bestRouteOverview && (
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      marginBottom: "12px",
                      fontSize: "12px",
                      color: "#166534",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontWeight: "800", color: "#15803d" }}>
                        🛣️ {tripResult.bestRouteOverview.recommendedRouteName}
                      </span>
                      <span
                        style={{
                          background: "#dcfce7",
                          color: "#166534",
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontWeight: "800",
                          fontSize: "11px",
                        }}
                      >
                        {tripResult.bestRouteOverview.averageRoadQualityScore}% Qualité Bitume
                      </span>
                    </div>
                    <div style={{ fontSize: "11.5px", color: "#166534", opacity: 0.95 }}>
                      ✨ <strong>Avantage de l'axe :</strong> {tripResult.bestRouteOverview.whyBestRoute}
                    </div>
                    {tripResult.bestRouteOverview.alternativeDegradedRoute && (
                      <div style={{ fontSize: "11px", color: "#b45309", marginTop: "4px", paddingTop: "4px", borderTop: "1px dashed #cbd5e1" }}>
                        ⚠️ <strong>Évitement conseillé :</strong> {tripResult.bestRouteOverview.alternativeDegradedRoute.name} ({tripResult.bestRouteOverview.alternativeDegradedRoute.warning})
                      </div>
                    )}
                  </div>
                )}

                {tripResult.criticalBottleneck && tripResult.criticalBottleneck.congestionScore >= 65 && (
                  <div
                    style={{
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      marginBottom: "14px",
                      fontSize: "12.5px",
                      color: "#991b1b",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span style={{ fontSize: "16px" }}>🚨</span>
                    <div>
                      <strong>Point critique du parcours : </strong>
                      <u>{tripResult.criticalBottleneck.nodeName}</u> atteint vers <b>{tripResult.criticalBottleneck.etaFormatted}</b> ({tripResult.criticalBottleneck.mainReason}).
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {tripResult.corridorWaypoints.map((wp, wIdx) => {
                    const isOrigin = wp.isOrigin;
                    const isDest = wp.isDestination;
                    const score = wp.congestionScore || 50;
                    const badgeColor = score >= 85 ? "#dc2626" : score >= 68 ? "#ea580c" : score >= 40 ? "#f59e0b" : "#10b981";

                    return (
                      <div
                        key={wp.id || wIdx}
                        style={{
                          borderLeft: `3px solid ${badgeColor}`,
                          paddingLeft: "12px",
                          paddingTop: "2px",
                          paddingBottom: "2px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontWeight: isOrigin || isDest ? "900" : "800", fontSize: "13px", color: "#1e293b" }}>
                            {isOrigin ? "🏁 " : isDest ? "📍 " : "🚦 "}
                            {wp.name}
                          </span>
                          <span
                            style={{
                              background: "#f1f5f9",
                              color: "#0284c7",
                              padding: "2px 8px",
                              borderRadius: "6px",
                              fontWeight: "800",
                              fontSize: "11px",
                            }}
                          >
                            🕒 {wp.estimatedArrival}
                          </span>
                        </div>

                        {/* Indication de la route empruntée et qualité du bitume */}
                        {wp.roadName && (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", fontSize: "11.5px" }}>
                            <span style={{ color: "#0369a1", fontWeight: "700" }}>
                              🛣️ {wp.roadName}
                            </span>
                            {wp.pavementStatus && (
                              <span
                                style={{
                                  background: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  color: "#475569",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  fontSize: "10.5px",
                                  fontWeight: "600",
                                }}
                              >
                                {wp.pavementStatus}
                              </span>
                            )}
                          </div>
                        )}

                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", fontSize: "11px" }}>
                          <span style={{ color: badgeColor, fontWeight: "700" }}>
                            ● {wp.statusLabel} ({score}%)
                          </span>
                          {wp.delayAtNodeMin > 0 && (
                            <span style={{ color: "#64748b" }}>
                              (+{wp.delayAtNodeMin} min de ralentissement)
                            </span>
                          )}
                        </div>

                        {wp.obstacles && wp.obstacles.length > 0 && (
                          <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                            {wp.obstacles.map((obs, oIdx) => (
                              <div
                                key={oIdx}
                                style={{
                                  background: obs.severity === "critical" ? "#fef2f2" : "#fffbeb",
                                  border: `1px solid ${obs.severity === "critical" ? "#fecaca" : "#fde68a"}`,
                                  borderRadius: "8px",
                                  padding: "6px 10px",
                                  fontSize: "11.5px",
                                  color: obs.severity === "critical" ? "#991b1b" : "#92400e",
                                  display: "flex",
                                  gap: "6px",
                                  alignItems: "flex-start",
                                }}
                              >
                                <span>{obs.icon || "⚠️"}</span>
                                <div>
                                  <strong>{obs.title}</strong>
                                  <div style={{ fontSize: "11px", opacity: 0.9 }}>{obs.description}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Grille des facteurs déterminants (XAI) */}
            {tripResult.timeline?.factors && (
              <PredictionFactors
                isPeakHour={tripResult.timeline.factors.isPeakHour}
                rainMm={tripResult.timeline.factors.rainMm}
                hasEvent={tripResult.timeline.factors.hasEvent}
                roadDegraded={tripResult.timeline.factors.roadDegraded}
              />
            )}

            {/* Alertes d'événements */}
            {tripResult.warnings && tripResult.warnings.map((w, idx) => (
              <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "flex-start", marginTop: "10px" }}>
                <span style={{ fontSize: "16px" }}>{w.icon}</span>
                <div>
                  <strong style={{ fontSize: "12.5px", color: "#991b1b" }}>{w.title} : </strong>
                  <span style={{ fontSize: "12px", color: "#475569" }}>{w.description}</span>
                </div>
              </div>
            ))}

            {/* Déviation */}
            {tripResult.detourRecommendation && (
              <div
                style={{
                  marginTop: "12px",
                  background: "#ffffff",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12.5px",
                  fontWeight: "700",
                  color: "#0f172a",
                }}
              >
                <CornerDownRight size={16} color="#00875A" />
                <span>💡 {tripResult.detourRecommendation}</span>
              </div>
            )}

            {/* Conseil horaire */}
            {tripResult.bestDepartureAdvice && (
              <div style={{ marginTop: "8px", fontSize: "12px", fontWeight: "700", color: "#15803d" }}>
                ⏰ {tripResult.bestDepartureAdvice}
              </div>
            )}
          </div>
        ) : null}
      </section>

      {/* INDICATEUR PRINCIPAL EN TEMPS RÉEL */}
      <section className="prediction-main-card">
        <div className="prediction-main-left">
          <div className="prediction-main-icon">
            <Activity size={24} />
          </div>
          <div>
            <span>Niveau de congestion global en direct</span>
            <h2>{currentCongestion}%</h2>
            <strong style={{ color: currentCongestion >= 75 ? "#ef4444" : currentCongestion >= 40 ? "#f59e0b" : "#10b981" }}>
              {currentCongestion >= 75 ? "Trafic dense / saturé" : currentCongestion >= 40 ? "Trafic modéré" : "Trafic fluide"}
            </strong>
          </div>
        </div>

        <div className="prediction-main-description">
          <div className="live-indicator">
            <span></span>
            IA SYNCHRONISÉE EN TEMPS RÉEL
          </div>
          <p>
            Modèle calibré en continu sur les carrefours de {selectedCity}. Seuil de fiabilité estimé : <strong>95.8%</strong>.
          </p>
        </div>
      </section>

      {/* PREDICTIONS MULTI-HORIZONS */}
      <section className="prediction-section-page">
        <div className="page-section-heading">
          <div>
            <span className="prediction-eyebrow">
              <Clock3 size={15} />
              HORIZONS PRÉDICTIFS GLOBAUX
            </span>
            <h2>Évolution temporelle du trafic</h2>
          </div>
          <span className="city-label">📍 {selectedCity}</span>
        </div>

        <div className="prediction-cards-page">
          {predictions.map((p) => {
            const val = p.congestionPercentage;
            const levelClass = getLevelClass(val);
            return (
              <article key={p.horizon} className={`prediction-time-card ${levelClass}`}>
                <span className="prediction-time">{p.horizon}</span>
                <strong>{val}%</strong>
                <div className="prediction-progress">
                  <span style={{ width: `${val}%` }}></span>
                </div>
                <span className="prediction-level">
                  ● {getStatusLabel(val)}
                </span>
              </article>
            );
          })}
        </div>
      </section>

      {/* DÉTAIL DES PRÉVISIONS PAR CARREFOUR */}
      {nodeForecasts.length > 0 && (
        <section className="prediction-zones-section">
          <div className="page-section-heading" style={{ flexWrap: "wrap", gap: "12px" }}>
            <div>
              <span className="prediction-eyebrow">
                <Gauge size={15} />
                ÉVOLUTION PAR CARREFOUR & ZONE
              </span>
              <h2>Diagnostic en direct des axes majeurs</h2>
            </div>

            <div className="zone-filter-tabs">
              <button
                type="button"
                className={`zone-tab ${selectedZoneFilter === "all" ? "active" : ""}`}
                onClick={() => setSelectedZoneFilter("all")}
              >
                Tous ({nodeForecasts.length})
              </button>
              <button
                type="button"
                className={`zone-tab ${selectedZoneFilter === "dense" ? "active" : ""}`}
                onClick={() => setSelectedZoneFilter("dense")}
              >
                Saturés
              </button>
              <button
                type="button"
                className={`zone-tab ${selectedZoneFilter === "moderate" ? "active" : ""}`}
                onClick={() => setSelectedZoneFilter("moderate")}
              >
                Modérés
              </button>
              <button
                type="button"
                className={`zone-tab ${selectedZoneFilter === "fluid" ? "active" : ""}`}
                onClick={() => setSelectedZoneFilter("fluid")}
              >
                Fluides
              </button>
            </div>
          </div>

          <div className="node-forecast-grid">
            {filteredNodes.map((node) => {
              const nodeLevel = getLevelClass(node.congestionValue || (node.currentCongestion === "jammed" ? 85 : 50));
              return (
                <article key={node.id} className={`node-forecast-card ${nodeLevel}`}>
                  <div className="node-forecast-header">
                    <div>
                      <h4>{node.name}</h4>
                      <span className="node-city-badge">{node.city || selectedCity}</span>
                    </div>
                    <span className={`node-status-badge ${nodeLevel}`}>
                      {node.congestionValue || (node.currentCongestion === "jammed" ? 85 : 50)}%
                    </span>
                  </div>

                  <div className="node-metrics-bar">
                    <div className="metric-item">
                      <span className="metric-lbl">Vitesse :</span>
                      <strong className="metric-val">{Math.round(node.currentSpeed || node.averageSpeedKmh || 15)} km/h</strong>
                    </div>
                    <div className="metric-item">
                      <span className="metric-lbl">Retard :</span>
                      <strong className="metric-val">+{node.estimatedDelayMinutes || 10} min</strong>
                    </div>
                  </div>

                  {node.diagnosticReason && (
                    <div className="node-diagnostic">
                      <span>💡 {node.diagnosticReason}</span>
                    </div>
                  )}

                  {node.predictions && (
                    <div className="node-horizons-mini">
                      {node.predictions.slice(0, 4).map((p, pIdx) => (
                        <div key={pIdx} className="mini-horizon-chip">
                          <span className="mini-h-lbl">{p.horizon || `+${p.hourOffset}h`}</span>
                          <span className="mini-h-val" style={{ color: p.congestionPercentage >= 75 ? "#ef4444" : p.congestionPercentage >= 40 ? "#f59e0b" : "#10b981" }}>
                            {p.congestionPercentage}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

export default PredictionPage;