import { YAOUNDE_NODES, DOUALA_NODES, INCIDENT_ALERTS, CITIES } from "../data/cityData";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

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
      // Fallback gracieux sur les données locales
      console.info(`[CityFlow API Offline/Fallback] using local data for ${endpoint}:`, error.message);
      return fallbackData;
    }
  }

  // Récupérer les nœuds de trafic par ville
  async getTrafficNodes(city = "Yaoundé") {
    const defaultData = city.toLowerCase().includes("douala") ? DOUALA_NODES : YAOUNDE_NODES;
    return this.fetchWithFallback(`/traffic/nodes?city=${encodeURIComponent(city)}`, {
      city,
      nodes: defaultData,
    });
  }

  // Récupérer les prédictions IA globales ou par nœud
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

  // Prévisions IA multi-horizons avec météo et simulation
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

  // Détection d'anomalies en temps réel par l'IA
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

  // Récupérer le flux des alertes
  async getAlerts(city = "all") {
    const alerts = city === "all" ? INCIDENT_ALERTS : INCIDENT_ALERTS.filter((a) => a.city.toLowerCase() === city.toLowerCase());
    return this.fetchWithFallback(`/alerts?city=${encodeURIComponent(city)}`, {
      alerts,
    });
  }

  // Calcul d'itinéraire intelligent
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
}

export const apiService = new CityFlowApiService();
export default apiService;
