// Contrôleur de Calcul d'Itinéraires Multi-Critères, Éco-Mobilité, Segments de Trafic en Direct & OSRM Réel

export const CITY_LANDMARKS = {
  "Yaoundé": {
    // Carrefours & Quartiers majeurs
    "Poste Centrale": { pos: [3.8667, 11.5167], category: "landmark", district: "Centre-Ville", desc: "Boulevard du 20 Mai & Cœur Administratif" },
    "Bastos (Ambassades)": { pos: [3.8890, 11.5120], category: "landmark", district: "Bastos", desc: "Zone Diplomatique & Résidentielle" },
    "Carrefour Nlongkak": { pos: [3.8900, 11.5220], category: "landmark", district: "Nlongkak", desc: "Nœud de liaison vers Bastos et Tsinga" },
    "Mvan (Gare Voyageurs)": { pos: [3.8220, 11.5230], category: "transport", district: "Mvan", desc: "Gare routière interurbaine Axe Sud" },
    "Carrefour Nsam": { pos: [3.8290, 11.5110], category: "landmark", district: "Nsam", desc: "Accès SCDP & Sortie Sud de Yaoundé" },
    "Marché Mokolo": { pos: [3.8730, 11.5030], category: "mall", district: "Mokolo", desc: "Grand marché populaire & Carrefour Madagascar" },
    "Carrefour Odza": { pos: [3.7990, 11.5230], category: "landmark", district: "Odza", desc: "Route de l'Aéroport International" },
    "Ahala (Barrière)": { pos: [3.7850, 11.5050], category: "transport", district: "Ahala", desc: "Entrée / Sortie Axe Lourd Douala-Yaoundé" },
    "Omnisports (Stade Ahmadou Ahidjo)": { pos: [3.8810, 11.5360], category: "landmark", district: "Mfandena", desc: "Complexe sportif & Stade de la Réunification" },
    "Rond-point Warda (Mfoundi)": { pos: [3.8730, 11.5180], category: "landmark", district: "Centre", desc: "Vallée de la mort & Liaison Mfoundi" },
    "Carrefour Tsinga (FECAFOOT)": { pos: [3.8840, 11.5060], category: "landmark", district: "Tsinga", desc: "Siège FECAFOOT & Grande Mosquée" },
    "Carrefour Emombo": { pos: [3.8560, 11.5410], category: "landmark", district: "Emombo", desc: "Liaison Est Yaoundé vers Kondengui" },
    
    // Hôpitaux & Urgences
    "Hôpital Central de Yaoundé (CHU)": { pos: [3.8650, 11.5080], category: "hospital", district: "Centre", desc: "Grand Centre Hospitalier & Service d'Urgence" },
    "Hôpital Général de Yaoundé": { pos: [3.8980, 11.5430], category: "hospital", district: "Ngousso", desc: "Pôle Médical Spécialisé & Urgences Nord" },
    "Hôpital Gynéco-Obstétrique (HGOPY)": { pos: [3.8410, 11.5620], category: "hospital", district: "Ngousso", desc: "Centre de référence Mère et Enfant" },
    "Centre Pasteur du Cameroun": { pos: [3.8690, 11.5150], category: "hospital", district: "Centre", desc: "Laboratoire de santé & Recherche biomédicale" },

    // Enseignement & Universités
    "Université de Yaoundé I (Ngoa-Ekélé)": { pos: [3.8580, 11.5010], category: "university", district: "Ngoa-Ekélé", desc: "Campus universitaire & Faculté des Sciences" },
    "École Nationale Polytechnique (ENSP)": { pos: [3.8620, 11.4980], category: "university", district: "Melen", desc: "Grande école d'ingénieurs du Cameroun" },
    "Université de Yaoundé II (Soa)": { pos: [3.9550, 11.5950], category: "university", district: "Soa", desc: "Faculté de Droit et Sciences Économiques" },

    // Transports & Aéroports
    "Aéroport International de Yaoundé-Nsimalen": { pos: [3.7220, 11.5530], category: "transport", district: "Nsimalen", desc: "Aéroport Principal & Hub Aérien" },
    "Gare Ferroviaire de Yaoundé (Camrail)": { pos: [3.8690, 11.5270], category: "transport", district: "Elig-Essono", desc: "Gare ferroviaire voyageurs vers Ngaoundéré" },

    // Malls & Hôtels
    "Hôtel Hilton Yaoundé": { pos: [3.8670, 11.5190], category: "hotel", district: "Centre", desc: "Hôtel d'affaires 5 étoiles" },
    "Hôtel Mont Fébé": { pos: [3.9140, 11.5150], category: "hotel", district: "Mont Fébé", desc: "Hôtel panoramique sur les collines" },
    "Playce Yaoundé (Carrefour Market)": { pos: [3.8760, 11.5140], category: "mall", district: "Warda", desc: "Centre commercial moderne et supermarché" },
  },
  "Douala": {
    // Carrefours & Quartiers majeurs
    "Carrefour Akwa (Boulevard Liberté)": { pos: [4.0511, 9.7043], category: "landmark", district: "Akwa", desc: "Cœur économique & Zone commerciale" },
    "Rond-point Deido": { pos: [4.0667, 9.7006], category: "landmark", district: "Deido", desc: "Carrefour stratégique vers le Pont sur le Wouri" },
    "Bonanjo (Zone Administrative)": { pos: [4.0430, 9.6910], category: "landmark", district: "Bonanjo", desc: "Services publics, Banques & Port Autonome" },
    "Carrefour Ndokoti (Axe Lourd)": { pos: [4.0450, 9.7420], category: "landmark", district: "Ndokoti", desc: "Grand nœud industriel & Carrefour stratégique" },
    "Carrefour Bonabéri (Ancien Pont)": { pos: [4.0714, 9.6712], category: "landmark", district: "Bonabéri", desc: "Porte d'entrée Ouest de Douala" },
    "Carrefour Bépanda (Omnisports)": { pos: [4.0470, 9.7270], category: "landmark", district: "Bépanda", desc: "Zone urbaine dense & Stade de la Réunification" },
    "Rond-point Bonamoussadi": { pos: [4.0867, 9.7350], category: "landmark", district: "Bonamoussadi", desc: "Centre commercial & Résidentiel Douala Nord" },
    "Carrefour Kotto": { pos: [4.0920, 9.7480], category: "landmark", district: "Kotto", desc: "Quartier résidentiel & Axe vers Logbesou" },
    "Carrefour Logbessou": { pos: [4.1050, 9.7760], category: "landmark", district: "Logbessou", desc: "Campus universitaire & Hôpital Général" },
    "Carrefour Cité des Palmiers": { pos: [4.0610, 9.7680], category: "landmark", district: "Cité des Palmiers", desc: "Zone résidentielle et commerciale Est" },

    // Hôpitaux & Urgences
    "Hôpital Laquintinie de Douala": { pos: [4.0550, 9.7020], category: "hospital", district: "Akwa/Deido", desc: "Hôpital historique & Service d'Urgences 24/7" },
    "Hôpital Général de Douala": { pos: [4.0620, 9.7480], category: "hospital", district: "Logbessou", desc: "Grand Centre Hospitalier de référence" },
    "Hôpital Militaire de Douala": { pos: [4.0420, 9.6950], category: "hospital", district: "Bonanjo", desc: "Soins spécialisés et urgences médicales" },

    // Transports & Aéroports
    "Aéroport International de Douala": { pos: [4.0060, 9.7190], category: "transport", district: "Aéroport", desc: "Principal aéroport international du Cameroun" },
    "Gare Ferroviaire de Bessengué (Camrail)": { pos: [4.0580, 9.7090], category: "transport", district: "Bessengué", desc: "Hub ferroviaire voyageurs et fret" },
    "Port Autonome de Douala (PAD)": { pos: [4.0410, 9.6880], category: "transport", district: "Bonanjo", desc: "Plateforme logistique maritime majeure" },

    // Malls & Hôtels
    "Douala Grand Mall (DGM)": { pos: [4.0090, 9.7170], category: "mall", district: "Aéroport", desc: "Plus grand centre commercial d'Afrique Centrale" },
    "Hôtel Akwa Palace": { pos: [4.0520, 9.7020], category: "hotel", district: "Akwa", desc: "Hôtel de prestige au cœur d'Akwa" },
    "Hôtel Pullman Douala Rabingha": { pos: [4.0440, 9.6920], category: "hotel", district: "Bonanjo", desc: "Hôtel international d'affaires" },
    "Marché Mboppi": { pos: [4.0530, 9.7250], category: "mall", district: "Mboppi", desc: "Grand marché de négoce et textile d'Afrique Centrale" },
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

// Résolution de coordonnées
function resolveCoordinates(point, city = "Yaoundé") {
  if (!point) return null;
  if (Array.isArray(point) && point.length === 2 && typeof point[0] === "number") {
    return [point[0], point[1]];
  }
  if (typeof point === "object" && point.lat !== undefined && point.lng !== undefined) {
    return [parseFloat(point.lat), parseFloat(point.lng)];
  }
  if (typeof point === "string") {
    if (point.includes(",") && !isNaN(parseFloat(point.split(",")[0]))) {
      const parts = point.split(",").map((p) => parseFloat(p.trim()));
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return [parts[0], parts[1]];
      }
    }
    const currentCityLandmarks = CITY_LANDMARKS[city] || CITY_LANDMARKS["Yaoundé"];
    if (currentCityLandmarks[point]) {
      return currentCityLandmarks[point].pos;
    }
    const otherCity = city === "Douala" ? "Yaoundé" : "Douala";
    if (CITY_LANDMARKS[otherCity]?.[point]) {
      return CITY_LANDMARKS[otherCity][point].pos;
    }
    // Recherche floue par nom partiel
    for (const [key, val] of Object.entries(currentCityLandmarks)) {
      if (key.toLowerCase().includes(point.toLowerCase()) || point.toLowerCase().includes(key.toLowerCase())) {
        return val.pos;
      }
    }
  }
  return null;
}

// Générateur de tracé géométrique fallback
function generatePolyline(start, end, variant = 0) {
  const points = [start];
  const steps = 12;
  for (let i = 1; i < steps; i++) {
    const ratio = i / steps;
    const lat = start[0] + (end[0] - start[0]) * ratio;
    const lng = start[1] + (end[1] - start[1]) * ratio;
    
    let latOffset = 0;
    let lngOffset = 0;
    if (variant === 0) {
      latOffset = Math.sin(ratio * Math.PI) * 0.0035;
      lngOffset = Math.cos(ratio * Math.PI) * 0.0025;
    } else if (variant === 1) {
      latOffset = -Math.sin(ratio * Math.PI) * 0.006;
      lngOffset = Math.sin(ratio * Math.PI) * 0.005;
    } else {
      latOffset = Math.cos(ratio * Math.PI) * 0.007;
      lngOffset = -Math.sin(ratio * Math.PI) * 0.006;
    }
    points.push([parseFloat((lat + latOffset).toFixed(5)), parseFloat((lng + lngOffset).toFixed(5))]);
  }
  points.push(end);
  return points;
}

// Découpeur d'itinéraire en segments de congestion et trafic en temps réel
function buildTrafficSegments(coordinates, congestionMultiplier = 1.0) {
  if (!coordinates || coordinates.length < 2) return [];

  const segments = [];
  const totalPoints = coordinates.length;
  const chunkSize = Math.max(3, Math.floor(totalPoints / 4));

  for (let i = 0; i < totalPoints - 1; i += chunkSize - 1) {
    const slice = coordinates.slice(i, Math.min(totalPoints, i + chunkSize));
    if (slice.length < 2) continue;

    // Simulation de niveau de trafic réaliste selon la position dans le trajet
    let status = "fluid";
    let color = "#10B981"; // Vert
    let speedKmh = 45;
    let delay = 0;

    const progressRatio = i / totalPoints;

    if (progressRatio > 0.3 && progressRatio < 0.65) {
      // Zone médiane / carrefour souvent dense
      if (congestionMultiplier > 1.2) {
        status = "jammed";
        color = "#EF4444"; // Rouge vif bouchon
        speedKmh = 9;
        delay = 14;
      } else {
        status = "moderate";
        color = "#F59E0B"; // Orange
        speedKmh = 24;
        delay = 6;
      }
    } else if (progressRatio >= 0.65 && progressRatio < 0.85) {
      status = "moderate";
      color = "#F59E0B"; // Orange
      speedKmh = 28;
      delay = 4;
    }

    segments.push({
      status,
      color,
      speedKmh,
      delayMinutes: delay,
      coordinates: slice,
    });
  }

  return segments;
}

// Appel au serveur OSRM (OpenStreetMap)
async function fetchOsrmRoute(startCoords, endCoords) {
  try {
    const [startLat, startLng] = startCoords;
    const [endLat, endLng] = endCoords;
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`OSRM HTTP error ${response.status}`);
    const data = await response.json();

    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const primaryRoute = data.routes[0];
      const distanceKm = parseFloat((primaryRoute.distance / 1000).toFixed(1));
      const durationMinutes = Math.max(3, Math.round(primaryRoute.duration / 60));
      const coordinates = primaryRoute.geometry.coordinates.map((c) => [c[1], c[0]]);

      const maneuversMap = {
        "turn": "turn-right",
        "new name": "straight",
        "depart": "navigation",
        "arrive": "map-pin",
        "roundabout": "rotate-cw",
        "merge": "git-merge",
        "fork": "split",
        "end of road": "turn-left",
      };

      const steps = primaryRoute.legs?.[0]?.steps?.map((step, idx) => {
        const type = step.maneuver?.type || "straight";
        const modifier = step.maneuver?.modifier || "";
        let maneuverIcon = "navigation";

        if (modifier.includes("right")) maneuverIcon = "arrow-up-right";
        else if (modifier.includes("left")) maneuverIcon = "arrow-up-left";
        else if (type === "roundabout") maneuverIcon = "rotate-cw";
        else if (type === "arrive") maneuverIcon = "map-pin";

        let instruction = step.maneuver?.instruction;
        if (!instruction || instruction.length < 5) {
          if (type === "depart") instruction = "Prendre le départ de l'itinéraire";
          else if (type === "arrive") instruction = "Vous êtes arrivé à votre destination";
          else if (modifier.includes("right")) instruction = `Tourner à droite${step.name ? ` sur ${step.name}` : ""}`;
          else if (modifier.includes("left")) instruction = `Tourner à gauche${step.name ? ` sur ${step.name}` : ""}`;
          else if (type === "roundabout") instruction = `Au rond-point, prendre la ${step.maneuver?.exit || 2}e sortie`;
          else instruction = `Continuer tout droit${step.name ? ` sur ${step.name}` : ""}`;
        }

        return {
          instruction,
          distance: step.distance < 1000 ? `${Math.round(step.distance)} m` : `${(step.distance / 1000).toFixed(1)} km`,
          rawDistanceMeters: Math.round(step.distance),
          action: type,
          modifier,
          maneuverIcon,
          spokenText: `Dans ${step.distance < 1000 ? `${Math.round(step.distance)} mètres` : `${(step.distance / 1000).toFixed(1)} kilomètres`}, ${instruction.toLowerCase()}`,
        };
      }) || [];

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
      CITY_LANDMARKS[city]?.["Poste Centrale"]?.pos ||
      [3.8667, 11.5167];

    const endCoords =
      resolveCoordinates(rawDestCoords, city) ||
      resolveCoordinates(destination, city) ||
      CITY_LANDMARKS[city]?.["Bastos (Ambassades)"]?.pos ||
      [3.8890, 11.5120];

    const baseDistance = calculateDistanceKm(startCoords, endCoords);

    // Essayer de récupérer le tracé routier réel OSRM
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

    // Segments de congestion et état du trafic
    const fastestTrafficSegments = buildTrafficSegments(fastestCoords, 1.35);
    const ecoTrafficSegments = buildTrafficSegments(ecoCoords, 0.9);
    const secureTrafficSegments = buildTrafficSegments(secureCoords, 1.1);

    const defaultSteps = [
      {
        instruction: `Prendre le départ depuis ${typeof origin === "string" ? origin : "votre position"}`,
        distance: "400 m",
        rawDistanceMeters: 400,
        action: "depart",
        maneuverIcon: "navigation",
        spokenText: "Départ immédiat. Suivez l'itinéraire indiqué sur votre écran.",
      },
      {
        instruction: `Rejoindre l'axe principal en direction de ${typeof destination === "string" ? destination : "votre destination"}`,
        distance: `${(fastestDist * 0.4).toFixed(1)} km`,
        rawDistanceMeters: Math.round(fastestDist * 400),
        action: "turn",
        maneuverIcon: "arrow-up-right",
        spokenText: `Dans 400 mètres, tournez à droite sur l'axe principal.`,
      },
      {
        instruction: "Continuer tout droit au carrefour régulé par l'Onde Verte IA",
        distance: `${(fastestDist * 0.4).toFixed(1)} km`,
        rawDistanceMeters: Math.round(fastestDist * 400),
        action: "straight",
        maneuverIcon: "traffic-light",
        spokenText: "Feu vert synchronisé. Poursuivez tout droit sur 1 kilomètre.",
      },
      {
        instruction: `Vous êtes arrivé à destination : ${typeof destination === "string" ? destination : "Destination choisie"}`,
        distance: "200 m",
        rawDistanceMeters: 200,
        action: "arrive",
        maneuverIcon: "map-pin",
        spokenText: "Vous êtes arrivé à votre destination.",
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
        trafficSegments: fastestTrafficSegments,
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
        trafficSegments: ecoTrafficSegments,
        highlights: ["Vitesse stabilisée sans arrêts fréquents", "Réduit l'usure des freins et carburant"],
        coordinates: ecoCoords,
        steps: [
          {
            instruction: "Départ éco-conduite en douceur",
            distance: "500 m",
            rawDistanceMeters: 500,
            action: "depart",
            maneuverIcon: "navigation",
            spokenText: "Départ en allure modérée pour optimiser votre consommation de carburant.",
          },
          {
            instruction: "Emprunter la rocade de contournement fluide à allure modérée (45 km/h)",
            distance: `${(ecoDist * 0.6).toFixed(1)} km`,
            rawDistanceMeters: Math.round(ecoDist * 600),
            action: "turn",
            maneuverIcon: "arrow-up-left",
            spokenText: "Prenez à gauche vers la rocade de contournement fluide.",
          },
          {
            instruction: "Continuer sur la voie dégagée",
            distance: `${(ecoDist * 0.3).toFixed(1)} km`,
            rawDistanceMeters: Math.round(ecoDist * 300),
            action: "straight",
            maneuverIcon: "leaf",
            spokenText: "Trajet fluide sans arrêt. Maintenez une vitesse stable.",
          },
          {
            instruction: "Arrivée à destination avec économie de CO2 validée",
            distance: "150 m",
            rawDistanceMeters: 150,
            action: "arrive",
            maneuverIcon: "map-pin",
            spokenText: "Vous êtes arrivé à destination.",
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
        trafficSegments: secureTrafficSegments,
        highlights: ["Avenue large et éclairée", "Évite les nids-de-poule récents"],
        coordinates: secureCoords,
        steps: [
          {
            instruction: "Départ sur voie prioritaire",
            distance: "300 m",
            rawDistanceMeters: 300,
            action: "depart",
            maneuverIcon: "navigation",
            spokenText: "Départ sur voie large et sécurisée.",
          },
          {
            instruction: "Emprunter l'axe principal à 4 voies éclairées",
            distance: `${(secureDist * 0.7).toFixed(1)} km`,
            rawDistanceMeters: Math.round(secureDist * 700),
            action: "straight",
            maneuverIcon: "shield-check",
            spokenText: "Suivez l'artère principale bien éclairée.",
          },
          {
            instruction: "Arrivée sécurisée à destination",
            distance: "250 m",
            rawDistanceMeters: 250,
            action: "arrive",
            maneuverIcon: "map-pin",
            spokenText: "Vous êtes arrivé à destination.",
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

// Obtenir tous les repères et catégories pour l'autocomplétion Google Maps
export const getAvailableLandmarks = (req, res) => {
  const { city } = req.query;
  const currentCity = city && CITY_LANDMARKS[city] ? city : "Yaoundé";
  const cityData = CITY_LANDMARKS[currentCity];

  const landmarksList = Object.entries(cityData).map(([name, data]) => ({
    name,
    category: data.category,
    district: data.district,
    desc: data.desc,
    position: data.pos,
  }));

  res.json({
    city: currentCity,
    count: landmarksList.length,
    landmarks: landmarksList,
  });
};
