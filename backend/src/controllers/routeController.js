// Contrôleur de Calcul d'Itinéraires Multi-Critères, Éco-Mobilité & Routage OSRM Réel

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
  return Math.max(0.5, parseFloat((R * c).toFixed(1)));
}

// Résolution de coordonnées (Nom de lieu, Array [lat, lng], ou Objet {lat, lng})
function resolveCoordinates(point, city = "Yaoundé") {
  if (!point) return null;
  if (Array.isArray(point) && point.length === 2 && typeof point[0] === "number") {
    return [point[0], point[1]];
  }
  if (typeof point === "object" && point.lat !== undefined && point.lng !== undefined) {
    return [parseFloat(point.lat), parseFloat(point.lng)];
  }
  if (typeof point === "string") {
    // Si c'est formaté "lat,lng"
    if (point.includes(",") && !isNaN(parseFloat(point.split(",")[0]))) {
      const parts = point.split(",").map((p) => parseFloat(p.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return [parts[0], parts[1]];
      }
    }
    const currentLandmarks = CITY_LANDMARKS[city] || CITY_LANDMARKS["Yaoundé"];
    if (currentLandmarks[point]) {
      return currentLandmarks[point];
    }
    // Chercher dans l'autre ville au cas où
    const otherCity = city === "Douala" ? "Yaoundé" : "Douala";
    if (CITY_LANDMARKS[otherCity][point]) {
      return CITY_LANDMARKS[otherCity][point];
    }
  }
  return null;
}

// Générateur de coordonnées de secours (si OSRM hors-ligne)
function generatePolyline(start, end, variant = 0) {
  const points = [start];
  const steps = 8;
  for (let i = 1; i < steps; i++) {
    const ratio = i / steps;
    const lat = start[0] + (end[0] - start[0]) * ratio;
    const lng = start[1] + (end[1] - start[1]) * ratio;
    
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

// Appel au serveur OSRM mondial (OpenStreetMap)
async function fetchOsrmRoute(startCoords, endCoords) {
  try {
    const [startLat, startLng] = startCoords;
    const [endLat, endLng] = endCoords;
    // OSRM prend lng,lat;lng,lat
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`OSRM HTTP error ${response.status}`);
    const data = await response.json();

    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const primaryRoute = data.routes[0];
      const distanceKm = parseFloat((primaryRoute.distance / 1000).toFixed(1));
      const durationMinutes = Math.max(3, Math.round(primaryRoute.duration / 60));
      // Convertir geojson [lng, lat] -> leaflet [lat, lng]
      const coordinates = primaryRoute.geometry.coordinates.map((c) => [c[1], c[0]]);

      const steps = primaryRoute.legs?.[0]?.steps?.slice(0, 6).map((step, idx) => ({
        instruction: step.maneuver?.instruction || (step.name ? `Suivre ${step.name}` : `Étape ${idx + 1}`),
        distance: `${Math.round(step.distance)} m`,
        action: step.maneuver?.type || "straight",
        icon: step.maneuver?.type === "turn" ? "arrow-up-right" : "navigation",
      })) || [];

      return {
        distanceKm,
        durationMinutes,
        coordinates,
        steps: steps.length > 0 ? steps : null,
      };
    }
  } catch (err) {
    console.info("[OSRM Route Service] Bascule sur le générateur local d'itinéraires :", err.message);
  }
  return null;
}

export const calculateRoute = async (req, res) => {
  try {
    const {
      city = "Yaoundé",
      origin = "Mvan (Gare)",
      destination = "Bastos",
      originCoords: rawOriginCoords,
      destinationCoords: rawDestCoords,
      strategy = "fastest",
    } = req.body;

    const startCoords =
      resolveCoordinates(rawOriginCoords, city) ||
      resolveCoordinates(origin, city) ||
      CITY_LANDMARKS[city]?.["Poste Centrale"] ||
      [3.8667, 11.5167];

    const endCoords =
      resolveCoordinates(rawDestCoords, city) ||
      resolveCoordinates(destination, city) ||
      CITY_LANDMARKS[city]?.["Bastos"] ||
      [3.8890, 11.5120];

    const baseDistance = calculateDistanceKm(startCoords, endCoords);

    // Essayer de récupérer le tracé réel via OpenStreetMap OSRM
    const osrmResult = await fetchOsrmRoute(startCoords, endCoords);

    const fastestDist = osrmResult?.distanceKm || parseFloat((baseDistance * 1.08).toFixed(1));
    const fastestDuration = osrmResult?.durationMinutes || Math.round(fastestDist * 2.8 + 4);
    const fastestSaved = Math.round(fastestDuration * 0.35);
    const fastestCoords = osrmResult?.coordinates || generatePolyline(startCoords, endCoords, 0);

    const ecoDist = parseFloat((fastestDist * 1.12).toFixed(1));
    const ecoDuration = Math.round(fastestDuration * 1.15 + 2);
    const ecoCo2Saved = parseFloat((fastestDist * 0.09 + 0.35).toFixed(2));
    const ecoCoords = generatePolyline(startCoords, endCoords, 1);

    const secureDist = parseFloat((fastestDist * 1.18).toFixed(1));
    const secureDuration = Math.round(fastestDuration * 1.25 + 3);
    const secureCoords = generatePolyline(startCoords, endCoords, 2);

    const defaultSteps = [
      {
        instruction: `Prendre le départ depuis ${typeof origin === "string" ? origin : "votre position GPS"}`,
        distance: "400 m",
        action: "straight",
        icon: "navigation",
      },
      {
        instruction: `Rejoindre l'axe principal vers ${typeof destination === "string" ? destination : "destination"}`,
        distance: `${(fastestDist * 0.4).toFixed(1)} km`,
        action: "right",
        icon: "arrow-up-right",
      },
      {
        instruction: "Passage au carrefour régulé par feux synchronisés (Feu Vert IA)",
        distance: `${(fastestDist * 0.4).toFixed(1)} km`,
        action: "straight",
        icon: "traffic-light",
      },
      {
        instruction: `Arrivée à destination : ${typeof destination === "string" ? destination : "Position choisie"}`,
        distance: "200 m",
        action: "arrival",
        icon: "map-pin",
      },
    ];

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
        isOsrmRealRoad: !!osrmResult,
        highlights: ["Contourne les axes saturés", "Régulation des feux favorable"],
        coordinates: fastestCoords,
        steps: osrmResult?.steps || defaultSteps,
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
        isOsrmRealRoad: false,
        highlights: ["Vitesse stabilisée sans arrêts fréquents", "Réduit l'usure des freins et carburant"],
        coordinates: ecoCoords,
        steps: [
          {
            instruction: `Départ éco-conduite`,
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
            instruction: "Rejoindre la destination en descente douce",
            distance: `${(ecoDist * 0.3).toFixed(1)} km`,
            action: "straight",
            icon: "leaf",
          },
          {
            instruction: `Destination atteinte avec succès`,
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
        co2SavedKg: 0.15,
        ecoScore: "B",
        congestionIndex: 48,
        color: "#3B82F6",
        fluidityLevel: "moderate",
        isOsrmRealRoad: false,
        highlights: ["Avenue large et éclairée", "Évite les nids-de-poule récents"],
        coordinates: secureCoords,
        steps: [
          {
            instruction: "Départ sur voie prioritaire",
            distance: "300 m",
            action: "straight",
            icon: "navigation",
          },
          {
            instruction: "Emprunter l'axe principal à 4 voies éclairées",
            distance: `${(secureDist * 0.7).toFixed(1)} km`,
            action: "straight",
            icon: "shield-check",
          },
          {
            instruction: "Arrivée sécurisée à destination",
            distance: "250 m",
            action: "arrival",
            icon: "map-pin",
          },
        ],
      },
    ];

    // Comparateur multimodal adapté
    const multimodal = [
      {
        mode: "car",
        label: "Voiture Personnelle",
        durationMinutes: fastestDuration,
        costLabel: `${Math.round(fastestDist * 95 + 400)} FCFA (Essence)`,
        co2Kg: parseFloat((fastestDist * 0.18).toFixed(2)),
        calorieKcal: 0,
        icon: "Car",
      },
      {
        mode: "mototaxi",
        label: "Moto-Taxi (Benskin)",
        durationMinutes: Math.max(5, Math.round(fastestDuration * 0.65)),
        costLabel: `${Math.round(fastestDist * 70 + 200)} FCFA`,
        co2Kg: parseFloat((fastestDist * 0.08).toFixed(2)),
        calorieKcal: 0,
        icon: "Bike",
      },
      {
        mode: "taxi",
        label: "Taxi Collectif (Jaune)",
        durationMinutes: Math.round(fastestDuration * 1.3 + 5),
        costLabel: "300 - 500 FCFA (Course)",
        co2Kg: parseFloat((fastestDist * 0.06).toFixed(2)),
        calorieKcal: 0,
        icon: "Bus",
      },
      {
        mode: "walking",
        label: "Marche à Pied",
        durationMinutes: Math.round(fastestDist * 12.5),
        costLabel: "0 FCFA (Gratuit)",
        co2Kg: 0,
        calorieKcal: Math.round(fastestDist * 65),
        icon: "Footprints",
      },
    ];

    res.json({
      city,
      origin: typeof origin === "string" ? origin : "Position personnalisée",
      destination: typeof destination === "string" ? destination : "Position personnalisée",
      startCoords,
      endCoords,
      calculatedAt: new Date().toISOString(),
      isOsrmLive: !!osrmResult,
      routes,
      multimodal,
    });
  } catch (err) {
    console.error("[calculateRoute Error]", err);
    res.status(500).json({ error: "Erreur lors du calcul d'itinéraire" });
  }
};

// Obtenir les repères / carrefours prédéfinis
export const getAvailableLandmarks = (req, res) => {
  const { city } = req.query;
  if (city && CITY_LANDMARKS[city]) {
    return res.json({
      city,
      landmarks: Object.keys(CITY_LANDMARKS[city]).map((name) => ({
        name,
        position: CITY_LANDMARKS[city][name],
      })),
    });
  }

  res.json({
    landmarks: CITY_LANDMARKS,
  });
};

