import { YAOUNDE_NODES, DOUALA_NODES, INCIDENT_ALERTS, CITIES } from "../data/cityData";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchTrafficNodes(city = "Yaoundé") {
  try {
    const res = await fetch(`${API_BASE_URL}/traffic/nodes?city=${encodeURIComponent(city)}`);
    if (!res.ok) throw new Error("Erreur de récupération du trafic");
    return await res.json();
  } catch (err) {
    console.warn("Backend API non joignable, fallback local activé:", err.message);
    const defaultData = city.toLowerCase().includes("douala") ? DOUALA_NODES : YAOUNDE_NODES;
    return { city, nodes: defaultData };
  }
}

export async function fetchPredictions(city = "Yaoundé") {
  try {
    const res = await fetch(`${API_BASE_URL}/traffic/predictions?city=${encodeURIComponent(city)}`);
    if (!res.ok) throw new Error("Erreur de récupération des prédictions");
    return await res.json();
  } catch (err) {
    console.warn("Backend API non joignable, fallback local activé:", err.message);
    return null;
  }
}

export async function fetchAlerts(city = "Yaoundé") {
  try {
    const res = await fetch(`${API_BASE_URL}/alerts?city=${encodeURIComponent(city)}`);
    if (!res.ok) throw new Error("Erreur de récupération des alertes");
    return await res.json();
  } catch (err) {
    console.warn("Backend API non joignable, fallback local activé:", err.message);
    return null;
  }
}

export async function calculateRoute(origin, destination, options = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}/routes/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination, ...options }),
    });
    if (!res.ok) throw new Error("Erreur de calcul d'itinéraire");
    return await res.json();
  } catch (err) {
    console.warn("Backend API non joignable, fallback local activé:", err.message);
    return null;
  }
}

// Authentification OTP WhatsApp, SMS & E-mail
export async function sendOtp({ identifier, phone, email, channel = "whatsapp", name, role, city, vehicleType }) {
  const res = await fetch(`${API_BASE_URL}/auth/send-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: identifier || phone || email, phone, email, channel, name, role, city, vehicleType }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Impossible d'envoyer le code.");
  return data;
}

export async function verifyOtp({ identifier, phone, email, code, channel, name, role, city, vehicleType }) {
  const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: identifier || phone || email, phone, email, code, channel, name, role, city, vehicleType }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Code de vérification invalide.");
  return data;
}

export async function resendOtp({ identifier, phone, email, channel }) {
  const res = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: identifier || phone || email, phone, email, channel }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Impossible de renvoyer le code.");
  return data;
}

export async function resetOtpPassword({ identifier, phone, email, newPassword }) {
  const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: identifier || phone || email, phone, email, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Impossible de réinitialiser le mot de passe.");
  return data;
}

// Authentification API classique
export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Échec de connexion.");
  return data;
}

export async function registerUser({ name, email, password, city, role, vehicleType }) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, city, role, vehicleType }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Échec d'inscription.");
  return data;
}

export async function updateUserProfile(profileData) {
  const res = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profileData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Échec de mise à jour du profil.");
  return data;
}

class CityFlowApiService {
  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async fetchWithFallback(endpoint, fallbackData) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return await response.json();
    } catch (error) {
      console.info(`[CityFlow API Offline/Fallback] using local data for ${endpoint}:`, error.message);
      return fallbackData;
    }
  }

  async getTrafficNodes(city = "Yaoundé") {
    const defaultData = city.toLowerCase().includes("douala") ? DOUALA_NODES : YAOUNDE_NODES;
    return this.fetchWithFallback(`/traffic/nodes?city=${encodeURIComponent(city)}`, {
      city,
      nodes: defaultData,
    });
  }

  async getPredictions(city = "Yaoundé") {
    const nodes = city.toLowerCase().includes("douala") ? DOUALA_NODES : YAOUNDE_NODES;
    const fallback = {
      city,
      summary: {
        now: 68,
        in15m: 74,
        in30m: 86,
        in60m: 61,
      },
      nodesPredictions: nodes.map((n) => ({
        id: n.id,
        name: n.name,
        current: n.congestionValue,
        predictions: n.predictions,
      })),
    };

    return this.fetchWithFallback(`/traffic/predictions?city=${encodeURIComponent(city)}`, fallback);
  }

  async getAiForecast({ city = "Yaoundé", weather = "dry", hour = new Date().getHours() }) {
    const fallback = {
      city,
      aiModel: "CityFlow-NeuralTraffic v2.4 (Mode Local)",
      weather: { label: "Temps sec / Ensoleillé", icon: "☀️", congestionMultiplier: 1.0 },
      globalForecast: [
        { horizon: "+15 min", congestionPercentage: 42, status: "Fluide" },
        { horizon: "+30 min", congestionPercentage: 58, status: "Modéré" },
        { horizon: "+1 heure", congestionPercentage: 78, status: "Critique" },
        { horizon: "+2 heures", congestionPercentage: 65, status: "Modéré" },
        { horizon: "+3 heures", congestionPercentage: 35, status: "Fluide" },
      ],
      recommendations: [
        {
          title: "Optimisation de départ",
          message: "L'IA conseille d'anticiper vos trajets de 20 minutes pour éviter le pic de circulation.",
          priority: "medium",
          badge: "RECOMMANDATION IA",
        },
      ],
      anomalies: [
        {
          nodeName: "Carrefour Nlongkak",
          type: "SURVEILLANCE_PREDICTIVE",
          severity: "medium",
          description: "Sensibilité élevée aux heures de pointe. Flux sous contrôle IA.",
          recommendedAction: "Voies d'évitement calculées automatiquement.",
        },
      ],
    };

    return this.fetchWithFallback(
      `/ai/forecast?city=${encodeURIComponent(city)}&weather=${encodeURIComponent(weather)}&hour=${encodeURIComponent(hour)}`,
      fallback
    );
  }

  async getAiAnomalies(city = "Yaoundé") {
    return this.fetchWithFallback(`/ai/anomalies?city=${encodeURIComponent(city)}`, {
      city,
      anomaliesCount: 1,
      anomalies: [
        {
          nodeName: "Axe Principal",
          type: "CONTRÔLE_FLUX",
          severity: "low",
          description: "Analyse en direct : aucune perturbation majeure détectée.",
        },
      ],
    });
  }

  async getAlerts(city = "all") {
    const alerts = city === "all" ? INCIDENT_ALERTS : INCIDENT_ALERTS.filter((a) => a.city.toLowerCase() === city.toLowerCase());
    return this.fetchWithFallback(`/alerts?city=${encodeURIComponent(city)}`, {
      alerts,
    });
  }

  async calculateRoute({ origin, destination, strategy = "fastest" }) {
    const fallback = {
      origin,
      destination,
      strategy,
      routes: [
        {
          id: "route_fastest",
          type: "fastest",
          title: "Itinéraire le plus rapide (Recommandé)",
          durationMinutes: 22,
          distanceKm: 6.8,
          delaySavedMinutes: 14,
          co2SavedKg: 0.8,
          congestionIndex: 35,
          color: "#00875A",
          steps: [
            "Départ depuis votre position actuelle",
            "Prendre la direction Boulevard du 20 Mai (1,2 km)",
            "Tourner à droite vers Axe Bastos / Ambassades (3,4 km)",
            "Arrivée à destination dans 22 min",
          ],
        },
        {
          id: "route_shortest",
          type: "shortest",
          title: "Itinéraire le plus court",
          durationMinutes: 36,
          distanceKm: 5.1,
          delaySavedMinutes: 0,
          co2SavedKg: 0.2,
          congestionIndex: 78,
          color: "#F59E0B",
          steps: [
            "Départ",
            "Traverser le Carrefour Nlongkak (Ralentissement sévère)",
            "Arrivée au Centre-ville",
          ],
        },
      ],
    };

    try {
      const response = await fetch(`${this.baseUrl}/routes/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, destination, strategy }),
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      return await response.json();
    } catch (error) {
      console.info("[CityFlow API Fallback] using local calculation:", error.message);
      return fallback;
    }
  }

  // === NOUVELLE API CARTOGRAPHIQUE DÉDIÉE (/api/map) ===
  async getMapConfig(city = "Yaoundé", theme = "light") {
    return this.fetchWithFallback(`/map/config?city=${encodeURIComponent(city)}&theme=${encodeURIComponent(theme)}`, {
      engine: "CityFlow Map API",
      providers: [
        { id: "cartoDark", name: "CARTO Dark Matter", url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" },
        { id: "osmStandard", name: "OpenStreetMap", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" },
      ],
    });
  }

  async searchMapPlaces(query, city = "Yaoundé") {
    try {
      const res = await fetch(`${this.baseUrl}/map/search?q=${encodeURIComponent(query)}&city=${encodeURIComponent(city)}`);
      if (!res.ok) throw new Error("Erreur de recherche cartographique");
      return await res.json();
    } catch (err) {
      console.warn("[Map API Search Error]", err.message);
      return { city, query, count: 0, results: [] };
    }
  }

  async reverseGeocode(lat, lon, city = "Yaoundé") {
    try {
      const res = await fetch(`${this.baseUrl}/map/reverse?lat=${lat}&lon=${lon}&city=${encodeURIComponent(city)}`);
      if (!res.ok) throw new Error("Erreur de géocodage inverse");
      return await res.json();
    } catch (err) {
      console.warn("[Map API Reverse Error]", err.message);
      return { lat, lng: lon, displayName: `Position [${lat}, ${lon}]`, district: city };
    }
  }

  async getMapLandmarks(city = "Yaoundé", category = "all") {
    return this.fetchWithFallback(`/map/landmarks?city=${encodeURIComponent(city)}&category=${encodeURIComponent(category)}`, {
      city,
      count: 0,
      landmarks: [],
    });
  }

  async getMapLayers() {
    return this.fetchWithFallback(`/map/layers`, {
      layers: [
        { id: "traffic_realtime", name: "Trafic en Direct", defaultVisible: true },
        { id: "incidents_alerts", name: "Signalements Citoyens", defaultVisible: true },
      ],
    });
  }

  // === API MODE URGENCE & ONDE VERTE DYNAMIQUE ===
  async getEmergencyStatus(city = "Yaoundé") {
    return this.fetchWithFallback(`/emergency/active?city=${encodeURIComponent(city)}`, {
      active: false,
      mission: null,
      corridorsAvailable: [],
      hospitals: [],
    });
  }

  async getEmergencyHospitals(city = "Yaoundé") {
    return this.fetchWithFallback(`/emergency/hospitals?city=${encodeURIComponent(city)}`, {
      city,
      count: 0,
      hospitals: [],
    });
  }

  async calculateCustomEmergencyCorridor(params) {
    try {
      const res = await fetch(`${this.baseUrl}/emergency/calculate-custom`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error("Erreur calcul corridor d'urgence");
      return await res.json();
    } catch (err) {
      console.warn("[Emergency API Calculate Error]", err.message);
      return null;
    }
  }

  async dispatchEmergencyMission(data) {
    try {
      const res = await fetch(`${this.baseUrl}/emergency/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erreur dispatch mission urgence");
      return await res.json();
    } catch (err) {
      console.warn("[Emergency API Dispatch Error]", err.message);
      return null;
    }
  }

  async stepEmergencyMission() {
    try {
      const res = await fetch(`${this.baseUrl}/emergency/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Erreur avancement mission");
      return await res.json();
    } catch (err) {
      console.warn("[Emergency API Step Error]", err.message);
      return null;
    }
  }

  async cancelEmergencyMission() {
    try {
      const res = await fetch(`${this.baseUrl}/emergency/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Erreur annulation mission");
      return await res.json();
    } catch (err) {
      console.warn("[Emergency API Cancel Error]", err.message);
      return null;
    }
  }

  async getEmergencyMissionHistory() {
    return this.fetchWithFallback(`/emergency/history`, {
      count: 0,
      stats: { totalMissions: 0, totalMinutesSaved: 0, totalKmCovered: 0, avgTimeSavedMinutes: 15 },
      missions: [],
    });
  }

  async interveneOnReport(reportId, vehicleType = "ambulance", city = "Yaoundé") {
    try {
      const res = await fetch(`${this.baseUrl}/emergency/intervene-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, vehicleType, city }),
      });
      if (!res.ok) throw new Error("Erreur intervention urgence sur signalement");
      return await res.json();
    } catch (err) {
      console.warn("[Emergency API Intervene Error]", err.message);
      return null;
    }
  }

  login(email, password) {
    return loginUser(email, password);
  }

  register(data) {
    return registerUser(data);
  }

  updateProfile(data) {
    return updateUserProfile(data);
  }
}

export const apiService = new CityFlowApiService();
export default apiService;
