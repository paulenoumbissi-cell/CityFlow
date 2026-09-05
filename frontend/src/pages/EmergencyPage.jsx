import React, { useState, useEffect, useRef, useMemo } from "react";
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
  StopCircle,
  Play,
  Pause,
  RotateCcw,
  Navigation,
  Activity,
  Car,
  PhoneCall,
  Hospital,
  Compass,
  Gauge,
  History,
  ShieldAlert,
  Sliders,
  Crosshair,
} from "lucide-react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap, Marker, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useCity } from "../context/CityContext";
import wsService from "../services/websocketService";
import apiService from "../services/api";
import "./EmergencyPage.css";

const VEHICLE_TYPES = [
  {
    id: "ambulance",
    name: "Ambulance / SAMU 119",
    badge: "Urgence médicale vitale",
    icon: Siren,
    color: "#ef4444",
    bg: "#fee2e2",
    speedRange: [70, 92],
  },
  {
    id: "firefighters",
    name: "Sapeurs-Pompiers 118",
    badge: "Secours & Incendie",
    icon: Flame,
    color: "#ea580c",
    bg: "#ffedd5",
    speedRange: [65, 85],
  },
  {
    id: "police",
    name: "Police Secours 117",
    badge: "Intervention d'Urgence",
    icon: Shield,
    color: "#2563eb",
    bg: "#dbeafe",
    speedRange: [80, 105],
  },
  {
    id: "convoy",
    name: "Convoi Sécurisé",
    badge: "Priorité absolue",
    icon: Sparkles,
    color: "#7c3aed",
    bg: "#ede9fe",
    speedRange: [75, 95],
  },
];

const CAMEROON_HOTLINES = [
  {
    number: "119",
    name: "SAMU Cameroun",
    service: "Service d'Aide Médicale Urgente",
    desc: "Urgences vitales, détresse respiratoire, AVC, traumatismes graves",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "#f87171",
  },
  {
    number: "118",
    name: "Sapeurs-Pompiers (CCF)",
    service: "Corps National des Sapeurs-Pompiers",
    desc: "Incendies, désincarcération, inondations, secours à personnes",
    color: "#ea580c",
    bg: "rgba(234, 88, 12, 0.12)",
    border: "#fb923c",
  },
  {
    number: "117",
    name: "Police Secours",
    service: "DGSN - Intervention Rapide",
    desc: "Agressions, vols à main armée, sécurisation d'axes",
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.12)",
    border: "#60a5fa",
  },
  {
    number: "1500",
    name: "Gendarmerie Nationale",
    service: "Centre Opérationnel (COG)",
    desc: "Sécurité routière, contrôle des axes lourds, secours interurbain",
    color: "#16a34a",
    bg: "rgba(22, 163, 74, 0.12)",
    border: "#4ade80",
  },
];

// Helper Leaflet Icons
const createVehicleDivIcon = (color, vehicleName) =>
  L.divIcon({
    className: "emergency-vehicle-custom-marker",
    html: `
      <div class="vehicle-pulsing-aura" style="border-color: ${color}; background: ${color}33;"></div>
      <div class="vehicle-inner-circle" style="background-color: ${color};">
        <span class="vehicle-siren-beacon"></span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1 .4-1 1v7h2"></path>
          <circle cx="7" cy="17" r="2"></circle>
          <circle cx="17" cy="17" r="2"></circle>
        </svg>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });

const createHospitalDivIcon = (isTarget = false) =>
  L.divIcon({
    className: "emergency-hospital-custom-marker",
    html: `
      <div class="hospital-marker-pin ${isTarget ? "target-hospital" : ""}">
        <span class="cross-icon">+</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

// Map View Controller with Camera Auto-Follow
function MapController({ coords, vehiclePos, cameraFollow, selectedCorridor }) {
  const map = useMap();
  const prevCoordsRef = useRef(null);

  useEffect(() => {
    if (cameraFollow && vehiclePos) {
      map.panTo(vehiclePos, { animate: true, duration: 0.8 });
    }
  }, [vehiclePos, cameraFollow, map]);

  useEffect(() => {
    if (!cameraFollow && coords && coords.length > 0) {
      const coordsKey = JSON.stringify(coords[0]) + JSON.stringify(coords[coords.length - 1]);
      if (prevCoordsRef.current !== coordsKey) {
        prevCoordsRef.current = coordsKey;
        try {
          const bounds = L.latLngBounds(coords);
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        } catch (e) {
          // ignore
        }
      }
    }
  }, [coords, cameraFollow, map, selectedCorridor]);

  return null;
}

export default function EmergencyPage() {
  const { selectedCity } = useCity();

  // Active Mission & Presets State
  const [selectedVehicle, setSelectedVehicle] = useState(VEHICLE_TYPES[0]);
  const [corridors, setCorridors] = useState([]);
  const [selectedCorridor, setSelectedCorridor] = useState(null);
  const [activeMission, setActiveMission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs System : 'corridors' | 'custom' | 'hotlines' | 'history'
  const [activeTab, setActiveTab] = useState("corridors");

  // Custom Dispatch State
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [customOriginText, setCustomOriginText] = useState("");
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [customOriginCoords, setCustomOriginCoords] = useState(null);
  const [customRoutePreview, setCustomRoutePreview] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // Mission History State
  const [missionHistory, setMissionHistory] = useState([]);
  const [historyStats, setHistoryStats] = useState(null);

  // Real-Time Smooth Interpolation Engine
  const [simProgress, setSimProgress] = useState(0); // 0 to 1
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState(2); // 1x, 2x, 4x, 8x
  const [isSimPaused, setIsSimPaused] = useState(false);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(76);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [cameraFollow, setCameraFollow] = useState(true);

  // Sound Engine (Web Audio API Native 2-Tone Siren)
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef(null);
  const sirenOscRef = useRef(null);
  const sirenGainRef = useRef(null);
  const sirenIntervalRef = useRef(null);

  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(null);

  // Initial Data Fetching
  const fetchEmergencyData = async () => {
    try {
      setIsLoading(true);
      const currentCity = selectedCity === "all" ? "Yaoundé" : selectedCity;

      // 1. Mission active ou corridors
      const statusData = await apiService.getEmergencyStatus(currentCity);
      if (statusData?.active && statusData?.mission) {
        setActiveMission(statusData.mission);
        setElapsedTime(statusData.elapsedSeconds || 0);
        const v = VEHICLE_TYPES.find((v) => v.id === statusData.mission.vehicleType) || VEHICLE_TYPES[0];
        setSelectedVehicle(v);
      } else {
        setActiveMission(null);
        if (statusData?.corridorsAvailable && statusData.corridorsAvailable.length > 0) {
          setCorridors(statusData.corridorsAvailable);
          if (!selectedCorridor) setSelectedCorridor(statusData.corridorsAvailable[0]);
        }
      }

      // 2. Hôpitaux
      const hospData = await apiService.getEmergencyHospitals(currentCity);
      if (hospData?.hospitals && hospData.hospitals.length > 0) {
        setHospitals(hospData.hospitals);
        if (!selectedHospital) setSelectedHospital(hospData.hospitals[0]);
      }

      // 3. Historique
      const histData = await apiService.getEmergencyMissionHistory();
      if (histData?.missions) {
        setMissionHistory(histData.missions);
        setHistoryStats(histData.stats);
      }
    } catch (err) {
      console.error("Erreur chargement mode urgence:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencyData();

    // WebSockets Listeners
    const unsubUpdate = wsService.on("EMERGENCY_MISSION_UPDATE", (data) => {
      if (data?.mission) {
        setActiveMission(data.mission);
        setElapsedTime(data.elapsedSeconds || 0);
        const v = VEHICLE_TYPES.find((v) => v.id === data.mission.vehicleType) || VEHICLE_TYPES[0];
        setSelectedVehicle(v);
      }
    });

    const unsubCancel = wsService.on("EMERGENCY_MISSION_CANCELLED", () => {
      setActiveMission(null);
      stopSirenSound();
      fetchEmergencyData();
    });

    return () => {
      unsubUpdate();
      unsubCancel();
    };
  }, [selectedCity]);

  // Chrono Timer
  useEffect(() => {
    let interval = null;
    if (activeMission && !isSimPaused) {
      interval = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeMission, isSimPaused]);

  // =========================================================================
  // NATIVE WEB AUDIO API SIREN SYNTHESIZER (2-TONE SAMU/POMPIERS)
  // =========================================================================
  const startSirenSound = () => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioCtxClass();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      // Oscillateur + Gain (Volume)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      gain.gain.setValueAtTime(0.08, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      sirenOscRef.current = osc;
      sirenGainRef.current = gain;

      // Modulation 2-tons (435 Hz / 580 Hz)
      let toneHigh = false;
      osc.frequency.setValueAtTime(435, ctx.currentTime);

      sirenIntervalRef.current = setInterval(() => {
        if (sirenOscRef.current && audioCtxRef.current) {
          toneHigh = !toneHigh;
          const targetFreq = toneHigh ? 580 : 435;
          sirenOscRef.current.frequency.exponentialRampToValueAtTime(targetFreq, audioCtxRef.current.currentTime + 0.08);
        }
      }, 500);

      setSoundEnabled(true);
    } catch (err) {
      console.warn("Impossible de démarrer la sirène Web Audio:", err);
    }
  };

  const stopSirenSound = () => {
    if (sirenIntervalRef.current) {
      clearInterval(sirenIntervalRef.current);
      sirenIntervalRef.current = null;
    }
    if (sirenOscRef.current) {
      try {
        sirenOscRef.current.stop();
        sirenOscRef.current.disconnect();
      } catch (e) {
        // ignore
      }
      sirenOscRef.current = null;
    }
    setSoundEnabled(false);
  };

  const toggleSound = () => {
    if (soundEnabled) {
      stopSirenSound();
    } else {
      startSirenSound();
    }
  };

  // Annonce vocale synthétisée (Web Speech API)
  const speakAnnouncement = (text) => {
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "fr-FR";
        utterance.rate = 1.05;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        // ignore
      }
    }
  };

  // Arrêt du son lors du démontage ou clôture de mission
  useEffect(() => {
    return () => {
      stopSirenSound();
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // =========================================================================
  // CONTINUOUS SMOOTH SIMULATION ENGINE (INTERPOLATION ALONG POLYLINE)
  // =========================================================================
  const activeCoordinates = useMemo(() => {
    if (activeMission?.coordinates?.length) return activeMission.coordinates;
    if (customRoutePreview?.coordinates?.length) return customRoutePreview.coordinates;
    if (selectedCorridor?.coordinates?.length) return selectedCorridor.coordinates;
    return [[3.8667, 11.5167], [3.8650, 11.5080]];
  }, [activeMission, customRoutePreview, selectedCorridor]);

  // Calcul du point de la position courante du véhicule selon simProgress [0..1]
  const currentVehiclePosition = useMemo(() => {
    if (!activeMission || !activeCoordinates || activeCoordinates.length < 2) {
      return activeCoordinates[0] || [3.8667, 11.5167];
    }

    const numSegments = activeCoordinates.length - 1;
    const globalProgress = Math.min(0.999, Math.max(0, simProgress));
    const segmentIndex = Math.min(numSegments - 1, Math.floor(globalProgress * numSegments));
    const segmentProgress = (globalProgress * numSegments) - segmentIndex;

    const p1 = activeCoordinates[segmentIndex];
    const p2 = activeCoordinates[segmentIndex + 1];

    if (!p1 || !p2) return activeCoordinates[0];

    const lat = p1[0] + (p2[0] - p1[0]) * segmentProgress;
    const lng = p1[1] + (p2[1] - p1[1]) * segmentProgress;
    return [lat, lng];
  }, [activeMission, activeCoordinates, simProgress]);

  // Animation Loop avec requestAnimationFrame
  useEffect(() => {
    if (!activeMission || isSimPaused) {
      lastTimeRef.current = null;
      return;
    }

    const durationSeconds = Math.max(15, (activeMission.priorityDurationMinutes || 8) * 60 / (simSpeedMultiplier * 6));

    const stepAnimation = (now) => {
      if (!lastTimeRef.current) lastTimeRef.current = now;
      const deltaTime = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setSimProgress((prev) => {
        const next = prev + deltaTime / durationSeconds;

        // Vitesse instantanée dynamique avec fluctuation naturelle
        const [minSpd, maxSpd] = selectedVehicle.speedRange || [70, 95];
        const randomFluct = Math.sin(now / 400) * 6;
        setCurrentSpeedKmh(Math.round(minSpd + ((maxSpd - minSpd) * 0.7) + randomFluct));

        if (next >= 1) {
          // Mission terminée !
          handleFinishMission();
          return 1;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(stepAnimation);
    };

    animFrameRef.current = requestAnimationFrame(stepAnimation);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeMission, isSimPaused, simSpeedMultiplier, selectedVehicle]);

  // Synchronisation dynamique des feux au fur et à mesure de l'avancement
  useEffect(() => {
    if (!activeMission || !activeMission.intersections?.length) return;

    const totalInts = activeMission.intersections.length;
    const currentIntIndex = Math.floor(simProgress * totalInts);

    if (currentIntIndex !== activeMission.currentStepIndex && currentIntIndex < totalInts) {
      // Mettre à jour l'état local
      setActiveMission((prev) => {
        if (!prev) return null;
        const updatedInts = prev.intersections.map((it, idx) => {
          if (idx < currentIntIndex) return { ...it, state: "cleared" };
          if (idx === currentIntIndex) return { ...it, state: "green_wave" };
          return { ...it, state: "pending" };
        });
        return {
          ...prev,
          currentStepIndex: currentIntIndex,
          intersections: updatedInts,
        };
      });
    }
  }, [simProgress, activeMission?.intersections?.length]);

  // =========================================================================
  // ACTIONS DE MISSION
  // =========================================================================

  // 1. Déclencher un corridor prédéfini
  const handleDispatchPreset = async () => {
    if (!selectedCorridor) return;
    try {
      setIsLoading(true);
      const res = await apiService.dispatchEmergencyMission({
        vehicleType: selectedVehicle.id,
        city: selectedCity === "all" ? "Yaoundé" : selectedCity,
        corridorId: selectedCorridor.id,
        origin: selectedCorridor.origin,
        destination: selectedCorridor.destination,
      });

      if (res?.success && res.mission) {
        setActiveMission(res.mission);
        setSimProgress(0);
        setIsSimPaused(false);
        speakAnnouncement(`Priorité d'urgence engagée pour ${res.mission.vehicleName}. Onde verte activée.`);
        startSirenSound();
      }
    } catch (err) {
      console.error("Erreur dispatch preset:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Calculer un corridor sur-mesure (Point A -> Hôpital)
  const handleCalculateCustom = async () => {
    if (!selectedHospital) return;
    const currentCity = selectedCity === "all" ? "Yaoundé" : selectedCity;
    const originQuery = customOriginText.trim() || (customOriginCoords ? "Position GPS Actuelle" : "Poste Centrale");

    try {
      setIsCalculatingRoute(true);
      const data = await apiService.calculateCustomEmergencyCorridor({
        origin: originQuery,
        originCoords: customOriginCoords,
        destination: selectedHospital.name,
        destCoords: selectedHospital.position,
        city: currentCity,
        vehicleType: selectedVehicle.id,
      });

      if (data?.success && data.corridor) {
        setCustomRoutePreview(data.corridor);
      }
    } catch (err) {
      console.error("Erreur calcul corridor custom:", err);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  // 3. Déclencher le corridor sur-mesure calculé
  const handleDispatchCustom = async () => {
    if (!customRoutePreview || !selectedHospital) return;
    try {
      setIsLoading(true);
      const res = await apiService.dispatchEmergencyMission({
        vehicleType: selectedVehicle.id,
        city: selectedCity === "all" ? "Yaoundé" : selectedCity,
        origin: customRoutePreview.origin,
        destination: customRoutePreview.destination,
        customData: customRoutePreview,
      });

      if (res?.success && res.mission) {
        setActiveMission(res.mission);
        setSimProgress(0);
        setIsSimPaused(false);
        speakAnnouncement(`Priorité d'urgence activée vers ${selectedHospital.name}. Onde verte en cours.`);
        startSirenSound();
      }
    } catch (err) {
      console.error("Erreur dispatch custom:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Géolocaliser l'utilisateur pour le point de départ
  const handleGeolocateUser = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = [pos.coords.latitude, pos.coords.longitude];
        setCustomOriginCoords(coords);
        setCustomOriginText(`Ma position GPS (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})`);
        setIsLocatingUser(false);
      },
      (err) => {
        console.warn("GPS non accessible, utilisation du centre ville:", err.message);
        const fallback = selectedCity === "Douala" ? [4.0511, 9.7043] : [3.8667, 11.5167];
        setCustomOriginCoords(fallback);
        setCustomOriginText("Position Détectée (Centre-Ville)");
        setIsLocatingUser(false);
      },
      { timeout: 8000 }
    );
  };

  // 5. Terminer / Annuler la mission active
  const handleCancelMission = async () => {
    try {
      stopSirenSound();
      await apiService.cancelEmergencyMission();
      setActiveMission(null);
      setSimProgress(0);
      fetchEmergencyData();
    } catch (err) {
      console.error("Erreur annulation mission:", err);
    }
  };

  // 6. Fin naturelle de la mission (Destination atteinte)
  const handleFinishMission = async () => {
    stopSirenSound();
    speakAnnouncement("Véhicule de secours arrivé à destination avec succès. Feux tricolores remis au cycle régulier.");
    try {
      await apiService.stepEmergencyMission();
      setTimeout(() => {
        setActiveMission(null);
        setSimProgress(0);
        fetchEmergencyData();
      }, 2500);
    } catch (err) {
      // ignore
    }
  };

  // Formatage du chrono (mm:ss)
  const formatSeconds = (sec) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Coordonnées et informations courantes pour la carte
  const currentIntersections = activeMission?.intersections || customRoutePreview?.intersections || selectedCorridor?.intersections || [];
  const mapCenter = activeCoordinates[0] || [3.8667, 11.5167];

  // Métriques de distance et durée restante
  const totalDistanceKm = activeMission?.distanceKm || customRoutePreview?.distanceKm || selectedCorridor?.distanceKm || 5.4;
  const remainingDistanceKm = activeMission ? Math.max(0, parseFloat((totalDistanceKm * (1 - simProgress)).toFixed(1))) : totalDistanceKm;
  const remainingMinutes = activeMission ? Math.max(1, Math.round((activeMission.priorityDurationMinutes || 8) * (1 - simProgress))) : (selectedCorridor?.priorityDurationMinutes || 8);

  return (
    <main className="emergency-page">
      {/* =========================================================================
          1. BANNIÈRE FLUIDE & TÉLÉMÉTRIE D'URGENCE EN DIRECT (SI MISSION EN COURS)
          ========================================================================= */}
      {activeMission && (
        <div className="emergency-live-telemetry-banner animate-strobe-border">
          <div className="banner-top-row">
            <div className="banner-badge-group">
              <div className="siren-pulse-box">
                <Siren size={26} className="text-white animate-spin-slow" />
              </div>
              <div>
                <div className="live-priority-tag">
                  <span className="live-pulsing-dot"></span> PRIORITÉ ABSOLUE ACTIVE • ONDE VERTE ASSERVIE
                </div>
                <h2 className="banner-active-title">
                  {activeMission.vehicleName} ➔ <span>{activeMission.destination}</span>
                </h2>
                <p className="banner-origin-sub">Départ : {activeMission.origin} • Ville : {activeMission.city}</p>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="banner-quick-actions">
              <button
                className={`btn-siren-toggle ${soundEnabled ? "active" : ""}`}
                onClick={toggleSound}
                title={soundEnabled ? "Couper la sirène" : "Activer la sirène sonore 2-tons"}
              >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                <span>Sirène : {soundEnabled ? "ON" : "OFF"}</span>
              </button>

              <button
                className={`btn-pause-sim ${isSimPaused ? "paused" : ""}`}
                onClick={() => setIsSimPaused(!isSimPaused)}
                title={isSimPaused ? "Reprendre la mission" : "Mettre en pause"}
              >
                {isSimPaused ? <Play size={18} /> : <Pause size={18} />}
                <span>{isSimPaused ? "Reprendre" : "Pause"}</span>
              </button>

              <button className="btn-finish-mission-danger" onClick={handleCancelMission}>
                <StopCircle size={18} />
                <span>Clôturer la Mission</span>
              </button>
            </div>
          </div>

          {/* TELEMETRY GAUGES GRID */}
          <div className="telemetry-gauges-grid">
            <div className="telemetry-gauge-card">
              <div className="gauge-icon-box text-red-400">
                <Gauge size={20} />
              </div>
              <div className="gauge-info">
                <span className="gauge-label">Vitesse Instantanée</span>
                <span className="gauge-value">{currentSpeedKmh} <small>km/h</small></span>
              </div>
            </div>

            <div className="telemetry-gauge-card">
              <div className="gauge-icon-box text-green-400">
                <Clock size={20} />
              </div>
              <div className="gauge-info">
                <span className="gauge-label">Temps Écoulé</span>
                <span className="gauge-value">{formatSeconds(elapsedTime)}</span>
              </div>
            </div>

            <div className="telemetry-gauge-card">
              <div className="gauge-icon-box text-blue-400">
                <Navigation size={20} />
              </div>
              <div className="gauge-info">
                <span className="gauge-label">ETA Estimé Restant</span>
                <span className="gauge-value">~{remainingMinutes} <small>min</small></span>
              </div>
            </div>

            <div className="telemetry-gauge-card">
              <div className="gauge-icon-box text-yellow-400">
                <Route size={20} />
              </div>
              <div className="gauge-info">
                <span className="gauge-label">Distance Restante</span>
                <span className="gauge-value">{remainingDistanceKm} <small>km</small></span>
              </div>
            </div>

            <div className="telemetry-gauge-card speed-multiplier-card">
              <div className="gauge-icon-box text-purple-400">
                <Sliders size={20} />
              </div>
              <div className="gauge-info">
                <span className="gauge-label">Vitesse Simulation</span>
                <div className="speed-pills-row">
                  {[1, 2, 4, 8].map((mult) => (
                    <button
                      key={mult}
                      className={`speed-pill ${simSpeedMultiplier === mult ? "active" : ""}`}
                      onClick={() => setSimSpeedMultiplier(mult)}
                    >
                      {mult}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* PROGRESSION BAR */}
          <div className="mission-progress-container">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${Math.round(simProgress * 100)}%` }}></div>
            </div>
            <div className="progress-bar-labels">
              <span>{activeMission.origin}</span>
              <span className="progress-pct-badge">{Math.round(simProgress * 100)}% parcouru</span>
              <span>{activeMission.destination}</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. HEADER HERO & TACTICAL NAVIGATION TABS
          ========================================================================= */}
      <section className="emergency-hero-tactical">
        <div className="hero-flex-header">
          <div>
            <div className="hero-tag-live">
              <Siren size={15} />
              <span>Centre de Régulation & Onde Verte Prioritaire ({selectedCity})</span>
            </div>
            <h1>
              Couloirs d'Urgence <span>& Dispatch Intelligent</span>
            </h1>
            <p>
              Ouverture synchronisée des feux tricolores en cascade, routage OSRM sur-mesure vers les hôpitaux de Yaoundé et Douala, et alertes de dégagement aux automobilistes.
            </p>
          </div>

          <div className="hero-right-stats">
            <div className="stat-pill">
              <span className="stat-num">{hospitals.length}</span>
              <span className="stat-desc">Hôpitaux Connectés</span>
            </div>
            <div className="stat-pill">
              <span className="stat-num">-62%</span>
              <span className="stat-desc">Temps de Trajet</span>
            </div>
            <div className="stat-pill">
              <span className="stat-num">24/7</span>
              <span className="stat-desc">Onde Verte</span>
            </div>
          </div>
        </div>

        {/* TABS SELECTOR */}
        <div className="emergency-tabs-bar">
          <button
            className={`tab-btn ${activeTab === "corridors" ? "active" : ""}`}
            onClick={() => setActiveTab("corridors")}
          >
            <Route size={18} />
            <span>🚨 Corridors Rapides ({corridors.length})</span>
          </button>

          <button
            className={`tab-btn ${activeTab === "custom" ? "active" : ""}`}
            onClick={() => setActiveTab("custom")}
          >
            <Navigation size={18} />
            <span>🚑 Dispatch Sur-Mesure & Hôpitaux</span>
          </button>

          <button
            className={`tab-btn ${activeTab === "hotlines" ? "active" : ""}`}
            onClick={() => setActiveTab("hotlines")}
          >
            <PhoneCall size={18} />
            <span>📞 Numéros d'Urgence (119, 118, 117, 1500)</span>
          </button>

          <button
            className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <History size={18} />
            <span>📜 Journal des Missions {historyStats ? `(${historyStats.totalMissions})` : ""}</span>
          </button>
        </div>
      </section>

      {/* =========================================================================
          3. MAIN TACTICAL GRID (CONSOLE ON LEFT, INTERACTIVE MAP ON RIGHT)
          ========================================================================= */}
      <div className="emergency-main-grid">
        {/* LEFT COLUMN: INTERACTIVE DISPATCH CONSOLE */}
        <div className="emergency-console-col">
          {/* VEHICLE UNIT SELECTOR */}
          <div className="emergency-card">
            <h3 className="card-heading">
              <Zap size={18} className="heading-icon text-red-500" />
              <span>Unité d'Intervention en Service</span>
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

          {/* TAB 1: PRECONFIGURED EXPRESS CORRIDORS */}
          {activeTab === "corridors" && (
            <div className="emergency-card">
              <h3 className="card-heading">
                <Route size={18} className="heading-icon text-blue-500" />
                <span>Axes Stratégiques & Corridors Pré-Calibrés</span>
              </h3>

              <div className="corridors-list">
                {corridors.map((c) => {
                  const isSel = selectedCorridor?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      className={`corridor-card ${isSel ? "selected" : ""}`}
                      onClick={() => !activeMission && setSelectedCorridor(c)}
                    >
                      <div className="corridor-card-header">
                        <h4>{c.name}</h4>
                        <span className="time-gain-tag">-{c.timeSavedMinutes} min d'onde verte</span>
                      </div>
                      <div className="corridor-route-text">
                        <MapPin size={14} className="text-red-500" />
                        <span>{c.origin} ➔ <strong>{c.destination}</strong></span>
                      </div>
                      <div className="corridor-metrics">
                        <span>Distance : <strong>{c.distanceKm} km</strong></span>
                        <span>Nominal : <strong className="line-through text-gray-400">{c.nominalDurationMinutes} min</strong></span>
                        <span>Prioritaire : <strong className="text-green-600 font-bold">{c.priorityDurationMinutes} min</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!activeMission && (
                <button
                  className="btn-dispatch-emergency pulse-red"
                  onClick={handleDispatchPreset}
                  disabled={isLoading || !selectedCorridor}
                >
                  <Siren size={20} />
                  <span>ENCLENCHER L'ONDE VERTE IMMÉDIATE</span>
                </button>
              )}
            </div>
          )}

          {/* TAB 2: CUSTOM DISPATCH (GPS / QUARTIER -> HÔPITAL) */}
          {activeTab === "custom" && (
            <div className="emergency-card">
              <h3 className="card-heading">
                <Navigation size={18} className="heading-icon text-green-500" />
                <span>Dispatch Sur-Mesure OSRM & Télémétrie Hôpitaux</span>
              </h3>

              {/* Point de départ */}
              <div className="form-group-custom">
                <label className="input-label">Point de départ (Patrouille / Lieu d'accident) :</label>
                <div className="input-with-action">
                  <input
                    type="text"
                    className="input-custom-text"
                    placeholder="Ex: Marché Mokolo, Bastos, Ndokoti ou GPS..."
                    value={customOriginText}
                    onChange={(e) => setCustomOriginText(e.target.value)}
                  />
                  <button
                    className="btn-geoloc"
                    onClick={handleGeolocateUser}
                    disabled={isLocatingUser}
                    title="Utiliser ma position GPS"
                  >
                    <Crosshair size={16} />
                    <span>{isLocatingUser ? "GPS..." : "GPS"}</span>
                  </button>
                </div>
              </div>

              {/* Choix de l'Hôpital */}
              <div className="form-group-custom">
                <label className="input-label">Hôpital / Centre de Réanimation de Destination :</label>
                <div className="hospitals-selector-grid">
                  {hospitals.map((hosp) => {
                    const isSel = selectedHospital?.id === hosp.id;
                    return (
                      <div
                        key={hosp.id}
                        className={`hospital-select-card ${isSel ? "selected" : ""}`}
                        onClick={() => setSelectedHospital(hosp)}
                      >
                        <div className="hosp-card-header">
                          <div className="hosp-title-group">
                            <Hospital size={16} className={isSel ? "text-red-500" : "text-gray-500"} />
                            <span className="hosp-name">{hosp.name}</span>
                          </div>
                          <span className="hosp-beds-badge">{hosp.bedsAvailable} lits réa</span>
                        </div>
                        <p className="hosp-badge-text">{hosp.badge} • {hosp.district}</p>
                        <div className="hosp-occupancy-row">
                          <div className="occupancy-bar-bg">
                            <div className="occupancy-bar-fill" style={{ width: `${hosp.occupancyRate}%` }}></div>
                          </div>
                          <span className="occupancy-pct">{hosp.occupancyRate}% occ.</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bouton Calculer OSRM */}
              {!customRoutePreview && (
                <button
                  className="btn-calculate-route"
                  onClick={handleCalculateCustom}
                  disabled={isCalculatingRoute || !selectedHospital}
                >
                  <Activity size={18} />
                  <span>{isCalculatingRoute ? "Calcul OSRM en cours..." : "Calculer le Corridor & l'Onde Verte"}</span>
                </button>
              )}

              {/* Résumé du corridor calculé & Bouton Lancement */}
              {customRoutePreview && (
                <div className="custom-preview-box animate-fade-in">
                  <div className="preview-header">
                    <h4>Corridor Calculé ➔ {customRoutePreview.destination}</h4>
                    <span className="time-gain-tag">-{customRoutePreview.timeSavedMinutes} min</span>
                  </div>
                  <div className="preview-metrics-grid">
                    <div>Distance : <strong>{customRoutePreview.distanceKm} km</strong></div>
                    <div>Durée standard : <strong>{customRoutePreview.nominalDurationMinutes} min</strong></div>
                    <div>Priorité absolue : <strong className="text-green-600">{customRoutePreview.priorityDurationMinutes} min</strong></div>
                    <div>Feux asservis : <strong>{customRoutePreview.intersections?.length || 4} carrefours</strong></div>
                  </div>

                  <div className="preview-actions-row">
                    <button className="btn-recalculate" onClick={() => setCustomRoutePreview(null)}>
                      <RotateCcw size={16} />
                      <span>Modifier</span>
                    </button>
                    <button className="btn-dispatch-custom-now pulse-red" onClick={handleDispatchCustom}>
                      <Siren size={18} />
                      <span>ENGAGER LES SECOURS</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CAMEROON EMERGENCY HOTLINES */}
          {activeTab === "hotlines" && (
            <div className="emergency-card">
              <h3 className="card-heading">
                <PhoneCall size={18} className="heading-icon text-red-500" />
                <span>Numéros d'Urgence Nationaux (Cameroun)</span>
              </h3>
              <p className="hotlines-intro">
                Appel direct gratuit 24h/24 et 7j/7 depuis tout téléphone mobile ou fixe sur le territoire camerounais.
              </p>

              <div className="hotlines-list">
                {CAMEROON_HOTLINES.map((hl) => (
                  <div
                    key={hl.number}
                    className="hotline-card"
                    style={{ backgroundColor: hl.bg, borderColor: hl.border }}
                  >
                    <div className="hotline-main-info">
                      <div className="hotline-number-box" style={{ backgroundColor: hl.color }}>
                        <span>{hl.number}</span>
                      </div>
                      <div>
                        <h4 className="hotline-name">{hl.name}</h4>
                        <p className="hotline-service">{hl.service}</p>
                        <p className="hotline-desc">{hl.desc}</p>
                      </div>
                    </div>

                    <a href={`tel:${hl.number}`} className="btn-call-hotline" style={{ backgroundColor: hl.color }}>
                      <PhoneCall size={16} />
                      <span>Appeler le {hl.number}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MISSIONS HISTORY & IMPACT */}
          {activeTab === "history" && (
            <div className="emergency-card">
              <h3 className="card-heading">
                <History size={18} className="heading-icon text-purple-500" />
                <span>Journal des Interventions & Bilan d'Impact</span>
              </h3>

              {historyStats && (
                <div className="history-stats-grid">
                  <div className="stat-card">
                    <span className="stat-val">{historyStats.totalMissions}</span>
                    <span className="stat-lbl">Missions Menées</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-val text-green-600">+{historyStats.totalMinutesSaved} min</span>
                    <span className="stat-lbl">Temps Total Économisé</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-val">{historyStats.totalKmCovered} km</span>
                    <span className="stat-lbl">Distance Prioritaire</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-val text-blue-600">~{historyStats.avgTimeSavedMinutes} min</span>
                    <span className="stat-lbl">Gain Moyen / Mission</span>
                  </div>
                </div>
              )}

              <div className="history-missions-list">
                {missionHistory.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">Aucune mission archivée pour le moment.</p>
                ) : (
                  missionHistory.slice(0, 8).map((m, idx) => (
                    <div key={m.id || idx} className="history-item">
                      <div className="history-item-top">
                        <span className="history-veh-badge" style={{ backgroundColor: m.color || "#ef4444" }}>
                          {m.vehicleName || "Ambulance"}
                        </span>
                        <span className="history-time-tag">-{m.timeSavedMinutes || 16} min économisées</span>
                      </div>
                      <div className="history-route-row">
                        <span>{m.origin} ➔ <strong>{m.destination}</strong></span>
                      </div>
                      <div className="history-footer-row">
                        <span>Ville : {m.city || "Yaoundé"}</span>
                        <span>Distance : {m.distanceKm || 5.4} km</span>
                        <span>{m.startedAt ? new Date(m.startedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "Terminé"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TIMELINE OF TRAFFIC LIGHTS (DYNAMIC FOR ACTIVE MISSION) */}
          {activeMission && (
            <div className="emergency-card">
              <div className="card-header-flex">
                <h3 className="card-heading">
                  <Activity size={18} className="heading-icon text-green-500" />
                  <span>Feux Tricolores Asservis en Direct</span>
                </h3>
                <span className="live-pill animate-pulse">ONDE VERTE SYNCHRONISÉE</span>
              </div>

              <div className="intersections-timeline">
                {activeMission.intersections.map((int, idx) => {
                  const isCleared = int.state === "cleared";
                  const isGreenWave = int.state === "green_wave";
                  return (
                    <div key={int.id || idx} className={`timeline-step ${int.state}`}>
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
                          {isCleared && <span className="text-gray-400">Carrefour franchi (Cycle nominal rétabli)</span>}
                          {isGreenWave && <span className="text-green-600 font-bold">FEU VERT PRIORITAIRE OUVERT 🟢 (Transversale au ROUGE 🔴)</span>}
                          {!isCleared && !isGreenWave && <span className="text-yellow-600">En approche • Synchronisation en attente</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* BROADCAST ALERT PREVIEW */}
              <div className="broadcast-box">
                <div className="broadcast-header">
                  <Radio size={16} className="text-red-500 animate-pulse" />
                  <span>Alerte Automobilistes (Rayon 3 km diffusé)</span>
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

        {/* RIGHT COLUMN: REAL-TIME TACTICAL LEAFLET MAP */}
        <div className="emergency-map-col">
          <div className="emergency-map-card">
            <div className="map-card-header">
              <div className="map-title-box">
                <MapPin size={18} className="text-red-500" />
                <span>
                  Vue Tactique Satellite & Corridors • {selectedCity}
                  {activeMission && <span className="live-camera-tag"> • Caméra Suivi Active</span>}
                </span>
              </div>

              <div className="map-controls-row">
                <button
                  className={`btn-camera-lock ${cameraFollow ? "active" : ""}`}
                  onClick={() => setCameraFollow(!cameraFollow)}
                  title="Activer / Désactiver le centrage automatique sur le véhicule"
                >
                  <Compass size={14} />
                  <span>Suivi Caméra : {cameraFollow ? "ON" : "OFF"}</span>
                </button>

                <div className="map-legend-items">
                  <span className="legend-item"><span className="legend-dot green"></span> Onde Verte</span>
                  <span className="legend-item"><span className="legend-dot red"></span> Transversale Rouge</span>
                  <span className="legend-item"><span className="legend-dot vehicle"></span> Véhicule</span>
                </div>
              </div>
            </div>

            <div className="leaflet-emergency-wrapper">
              <MapContainer
                center={mapCenter}
                zoom={13.5}
                scrollWheelZoom={true}
                className="emergency-leaflet-container"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png"
                />

                <MapController
                  coords={activeCoordinates}
                  vehiclePos={currentVehiclePosition}
                  cameraFollow={cameraFollow}
                  selectedCorridor={selectedCorridor}
                />

                {/* Tracé Polyline de l'Itinéraire */}
                <Polyline
                  positions={activeCoordinates}
                  pathOptions={{
                    color: activeMission ? "#22c55e" : "#ef4444",
                    weight: activeMission ? 7 : 5,
                    dashArray: activeMission ? undefined : "8, 8",
                    opacity: 0.95,
                  }}
                />

                {/* Marqueurs des Hôpitaux */}
                {hospitals.map((hosp) => (
                  <Marker
                    key={hosp.id}
                    position={hosp.position}
                    icon={createHospitalDivIcon(selectedHospital?.id === hosp.id || activeMission?.destination?.includes(hosp.name))}
                  >
                    <Popup>
                      <div className="popup-emergency">
                        <strong>🏥 {hosp.name}</strong>
                        <p>{hosp.badge}</p>
                        <p className="text-xs text-gray-500">{hosp.district}</p>
                        <div className="hosp-popup-badge">
                          <span>🟢 {hosp.bedsAvailable} lits réa libres ({hosp.occupancyRate}% occupé)</span>
                        </div>
                        <a href={`tel:${hosp.phone}`} className="hosp-call-link">
                          📞 {hosp.phone}
                        </a>
                      </div>
                    </Popup>
                    <Tooltip direction="top" offset={[0, -15]} opacity={0.9}>
                      {hosp.name} ({hosp.bedsAvailable} lits)
                    </Tooltip>
                  </Marker>
                ))}

                {/* Marqueur Animé du Véhicule de Secours */}
                {activeMission && (
                  <Marker
                    position={currentVehiclePosition}
                    icon={createVehicleDivIcon(selectedVehicle.color, activeMission.vehicleName)}
                  >
                    <Popup>
                      <div className="popup-emergency">
                        <strong>🚨 {activeMission.vehicleName}</strong>
                        <p>Vitesse : <strong>{currentSpeedKmh} km/h</strong></p>
                        <p>Progression : <strong>{Math.round(simProgress * 100)}%</strong></p>
                        <p>ETA : <strong>~{remainingMinutes} min</strong> ({remainingDistanceKm} km)</p>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Marqueurs des Carrefours / Feux Tricolores */}
                {currentIntersections.map((int, idx) => {
                  const isGreenWave = int.state === "green_wave";
                  const isCleared = int.state === "cleared";
                  return (
                    <CircleMarker
                      key={int.id || idx}
                      center={int.position}
                      radius={isGreenWave ? 12 : 8}
                      pathOptions={{
                        fillColor: isCleared ? "#64748b" : isGreenWave ? "#22c55e" : "#f59e0b",
                        fillOpacity: 0.95,
                        color: "#ffffff",
                        weight: isGreenWave ? 3 : 2,
                      }}
                    >
                      <Popup>
                        <div className="popup-emergency">
                          <strong>🚦 {int.name}</strong>
                          <p>
                            Statut : {isGreenWave ? "🟢 Onde Verte Active (Feu Vert Prioritaire)" : isCleared ? "✅ Franchi (Cycle nominal)" : "⏳ En attente"}
                          </p>
                          <p className="text-xs text-red-500">Voies transversales : ROUGE FORCÉ 🔴</p>
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
