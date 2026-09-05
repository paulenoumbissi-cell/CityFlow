import { MAP_PROVIDERS, CITIES_CONFIG, searchPlaces, reverseGeocode } from "../services/mapService.js";
import { CITY_LANDMARKS } from "./routeController.js";

/**
 * Configuration complète de l'API cartographique (Tuiles, Villes, Thèmes)
 * GET /api/map/config
 */
export const getMapConfig = (req, res) => {
  const { city = "Yaoundé", theme = "light" } = req.query;
  const currentCityConfig = CITIES_CONFIG[city] || CITIES_CONFIG["Yaoundé"];

  const defaultTile = theme === "dark" ? MAP_PROVIDERS.cartoDark : MAP_PROVIDERS.osmStandard;

  res.json({
    engine: "CityFlow Geospatial Map API",
    version: "2.0.0",
    defaultProvider: defaultTile.id,
    activeCity: currentCityConfig,
    providers: Object.values(MAP_PROVIDERS),
    availableCities: Object.values(CITIES_CONFIG),
    features: {
      dynamicTiles: true,
      darkModeNative: true,
      satelliteLayer: true,
      geocodingNominatim: true,
      reverseGeocoding: true,
      realtimeTrafficOverlay: true,
      ecoRoutes: true,
    },
    attributionNotice: "CityFlow Cartographie Propulsée par OpenStreetMap, CARTO Dark Matter & Nominatim Cameroun",
  });
};

/**
 * Recherche de lieux et carrefours (Géocodage)
 * GET /api/map/search?q=...&city=...
 */
export const searchMapPlaces = async (req, res) => {
  try {
    const { q, city = "Yaoundé" } = req.query;
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: "Le paramètre 'q' (recherche) est requis." });
    }

    const places = await searchPlaces(q, city);
    res.json({
      city,
      query: q,
      count: places.length,
      results: places,
    });
  } catch (err) {
    console.error("[searchMapPlaces Error]", err);
    res.status(500).json({ error: "Erreur lors de la recherche de lieu sur la carte." });
  }
};

/**
 * Géocodage inverse : Coordonnées -> Nom du lieu / Quartier
 * GET /api/map/reverse?lat=...&lon=...&city=...
 */
export const reverseGeocodeController = async (req, res) => {
  try {
    const { lat, lon, lng, city = "Yaoundé" } = req.query;
    const targetLng = lon || lng;

    if (!lat || !targetLng) {
      return res.status(400).json({ error: "Les coordonnées 'lat' et 'lon'/'lng' sont requises." });
    }

    const locationInfo = await reverseGeocode(lat, targetLng, city);
    res.json(locationInfo);
  } catch (err) {
    console.error("[reverseGeocodeController Error]", err);
    res.status(500).json({ error: "Erreur lors du géocodage inverse." });
  }
};

/**
 * Repères et Points d'Intérêt catégorisés (Carrefours, Hôpitaux, Universités, Gares)
 * GET /api/map/landmarks?city=...&category=...
 */
export const getLandmarks = (req, res) => {
  const { city = "Yaoundé", category } = req.query;
  const currentCity = CITY_LANDMARKS[city] ? city : "Yaoundé";
  const cityData = CITY_LANDMARKS[currentCity];

  let landmarksList = Object.entries(cityData).map(([name, data]) => ({
    name,
    category: data.category || "landmark",
    district: data.district || "",
    desc: data.desc || "",
    position: data.pos,
    lat: data.pos[0],
    lng: data.pos[1],
  }));

  if (category && category !== "all") {
    landmarksList = landmarksList.filter((item) => item.category === category);
  }

  res.json({
    city: currentCity,
    category: category || "all",
    count: landmarksList.length,
    landmarks: landmarksList,
  });
};

/**
 * Calques interactifs disponibles sur la carte
 * GET /api/map/layers
 */
export const getMapLayers = (req, res) => {
  res.json({
    layers: [
      {
        id: "traffic_realtime",
        name: "Trafic & Congestion en Direct",
        description: "Visualisation des vitesses et ralentissements aux carrefours clés",
        defaultVisible: true,
        type: "vector_pulse",
      },
      {
        id: "incidents_alerts",
        name: "Signalements & Incidents Citoyens",
        description: "Accidents, obstacles, feux en panne et travaux",
        defaultVisible: true,
        type: "markers",
      },
      {
        id: "emergency_corridors",
        name: "Couloirs Prioritaires d'Urgence",
        description: "Ondes vertes pour ambulances, pompiers et forces de l'ordre",
        defaultVisible: false,
        type: "corridor_polyline",
      },
      {
        id: "hospitals_poi",
        name: "Hôpitaux & Centres de Santé",
        description: "Centres hospitaliers, CHU, Hôpitaux Généraux",
        defaultVisible: true,
        type: "poi",
      },
    ],
  });
};
