import { YAOUNDE_NODES, DOUALA_NODES } from "../data/cityData.js";

// Facteurs météo réels et impact sur l'adhérence / vitesse
export const WEATHER_CONDITIONS = {
  dry: {
    label: "Temps sec / Ensoleillé",
    speedFactor: 1.0,
    congestionMultiplier: 1.0,
    icon: "☀️",
    rainMm: 0,
    description: "Conditions optimales de circulation et d'adhérence routière.",
  },
  light_rain: {
    label: "Pluie fine / Bruine",
    speedFactor: 0.82,
    congestionMultiplier: 1.25,
    icon: "🌦️",
    rainMm: 5,
    description: "Chaussée glissante, visibilité légèrement réduite, freinage anticipé.",
  },
  heavy_rain: {
    label: "Orage tropical violent",
    speedFactor: 0.55,
    congestionMultiplier: 1.75,
    icon: "🌧️",
    rainMm: 40,
    description: "Visibilité critique, flaques profondes, risque d'aquaplaning et ralentissements sévères.",
  },
  flood: {
    label: "Inondation / Chaussée submergée",
    speedFactor: 0.32,
    congestionMultiplier: 2.35,
    icon: "🌊",
    rainMm: 85,
    description: "Axes bas inondés, caniveaux débordés, franchissement au pas ou déviations obligatoires.",
  },
};

// Facteurs d'événements urbains réels (Réalité camerounaise : Deuils, Marchés, Heures de pointe, Écoles)
export const LOCAL_EVENTS = {
  funeral_cortege: {
    id: "funeral_cortege",
    label: "Deuil & Levée de corps",
    shortLabel: "Deuil / Cortège",
    icon: "⚰️",
    baseCongestionBoost: 32,
    speedFactor: 0.68,
    typicalDays: [4, 5, 6], // Jeudi soir, Vendredi, Samedi
    description: "Sorties de morgue, cortèges funèbres et bâches de veillée réduisant la largeur des voies de quartier et de sortie de ville.",
    targetedNodes: ["yde_nlongkak", "yde_mvan", "yde_mvolye", "yde_biyem_assi", "dla_laquintinie", "dla_ndokoti", "dla_bonaberi", "dla_deido"],
  },
  school_office_rush: {
    id: "school_office_rush",
    label: "Heure de pointe (Écoles & Bureaux)",
    shortLabel: "Heure de pointe",
    icon: "🎒",
    baseCongestionBoost: 38,
    speedFactor: 0.52,
    typicalDays: [1, 2, 3, 4, 5], // Lundi au Vendredi
    description: "Saturation dense liée aux rentrées/sorties de classes et déplacements professionnels vers les centres administratifs.",
    targetedNodes: ["yde_poste_centrale", "yde_nlongkak", "yde_bastos", "yde_warda", "dla_bonanjo", "dla_rond_point_deido", "dla_ndokoti", "dla_bonamoussadi"],
  },
  market_day: {
    id: "market_day",
    label: "Grand Marché Populaire (Mokolo / Mboppi)",
    shortLabel: "Grand Marché",
    icon: "🛒",
    baseCongestionBoost: 42,
    speedFactor: 0.58,
    typicalDays: [3, 5, 6], // Mercredi, Vendredi, Samedi
    description: "Forte affluence marchande, déchargement de camions de vivres frais, pousseurs et concentration de motos-taxis sur la chaussée.",
    targetedNodes: ["yde_mokolo", "yde_marche_central", "yde_madagascar", "dla_mboppi", "dla_marche_central", "dla_sandaga"],
  },
  stadium_match: {
    id: "stadium_match",
    label: "Match de Football / Grand Événement",
    shortLabel: "Match au Stade",
    icon: "⚽",
    baseCongestionBoost: 40,
    speedFactor: 0.50,
    typicalDays: [0, 3, 6], // Dimanche, Mercredi, Samedi
    description: "Engorgement massif des voies d'accès et d'évacuation des grands stades urbains (Olembé, Ahmadou Ahidjo, Japoma).",
    targetedNodes: ["yde_omnisports", "yde_olembé", "dla_japoma", "dla_bonamoussadi"],
  },
  road_works: {
    id: "road_works",
    label: "Travaux d'assainissement / Bitumage",
    shortLabel: "Travaux voirie",
    icon: "🚧",
    baseCongestionBoost: 30,
    speedFactor: 0.60,
    typicalDays: [1, 2, 3, 4, 5, 6],
    description: "Réfection de la couche de roulement, curage de buses ou déviations temporaires créant un goulot d'étranglement.",
    targetedNodes: ["yde_nlongkak", "yde_nsam", "dla_ndokoti", "dla_bonaberi"],
  },
  presidential_escort: {
    id: "presidential_escort",
    label: "Cortège Officiel & Escorte Prioritaire",
    shortLabel: "Cortège Officiel",
    icon: "🚨",
    baseCongestionBoost: 48,
    speedFactor: 0.35,
    typicalDays: [1, 2, 3, 4, 5],
    description: "Blocage momentané des grands boulevards pour le passage de convois sécurisés et d'autorités.",
    targetedNodes: ["yde_poste_centrale", "yde_bastos", "yde_warda", "dla_bonanjo"],
  },
};

// Courbe d'affluence horaire théorique africaine (24h)
const getHourlyBaseFactor = (hour) => {
  if (hour >= 6.5 && hour < 8.75) return 1.70; // Grande pointe matinale (06h30 - 08h45)
  if (hour >= 8.75 && hour < 11.5) return 1.05; // Matinée d'activité fluide/régulière
  if (hour >= 11.5 && hour < 13.75) return 1.35; // Pause méridienne et sorties scolaires
  if (hour >= 13.75 && hour < 16.25) return 1.15; // Après-midi commerciale
  if (hour >= 16.25 && hour < 19.75) return 1.85; // Grande pointe vespérale de sortie des bureaux (16h15 - 19h45)
  if (hour >= 19.75 && hour < 22.0) return 1.15; // Soirée vie nocturne et marchés de nuit
  if (hour >= 22.0 || hour < 6.0) return 0.35; // Nuit calme
  return 0.85;
};

// Coefficient selon le jour de la semaine (0 = Dimanche, 5 = Vendredi, 6 = Samedi)
const getDayOfWeekFactor = (dayIndex) => {
  switch (dayIndex) {
    case 5: // Vendredi : Pic de sorties de ville, veillées et levées de corps
      return 1.30;
    case 6: // Samedi : Grands marchés, enterrements et cérémonies
      return 1.22;
    case 1: // Lundi : Rentrée de semaine énergique
      return 1.18;
    case 0: // Dimanche : Calme général sauf sorties d'églises (10h-13h)
      return 0.72;
    default: // Mardi, Mercredi, Jeudi
      return 1.0;
  }
};

export class AiTrafficEngine {
  /**
   * Calcul complet des prévisions multi-critères (Météo, Événements réels, Heures de pointe, Horizons temporels)
   */
  static calculateForecast({
    city = "Yaoundé",
    weather = "dry",
    targetHour = new Date().getHours(),
    dayOfWeek = new Date().getDay(),
    activeEvents = [],
    selectedNodeId = null,
  }) {
    const isDouala = city.toLowerCase().includes("douala");
    const baseNodes = isDouala ? DOUALA_NODES : YAOUNDE_NODES;
    const weatherConfig = WEATHER_CONDITIONS[weather] || WEATHER_CONDITIONS.dry;
    const dayFactor = getDayOfWeekFactor(dayOfWeek);

    // Résolution des événements actifs
    const resolvedEvents = (Array.isArray(activeEvents) ? activeEvents : [activeEvents])
      .map((evKey) => LOCAL_EVENTS[evKey])
      .filter(Boolean);

    // Si aucun événement n'est fourni explicitement, détection automatique selon l'heure et le jour réel
    const effectiveEvents = resolvedEvents.length > 0 ? resolvedEvents : this.autoDetectContextualEvents(targetHour, dayOfWeek);

    const horizons = [
      { offsetMinutes: 15, label: "+15 min", hourOffset: 0.25 },
      { offsetMinutes: 30, label: "+30 min", hourOffset: 0.5 },
      { offsetMinutes: 60, label: "+1 heure", hourOffset: 1.0 },
      { offsetMinutes: 120, label: "+2 heures", hourOffset: 2.0 },
      { offsetMinutes: 180, label: "+3 heures", hourOffset: 3.0 },
      { offsetMinutes: 360, label: "+6 heures", hourOffset: 6.0 },
    ];

    // Calcul node par node avec impact localisé des événements et de la météo
    const nodeForecasts = baseNodes.map((node) => {
      // Vérifier si ce carrefour est ciblé par un événement actif
      const matchingEvents = effectiveEvents.filter(
        (ev) => !ev.targetedNodes || ev.targetedNodes.includes(node.id) || ev.targetedNodes.some((tn) => node.id.includes(tn))
      );

      const eventCongestionAddition = matchingEvents.reduce((sum, ev) => sum + ev.baseCongestionBoost, 0);
      const eventSpeedMultiplier = matchingEvents.reduce((prod, ev) => prod * ev.speedFactor, 1.0);

      const isNodeJammed = node.currentCongestion === "jammed" || node.congestionValue > 80;
      const sensitivity = isNodeJammed ? 1.25 : 1.0;

      const horizonPredictions = horizons.map((h) => {
        const futureHour = (targetHour + h.hourOffset) % 24;
        const futureHourFactor = getHourlyBaseFactor(futureHour);

        // Formule IA multicritères
        let projectedCongestion = Math.round(
          (node.congestionValue * 0.55 + eventCongestionAddition * 0.6) *
            futureHourFactor *
            dayFactor *
            weatherConfig.congestionMultiplier *
            sensitivity
        );
        projectedCongestion = Math.min(99, Math.max(12, projectedCongestion));

        let projectedSpeed = Math.round(
          node.averageSpeedKmh *
            (1 / Math.max(0.6, futureHourFactor * 0.75)) *
            weatherConfig.speedFactor *
            eventSpeedMultiplier
        );
        projectedSpeed = Math.min(55, Math.max(4, projectedSpeed));

        let projectedDelay = Math.round(
          (projectedCongestion / 100) * 32 * weatherConfig.congestionMultiplier + (matchingEvents.length > 0 ? 8 : 0)
        );

        // Score de confiance de l'IA (diminue avec l'horizon et les perturbations météo/événements)
        const confidenceScore = Math.round(
          Math.max(68, 96 - h.offsetMinutes * 0.05 - (weather !== "dry" ? 6 : 0) - (matchingEvents.length > 0 ? 4 : 0))
        );

        return {
          horizon: h.label,
          offsetMinutes: h.offsetMinutes,
          congestionPercentage: projectedCongestion,
          predictedSpeedKmh: projectedSpeed,
          estimatedDelayMinutes: projectedDelay,
          confidenceScore,
        };
      });

      // Diagnostic textuel IA pour ce carrefour
      const primaryReason = this.diagnoseNodeFactors(node, weatherConfig, matchingEvents, targetHour);

      return {
        id: node.id,
        name: node.name,
        currentCongestion: node.currentCongestion,
        currentSpeed: node.averageSpeedKmh,
        congestionValue: node.congestionValue,
        predictions: horizonPredictions,
        activeEvents: matchingEvents.map((e) => ({ id: e.id, label: e.shortLabel, icon: e.icon })),
        diagnosticReason: primaryReason,
      };
    });

    // Synthèse globale de la ville
    const globalCongestions = horizons.map((h, index) => {
      const avg = Math.round(
        nodeForecasts.reduce((acc, n) => acc + n.predictions[index].congestionPercentage, 0) / nodeForecasts.length
      );
      return {
        horizon: h.label,
        offsetMinutes: h.offsetMinutes,
        congestionPercentage: avg,
        status: avg >= 75 ? "Critique (Bouchonné)" : avg >= 45 ? "Dense (Ralentissement)" : "Fluide (Optimal)",
      };
    });

    const recommendations = this.generateRecommendations(globalCongestions, weather, city, effectiveEvents, targetHour);
    const anomalies = this.detectAnomalies(baseNodes, weather, effectiveEvents);
    const optimalDeparture = this.computeOptimalDepartureWindow(globalCongestions, targetHour);

    return {
      city: isDouala ? "Douala" : "Yaoundé",
      timestamp: new Date().toISOString(),
      weather: weatherConfig,
      dayOfWeek: dayOfWeek,
      dayLabel: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"][dayOfWeek] || "Aujourd'hui",
      simulatedHour: targetHour,
      activeEvents: effectiveEvents.map((e) => ({
        id: e.id,
        label: e.label,
        shortLabel: e.shortLabel,
        icon: e.icon,
        description: e.description,
      })),
      aiModel: "CityFlow-NeuralPredict v3.0 (Cameroun Urban Engine)",
      globalForecast: globalCongestions,
      optimalDepartureWindow: optimalDeparture,
      nodeForecasts,
      recommendations,
      anomalies,
    };
  }

  /**
   * Détection automatique d'événements contextuels selon l'heure et le jour si aucun n'est forcé manuellement
   */
  static autoDetectContextualEvents(hour, dayOfWeek) {
    const events = [];

    // 1. Pointe scolaire et administrative (Lundi au Vendredi)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      if ((hour >= 7 && hour <= 9) || (hour >= 16.5 && hour <= 19.5)) {
        events.push(LOCAL_EVENTS.school_office_rush);
      }
    }

    // 2. Deuils & Levées de corps (Jeudi soir, Vendredi après-midi, Samedi matin)
    if (
      (dayOfWeek === 4 && hour >= 17) ||
      (dayOfWeek === 5 && hour >= 11 && hour <= 20) ||
      (dayOfWeek === 6 && hour >= 7 && hour <= 14)
    ) {
      events.push(LOCAL_EVENTS.funeral_cortege);
    }

    // 3. Jours de grand marché (Mercredi, Vendredi, Samedi en journée)
    if ((dayOfWeek === 3 || dayOfWeek === 5 || dayOfWeek === 6) && hour >= 9 && hour <= 16) {
      events.push(LOCAL_EVENTS.market_day);
    }

    return events;
  }

  /**
   * Génère un diagnostic IA précis et contextuel pour chaque carrefour
   */
  static diagnoseNodeFactors(node, weatherConfig, matchingEvents, hour) {
    const factors = [];

    if (matchingEvents.length > 0) {
      factors.push(`${matchingEvents[0].icon} ${matchingEvents[0].shortLabel}`);
    }

    if (weatherConfig.rainMm > 0) {
      factors.push(`${weatherConfig.icon} ${weatherConfig.label}`);
    }

    if ((hour >= 7 && hour <= 9) || (hour >= 16.5 && hour <= 19.5)) {
      factors.push("Heure de pointe");
    }

    if (factors.length === 0) {
      return "Flux régulier nominal conforme aux moyennes saisonnières.";
    }

    return `Facteurs d'influence IA : ${factors.join(" + ")}.`;
  }

  /**
   * Calcule le créneau de départ le plus rapide selon la projection de l'IA
   */
  static computeOptimalDepartureWindow(globalCongestions, currentHour) {
    let bestHorizon = globalCongestions[0];
    for (const h of globalCongestions) {
      if (h.congestionPercentage < bestHorizon.congestionPercentage) {
        bestHorizon = h;
      }
    }

    const isPeakNow = globalCongestions[0].congestionPercentage > 65;
    const timeSavedMin = isPeakNow ? Math.round((globalCongestions[0].congestionPercentage - bestHorizon.congestionPercentage) * 0.45) : 0;

    return {
      bestHorizonLabel: bestHorizon.horizon,
      bestCongestion: bestHorizon.congestionPercentage,
      timeSavedMinutes: Math.max(0, timeSavedMin),
      advice: isPeakNow
        ? `Départ recommandé dans ${bestHorizon.horizon} pour économiser jusqu'à ~${Math.max(10, timeSavedMin)} min de bouchons.`
        : "Conditions de départ optimales dès maintenant.",
    };
  }

  /**
   * Détection d'anomalies et d'incidents suspects non déclarés
   */
  static detectAnomalies(nodes, weather, activeEvents) {
    const anomalies = [];
    const hasHeavyWeather = weather === "heavy_rain" || weather === "flood";

    nodes.forEach((node) => {
      // Ralentissement anormal hors météo sévère
      if (node.averageSpeedKmh < 11 && !hasHeavyWeather) {
        anomalies.push({
          nodeId: node.id,
          nodeName: node.name,
          type: "RALENTISSEMENT_SUSPECT",
          severity: "high",
          description: `Vitesse critique (${node.averageSpeedKmh} km/h) détectée à ${node.name}. Risque élevé d'incident, de véhicule en panne ou de cortège non planifié.`,
          detectedAt: new Date().toISOString(),
          recommendedAction: "Évitement conseillé par les voies de délestage secondaires.",
        });
      }
    });

    if (hasHeavyWeather) {
      anomalies.push({
        nodeId: "weather_anomaly",
        nodeName: "Axes à risque d'inondation",
        type: "ALERTE_METEO_HYDRO",
        severity: "critical",
        description: "Montée rapide des eaux sur la chaussée. Risque de calage moteur et ralentissements en chaîne.",
        detectedAt: new Date().toISOString(),
        recommendedAction: "Ralentir l'allure, maintenir une distance de sécurité de 25m et éviter les points bas.",
      });
    }

    if (anomalies.length === 0 && nodes.length > 0) {
      anomalies.push({
        nodeId: nodes[0].id,
        nodeName: nodes[0].name,
        type: "SURVEILLANCE_PREDICTIVE",
        severity: "low",
        description: "Modèles d'apprentissage nominaux. Aucun bouchon critique imprévu.",
        detectedAt: new Date().toISOString(),
        recommendedAction: "Circulation stable sur le réseau principal.",
      });
    }

    return anomalies;
  }

  /**
   * Générateur de recommandations proactives ultra-précises
   */
  static generateRecommendations(forecast, weather, city, activeEvents, targetHour) {
    const peakIn1h = forecast.find((f) => f.horizon === "+1 heure")?.congestionPercentage || 50;
    const recommendations = [];

    // Recommandation Météo
    if (weather === "heavy_rain" || weather === "flood") {
      recommendations.push({
        title: "Alerte Météo Tropicale & Inondations",
        message: `Fort risque d'aquaplaning et d'inondation de chaussée à ${city}. L'IA préconise +25 min de marge sur tous vos déplacements.`,
        priority: "high",
        badge: "MÉTÉO & SÉCURITÉ",
      });
    }

    // Recommandation Événements (Deuil / Marché)
    const funeralEvent = activeEvents.find((e) => e.id === "funeral_cortege");
    if (funeralEvent) {
      recommendations.push({
        title: "Impact Cortèges Funèbres & Sorties de Ville",
        message: `Présence de cortèges de deuil et de veillées en cours. Ralentissements accentués aux abords des morgues et sorties d'agglomération.`,
        priority: "high",
        badge: "DEUIL & CORTÈGE",
      });
    }

    const marketEvent = activeEvents.find((e) => e.id === "market_day");
    if (marketEvent) {
      recommendations.push({
        title: "Affluence Dense autour des Grands Marchés",
        message: `Forte affluence marchande (Mokolo / Mboppi). Privilégiez les voies de contournement pour éviter les pousseurs et camions en déchargement.`,
        priority: "medium",
        badge: "MARCHÉ & COMMERCE",
      });
    }

    // Recommandation Heure de pointe / Anticipation
    if (peakIn1h >= 70) {
      recommendations.push({
        title: "Pic de trafic imminent d'ici 1h",
        message: `L'IA prévoit une saturation à ${peakIn1h}% dans 60 minutes. Anticipez votre départ maintenant pour gagner jusqu'à 20 minutes.`,
        priority: "medium",
        badge: "OPTIMISATION TEMPORELLE",
      });
    } else {
      recommendations.push({
        title: "Créneau de circulation optimal",
        message: `Conditions fluides et favorables sur la majorité des axes de ${city}.`,
        priority: "low",
        badge: "FLUX FAVORABLE",
      });
    }

    return recommendations;
  }
}

