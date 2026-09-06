import { YAOUNDE_NODES, DOUALA_NODES } from "../data/cityData.js";
import { fetchLiveWeatherData, getForecastForHour, parseWmoCode } from "./weatherService.js";

// Facteurs météo et coefficients d'adhérence
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

// Facteurs d'événements urbains réels (Réalité camerounaise : Campus CRADAT, Deuils, Marchés, Travaux, Barrages)
export const LOCAL_EVENTS = {
  university_cradat_rush: {
    id: "university_cradat_rush",
    label: "Sortie d'Amphithéâtres & Affluence Campus CRADAT",
    shortLabel: "Sortie Campus CRADAT",
    icon: "🎓",
    baseCongestionBoost: 46,
    speedFactor: 0.42,
    typicalDays: [1, 2, 3, 4, 5], // Lundi au Vendredi
    description: "Sortie massive des étudiants de l'Université Yaoundé I & ESSTIC, traversées piétonnes denses, stationnement de taxis et gargotes saturant le Carrefour CRADAT et l'axe Ngoa-Ekellé.",
    targetedNodes: ["yde_cradat", "yde_ngoa_ekelle", "yde_warda", "yde_biyem_assi"],
  },
  funeral_cortege: {
    id: "funeral_cortege",
    label: "Deuil & Levée de corps",
    shortLabel: "Deuil / Cortège",
    icon: "⚰️",
    baseCongestionBoost: 35,
    speedFactor: 0.65,
    typicalDays: [4, 5, 6], // Jeudi soir, Vendredi, Samedi
    description: "Sorties de morgue (Hôpital Général, Laquintinie), cortèges funèbres et bâches réduisant la largeur des voies de quartier.",
    targetedNodes: ["yde_nlongkak", "yde_mvan", "yde_mvolye", "yde_biyem_assi", "dla_laquintinie", "dla_ndokoti", "dla_bonaberi", "dla_deido"],
  },
  school_office_rush: {
    id: "school_office_rush",
    label: "Heure de pointe (Écoles & Bureaux)",
    shortLabel: "Heure de pointe",
    icon: "🎒",
    baseCongestionBoost: 40,
    speedFactor: 0.50,
    typicalDays: [1, 2, 3, 4, 5],
    description: "Saturation dense liée aux rentrées/sorties des classes et déplacements professionnels vers les centres administratifs.",
    targetedNodes: ["yde_poste_centrale", "yde_nlongkak", "yde_bastos", "yde_warda", "yde_cradat", "dla_bonanjo", "dla_deido", "dla_ndokoti", "dla_bonamoussadi"],
  },
  market_day: {
    id: "market_day",
    label: "Grand Marché Populaire (Mokolo / Mboppi)",
    shortLabel: "Grand Marché",
    icon: "🛒",
    baseCongestionBoost: 45,
    speedFactor: 0.52,
    typicalDays: [3, 5, 6], // Mercredi, Vendredi, Samedi
    description: "Forte affluence marchande, déchargement de camions de vivres frais, pousseurs et concentration de motos-taxis sur la chaussée.",
    targetedNodes: ["yde_mokolo", "yde_marche_central", "yde_madagascar", "dla_mboppi", "dla_marche_central", "dla_sandaga"],
  },
  police_checkpoint_roadblock: {
    id: "police_checkpoint_roadblock",
    label: "Contrôle & Barrage de Circulation",
    shortLabel: "Contrôle Routier",
    icon: "🛑",
    baseCongestionBoost: 42,
    speedFactor: 0.38,
    typicalDays: [1, 2, 3, 4, 5, 6],
    description: "Contrôles de sécurité ou barrage temporaire créant une file d'attente importante et un rétrécissement d'axe.",
    targetedNodes: ["yde_cradat", "yde_poste_centrale", "yde_mvan", "yde_nlongkak", "dla_bonaberi", "dla_ndokoti"],
  },
  flash_flood_vulnerable: {
    id: "flash_flood_vulnerable",
    label: "Risque d'Inondation & Débordement de Caniveaux",
    shortLabel: "Bas-fonds Inondables",
    icon: "🌊",
    baseCongestionBoost: 55,
    speedFactor: 0.28,
    typicalDays: [0, 1, 2, 3, 4, 5, 6],
    description: "Chaussée submersible au bas CRADAT, Carrefour Nlongkak, Rond-point Deido et Ndokoti lors de fortes averses.",
    targetedNodes: ["yde_nlongkak", "yde_cradat", "dla_deido", "dla_ndokoti"],
  },
  stadium_match: {
    id: "stadium_match",
    label: "Match de Football / Grand Événement",
    shortLabel: "Match au Stade",
    icon: "⚽",
    baseCongestionBoost: 40,
    speedFactor: 0.50,
    typicalDays: [0, 3, 6],
    description: "Engorgement massif des voies d'accès et d'évacuation des grands stades urbains (Olembé, Ahmadou Ahidjo, Japoma).",
    targetedNodes: ["yde_omnisports", "yde_olembé", "dla_japoma", "dla_bonamoussadi"],
  },
  road_works: {
    id: "road_works",
    label: "Travaux d'assainissement / Bitumage",
    shortLabel: "Travaux voirie",
    icon: "🚧",
    baseCongestionBoost: 32,
    speedFactor: 0.58,
    typicalDays: [1, 2, 3, 4, 5, 6],
    description: "Réfection de la couche de roulement, curage de buses ou déviations temporaires créant un goulot d'étranglement.",
    targetedNodes: ["yde_nlongkak", "yde_nsam", "yde_cradat", "dla_ndokoti", "dla_bonaberi"],
  },
  presidential_escort: {
    id: "presidential_escort",
    label: "Cortège Officiel & Escorte Prioritaire",
    shortLabel: "Cortège Officiel",
    icon: "🚨",
    baseCongestionBoost: 50,
    speedFactor: 0.30,
    typicalDays: [1, 2, 3, 4, 5],
    description: "Blocage momentané des grands boulevards pour le passage de convois sécurisés et d'autorités.",
    targetedNodes: ["yde_poste_centrale", "yde_bastos", "yde_warda", "dla_bonanjo"],
  },
};

// Courbe d'affluence horaire (24h)
const getHourlyBaseFactor = (hour) => {
  if (hour >= 6.5 && hour < 8.75) return 1.70; // Pointe matinale (06h30 - 08h45)
  if (hour >= 8.75 && hour < 11.5) return 1.05; // Matinée
  if (hour >= 11.5 && hour < 13.75) return 1.35; // Midi & sorties scolaires
  if (hour >= 13.75 && hour < 16.25) return 1.15; // Après-midi
  if (hour >= 16.25 && hour < 19.75) return 1.90; // Pointe vespérale de sortie des bureaux & cours (16h15 - 19h45)
  if (hour >= 19.75 && hour < 22.0) return 1.15; // Soirée
  if (hour >= 22.0 || hour < 6.0) return 0.35; // Nuit
  return 0.85;
};

// Coefficient selon le jour de la semaine
const getDayOfWeekFactor = (dayIndex) => {
  switch (dayIndex) {
    case 5: // Vendredi : Sorties de ville, veillées et levées de corps
      return 1.32;
    case 6: // Samedi : Grands marchés et cérémonies
      return 1.25;
    case 1: // Lundi : Rentrée de semaine
      return 1.20;
    case 0: // Dimanche : Calme
      return 0.72;
    default:
      return 1.0;
  }
};

export class AiTrafficEngine {
  /**
   * Calcul complet des prévisions multi-critères avec météo en direct automatique
   */
  static async calculateForecast({
    city = "Yaoundé",
    weather = null,
    targetHour = new Date().getHours(),
    dayOfWeek = new Date().getDay(),
    activeEvents = [],
    liveNodes = null,
  }) {
    const isDouala = city.toLowerCase().includes("douala");
    const fallbackNodes = isDouala ? DOUALA_NODES : YAOUNDE_NODES;
    const baseNodes = Array.isArray(liveNodes) && liveNodes.length > 0 ? liveNodes : fallbackNodes;

    // Récupération de la météo automatique en direct si non spécifiée manuellement
    let weatherConfig;
    let liveWeatherInfo = null;

    if (!weather || weather === "auto" || weather === "live") {
      try {
        const hourWeather = await getForecastForHour(city, targetHour);
        weatherConfig = {
          label: hourWeather.label,
          speedFactor: hourWeather.speedFactor,
          congestionMultiplier: hourWeather.congestionMultiplier,
          icon: hourWeather.icon,
          rainMm: hourWeather.rainMm,
          description: hourWeather.description,
          conditionKey: hourWeather.conditionKey,
        };
        liveWeatherInfo = hourWeather;
      } catch (e) {
        weatherConfig = WEATHER_CONDITIONS.dry;
      }
    } else {
      weatherConfig = WEATHER_CONDITIONS[weather] || WEATHER_CONDITIONS.dry;
    }

    const dayFactor = getDayOfWeekFactor(dayOfWeek);

    // Moyenne de congestion actuelle sur les nœuds
    const currentCongestionAvg = Math.round(
      baseNodes.reduce((acc, n) => acc + (n.congestionValue || (n.currentCongestion === "jammed" ? 85 : n.currentCongestion === "heavy" ? 75 : n.currentCongestion === "moderate" ? 50 : 25)), 0) / (baseNodes.length || 1)
    );

    // Résolution des événements actifs
    const resolvedEvents = (Array.isArray(activeEvents) ? activeEvents : [activeEvents])
      .map((evKey) => LOCAL_EVENTS[evKey])
      .filter(Boolean);

    // Détection automatique contextuelle
    const effectiveEvents = resolvedEvents.length > 0
      ? resolvedEvents
      : this.autoDetectContextualEvents(targetHour, dayOfWeek, weatherConfig);

    const horizons = [
      { offsetMinutes: 15, label: "+15 min", hourOffset: 0.25 },
      { offsetMinutes: 30, label: "+30 min", hourOffset: 0.5 },
      { offsetMinutes: 60, label: "+1 heure", hourOffset: 1.0 },
      { offsetMinutes: 120, label: "+2 heures", hourOffset: 2.0 },
      { offsetMinutes: 180, label: "+3 heures", hourOffset: 3.0 },
      { offsetMinutes: 360, label: "+6 heures", hourOffset: 6.0 },
    ];

    // Calcul nœud par nœud
    const nodeForecasts = baseNodes.map((node) => {
      const matchingEvents = effectiveEvents.filter(
        (ev) => !ev.targetedNodes || ev.targetedNodes.includes(node.id) || ev.targetedNodes.some((tn) => node.id.includes(tn))
      );

      const eventCongestionAddition = matchingEvents.reduce((sum, ev) => sum + ev.baseCongestionBoost, 0);
      const eventSpeedMultiplier = matchingEvents.reduce((prod, ev) => prod * ev.speedFactor, 1.0);

      const currentCong = node.congestionValue || (node.currentCongestion === "jammed" ? 88 : node.currentCongestion === "heavy" ? 75 : node.currentCongestion === "moderate" ? 50 : 25);
      const isNodeJammed = currentCong >= 75;
      const sensitivity = isNodeJammed ? 1.15 : 1.0;

      const horizonPredictions = horizons.map((h) => {
        const futureHour = (targetHour + h.hourOffset) % 24;
        const futureHourFactor = getHourlyBaseFactor(futureHour);

        // Cible théorique à l'heure future (météo + pointe + événements)
        const targetCongestion = Math.round(
          (48 * (futureHourFactor / 1.1) + eventCongestionAddition * 0.7) *
            dayFactor *
            weatherConfig.congestionMultiplier *
            sensitivity
        );

        // Transition continue réaliste : forte inertie à +15m, évolution progressive vers la cible
        const inertiaWeight = Math.exp(-h.hourOffset / 1.3);
        let projectedCongestion = Math.round(currentCong * inertiaWeight + targetCongestion * (1 - inertiaWeight));
        projectedCongestion = Math.min(96, Math.max(12, projectedCongestion));

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

        const totalMinutes = Math.round(targetHour * 60 + h.offsetMinutes) % 1440;
        const clockHour = Math.floor(totalMinutes / 60);
        const clockMin = (totalMinutes % 60).toString().padStart(2, "0");
        const timeFormatted = `${clockHour}h${clockMin}`;

        const confidenceScore = Math.round(
          Math.max(70, 97 - h.offsetMinutes * 0.05 - (weatherConfig.rainMm > 0 ? 5 : 0) - (matchingEvents.length > 0 ? 3 : 0))
        );

        return {
          time: timeFormatted,
          horizon: h.label,
          offsetMinutes: h.offsetMinutes,
          congestionPercentage: projectedCongestion,
          predictedSpeedKmh: projectedSpeed,
          estimatedDelayMinutes: projectedDelay,
          confidenceScore,
        };
      });

      const primaryReason = this.diagnoseNodeFactors(node, weatherConfig, matchingEvents, targetHour);

      return {
        id: node.id,
        name: node.name,
        currentCongestion: node.currentCongestion,
        currentSpeed: node.averageSpeedKmh,
        congestionValue: node.congestionValue,
        estimatedDelayMinutes: node.estimatedDelayMinutes,
        vehicleCountPerHour: node.vehicleCountPerHour,
        predictions: horizonPredictions,
        activeEvents: matchingEvents.map((e) => ({ id: e.id, label: e.shortLabel, icon: e.icon })),
        diagnosticReason: primaryReason,
      };
    });

    const globalCongestions = horizons.map((h, index) => {
      const avg = Math.round(
        nodeForecasts.reduce((acc, n) => acc + n.predictions[index].congestionPercentage, 0) / nodeForecasts.length
      );
      const totalMinutes = Math.round(targetHour * 60 + h.offsetMinutes) % 1440;
      const clockHour = Math.floor(totalMinutes / 60);
      const clockMin = (totalMinutes % 60).toString().padStart(2, "0");
      const timeFormatted = `${clockHour}h${clockMin}`;

      return {
        time: timeFormatted,
        horizon: h.label,
        offsetMinutes: h.offsetMinutes,
        congestionPercentage: avg,
        status: avg >= 75 ? "Critique (Bouchonné)" : avg >= 40 ? "Modéré (Ralentissement)" : "Fluide (Optimal)",
      };
    });

    const recommendations = this.generateRecommendations(globalCongestions, weatherConfig, city, effectiveEvents, targetHour);
    const anomalies = this.detectAnomalies(baseNodes, weatherConfig, effectiveEvents);
    const optimalDeparture = this.computeOptimalDepartureWindow(globalCongestions, targetHour);

    return {
      city: isDouala ? "Douala" : "Yaoundé",
      timestamp: new Date().toISOString(),
      currentCongestion: currentCongestionAvg,
      weather: weatherConfig,
      liveWeatherInfo,
      dayOfWeek,
      dayLabel: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"][dayOfWeek] || "Aujourd'hui",
      simulatedHour: targetHour,
      activeEvents: effectiveEvents.map((e) => ({
        id: e.id,
        label: e.label,
        shortLabel: e.shortLabel,
        icon: e.icon,
        description: e.description,
      })),
      aiModel: "CityFlow-NeuralPredict v3.5 (Automated Live Multi-API Engine)",
      globalForecast: globalCongestions,
      optimalDepartureWindow: optimalDeparture,
      nodeForecasts,
      recommendations,
      anomalies,
    };
  }

  /**
   * Diagnostic prédictif complet pour un trajet futur (Ex: Aller au CRADAT à 17h)
   */
  static async predictTripAndHazards({
    city = "Yaoundé",
    origin = "Poste Centrale",
    destination = "Carrefour CRADAT",
    departureHour = 17,
    departureDate = new Date().toISOString(),
  }) {
    const isDouala = city.toLowerCase().includes("douala");
    const allNodes = isDouala ? DOUALA_NODES : YAOUNDE_NODES;

    const normalizedHour = Math.floor(departureHour) % 24;
    const dateObj = new Date(departureDate);
    const dayOfWeek = isNaN(dateObj.getDay()) ? new Date().getDay() : dateObj.getDay();

    // 1. Météo exacte prévue à cette heure précise par Open-Meteo
    const targetWeather = await getForecastForHour(city, normalizedHour);

    // 2. Recherche du nœud d'arrivée et de départ
    const findMatchingNode = (query) => {
      if (!query) return null;
      const q = query.toLowerCase();
      return allNodes.find((n) => n.name.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)) || null;
    };

    const destNode = findMatchingNode(destination) || {
      id: "dest_custom",
      name: destination,
      position: isDouala ? [4.053, 9.708] : [3.860, 11.503],
      congestionValue: 80,
      averageSpeedKmh: 12,
    };

    const origNode = findMatchingNode(origin) || {
      id: "orig_custom",
      name: origin,
      position: isDouala ? [4.042, 9.691] : [3.864, 11.519],
      congestionValue: 50,
      averageSpeedKmh: 25,
    };

    // 3. Détection des événements affectant ce trajet à cette heure
    const autoEvents = this.autoDetectContextualEvents(normalizedHour, dayOfWeek, targetWeather);
    const isDestCradat = destNode.name.toLowerCase().includes("cradat") || destNode.name.toLowerCase().includes("ngoa");
    const isDestMokolo = destNode.name.toLowerCase().includes("mokolo") || destNode.name.toLowerCase().includes("mboppi");

    const matchedEvents = autoEvents.filter((ev) => {
      if (isDestCradat && (ev.id === "university_cradat_rush" || ev.id === "flash_flood_vulnerable")) return true;
      if (isDestMokolo && ev.id === "market_day") return true;
      return !ev.targetedNodes || ev.targetedNodes.some((id) => destNode.id.includes(id) || origNode.id.includes(id));
    });

    // 4. Calcul de l'engorgement et du statut de la route
    const hourFactor = getHourlyBaseFactor(normalizedHour);
    const dayFactor = getDayOfWeekFactor(dayOfWeek);
    const eventBoost = matchedEvents.reduce((acc, ev) => acc + ev.baseCongestionBoost, 0);

    let calculatedCongestion = Math.round(
      (destNode.congestionValue * 0.5 + eventBoost * 0.6) *
        hourFactor *
        dayFactor *
        targetWeather.congestionMultiplier
    );
    calculatedCongestion = Math.min(99, Math.max(15, calculatedCongestion));

    // Statut précis de la route
    const isBarricadedOrBlocked = calculatedCongestion >= 88 || (targetWeather.rainMm >= 25 && isDestCradat);
    let roadStatus = "FLUID";
    let roadStatusLabel = "Voie fluide et dégagée";
    let statusColor = "#10B981";

    if (isBarricadedOrBlocked) {
      roadStatus = "BLOCKED_OR_JAMMED";
      roadStatusLabel = "Route saturée / Risque d'axe bloqué";
      statusColor = "#DC2626";
    } else if (calculatedCongestion >= 70) {
      roadStatus = "HEAVY_CONGESTION";
      roadStatusLabel = "Forts ralentissements & engorgement";
      statusColor = "#EA580C";
    } else if (calculatedCongestion >= 40) {
      roadStatus = "MODERATE";
      roadStatusLabel = "Ralentissement modéré";
      statusColor = "#F59E0B";
    }

    // Calcul du temps de trajet estimé (Base nominale 15 min)
    const nominalDurationMin = 14;
    const delayMinutes = Math.round((calculatedCongestion / 100) * 35 + (matchedEvents.length > 0 ? 12 : 0) + (targetWeather.rainMm > 0 ? 8 : 0));
    const estimatedDurationMin = nominalDurationMin + delayMinutes;

    // Construction des alertes et explications détaillées
    const detailedWarnings = [];

    // Alerte météo
    if (targetWeather.rainMm > 0 || targetWeather.precipitationProbability >= 60) {
      detailedWarnings.push({
        type: "WEATHER",
        icon: targetWeather.icon,
        title: `Météo prévue à ${normalizedHour}h00 : ${targetWeather.label}`,
        description: `Précipitations prévues (${targetWeather.rainMm} mm, ${targetWeather.precipitationProbability}% de risque). Chaussée très glissante et visibilité réduite.`,
        severity: targetWeather.rainMm >= 20 ? "critical" : "warning",
      });
    }

    // Alerte Événements / Sorties / Campus
    if (isDestCradat && (normalizedHour >= 16 && normalizedHour <= 19)) {
      detailedWarnings.push({
        type: "EVENT",
        icon: "🎓",
        title: "Sortie massive des amphis Université Yaoundé I",
        description: "À 17h, forte affluence d'étudiants, stationnements sauvages de taxis et attroupements créant un goulet d'étranglement au carrefour CRADAT.",
        severity: "critical",
      });
    }

    if (matchedEvents.some((e) => e.id === "funeral_cortege")) {
      detailedWarnings.push({
        type: "EVENT",
        icon: "⚰️",
        title: "Cortège funèbre & levée de corps",
        description: "Ralentissement accentué sur l'axe par un cortège funéraire et occupation latérale de chaussée.",
        severity: "warning",
      });
    }

    // Alerte Inondation bas-fonds
    if (isDestCradat && targetWeather.rainMm >= 10) {
      detailedWarnings.push({
        type: "FLOOD",
        icon: "🌊",
        title: "Alerte Inondation : Bas-fonds du CRADAT",
        description: "Accumulation d'eau au bas du carrefour. Passage au pas obligatoire ou axe impraticable pour les berlines.",
        severity: "critical",
      });
    }

    // 5. Proposition de déviation intelligente
    let detourAdvice = "Conserver l'itinéraire principal.";
    if (isDestCradat) {
      detourAdvice = "Déviation conseillée : Passer par le haut de Ngoa-Ekellé (Plateau / CHU) ou par Bastos / Dragages pour contourner l'entonnoir du Carrefour CRADAT.";
    } else if (isDestMokolo) {
      detourAdvice = "Déviation conseillée : Emprunter le Boulevard Jean-Paul II ou le quartier Madagascar en amont.";
    } else if (destNode.id.includes("nlongkak")) {
      detourAdvice = "Déviation conseillée : Contourner par le Boulevard de l'URSS / Bastos.";
    } else if (isDouala && destNode.id.includes("deido")) {
      detourAdvice = "Déviation conseillée : Passer par le Boulevard de la République ou la pénétrante Est.";
    }

    // Recommandation d'heure optimale
    const optimalDepartureHour = normalizedHour > 17 ? normalizedHour + 1.5 : normalizedHour - 0.75;
    const optimalHourText = `${Math.floor(optimalDepartureHour)}h${Math.round((optimalDepartureHour % 1) * 60).toString().padStart(2, "0")}`;

    return {
      city: isDouala ? "Douala" : "Yaoundé",
      origin: origNode.name,
      destination: destNode.name,
      targetHour: normalizedHour,
      targetDate: departureDate,
      weatherAtTargetHour: targetWeather,
      congestionScore: calculatedCongestion,
      roadStatus,
      roadStatusLabel,
      statusColor,
      nominalDurationMinutes: nominalDurationMin,
      estimatedDurationMinutes: estimatedDurationMin,
      delayMinutes,
      isRoadBlocked: isBarricadedOrBlocked,
      activeEventsOnRoute: matchedEvents.map((e) => ({ id: e.id, label: e.shortLabel, icon: e.icon, description: e.description })),
      warnings: detailedWarnings,
      detourRecommendation: detourAdvice,
      bestDepartureAdvice: `Pour éviter ce pic de ${calculatedCongestion}% à ${normalizedHour}h, il est fortement conseillé de partir vers ${optimalHourText} (-${Math.max(15, delayMinutes - 5)} min économisées).`,
    };
  }

  /**
   * Détection automatique d'événements contextuels selon l'heure, le jour et la météo réelle
   */
  static autoDetectContextualEvents(hour, dayOfWeek, weatherConfig = {}) {
    const events = [];

    // 1. Sortie universitaire & CRADAT (Lundi au Vendredi, 16h30 à 19h30)
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 16.25 && hour <= 19.5) {
      events.push(LOCAL_EVENTS.university_cradat_rush);
    }

    // 2. Pointe scolaire et administrative (Lundi au Vendredi)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      if ((hour >= 7 && hour <= 9) || (hour >= 16.5 && hour <= 19.5)) {
        events.push(LOCAL_EVENTS.school_office_rush);
      }
    }

    // 3. Deuils & Levées de corps (Jeudi soir, Vendredi après-midi, Samedi matin)
    if (
      (dayOfWeek === 4 && hour >= 17) ||
      (dayOfWeek === 5 && hour >= 11 && hour <= 20) ||
      (dayOfWeek === 6 && hour >= 7 && hour <= 14)
    ) {
      events.push(LOCAL_EVENTS.funeral_cortege);
    }

    // 4. Jours de grand marché (Mercredi, Vendredi, Samedi en journée)
    if ((dayOfWeek === 3 || dayOfWeek === 5 || dayOfWeek === 6) && hour >= 9 && hour <= 16) {
      events.push(LOCAL_EVENTS.market_day);
    }

    // 5. Inondation des bas-fonds si pluie détectée
    if (weatherConfig && weatherConfig.rainMm >= 15) {
      events.push(LOCAL_EVENTS.flash_flood_vulnerable);
    }

    return events;
  }

  /**
   * Diagnostic textuel pour chaque carrefour
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
   * Détection d'anomalies
   */
  static detectAnomalies(nodes, weatherConfig, activeEvents) {
    const anomalies = [];
    const hasHeavyWeather = weatherConfig.rainMm >= 15 || weatherConfig.conditionKey === "heavy_rain" || weatherConfig.conditionKey === "flood";

    nodes.forEach((node) => {
      if (node.averageSpeedKmh < 11 && !hasHeavyWeather) {
        anomalies.push({
          nodeId: node.id,
          nodeName: node.name,
          type: "RALENTISSEMENT_SUSPECT",
          severity: "high",
          description: `Vitesse critique (${node.averageSpeedKmh} km/h) détectée à ${node.name}. Risque élevé d'incident ou de retenue dense.`,
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
        description: "Montée rapide des eaux sur la chaussée. Risque d'aquaplaning et ralentissements en chaîne.",
        detectedAt: new Date().toISOString(),
        recommendedAction: "Ralentir l'allure, maintenir une distance de sécurité de 25m et éviter les bas-fonds.",
      });
    }

    if (anomalies.length === 0 && nodes.length > 0) {
      anomalies.push({
        nodeId: nodes[0].id,
        nodeName: nodes[0].name,
        type: "SURVEILLANCE_PREDICTIVE",
        severity: "low",
        description: "Modèles d'apprentissage nominaux. Réseau principal sous contrôle.",
        detectedAt: new Date().toISOString(),
        recommendedAction: "Circulation nominale sur les grands axes.",
      });
    }

    return anomalies;
  }

  /**
   * Recommandations proactives
   */
  static generateRecommendations(forecast, weatherConfig, city, activeEvents, targetHour) {
    const peakIn1h = forecast.find((f) => f.horizon === "+1 heure")?.congestionPercentage || 50;
    const recommendations = [];

    if (weatherConfig.rainMm > 0) {
      recommendations.push({
        title: "Alerte Météorologique Active",
        message: `${weatherConfig.label} en direct à ${city} (${weatherConfig.rainMm} mm). Prévoyez +15 min de marge sur tous vos trajets.`,
        priority: "high",
        badge: "MÉTÉO & SÉCURITÉ",
      });
    }

    const cradatRush = activeEvents.find((e) => e.id === "university_cradat_rush");
    if (cradatRush) {
      recommendations.push({
        title: "Forte affluence Campus CRADAT & Université",
        message: "Sortie d'amphithéâtres en cours. Évitez l'axe Carrefour CRADAT pour ne pas être bloqué par les taxis et la foule.",
        priority: "high",
        badge: "CAMPUS & ÉVÉNEMENT",
      });
    }

    const funeralEvent = activeEvents.find((e) => e.id === "funeral_cortege");
    if (funeralEvent) {
      recommendations.push({
        title: "Impact Cortèges Funèbres & Sorties de Ville",
        message: "Présence de cortèges de deuil et de veillées. Ralentissements marqués aux abords des morgues.",
        priority: "high",
        badge: "DEUIL & CORTÈGE",
      });
    }

    if (peakIn1h >= 70) {
      recommendations.push({
        title: "Pic de trafic imminent d'ici 1h",
        message: `L'IA prévoit une saturation à ${peakIn1h}% dans 60 minutes. Anticipez votre départ maintenant pour gagner jusqu'à 20 minutes.`,
        priority: "medium",
        badge: "OPTIMISATION TEMPORELLE",
      });
    } else {
      recommendations.push({
        title: "Créneau de circulation favorable",
        message: `Conditions fluides sur la majorité des axes de ${city}.`,
        priority: "low",
        badge: "FLUX FAVORABLE",
      });
    }

    return recommendations;
  }
}
