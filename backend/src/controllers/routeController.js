// Contrôleur de Calcul d'Itinéraires Multi-Critères & Éco-Mobilité CityFlow

const CITY_LANDMARKS = {
  "Yaoundé": {
    "Poste Centrale": [3.8667, 11.5167],
    "Bastos": [3.8890, 11.5120],
    "Mvan (Gare)": [3.8220, 11.5230],
    "Nsam": [3.8290, 11.5110],
    "Nlongkak": [3.8900, 11.5220],
    "Mokolo": [3.8730, 11.5030],
    "Odza": [3.7990, 11.5230],
    "Ahala": [3.7850, 11.5050],
    "Hôpital Général": [3.8980, 11.5430],
    "Hôpital Central (CHU)": [3.8650, 11.5080],
    "Omnisports (Stade)": [3.8810, 11.5360],
  },
  "Douala": {
    "Akwa": [4.0511, 9.7043],
    "Deido (Rond-point)": [4.0667, 9.7006],
    "Bonanjo": [4.0430, 9.6910],
    "Bonabéri": [4.0714, 9.6712],
    "Bépanda": [4.0470, 9.7270],
    "Bonamoussadi": [4.0867, 9.7350],
    "Logbessou": [4.1050, 9.7760],
    "Hôpital Laquintinie": [4.0550, 9.7020],
    "Hôpital Général de Douala": [4.0620, 9.7480],
    "Aéroport International": [4.0060, 9.7190],
  }
};

// Helper: Distance Haversine
function calculateDistanceKm(pos1, pos2) {
  const R = 6371;
  const dLat = ((pos2[0] - pos1[0]) * Math.PI) / 180;
  const dLon = ((pos2[1] - pos1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((pos1[0] * Math.PI) / 180) *
      Math.cos((pos2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(1.2, parseFloat((R * c).toFixed(1)));
}

// Générateur de coordonnées intermédiaires réalistes
function generatePolyline(start, end, variant = 0) {
  const points = [start];
  const steps = 6;
  for (let i = 1; i < steps; i++) {
    const ratio = i / steps;
    const lat = start[0] + (end[0] - start[0]) * ratio;
    const lng = start[1] + (end[1] - start[1]) * ratio;
    
    // Déviation selon la variante d'itinéraire
    let latOffset = 0;
    let lngOffset = 0;
    if (variant === 0) {
      latOffset = Math.sin(ratio * Math.PI) * 0.003;
      lngOffset = Math.cos(ratio * Math.PI) * 0.002;
    } else if (variant === 1) {
      latOffset = -Math.sin(ratio * Math.PI) * 0.005;
      lngOffset = Math.sin(ratio * Math.PI) * 0.004;
    } else {
      latOffset = Math.cos(ratio * Math.PI) * 0.006;
      lngOffset = -Math.sin(ratio * Math.PI) * 0.005;
    }
    points.push([parseFloat((lat + latOffset).toFixed(5)), parseFloat((lng + lngOffset).toFixed(5))]);
  }
  points.push(end);
  return points;
}

export const calculateRoute = (req, res) => {
  const {
    city = "Yaoundé",
    origin = "Mvan (Gare)",
    destination = "Bastos",
    strategy = "fastest",
  } = req.body;

  const currentLandmarks = CITY_LANDMARKS[city] || CITY_LANDMARKS["Yaoundé"];
  const startCoords = currentLandmarks[origin] || Object.values(currentLandmarks)[0];
  const endCoords = currentLandmarks[destination] || Object.values(currentLandmarks)[1];

  const baseDistance = calculateDistanceKm(startCoords, endCoords);

  // 1. Itinéraire Le Plus Rapide (Recommandé IA)
  const fastestDist = parseFloat((baseDistance * 1.05).toFixed(1));
  const fastestDuration = Math.round(fastestDist * 2.8 + 4);
  const fastestSaved = Math.round(fastestDuration * 0.4);
  const fastestCoords = generatePolyline(startCoords, endCoords, 0);

  // 2. Itinéraire Éco-Responsable
  const ecoDist = parseFloat((baseDistance * 1.12).toFixed(1));
  const ecoDuration = Math.round(ecoDist * 3.1 + 2);
  const ecoCo2Saved = parseFloat((fastestDist * 0.09 + 0.35).toFixed(2));
  const ecoCoords = generatePolyline(startCoords, endCoords, 1);

  // 3. Itinéraire Sécurisé & Voie Large
  const secureDist = parseFloat((baseDistance * 1.18).toFixed(1));
  const secureDuration = Math.round(secureDist * 3.4 + 3);
  const secureCoords = generatePolyline(startCoords, endCoords, 2);

  const routes = [
    {
      id: "route_fastest",
      type: "fastest",
      title: "Itinéraire le plus rapide (Recommandé IA)",
      badge: "⚡ Recommandé CityFlow",
      tag: "Temps optimal",
      durationMinutes: fastestDuration,
      distanceKm: fastestDist,
      delaySavedMinutes: fastestSaved,
      co2SavedKg: 0.4,
      ecoScore: "B+",
      congestionIndex: 32,
      color: "#00875A",
      fluidityLevel: "fluid",
      highlights: ["Contourne les carrefours bloqués", "Régulation des feux favorable"],
      coordinates: fastestCoords,
      steps: [
        {
          instruction: `Prendre le départ depuis ${origin}`,
          distance: "400 m",
          action: "straight",
          icon: "navigation",
        },
        {
          instruction: `Rejoindre l'axe principal en direction de ${destination}`,
          distance: `${(fastestDist * 0.4).toFixed(1)} km`,
          action: "right",
          icon: "arrow-up-right",
        },
        {
          instruction: "Passage au carrefour régulé par feux synchronisés (Feu Vert)",
          distance: `${(fastestDist * 0.4).toFixed(1)} km`,
          action: "straight",
          icon: "traffic-light",
        },
        {
          instruction: `Arrivée à destination à ${destination}`,
          distance: "200 m",
          action: "arrival",
          icon: "map-pin",
        },
      ],
    },
    {
      id: "route_eco",
      type: "eco",
      title: "Itinéraire Éco-Responsable & Vitesse Constante",
      badge: "🌿 Eco-Score A+ (-35% CO2)",
      tag: "Faible émission",
      durationMinutes: ecoDuration,
      distanceKm: ecoDist,
      delaySavedMinutes: Math.round(fastestSaved * 0.6),
      co2SavedKg: ecoCo2Saved,
      ecoScore: "A+",
      congestionIndex: 22,
      color: "#10B981",
      fluidityLevel: "fluid",
      highlights: ["Vitesse stabilisée sans arrêts fréquents", "Réduit l'usure des freins et carburant"],
      coordinates: ecoCoords,
      steps: [
        {
          instruction: `Départ éco-conduite depuis ${origin}`,
          distance: "500 m",
          action: "straight",
          icon: "navigation",
        },
        {
          instruction: "Emprunter la rocade de contournement fluide à allure modérée (45 km/h)",
          distance: `${(ecoDist * 0.6).toFixed(1)} km`,
          action: "left",
          icon: "arrow-up-left",
        },
        {
          instruction: `Rejoindre ${destination} en descente douce`,
          distance: `${(ecoDist * 0.3).toFixed(1)} km`,
          action: "straight",
          icon: "leaf",
        },
        {
          instruction: `Destination atteinte : ${destination}`,
          distance: "150 m",
          action: "arrival",
          icon: "map-pin",
        },
      ],
    },
    {
      id: "route_secure",
      type: "secure",
      title: "Itinéraire Sécurisé & Chaussée Optimale",
      badge: "🛡️ Chaussée optimale & Éclairée",
      tag: "Grandes voies",
      durationMinutes: secureDuration,
      distanceKm: secureDist,
      delaySavedMinutes: 0,
      co2SavedKg: 0.2,
      ecoScore: "A",
      congestionIndex: 48,
      color: "#2563EB",
      fluidityLevel: "moderate",
      highlights: ["Évite les zones de nids-de-poule et travaux", "Voies larges à double sens"],
      coordinates: secureCoords,
      steps: [
        {
          instruction: `Départ par les grands boulevards depuis ${origin}`,
          distance: "600 m",
          action: "straight",
          icon: "navigation",
        },
        {
          instruction: "Suivre le boulevard éclairé à chaussée rénovée",
          distance: `${(secureDist * 0.7).toFixed(1)} km`,
          action: "right",
          icon: "shield-check",
        },
        {
          instruction: `Accès direct sécurisé à ${destination}`,
          distance: "300 m",
          action: "arrival",
          icon: "map-pin",
        },
      ],
    },
  ];

  // Comparateur Multi-Modal (Réalité urbaine Cameroun)
  const multimodal = [
    {
      mode: "car",
      label: "Voiture personnelle",
      icon: "car",
      durationMinutes: fastestDuration,
      estimatedCostFcfa: Math.round(fastestDist * 140), // Carburant estimé
      costLabel: `~${Math.round(fastestDist * 140)} FCFA`,
      co2Kg: (fastestDist * 0.17).toFixed(2),
      comfort: "Confort climatisé",
      isFastest: false,
    },
    {
      mode: "mototaxi",
      label: "Moto-taxi (Bend-skin)",
      icon: "bike",
      durationMinutes: Math.max(8, Math.round(fastestDuration * 0.75)), // Plus rapide en heure de pointe
      estimatedCostFcfa: Math.min(600, Math.max(200, Math.round(fastestDist * 50) + 150)),
      costLabel: `${Math.min(600, Math.max(200, Math.round(fastestDist * 50) + 150))} FCFA`,
      co2Kg: (fastestDist * 0.05).toFixed(2),
      comfort: "Agilité maximale dans les embouteillages",
      isFastest: true,
    },
    {
      mode: "taxi",
      label: "Taxi collectif / Bus de ville",
      icon: "bus",
      durationMinutes: Math.round(fastestDuration * 1.3),
      estimatedCostFcfa: 350,
      costLabel: "350 FCFA",
      co2Kg: (fastestDist * 0.04).toFixed(2),
      comfort: "Tarif standard de ville",
      isFastest: false,
    },
    {
      mode: "walking",
      label: "Marche à pied",
      icon: "footprints",
      durationMinutes: Math.round((baseDistance / 4.8) * 60),
      estimatedCostFcfa: 0,
      costLabel: "Gratuit (0 FCFA)",
      co2Kg: "0.00",
      caloriesKcal: Math.round(baseDistance * 62),
      comfort: "Santé & zéro émission carbone",
      isFastest: false,
    },
  ];

  res.json({
    city,
    origin,
    destination,
    startCoords,
    endCoords,
    strategy,
    calculatedAt: new Date().toISOString(),
    routes,
    multimodal,
  });
};

export const getAvailableLandmarks = (req, res) => {
  const { city = "Yaoundé" } = req.query;
  const landmarks = CITY_LANDMARKS[city] || CITY_LANDMARKS["Yaoundé"];
  res.json({
    city,
    landmarks: Object.keys(landmarks).map((name) => ({
      name,
      position: landmarks[name],
    })),
  });
};
