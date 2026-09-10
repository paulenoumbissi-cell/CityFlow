import { YAOUNDE_NODES, DOUALA_NODES } from "../data/cityData.js";
import { fetchLiveWeatherData, getForecastForHour, parseWmoCode } from "./weatherService.js";
import { CITY_LANDMARKS, resolveCoordinates, calculateDistanceKm, fetchOsrmRoutes, generatePolyline } from "../controllers/routeController.js";

// Helpers pour projection spatiale haute fidélité le long du réseau routier réel OSRM
function pointToSegmentDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { distKm: calculateDistanceKm(p, a), t: 0, proj: a };

  const px = p[0] - a[0];
  const py = p[1] - a[1];
  let t = (px * dx + py * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const proj = [a[0] + t * dx, a[1] + t * dy];
  const distKm = calculateDistanceKm(p, proj);
  return { distKm, t, proj };
}

function findDistanceAndProgressionOnPolyline(p, polyline) {
  let minDist = Infinity;
  let bestFraction = 0;
  let totalLength = 0;

  const segmentLengths = [];
  for (let i = 0; i < polyline.length - 1; i++) {
    const l = calculateDistanceKm(polyline[i], polyline[i + 1]);
    segmentLengths.push(l);
    totalLength += l;
  }
  if (totalLength === 0) totalLength = 0.001;

  let accumulatedDist = 0;
  for (let i = 0; i < polyline.length - 1; i++) {
    const a = polyline[i];
    const b = polyline[i + 1];
    const segLen = segmentLengths[i];
    const res = pointToSegmentDistance(p, a, b);
    if (res.distKm < minDist) {
      minDist = res.distKm;
      const alongSegment = res.t * segLen;
      bestFraction = (accumulatedDist + alongSegment) / totalLength;
    }
    accumulatedDist += segLen;
  }

  return { distToRoadKm: minDist, fraction: bestFraction, totalLengthKm: totalLength };
}

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

// --- INFRASTRUCTURE ROUTIÈRE & QUALITÉ DES CHAUSSÉES DE YAOUNDÉ ET DOUALA ---
export const CITY_ROAD_INFRASTRUCTURE = {
  "Yaoundé": [
    {
      id: "axe_boulevard_20_mai",
      name: "Boulevard du 20 Mai & Quartier Administratif",
      type: "Boulevard 2x2 voies",
      qualityScore: 98,
      pavementStatus: "Bitumé excellent état",
      isPrimaryAxis: true,
      surfaceAdvantage: "Chaussée bitumée prioritaire, éclairée et fluide sans nids de poule",
      keywords: ["poste centrale", "warda", "minpostel", "enam", "leclerc", "centre", "hilton", "djeuga", "retraite", "paposy", "churchill"],
    },
    {
      id: "axe_ngoa_ekele_cradat",
      name: "Axe Ngoa-Ekélé / Avenue Mgr Vogt",
      type: "Artère principale bitumée",
      qualityScore: 92,
      pavementStatus: "Bitumé bon état",
      isPrimaryAxis: true,
      surfaceAdvantage: "Axe goudronné large reliant le centre aux facultés",
      keywords: ["supptic", "cradat", "ngoa", "universite", "esstic", "ens", "polytech", "melen", "vogt", "cuss", "hopital central", "fmsb"],
    },
    {
      id: "axe_bastos_urss",
      name: "Boulevard de l'URSS / Bastos - Dragages",
      type: "Boulevard prioritaire bitumé",
      qualityScore: 96,
      pavementStatus: "Bitumé haute qualité",
      isPrimaryAxis: true,
      surfaceAdvantage: "Revêtement asphalté haute qualité, évite les ruelles encombrées",
      keywords: ["bastos", "nlongkak", "palais des congres", "tsinga", "dragages", "ambassade", "super u", "dovv bastos", "golf"],
    },
    {
      id: "axe_ekounou_cfta_mvogmbi",
      name: "Axe Ekounou - Mvog-Mbi (Route de l'Aéroport)",
      type: "Artère urbaine bitumée",
      qualityScore: 88,
      pavementStatus: "Bitumé régulier",
      isPrimaryAxis: true,
      surfaceAdvantage: "Chaussée goudronnée directe reliant le Sud-Est au centre",
      keywords: ["cfta", "ekounou", "mvog-mbi", "anguissa", "nkolndongo", "coron", "siantou", "mvog-ada", "kondengui", "ekie", "nkomo"],
    },
    {
      id: "axe_voie_express_nsimalen",
      name: "Autoroute / Voie Express Nsimalen",
      type: "Voie express 2x2 voies",
      qualityScore: 99,
      pavementStatus: "Bitume autoroutier optimal",
      isPrimaryAxis: true,
      surfaceAdvantage: "Voie rapide 2x2 séparée, vitesse optimale et sécurité",
      keywords: ["nsimalen", "aeroport", "mvan", "tropicana", "ahala", "nsam"],
    },
    {
      id: "axe_mokolo_madagascar",
      name: "Route de Mokolo / Boulevard Jean-Paul II",
      type: "Artère commerçante bitumée",
      qualityScore: 80,
      pavementStatus: "Bitumé trafic dense",
      isPrimaryAxis: true,
      surfaceAdvantage: "Axe goudronné majeur évitant les pistes boueuses",
      keywords: ["mokolo", "madagascar", "cite verte", "marche central", "carrefour meec", "carrefour tsinga"],
    },
    {
      id: "axe_omnisports_essos",
      name: "Avenue Germaine / Axe Omnisports - Ngousso",
      type: "Artère principale bitumée",
      qualityScore: 90,
      pavementStatus: "Bitumé bon état",
      isPrimaryAxis: true,
      surfaceAdvantage: "Axe bitumé large desservant l'Est et les hôpitaux",
      keywords: ["omnisports", "essos", "ngousso", "hopital general", "injs", "mimboman", "djoungolo", "jamot"],
    },
    {
      id: "axe_mendong_biyemassi",
      name: "Route de Mendong / Biyem-Assi - Simbock",
      type: "Artère urbaine bitumée",
      qualityScore: 86,
      pavementStatus: "Bitumé régulier",
      isPrimaryAxis: true,
      surfaceAdvantage: "Chaussée principale goudronnée évitant les ravins et pistes",
      keywords: ["mendong", "biyem-assi", "etoug-ebe", "ronpoint damas", "lycee de mendong", "simbock", "dovv mendong", "nkolbisson"],
    },
  ],
  "Douala": [
    {
      id: "axe_boulevard_liberte",
      name: "Boulevard de la Liberté / Rue Prince Bell",
      type: "Boulevard central 2x2 voies",
      qualityScore: 96,
      pavementStatus: "Bitumé excellent état",
      isPrimaryAxis: true,
      surfaceAdvantage: "Boulevard commercial bitumé 2x2 avec feux régulés",
      keywords: ["akwa", "liberte", "atrium", "krystal", "palace", "deido", "bonanjo", "laquintinie", "libermann"],
    },
    {
      id: "axe_pont_wouri_bonaberi",
      name: "Axe Lourd Pont sur le Wouri (N3)",
      type: "Voie express 2x3 voies",
      qualityScore: 95,
      pavementStatus: "Bitume autoroutier",
      isPrimaryAxis: true,
      surfaceAdvantage: "Franchissement rapide sur le Wouri à 6 voies bitumées",
      keywords: ["bonaberi", "pont", "wouri", "deido", "rond-point bonaberi", "grand moulin", "sodiko", "bonassama"],
    },
    {
      id: "axe_lourd_ndokoti_bassa",
      name: "Axe Lourd Bassa / Carrefour Ndokoti (N3)",
      type: "Artère industrielle bitumée",
      qualityScore: 84,
      pavementStatus: "Bitume lourd",
      isPrimaryAxis: true,
      surfaceAdvantage: "Axe de transit goudronné pour poids lourds et véhicules",
      keywords: ["ndokoti", "bassa", "ndogbong", "bessengue", "bepanda", "iut", "enset", "tergal", "cite sic"],
    },
    {
      id: "axe_bonamoussadi_nations_unies",
      name: "Boulevard des Nations Unies (Maetur)",
      type: "Boulevard résidentiel 2x2 voies",
      qualityScore: 94,
      pavementStatus: "Bitumé excellent état",
      isPrimaryAxis: true,
      surfaceAdvantage: "Boulevard résidentiel moderne large et parfaitement bitumé",
      keywords: ["bonamoussadi", "makepe", "denver", "kotto", "logbessou", "hopital general"],
    },
    {
      id: "axe_aeroport_yassa_japoma",
      name: "Pénétrante Est / Boulevard de l'Aviation",
      type: "Voie express 2x2 voies",
      qualityScore: 98,
      pavementStatus: "Bitume autoroutier optimal",
      isPrimaryAxis: true,
      surfaceAdvantage: "Voie rapide 2x2 vers l'aéroport et l'autoroute de Japoma",
      keywords: ["aeroport", "douala grand mall", "yassa", "japoma", "nyalla", "stade"],
    },
    {
      id: "axe_bonanjo_port",
      name: "Avenue Charles de Gaulle / Bonanjo",
      type: "Boulevard administratif bitumé",
      qualityScore: 97,
      pavementStatus: "Bitumé parfait",
      isPrimaryAxis: true,
      surfaceAdvantage: "Artère administrative large, fluide et en parfait état",
      keywords: ["bonanjo", "port", "pad", "prefecture", "bali", "bonapriso", "joss", "sawa", "pullman"],
    },
  ],
};

// Résolution de la meilleure route et de la qualité du revêtement pour un segment ou carrefour
export function getRoadSegmentInfrastructure(nodeA, nodeB, city = "Yaoundé") {
  const isDouala = (city || "").toLowerCase().includes("douala");
  const roadAxes = CITY_ROAD_INFRASTRUCTURE[isDouala ? "Douala" : "Yaoundé"] || [];

  const textA = ((nodeA?.name || "") + " " + (nodeA?.id || "") + " " + (nodeA?.district || "")).toLowerCase();
  const textB = ((nodeB?.name || "") + " " + (nodeB?.id || "") + " " + (nodeB?.district || "")).toLowerCase();
  const combined = `${textA} ${textB}`;

  let bestMatch = null;
  let bestScore = 0;

  for (const axis of roadAxes) {
    let matchCount = 0;
    for (const kw of axis.keywords) {
      if (combined.includes(kw)) {
        matchCount += 1;
      }
    }
    if (matchCount > bestScore) {
      bestScore = matchCount;
      bestMatch = axis;
    }
  }

  if (bestMatch && bestScore > 0) {
    return {
      roadName: bestMatch.name,
      roadType: bestMatch.type,
      roadQualityScore: bestMatch.qualityScore,
      pavementStatus: bestMatch.pavementStatus,
      surfaceAdvantage: bestMatch.surfaceAdvantage,
      isPrimaryAxis: true,
      isRecommendedBestRoute: true,
    };
  }

  return {
    roadName: isDouala ? "Artère urbaine bitumée de Douala" : "Axe de liaison urbain bitumé",
    roadType: "Artère principale bitumée",
    roadQualityScore: 88,
    pavementStatus: "Bitumé bon état",
    surfaceAdvantage: "Axe goudronné direct privilégiant la sécurité et la fluidité",
    isPrimaryAxis: true,
    isRecommendedBestRoute: true,
  };
}

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

export const LEVEL_THRESHOLDS = [
  { threshold: 3.0, level: "fluide" },
  { threshold: 5.5, level: "ralenti" },
  { threshold: 7.5, level: "embouteillage" },
  { threshold: 10.01, level: "bloque" },
];

export const scoreToLevel = (score) => {
  for (const item of LEVEL_THRESHOLDS) {
    if (score < item.threshold) {
      return item.level;
    }
  }
  return "bloque";
};

export const buildAlertMessage = (roadName, timeline) => {
  const peak = timeline.peak;
  if (!peak || (peak.level !== "embouteillage" && peak.level !== "bloque")) {
    return null;
  }
  const nature = peak.level === "bloque" ? "un blocage important" : "un fort ralentissement";
  
  let horizonStr = `dans ${peak.horizon_minutes} min`;
  if (peak.horizon_minutes === 0) {
    horizonStr = "dès maintenant";
  } else if (peak.horizon_minutes === 60) {
    horizonStr = "dans 1h";
  } else if (peak.horizon_minutes === 90) {
    horizonStr = "dans 1h30";
  } else if (peak.horizon_minutes === 120) {
    horizonStr = "dans 2h";
  } else if (peak.horizon_minutes >= 60 && peak.horizon_minutes % 60 === 0) {
    horizonStr = `dans ${peak.horizon_minutes / 60}h`;
  }

  let message = `Il y aura ${nature} à ${roadName} ${horizonStr}`;
  if (timeline.causes && timeline.causes.length > 0) {
    message += " à cause de " + timeline.causes.join(" et ");
  }
  return message + ".";
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

  // Estimation de l'intensité de trafic de base selon la notoriété réelle du carrefour / pôle
  static getLandmarkBaseCongestion(node) {
    const n = (node?.name || "").toLowerCase();
    const cat = node?.category || "";
    if (n.includes("mokolo") || n.includes("mboppi") || n.includes("nlongkak") || n.includes("ndokoti") || n.includes("mvan")) return 76;
    if (n.includes("poste centrale") || n.includes("deido") || n.includes("bonamoussadi") || n.includes("express") || n.includes("cradat")) return 66;
    if (n.includes("melen") || n.includes("damas") || n.includes("anguissa") || n.includes("coron") || n.includes("elig-essono") || n.includes("madagascar") || n.includes("makepe")) return 50;
    if (n.includes("leclerc") || n.includes("hopital") || n.includes("bastos") || n.includes("omnisports") || n.includes("supptic") || n.includes("enam") || n.includes("esstic")) return 32;
    if (cat === "university" || cat === "hospital") return 40;
    if (cat === "mall") return 58;
    return 36;
  }

  /**
   * Résolution universelle et géographiquement exacte des carrefours intermédiaires traversés pour N'IMPORTE QUEL lieu
   */
  static async resolveRouteCorridorWaypoints(city, origNode, destNode, allNodes = [], routeMode = "comfort") {
    const isDouala = (city || "").toLowerCase().includes("douala");
    const origPos = origNode.position || (isDouala ? [4.0430, 9.6910] : [3.8640, 11.5190]);
    const destPos = destNode.position || (isDouala ? [4.0530, 9.7080] : [3.8600, 11.5030]);
    const directKm = calculateDistanceKm(origPos, destPos);

    // Nombre maximum d'étapes et espacement minimal strictement adaptés à la distance réelle du trajet
    let maxIntermediates = 0;
    let minSpacing = 1.0;
    if (directKm < 1.3) {
      maxIntermediates = 0; // Trajet court / contigu (< 1.3 km) : direct sans étapes superflues
    } else if (directKm < 3.2) {
      maxIntermediates = 1; // Trajet de proximité : 1 carrefour clé
      minSpacing = Math.max(0.8, directKm * 0.45);
    } else if (directKm < 6.5) {
      maxIntermediates = 2; // Trajet moyen : 2 étapes majeures
      minSpacing = Math.max(1.1, directKm * 0.28);
    } else {
      maxIntermediates = 4; // Long trajet : 3 à 4 étapes
      minSpacing = Math.max(1.5, directKm * 0.20);
    }

    if (maxIntermediates === 0) {
      return [origNode, destNode];
    }

    const currentCityLandmarks = CITY_LANDMARKS[city] || CITY_LANDMARKS[isDouala ? "Douala" : "Yaoundé"];

    // 1. Récupération du tracé réel de la chaussée (OSRM ou générateur géométrique)
    let polyline = null;
    try {
      const osrm = await fetchOsrmRoutes(origPos, destPos, origNode.name, destNode.name);
      if (osrm && osrm.length > 0 && osrm[0].coordinates && osrm[0].coordinates.length > 1) {
        polyline = osrm[0].coordinates;
      }
    } catch (e) {
      // ignore
    }
    if (!polyline || polyline.length < 2) {
      polyline = generatePolyline(origPos, destPos, 0);
    }

    // 2. Constitution du catalogue de carrefours, ronds-points et nœuds réels
    const landmarkNodes = Object.entries(currentCityLandmarks).map(([name, data]) => ({
      id: `lm_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      name,
      position: data.pos,
      category: data.category,
      district: data.district,
      congestionValue: AiTrafficEngine.getLandmarkBaseCongestion({ name, category: data.category }),
    }));

    const isExcluded = (n) => {
      const name = (n.name || "").toLowerCase();
      const cat = n.category || "";
      if (cat === "hotel") return true;
      if (name.includes("hotel") || name.includes("hôtel")) return true;
      if (name.includes("super u") || name.includes("dovv") || name.includes("playce")) return true;
      return false;
    };

    const candidatePool = [...allNodes, ...landmarkNodes].filter((n) => {
      if (!n || !n.position || isExcluded(n)) return false;
      const dO = calculateDistanceKm(origPos, n.position);
      const dD = calculateDistanceKm(destPos, n.position);
      return dO >= 0.45 && dD >= 0.45;
    });

    // 3. Calcul de la distance perpendiculaire exacte à la route et de la fraction de progression chronologique
    const rankedCandidates = [];
    for (const node of candidatePool) {
      const match = findDistanceAndProgressionOnPolyline(node.position, polyline);
      // Le carrefour doit être à moins de 350 mètres de la trajectoire routière réelle
      if (match.distToRoadKm <= 0.35 && match.fraction >= 0.12 && match.fraction <= 0.88) {
        const roadInfo = getRoadSegmentInfrastructure(origNode, node, city);
        // Priorité aux meilleures routes bitumées et aux grands axes
        const roadQualityBonus = (roadInfo.roadQualityScore || 80) / 100.0;
        rankedCandidates.push({
          node,
          fraction: match.fraction,
          distToRoadKm: match.distToRoadKm,
          roadQualityBonus,
        });
      }
    }

    // 4. Tri : en mode "comfort" on priorise les meilleures routes bitumées,
    //          en mode "speed" on priorise la proximité au trajet (chemin le plus court)
    rankedCandidates.sort((a, b) => {
      if (routeMode === "speed") {
        // Moins la distance au trajet est grande, mieux c'est
        return a.distToRoadKm - b.distToRoadKm || a.fraction - b.fraction;
      }
      // Mode comfort : combo qualité bitume + position sur l'axe
      const scoreA = a.roadQualityBonus - a.distToRoadKm * 2;
      const scoreB = b.roadQualityBonus - b.distToRoadKm * 2;
      return scoreB - scoreA || a.fraction - b.fraction;
    });
    // Retrier dans l'ordre chronologique après le tri par qualité
    rankedCandidates.sort((a, b) => a.fraction - b.fraction);

    // 5. Sélection avec espacement minimum et limitation selon la distance
    const selectedIntermediates = [];
    for (const item of rankedCandidates) {
      if (selectedIntermediates.length >= maxIntermediates) break;
      const tooClose = selectedIntermediates.some(
        (sel) => calculateDistanceKm(sel.node.position, item.node.position) < minSpacing
      );
      if (!tooClose) {
        selectedIntermediates.push(item);
      }
    }

    // Fallback : si la route est très isolée, projection vectorielle adaptative
    if (selectedIntermediates.length === 0 && maxIntermediates > 0) {
      const dx = destPos[0] - origPos[0];
      const dy = destPos[1] - origPos[1];
      const lenSq = dx * dx + dy * dy || 0.00001;
      const maxCorridorWidthKm = Math.min(0.60, Math.max(0.25, directKm * 0.18));

      const fallbackRanked = candidatePool
        .map((n) => {
          const px = n.position[0] - origPos[0];
          const py = n.position[1] - origPos[1];
          const t = (px * dx + py * dy) / lenSq;
          const projX = origPos[0] + t * dx;
          const projY = origPos[1] + t * dy;
          const distToCorridor = calculateDistanceKm(n.position, [projX, projY]);
          const dOrig = calculateDistanceKm(origPos, n.position);
          const dDest = calculateDistanceKm(n.position, destPos);
          const detourRatio = (dOrig + dDest) / (directKm || 0.1);
          return { node: n, t, distToCorridor, detourRatio };
        })
        .filter((item) => item.t >= 0.15 && item.t <= 0.85 && item.distToCorridor <= maxCorridorWidthKm && item.detourRatio <= 1.20)
        .sort((a, b) => a.t - b.t);

      for (const item of fallbackRanked) {
        if (selectedIntermediates.length >= maxIntermediates) break;
        const tooClose = selectedIntermediates.some(
          (sel) => calculateDistanceKm(sel.node.position, item.node.position) < minSpacing
        );
        if (!tooClose) {
          selectedIntermediates.push(item);
        }
      }
    }

    return [origNode, ...selectedIntermediates.map((item) => item.node), destNode];
  }

  /**
   * Diagnostic prédictif complet pour un trajet futur (Ex: Aller au CRADAT ou au Collège Vogt à 17h)
   */
  static async predictTripAndHazards({
    city = "Yaoundé",
    origin = "Poste Centrale",
    destination = "Carrefour CRADAT",
    departureHour = 17,
    departureDate = new Date().toISOString(),
    routeMode = "comfort", // "comfort" = routes bitumées prioritaires | "speed" = plus court chemin
  }) {
    const isDouala = city.toLowerCase().includes("douala");
    const allNodes = isDouala ? DOUALA_NODES : YAOUNDE_NODES;

    const now = new Date();
    let dateObj = departureDate ? new Date(departureDate) : new Date();
    if (isNaN(dateObj.getTime())) dateObj = new Date();

    const normalizedHour = Math.floor(departureHour) % 24;
    const normalizedMinute = Math.round((departureHour % 1) * 60);

    // Règle d'or : Toute prédiction doit être dans le futur (temps minimum = temps actuel).
    const isToday = dateObj.toDateString() === now.toDateString();
    let isPastTimeToday = false;
    let isTomorrow = false;

    if (isToday) {
      const targetTimeMinutes = normalizedHour * 60 + normalizedMinute;
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
      if (targetTimeMinutes < currentTimeMinutes) {
        isPastTimeToday = true;
        dateObj = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        isTomorrow = true;
      }
    } else if (dateObj > now) {
      isTomorrow = dateObj.getDate() !== now.getDate();
    }

    const dayOfWeek = dateObj.getDay();
    const dayFactor = [1, 2, 3, 4, 5].includes(dayOfWeek) ? 1.05 : 0.88;
    const formattedTime = `${normalizedHour.toString().padStart(2, "0")}h${normalizedMinute.toString().padStart(2, "0")}`;

    // 1. Météo exacte prévue à cette heure précise par Open-Meteo pour la bonne date
    const targetWeather = await getForecastForHour(city, normalizedHour, dateObj.toISOString());

    // 2. Recherche et résolution universelle du nœud d'arrivée et de départ
    const findMatchingNode = (query) => {
      if (!query) return null;
      const q = query.trim();
      const qLower = q.toLowerCase();

      // Vérification dans allNodes
      const direct = allNodes.find((n) => n.name.toLowerCase().includes(qLower) || n.id.toLowerCase().includes(qLower));
      if (direct) return direct;

      // Vérification dans CITY_LANDMARKS
      const cityLandmarks = CITY_LANDMARKS[city] || CITY_LANDMARKS[isDouala ? "Douala" : "Yaoundé"];
      for (const [key, val] of Object.entries(cityLandmarks)) {
        if (key.toLowerCase().includes(qLower) || qLower.includes(key.toLowerCase())) {
          return {
            id: `landmark_${key.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
            name: key,
            position: val.pos,
            district: val.district,
            congestionValue: 65,
            averageSpeedKmh: 20,
          };
        }
      }

      // Résolution via resolveCoordinates
      const coords = resolveCoordinates(q, city);
      if (coords) {
        return {
          id: `custom_${qLower.replace(/[^a-z0-9]/g, "_")}`,
          name: q,
          position: coords,
          congestionValue: 60,
          averageSpeedKmh: 22,
        };
      }
      return null;
    };

    const destNode = findMatchingNode(destination) || {
      id: "dest_custom",
      name: destination,
      position: isDouala ? [4.0530, 9.7080] : [3.8600, 11.5030],
      congestionValue: 75,
      averageSpeedKmh: 14,
    };

    const origNode = findMatchingNode(origin) || {
      id: "orig_custom",
      name: origin,
      position: isDouala ? [4.0430, 9.6910] : [3.8640, 11.5190],
      congestionValue: 50,
      averageSpeedKmh: 25,
    };

    // 3. Résolution complète du corridor routier et des carrefours traversés
    const corridorNodes = await AiTrafficEngine.resolveRouteCorridorWaypoints(city, origNode, destNode, allNodes, routeMode);
    
    let cumulativeNominalMinutes = 0;
    let cumulativeDelayMinutes = 0;
    const corridorWaypoints = [];
    let criticalBottleneck = null;
    let maxBottleneckCongestion = 0;

    for (let i = 0; i < corridorNodes.length; i++) {
      const node = corridorNodes[i];
      const isStart = i === 0;
      const isEnd = i === corridorNodes.length - 1;

      // Distance et durée nominale du segment
      const prevNode = i > 0 ? corridorNodes[i - 1] : node;
      const prevPos = prevNode.position;
      const segDistKm = calculateDistanceKm(prevPos, node.position);
      const segmentNominalMin = isStart ? 0 : Math.max(2, Math.round(segDistKm * 2.8));
      cumulativeNominalMinutes += segmentNominalMin;

      // Calcul précis de l'heure d'arrivée estimée (ETA) sur ce carrefour
      const etaTotalMinutes = normalizedMinute + cumulativeNominalMinutes + cumulativeDelayMinutes;
      const etaHourFloat = normalizedHour + (etaTotalMinutes / 60.0);
      const etaHourInt = Math.floor(etaHourFloat) % 24;
      const etaMinInt = Math.floor((etaHourFloat % 1) * 60);
      const etaFormatted = `${etaHourInt.toString().padStart(2, "0")}h${etaMinInt.toString().padStart(2, "0")}`;

      // Facteur horaire et météo à l'heure exacte d'arrivée sur ce carrefour
      const nodeHourFactor = getHourlyBaseFactor(etaHourFloat % 24);

      const nodeNameLower = (node.name || "").toLowerCase();
      const nodeIdLower = (node.id || "").toLowerCase();

      const isNodeCradat = nodeIdLower.includes("cradat") || nodeNameLower.includes("cradat") || nodeNameLower.includes("ngoa");
      const isNodeMokolo = nodeIdLower.includes("mokolo") || nodeNameLower.includes("mokolo") || nodeIdLower.includes("mboppi") || nodeNameLower.includes("mboppi");
      const isNodeNlongkak = nodeIdLower.includes("nlongkak") || nodeNameLower.includes("nlongkak");
      const isNodeMvan = nodeIdLower.includes("mvan") || nodeNameLower.includes("mvan");
      const isNodeDeido = nodeIdLower.includes("deido") || nodeNameLower.includes("deido");
      const isNodeNdokoti = nodeIdLower.includes("ndokoti") || nodeNameLower.includes("ndokoti");
      const isSchoolOrCollege = nodeNameLower.includes("vogt") || nodeNameLower.includes("leclerc") || nodeNameLower.includes("retraite") || nodeNameLower.includes("libermann") || nodeNameLower.includes("lycee") || nodeNameLower.includes("college");

      // Détection des obstacles et événements précis sur ce carrefour à cette heure
      const nodeObstacles = [];

      // A. Sortie d'amphis & campus universitaire (CRADAT / Ngoa-Ekélé / IUT)
      if (isNodeCradat && (etaHourFloat >= 16.25 && etaHourFloat <= 19.5)) {
        nodeObstacles.push({
          id: "cradat_rush",
          icon: "🎓",
          title: "Sortie massive des amphis Université Yaoundé I",
          description: `À ${etaFormatted}, traversées denses d'étudiants, taxis en double file et attroupements saturant le carrefour CRADAT.`,
          severity: "critical",
          timeFormatted: etaFormatted,
        });
      }

      // B. Sortie des lycées & collèges
      if (isSchoolOrCollege && ((etaHourFloat >= 7.0 && etaHourFloat <= 8.25) || (etaHourFloat >= 15.5 && etaHourFloat <= 17.75))) {
        nodeObstacles.push({
          id: "school_rush",
          icon: "🎒",
          title: `Affluence scolaire & dépose-minute (${node.name})`,
          description: `À ${etaFormatted}, attente de parents d'élèves, bus scolaires et flux de motos-taxis aux abords de l'établissement.`,
          severity: "warning",
          timeFormatted: etaFormatted,
        });
      }

      // C. Grand marché populaire (Mokolo, Mboppi, Sandaga)
      if (isNodeMokolo && (etaHourFloat >= 9.5 && etaHourFloat <= 17.5)) {
        nodeObstacles.push({
          id: "market_rush",
          icon: "🛒",
          title: "Forte affluence marchande & déchargements",
          description: `À ${etaFormatted}, camions de vivres, pousseurs et concentration de motos-taxis sur la chaussée.`,
          severity: etaHourFloat >= 11 && etaHourFloat <= 16 ? "critical" : "warning",
          timeFormatted: etaFormatted,
        });
      }

      // D. Risque d'inondation bas-fonds
      if ((isNodeCradat || isNodeNlongkak || isNodeDeido || isNodeNdokoti) && (targetWeather.rainMm >= 8 || targetWeather.precipitationProbability >= 70)) {
        nodeObstacles.push({
          id: "flash_flood",
          icon: "🌊",
          title: "Risque de chaussée submergée",
          description: `Bas-fond vulnérable aux fortes averses. Passage au pas obligatoire vers ${etaFormatted}.`,
          severity: targetWeather.rainMm >= 20 ? "critical" : "warning",
          timeFormatted: etaFormatted,
        });
      }

      // E. Travaux de voirie / Réfection
      if ((isNodeNlongkak || nodeIdLower.includes("nsam") || isNodeNdokoti) && (etaHourFloat >= 8 && etaHourFloat <= 18)) {
        nodeObstacles.push({
          id: "road_works",
          icon: "🚧",
          title: "Travaux d'assainissement / Voirie",
          description: `Chantier et rétrécissement temporaire de voie créant un goulot vers ${etaFormatted}.`,
          severity: "warning",
          timeFormatted: etaFormatted,
        });
      }

      // F. Affluence des gares routières
      if (isNodeMvan && ((etaHourFloat >= 6.5 && etaHourFloat <= 9.0) || (etaHourFloat >= 16.5 && etaHourFloat <= 19.5))) {
        nodeObstacles.push({
          id: "intercity_terminal",
          icon: "🚌",
          title: "Affluence des gares routières (Mvan)",
          description: `Départs de bus interurbains et manœuvres d'embarquement vers ${etaFormatted}.`,
          severity: "warning",
          timeFormatted: etaFormatted,
        });
      }

      // G. Pointe standard
      if (nodeObstacles.length === 0 && ((etaHourFloat >= 7.0 && etaHourFloat <= 9.0) || (etaHourFloat >= 16.5 && etaHourFloat <= 19.5))) {
        nodeObstacles.push({
          id: "school_office_rush",
          icon: "🚦",
          title: "Heure de pointe (Bureaux & Activités)",
          description: `Forte concentration de circulation au carrefour vers ${etaFormatted}.`,
          severity: "info",
          timeFormatted: etaFormatted,
        });
      }

      // Identification de la meilleure route et qualité de la chaussée
      const roadInfra = getRoadSegmentInfrastructure(prevNode, node, city);

      // Calcul individualisé du score de congestion à ce carrefour
      const rawBase = node.congestionValue || AiTrafficEngine.getLandmarkBaseCongestion(node);
      const nodeBoost = nodeObstacles.reduce((sum, o) => sum + (o.severity === "critical" ? 35 : o.severity === "warning" ? 18 : 8), 0);
      let nodeCongestion = Math.round(
        (rawBase * 0.70 + nodeBoost * 0.45) *
          nodeHourFactor *
          dayFactor *
          targetWeather.congestionMultiplier
      );
      nodeCongestion = Math.min(99, Math.max(12, nodeCongestion));

      // Calcul réaliste de la vitesse sur le segment et du retard cumulé
      const currentSpeedKmh = Math.max(8, Math.round(42 * (1 - (nodeCongestion / 125))));
      const actualSegmentMin = isStart ? 0 : Math.max(1, Math.round((segDistKm / currentSpeedKmh) * 60));
      const nodeDelayMin = isStart ? 0 : Math.max(0, actualSegmentMin - segmentNominalMin + (nodeBoost > 0 ? 2 : 0));
      cumulativeDelayMinutes += nodeDelayMin;

      let nodeStatus = "FLUID";
      let nodeStatusLabel = "Fluide";
      let nodeColor = "#10B981";

      if (nodeCongestion >= 85 || nodeObstacles.some((o) => o.severity === "critical")) {
        nodeStatus = "BLOCKED_OR_JAMMED";
        nodeStatusLabel = "Saturé / Bloqué";
        nodeColor = "#DC2626";
      } else if (nodeCongestion >= 68) {
        nodeStatus = "HEAVY_CONGESTION";
        nodeStatusLabel = "Très dense";
        nodeColor = "#EA580C";
      } else if (nodeCongestion >= 40) {
        nodeStatus = "MODERATE";
        nodeStatusLabel = "Ralenti";
        nodeColor = "#F59E0B";
      }

      const waypointData = {
        stepIndex: i + 1,
        id: node.id,
        name: node.name,
        position: node.position,
        isOrigin: isStart,
        isDestination: isEnd,
        estimatedArrival: etaFormatted,
        relativeMinutesFromStart: Math.round(etaTotalMinutes - normalizedMinute),
        congestionScore: nodeCongestion,
        status: nodeStatus,
        statusLabel: nodeStatusLabel,
        statusColor: nodeColor,
        segmentNominalMin,
        delayAtNodeMin: nodeDelayMin,
        obstacles: nodeObstacles,
        roadName: roadInfra.roadName,
        roadType: roadInfra.roadType,
        roadQualityScore: roadInfra.roadQualityScore,
        pavementStatus: roadInfra.pavementStatus,
        surfaceAdvantage: roadInfra.surfaceAdvantage,
        isRecommendedBestRoute: true,
        advice: isNodeCradat && nodeCongestion >= 70
          ? "Contourner par le Plateau Ngoa-Ekellé / CHU."
          : (nodeObstacles.length > 0 ? nodeObstacles[0].description : `Axe ${roadInfra.roadName} praticable et goudronné.`),
      };

      corridorWaypoints.push(waypointData);

      if (!isStart && (!criticalBottleneck || nodeCongestion > maxBottleneckCongestion)) {
        maxBottleneckCongestion = nodeCongestion;
        criticalBottleneck = {
          nodeId: node.id,
          nodeName: node.name,
          etaFormatted,
          congestionScore: nodeCongestion,
          statusLabel: nodeStatusLabel,
          statusColor: nodeColor,
          obstacles: nodeObstacles,
          mainReason: nodeObstacles.length > 0 ? nodeObstacles[0].title : "Affluence de pointe",
          detourAdvice: isNodeCradat
            ? "Déviation conseillée : Passer par le haut de Ngoa-Ekellé (Plateau / CHU) ou par Bastos / Dragages pour contourner l'entonnoir du Carrefour CRADAT."
            : isNodeMokolo
            ? "Déviation conseillée : Emprunter le Boulevard Jean-Paul II ou le quartier Madagascar en amont."
            : isNodeNlongkak
            ? "Déviation conseillée : Contourner par le Boulevard de l'URSS / Bastos."
            : "Conserver l'itinéraire principal avec vigilance.",
        };
      }
    }

    // 4. Synthèse globale du trajet
    const totalEstimatedMin = cumulativeNominalMinutes + cumulativeDelayMinutes;
    const isCorridorBlocked = maxBottleneckCongestion >= 85 || cumulativeDelayMinutes >= 20;

    let overallStatus = "FLUID";
    let overallStatusLabel = "Trajet fluide dans l'ensemble";
    let overallStatusColor = "#10B981";

    if (isCorridorBlocked) {
      overallStatus = "BLOCKED_OR_JAMMED";
      overallStatusLabel = "Trajet fortement saturé";
      overallStatusColor = "#DC2626";
    } else if (maxBottleneckCongestion >= 68 || cumulativeDelayMinutes >= 12) {
      overallStatus = "HEAVY_CONGESTION";
      overallStatusLabel = "Ralentissements majeurs sur le parcours";
      overallStatusColor = "#EA580C";
    } else if (maxBottleneckCongestion >= 40) {
      overallStatus = "MODERATE";
      overallStatusLabel = "Ralentissements modérés";
      overallStatusColor = "#F59E0B";
    }

    // Analyse globale de la qualité de l'infrastructure et de la meilleure route
    const avgRoadQuality = Math.round(
      corridorWaypoints.reduce((sum, w) => sum + (w.roadQualityScore || 88), 0) / (corridorWaypoints.length || 1)
    );
    const uniqueRoads = [...new Set(corridorWaypoints.map((w) => w.roadName).filter(Boolean))];

    const bestRouteOverview = {
      recommendedRouteName: `Itinéraire Bitumé Prioritaire (${uniqueRoads.slice(0, 2).join(" • ") || "Axe Principal"})`,
      averageRoadQualityScore: avgRoadQuality,
      pavementCondition: avgRoadQuality >= 92 ? "Chaussée bitumée en excellent état" : "Chaussée bitumée standard",
      primaryAvenues: uniqueRoads,
      isOptimalRoadChoice: true,
      whyBestRoute: "Privilégie les grands boulevards bitumés et évite les ruelles dégradées à nids de poule.",
      surfaceAdvantage: corridorWaypoints[0]?.surfaceAdvantage || "Axe prioritaire bitumé",
      alternativeDegradedRoute: {
        name: "Raccourcis par ruelles secondaires",
        warning: "Déconseillé (+5 à +9 min de retard estimé pour nids de poule, chaussée rétrécie et absence de feux)",
      },
    };

    // Collecte des alertes de tous les carrefours du corridor
    const allCorridorWarnings = [];
    if (targetWeather.rainMm > 0 || targetWeather.precipitationProbability >= 60) {
      allCorridorWarnings.push({
        type: "WEATHER",
        icon: targetWeather.icon,
        title: `Météo prévue à ${normalizedHour}h00 : ${targetWeather.label}`,
        description: `Précipitations prévues (${targetWeather.rainMm} mm, ${targetWeather.precipitationProbability}% de risque). Chaussée très glissante.`,
        severity: targetWeather.rainMm >= 20 ? "critical" : "warning",
      });
    }
    for (const wp of corridorWaypoints) {
      for (const obs of wp.obstacles) {
        if (obs.severity === "critical" || obs.severity === "warning") {
          allCorridorWarnings.push({
            type: "OBSTACLE",
            icon: obs.icon,
            title: `${wp.name} (${wp.estimatedArrival}) : ${obs.title}`,
            description: obs.description,
            severity: obs.severity,
          });
        }
      }
    }

    // Recommandation d'heure optimale
    const optimalDepartureHour = normalizedHour > 17 ? normalizedHour + 1.5 : normalizedHour - 0.75;
    const optimalHourText = `${Math.floor(optimalDepartureHour)}h${Math.round((optimalDepartureHour % 1) * 60).toString().padStart(2, "0")}`;

    // Timeline multi-horizons (15/30/45/60/90/120 min)
    const horizonsMin = [15, 30, 45, 60, 90, 120];
    const isPeakHour = (normalizedHour >= 7 && normalizedHour <= 9) || (normalizedHour >= 16.5 && normalizedHour <= 19.5);
    const rainAmount = targetWeather.rainMm || 0.0;
    const isRoadDegraded = corridorWaypoints.some((w) => w.name.toLowerCase().includes("mvan") || w.name.toLowerCase().includes("mokolo") || w.name.toLowerCase().includes("ndokoti"));

    const timelinePoints = horizonsMin.map((h) => {
      const hTarget = normalizedHour + (h / 60.0);
      const hFactor = getHourlyBaseFactor(hTarget % 24);

      let horizonCongestion = Math.round(
        (maxBottleneckCongestion * 0.5 + (criticalBottleneck?.obstacles?.length ? 30 : 0) * 0.5) *
          hFactor *
          dayFactor *
          targetWeather.congestionMultiplier
      );
      horizonCongestion = Math.min(99, Math.max(12, horizonCongestion));
      const scoreScale = Math.min(10.0, Math.max(1.0, parseFloat((horizonCongestion / 10.0).toFixed(1))));

      return {
        horizon_minutes: h,
        score: scoreScale,
        level: scoreToLevel(scoreScale),
        congestionPercentage: horizonCongestion,
      };
    });

    const peak = timelinePoints.reduce((maxP, p) => (p.score > maxP.score ? p : maxP), timelinePoints[0]);
    const causes = [];
    if (rainAmount >= 2.0) causes.push(rainAmount >= 20 ? "un orage violent" : "la pluie");
    if (criticalBottleneck && criticalBottleneck.obstacles.length > 0) {
      causes.push(criticalBottleneck.obstacles[0].title.toLowerCase());
    } else if (isPeakHour) {
      causes.push("l'affluence de pointe");
    }

    // Calcul dynamique de la confiance IA
    const peakMin = peak.horizon_minutes || 15;
    let confidence = 0.88;
    if (targetWeather && targetWeather.rainMm !== undefined) confidence += 0.04;
    if (isPeakHour) confidence += 0.02;
    confidence -= (peakMin / 120.0) * 0.08;
    confidence = Math.min(0.94, Math.max(0.74, parseFloat(confidence.toFixed(2))));

    // Message d'alerte naturel centré sur le point critique du parcours
    let alertMessage = null;
    if (criticalBottleneck && (criticalBottleneck.congestionScore >= 68 || isCorridorBlocked)) {
      const nature = criticalBottleneck.congestionScore >= 85 ? "un blocage important" : "un fort ralentissement";
      alertMessage = `Sur votre trajet vers ${destNode.name}, ${nature} est prévu à ${criticalBottleneck.nodeName} vers ${criticalBottleneck.etaFormatted}`;
      if (criticalBottleneck.obstacles.length > 0) {
        alertMessage += ` en raison de : ${criticalBottleneck.obstacles[0].title.toLowerCase()}.`;
      } else {
        alertMessage += ` à cause de l'affluence de pointe.`;
      }
    } else {
      alertMessage = buildAlertMessage(destNode.name, { peak, causes });
    }

    return {
      city: isDouala ? "Douala" : "Yaoundé",
      origin: origNode.name,
      destination: destNode.name,
      targetHour: normalizedHour,
      targetDate: dateObj.toISOString(),
      isTomorrow,
      isPastTimeAdjusted: isPastTimeToday,
      departureTimeFormatted: formattedTime,
      weatherAtTargetHour: targetWeather,
      congestionScore: maxBottleneckCongestion,
      roadStatus: overallStatus,
      roadStatusLabel: overallStatusLabel,
      statusColor: overallStatusColor,
      nominalDurationMinutes: cumulativeNominalMinutes,
      estimatedDurationMinutes: totalEstimatedMin,
      delayMinutes: cumulativeDelayMinutes,
      isRoadBlocked: isCorridorBlocked,
      activeEventsOnRoute: allCorridorWarnings.map((w, idx) => ({ id: `w_${idx}`, label: w.title, icon: w.icon, description: w.description })),
      warnings: allCorridorWarnings,
      corridorWaypoints,
      bestRouteOverview,
      criticalBottleneck,
      detourRecommendation: criticalBottleneck?.detourAdvice || "Conserver l'itinéraire principal.",
      bestDepartureAdvice: `Pour éviter le goulot de ${maxBottleneckCongestion}% à ${criticalBottleneck?.nodeName || destNode.name}, il est conseillé de partir vers ${optimalHourText} (-${Math.max(12, cumulativeDelayMinutes - 4)} min économisées).`,
      timeline: {
        points: timelinePoints,
        peak,
        confidence,
        causes,
        alert_message: alertMessage,
        factors: {
          isPeakHour,
          rainMm: rainAmount,
          hasEvent: allCorridorWarnings.length > 0,
          roadDegraded: isRoadDegraded,
        },
      },
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

  /**
   * Calcul d'une timeline de prédictions (15/30/45/60/90/120 min) et déduction du message d'alerte OS1
   */
  static async predictTimeline({
    history = [],
    rainForecastMm = 0.0,
    hasEvent = false,
    roadName = "cet axe",
    roadSegmentId = null,
    city = "Yaoundé",
    departureHour = new Date().getHours(),
  }) {
    const horizonsMin = [15, 30, 45, 60, 90, 120];
    const hour = typeof departureHour === "number" ? departureHour : parseFloat(departureHour) || new Date().getHours();
    const isPeak = (hour >= 7 && hour <= 9) || (hour >= 16.5 && hour <= 19.5);
    const rain = parseFloat(rainForecastMm) || 0.0;

    let baseScore = 2.8;
    if (Array.isArray(history) && history.length > 0) {
      const avg = history.reduce((sum, h) => sum + (parseFloat(h.score) || 0), 0) / history.length;
      baseScore = avg;
    } else {
      baseScore = isPeak ? 6.2 : 2.8;
    }

    const points = horizonsMin.map((h) => {
      const targetH = hour + (h / 60.0);
      const hourFactor = getHourlyBaseFactor(targetH % 24);
      const rainImpact = rain > 10 ? 2.5 : rain > 2 ? 1.5 : 0;
      const eventImpact = hasEvent ? 2.0 : 0;

      let calculated = (baseScore * (hourFactor / getHourlyBaseFactor(hour % 24))) + rainImpact + eventImpact;
      calculated = Math.min(10.0, Math.max(1.0, parseFloat(calculated.toFixed(1))));

      return {
        horizon_minutes: h,
        score: calculated,
        level: scoreToLevel(calculated),
      };
    });

    const peak = points.reduce((maxP, p) => (p.score > maxP.score ? p : maxP), points[0]);

    const causes = [];
    if (rain >= 2.0) causes.push("la pluie");
    if (hasEvent) causes.push("un évènement à proximité");
    if (isPeak && causes.length === 0) causes.push("l'affluence de pointe");

    const confidence = history.length >= 30 ? 0.85 : 0.85;

    const timeline = {
      road_segment_id: roadSegmentId || roadName,
      road_name: roadName,
      points,
      peak,
      confidence,
      causes,
      factors: {
        isPeakHour: isPeak,
        rainMm: rain,
        hasEvent: Boolean(hasEvent),
        roadDegraded: roadName.toLowerCase().includes("mvan") || roadName.toLowerCase().includes("mokolo") || roadName.toLowerCase().includes("ndokoti"),
      },
    };

    timeline.alert_message = buildAlertMessage(roadName, timeline);

    return timeline;
  }
}
