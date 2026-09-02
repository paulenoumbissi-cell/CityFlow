import { YAOUNDE_NODES, DOUALA_NODES } from "../data/cityData.js";

// Facteurs météo
export const WEATHER_CONDITIONS = {
  dry: { label: "Temps sec / Ensoleillé", speedFactor: 1.0, congestionMultiplier: 1.0, icon: "☀️" },
  light_rain: { label: "Pluie légère / Bruine", speedFactor: 0.85, congestionMultiplier: 1.25, icon: "🌦️" },
  heavy_rain: { label: "Pluie tropicale forte", speedFactor: 0.65, congestionMultiplier: 1.60, icon: "🌧️" },
  flood: { label: "Chaussée inondée", speedFactor: 0.40, congestionMultiplier: 2.10, icon: "🌊" },
};

// Courbe d'affluence horaire théorique (24h)
const getHourlyBaseFactor = (hour) => {
  if (hour >= 7 && hour < 9.5) return 1.65; // Pointe matinale
  if (hour >= 12 && hour < 14) return 1.30; // Pause midi
  if (hour >= 16.5 && hour < 19.5) return 1.80; // Pointe du soir
  if (hour >= 20 && hour < 22) return 1.05; // Soirée modérée
  if (hour >= 22 || hour < 6) return 0.40; // Nuit calme
  return 0.85; // Heures creuses
};

export class AiTrafficEngine {
  /**
   * Calcul des prévisions multi-horizons (+15m, +30m, +1h, +2h, +3h)
   */
  static calculateForecast({ city = "Yaoundé", weather = "dry", targetHour = new Date().getHours() }) {
    const isDouala = city.toLowerCase().includes("douala");
    const baseNodes = isDouala ? DOUALA_NODES : YAOUNDE_NODES;
    const weatherConfig = WEATHER_CONDITIONS[weather] || WEATHER_CONDITIONS.dry;
    const hourFactor = getHourlyBaseFactor(targetHour);

    const horizons = [
      { offsetMinutes: 15, label: "+15 min", hourOffset: 0.25 },
      { offsetMinutes: 30, label: "+30 min", hourOffset: 0.5 },
      { offsetMinutes: 60, label: "+1 heure", hourOffset: 1.0 },
      { offsetMinutes: 120, label: "+2 heures", hourOffset: 2.0 },
      { offsetMinutes: 180, label: "+3 heures", hourOffset: 3.0 },
    ];

    // Calcul pour chaque carrefour
    const nodeForecasts = baseNodes.map((node) => {
      const sensitivity = node.currentCongestion === "jammed" || node.currentCongestion === "heavy" ? 1.3 : 1.0;
      
      const horizonPredictions = horizons.map((h) => {
        const futureHour = (targetHour + h.hourOffset) % 24;
        const futureHourFactor = getHourlyBaseFactor(futureHour);
        
        // Formule de prédiction IA
        let projectedCongestion = Math.round(
          node.congestionValue * futureHourFactor * weatherConfig.congestionMultiplier * sensitivity * 0.75
        );
        projectedCongestion = Math.min(100, Math.max(10, projectedCongestion));

        let projectedSpeed = Math.round(
          node.averageSpeedKmh * (1 / (futureHourFactor * 0.8)) * weatherConfig.speedFactor
        );
        projectedSpeed = Math.min(55, Math.max(5, projectedSpeed));

        let projectedDelay = Math.round(
          (projectedCongestion / 100) * 35 * weatherConfig.congestionMultiplier
        );

        return {
          horizon: h.label,
          offsetMinutes: h.offsetMinutes,
          congestionPercentage: projectedCongestion,
          predictedSpeedKmh: projectedSpeed,
          estimatedDelayMinutes: projectedDelay,
          confidenceScore: Math.round(94 - h.offsetMinutes * 0.08), // La confiance diminue légèrement avec l'horizon
        };
      });

      return {
        id: node.id,
        name: node.name,
        currentCongestion: node.currentCongestion,
        currentSpeed: node.averageSpeedKmh,
        predictions: horizonPredictions,
      };
    });

    // Synthèse globale de la ville
    const globalCongestions = horizons.map((h, index) => {
      const avg = Math.round(
        nodeForecasts.reduce((acc, n) => acc + n.predictions[index].congestionPercentage, 0) / nodeForecasts.length
      );
      return {
        horizon: h.label,
        congestionPercentage: avg,
        status: avg > 70 ? "Critique" : avg > 40 ? "Modéré" : "Fluide",
      };
    });

    const recommendations = this.generateRecommendations(globalCongestions, weather, city);
    const anomalies = this.detectAnomalies(baseNodes, weather);

    return {
      city: isDouala ? "Douala" : "Yaoundé",
      timestamp: new Date().toISOString(),
      weather: weatherConfig,
      aiModel: "CityFlow-NeuralTraffic v2.4",
      globalForecast: globalCongestions,
      nodeForecasts,
      recommendations,
      anomalies,
    };
  }

  /**
   * Détection d'anomalies et d'incidents suspects non déclarés
   */
  static detectAnomalies(nodes, weather) {
    const anomalies = [];
    nodes.forEach((node) => {
      // Si la vitesse est anormalement basse par rapport au flux moyen
      if (node.averageSpeedKmh < 10 && weather === "dry") {
        anomalies.push({
          nodeId: node.id,
          nodeName: node.name,
          type: "RALENTISSEMENT_ANORMAL",
          severity: "high",
          description: `Vitesse critique (${node.averageSpeedKmh} km/h) détectée à ${node.name} en conditions sèches. Forte probabilité d'incident ou d'obstacle non déclaré.`,
          detectedAt: new Date().toISOString(),
          recommendedAction: "Évitement conseillé par les voies secondaires.",
        });
      }
    });

    if (anomalies.length === 0 && nodes.length > 0) {
      anomalies.push({
        nodeId: nodes[0].id,
        nodeName: nodes[0].name,
        type: "SURVEILLANCE_PREDICTIVE",
        severity: "low",
        description: "Flux conformes aux modèles nominaux. Aucun bouchon anormal détecté.",
        detectedAt: new Date().toISOString(),
        recommendedAction: "Circulation fluide sur les axes majeurs.",
      });
    }

    return anomalies;
  }

  /**
   * Générateur de recommandations personnalisées
   */
  static generateRecommendations(forecast, weather, city) {
    const peakIn1h = forecast.find((f) => f.horizon === "+1 heure")?.congestionPercentage || 50;
    const recommendations = [];

    if (weather === "heavy_rain" || weather === "flood") {
      recommendations.push({
        title: "Alerte Météo Tropicale",
        message: `Fort risque d'aquaplaning et ralentissements majeurs à ${city}. Anticipez +20 min de marge sur tous vos trajets.`,
        priority: "high",
        badge: "MÉTÉO IA",
      });
    }

    if (peakIn1h > 65) {
      recommendations.push({
        title: "Pic de trafic imminent dans 1h",
        message: "L'IA anticipe une saturation des grands carrefours d'ici 60 minutes. Départ conseillé dans les 20 prochaines minutes.",
        priority: "medium",
        badge: "OPTIMISATION TEMPORELLE",
      });
    } else {
      recommendations.push({
        title: "Fenêtre de circulation optimale",
        message: "Les conditions de trafic sont actuellement favorables pour vos déplacements urbains.",
        priority: "low",
        badge: "FLUX FAVORABLE",
      });
    }

    return recommendations;
  }
}
