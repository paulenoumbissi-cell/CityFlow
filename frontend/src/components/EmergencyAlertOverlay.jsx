import React, { useState, useEffect, useRef } from "react";
import {
  Siren,
  Volume2,
  VolumeX,
  X,
  MapPin,
  ShieldAlert,
  Radio,
  ArrowRight,
  Eye,
  Activity,
  AlertTriangle,
  Play,
  RotateCcw,
} from "lucide-react";
import wsService from "../services/websocketService";
import { useCity } from "../context/CityContext";
import "./EmergencyAlertOverlay.css";

const API_BASE = "http://localhost:3000/api";

export default function EmergencyAlertOverlay({ currentRouteCoords, onFocusVehicle }) {
  const { selectedCity } = useCity();
  const [activeAlert, setActiveAlert] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [approachingDistanceMeters, setApproachingDistanceMeters] = useState(380);
  const [isDemoActive, setIsDemoActive] = useState(false);

  const audioCtxRef = useRef(null);
  const alertIntervalRef = useRef(null);
  const speechDoneRef = useRef(false);

  // Play audio warning chime using Web Audio API
  const playAlertChime = () => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
        audioCtxRef.current = new AudioCtxClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(587.33, ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.38);
    } catch (e) {
      // ignore
    }
  };

  // Annonce vocale synthétisée
  const speakVoiceAlert = (text) => {
    if (!soundEnabled || speechDoneRef.current) return;
    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "fr-FR";
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
        speechDoneRef.current = true;
      } catch (e) {
        // ignore
      }
    }
  };

  // Vérifier s'il y a une mission d'urgence active sur le backend
  const checkActiveEmergency = async () => {
    try {
      const cityQuery = selectedCity && selectedCity !== "all" ? `?city=${encodeURIComponent(selectedCity)}` : "";
      const res = await fetch(`${API_BASE}/emergency/active${cityQuery}`);
      if (res.ok) {
        const data = await res.json();
        if (data.active && data.mission) {
          setActiveAlert({
            vehicleName: data.mission.vehicleName || "Ambulance SAMU 119",
            destination: data.mission.destination || "Hôpital Central",
            origin: data.mission.origin || "Poste Centrale",
            currentIntersection: data.mission.intersections?.[data.mission.currentStepIndex]?.name || "Carrefour Principal",
            color: data.mission.color || "#ef4444",
            message: "Véhicule de secours prioritaire en approche. Dégagez l'axe central.",
            advisedAction: "Serrez à droite et libérez le carrefour immédiatement",
          });
          setIsDismissed(false);
        } else if (!isDemoActive) {
          setActiveAlert(null);
        }
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    checkActiveEmergency();

    // Écoute WebSockets temps réel
    const unsubUpdate = wsService.on("EMERGENCY_MISSION_UPDATE", (data) => {
      if (data?.mission) {
        setActiveAlert({
          vehicleName: data.mission.vehicleName || "Ambulance SAMU 119",
          destination: data.mission.destination || "Urgences",
          origin: data.mission.origin || "Centre-Ville",
          currentIntersection: data.mission.intersections?.[data.mission.currentStepIndex]?.name || "Carrefour Asservi",
          color: data.mission.color || "#ef4444",
          message: data.mission.broadcastAlert?.message || "Véhicule d'urgence en approche.",
          advisedAction: data.mission.broadcastAlert?.advisedAction || "Serrez immédiatement à droite.",
        });
        setIsDismissed(false);
        playAlertChime();
        speakVoiceAlert("Attention conducteur, véhicule d'urgence en approche. Serrez à droite.");
      }
    });

    const unsubCancel = wsService.on("EMERGENCY_MISSION_CANCELLED", () => {
      if (!isDemoActive) {
        setActiveAlert(null);
        speechDoneRef.current = false;
      }
    });

    return () => {
      unsubUpdate();
      unsubCancel();
    };
  }, [selectedCity, isDemoActive, soundEnabled]);

  // Simulation dynamique de la distance qui diminue
  useEffect(() => {
    if (activeAlert) {
      alertIntervalRef.current = setInterval(() => {
        setApproachingDistanceMeters((prev) => {
          if (prev <= 60) return 450; // loop
          return prev - 25;
        });
      }, 1200);
    }
    return () => clearInterval(alertIntervalRef.current);
  }, [activeAlert]);

  // Déclencher une simulation de test d'alerte automobiliste
  const handleTriggerDemoAlert = () => {
    setIsDemoActive(true);
    setIsDismissed(false);
    speechDoneRef.current = false;
    setApproachingDistanceMeters(320);

    setActiveAlert({
      vehicleName: "Ambulance SAMU 119 (Urgence Vitale)",
      destination: selectedCity === "Douala" ? "Hôpital Laquintinie" : "Hôpital Central de Yaoundé",
      origin: selectedCity === "Douala" ? "Rond-point Deido" : "Carrefour Bastos",
      currentIntersection: selectedCity === "Douala" ? "Boulevard de la Liberté" : "Rond-point Warda / Mfoundi",
      color: "#ef4444",
      message: "Ambulance en approche rapide sur votre axe. Onde verte engagée.",
      advisedAction: "Serrez à droite et maintenez le carrefour dégagé",
    });

    playAlertChime();
    speakVoiceAlert("Attention conducteur, ambulance en approche à 300 mètres, serrez immédiatement à droite.");
  };

  const handleCloseDemo = () => {
    setIsDemoActive(false);
    setActiveAlert(null);
    speechDoneRef.current = false;
  };

  if (!activeAlert && !isDemoActive) {
    return (
      <div className="emergency-alert-trigger-wrapper">
        <button
          className="btn-trigger-emergency-demo"
          onClick={handleTriggerDemoAlert}
          title="Tester l'alerte d'urgence automobiliste (Pop-up + Son)"
        >
          <Siren size={16} className="text-red-500 animate-spin-slow" />
          <span>Simuler Alerte "Ambulance en approche"</span>
        </button>
      </div>
    );
  }

  if (isDismissed) {
    return (
      <div className="emergency-alert-trigger-wrapper">
        <button className="btn-reopen-emergency-alert" onClick={() => setIsDismissed(false)}>
          <Siren size={18} className="text-red-500 animate-bounce" />
          <span>🚨 Alerte Urgence Active (~{approachingDistanceMeters}m)</span>
        </button>
      </div>
    );
  }

  const estimatedTimeSec = Math.max(5, Math.round(approachingDistanceMeters / 15));

  return (
    <div className="emergency-motorist-alert-container animate-slide-down">
      {/* GLOWING STROBE BEACON HEADER */}
      <div className="alert-strobe-strip"></div>

      <div className="alert-main-content">
        {/* LEFT ICON WITH PULSING RING */}
        <div className="alert-siren-beacon-box">
          <div className="siren-beacon-pulse"></div>
          <Siren size={28} className="text-white animate-spin-slow" />
        </div>

        {/* CENTER INFO & INSTRUCTIONS */}
        <div className="alert-info-text-col">
          <div className="alert-badge-row">
            <span className="badge-danger-flashing">🚨 VÉHICULE D'URGENCE EN APPROCHE</span>
            <span className="badge-distance-live">
              📍 À {approachingDistanceMeters} mètres (~{estimatedTimeSec}s)
            </span>
          </div>

          <h3 className="alert-vehicle-title">{activeAlert.vehicleName}</h3>

          <div className="alert-consigne-box">
            <AlertTriangle size={18} className="consigne-icon text-yellow-300" />
            <span className="consigne-text">
              <strong>CONSIGNE AUTOMOBILISTE :</strong> {activeAlert.advisedAction.toUpperCase()} !
            </span>
          </div>

          <div className="alert-corridor-subtext">
            <span>
              Couloir : {activeAlert.origin} ➔ <strong>{activeAlert.destination}</strong>
            </span>
            <span className="separator">•</span>
            <span className="text-green-300">
              Feu vert forcé au : <strong>{activeAlert.currentIntersection}</strong>
            </span>
          </div>
        </div>

        {/* RIGHT ACTIONS */}
        <div className="alert-actions-col">
          <button
            className={`btn-alert-sound ${soundEnabled ? "active" : ""}`}
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Couper le son" : "Activer le son"}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? "Son ON" : "Muet"}</span>
          </button>

          {onFocusVehicle && (
            <button className="btn-alert-locate" onClick={onFocusVehicle}>
              <Eye size={16} />
              <span>Voir sur carte</span>
            </button>
          )}

          {isDemoActive ? (
            <button className="btn-alert-dismiss" onClick={handleCloseDemo} title="Arrêter la simulation">
              <X size={16} />
              <span>Arrêter démo</span>
            </button>
          ) : (
            <button className="btn-alert-dismiss" onClick={() => setIsDismissed(true)} title="Masquer temporairement">
              <X size={16} />
              <span>Réduire</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
