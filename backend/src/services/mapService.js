// Service de Cartographie CityFlow (OpenStreetMap France, OSM Standard, Esri & Nominatim Cameroun)
import { CITY_LANDMARKS } from "../controllers/routeController.js";

// Configuration des fonds de carte 100% Gratuits et Sans Clé API
export const MAP_PROVIDERS = {
  osmFrance: {
    id: "osmFrance",
    name: "OpenStreetMap France (Noms des rues & quartiers en Français)",
    url: "https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> France & contributeurs',
    subdomains: "abc",
    maxZoom: 19,
    theme: "light",
  },
  osmStandard: {
    id: "osmStandard",
    name: "OpenStreetMap Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributeurs',
    subdomains: "abc",
    maxZoom: 19,
    theme: "light",
  },
  esriStreet: {
    id: "esriStreet",
    name: "Esri Rues & Axes Routiers",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Sources: Esri, DeLorme, NAVTEQ, USGS",
    maxZoom: 19,
    theme: "light",
  },
  esriSatellite: {
    id: "esriSatellite",
    name: "Esri Imagerie Satellite Haute Résolution",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP",
    maxZoom: 18,
    theme: "satellite",
  },
  openTopoMap: {
    id: "openTopoMap",
    name: "Relief & Topographie (Collines)",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Style: OpenTopoMap',
    subdomains: "abc",
    maxZoom: 17,
    theme: "topo",
  },
};

// Villes supportées et leurs boîtes de délimitation (Bounding Box)
export const CITIES_CONFIG = {
  "Yaoundé": {
    name: "Yaoundé",
    country: "Cameroun",
    center: [3.8667, 11.5167],
    zoom: 13,
    minZoom: 11,
    maxZoom: 18,
    bounds: [
      [3.70, 11.40],
      [4.02, 11.65],
    ],
    description: "Capitale politique du Cameroun aux sept collines",
  },
  "Douala": {
    name: "Douala",
    country: "Cameroun",
    center: [4.0511, 9.7043],
    zoom: 13,
    minZoom: 11,
    maxZoom: 18,
    bounds: [
      [3.95, 9.60],
      [4.18, 9.85],
    ],
    description: "Capitale économique et portuaire du Cameroun",
  },
};

// Cache en mémoire pour les recherches Nominatim
const geocodeCache = new Map();

/**
 * Recherche de lieux / Géocodage via Nominatim OpenStreetMap avec secours local
 */
export async function searchPlaces(query, city = "Yaoundé") {
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return [];
  }

  const cleanQuery = query.trim().toLowerCase();
  const cacheKey = `${city}_${cleanQuery}`;

  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  const results = [];
  const cityLandmarks = CITY_LANDMARKS[city] || CITY_LANDMARKS["Yaoundé"];

  // 1. Recherche dans les repères locaux prédéfinis de la ville
  for (const [name, data] of Object.entries(cityLandmarks)) {
    if (name.toLowerCase().includes(cleanQuery) || data.district?.toLowerCase().includes(cleanQuery) || data.desc?.toLowerCase().includes(cleanQuery)) {
      results.push({
        id: `local_${name.replace(/\s+/g, "_")}`,
        name,
        category: data.category || "landmark",
        district: data.district || city,
        address: `${name}, ${data.district ? data.district + ", " : ""}${city}, Cameroun`,
        lat: data.pos[0],
        lng: data.pos[1],
        source: "cityflow_core",
        confidence: 0.95,
      });
    }
  }

  // 2. Requête externe Nominatim (OpenStreetMap) avec cadrage Cameroun
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const searchQuery = `${query}, ${city}, Cameroun`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=5&countrycodes=cm`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "CityFlow-Cameroon-TrafficApp/1.0 (contact@cityflow.cm)",
        "Accept-Language": "fr",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const osmData = await res.json();
      for (const item of osmData) {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);
        const isDuplicate = results.some((r) => Math.abs(r.lat - lat) < 0.001 && Math.abs(r.lng - lon) < 0.001);
        if (!isDuplicate) {
          results.push({
            id: `osm_${item.place_id}`,
            name: item.name || item.display_name.split(",")[0],
            category: item.type || "place",
            district: item.address?.suburb || item.address?.neighbourhood || city,
            address: item.display_name,
            lat,
            lng: lon,
            source: "openstreetmap_nominatim",
            confidence: item.importance || 0.8,
          });
        }
      }
    }
  } catch (err) {
    console.info(`[MapService Search Nominatim] Mode hors-ligne / fallback local: ${err.message}`);
  }

  if (geocodeCache.size > 100) {
    const firstKey = geocodeCache.keys().next().value;
    geocodeCache.delete(firstKey);
  }
  geocodeCache.set(cacheKey, results);

  return results;
}

/**
 * Géocodage inverse : Coordonnées (Lat, Lng) -> Adresse / Quartier
 */
export async function reverseGeocode(lat, lng, city = "Yaoundé") {
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  if (isNaN(latNum) || isNaN(lngNum)) {
    return { error: "Coordonnées invalides" };
  }

  const cacheKey = `rev_${latNum.toFixed(4)}_${lngNum.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  // 1. Trouver le repère local le plus proche
  let nearestLandmark = null;
  let minDistance = Infinity;

  const cityLandmarks = CITY_LANDMARKS[city] || CITY_LANDMARKS["Yaoundé"];
  for (const [name, data] of Object.entries(cityLandmarks)) {
    const dLat = (data.pos[0] - latNum) * 111;
    const dLng = (data.pos[1] - lngNum) * 111 * Math.cos((latNum * Math.PI) / 180);
    const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
    if (distKm < minDistance) {
      minDistance = distKm;
      nearestLandmark = { name, ...data, distKm: parseFloat(distKm.toFixed(2)) };
    }
  }

  // 2. Appel Nominatim reverse
  let osmAddress = null;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latNum}&lon=${lngNum}&format=json&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "CityFlow-Cameroon-TrafficApp/1.0 (contact@cityflow.cm)",
        "Accept-Language": "fr",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      osmAddress = data;
    }
  } catch (err) {
    console.info(`[MapService Reverse Nominatim] Mode hors-ligne / fallback: ${err.message}`);
  }

  const result = {
    lat: latNum,
    lng: lngNum,
    city,
    displayName: osmAddress?.display_name || (nearestLandmark ? `Près de ${nearestLandmark.name} (${nearestLandmark.district}), ${city}` : `Position [${latNum.toFixed(4)}, ${lngNum.toFixed(4)}], ${city}`),
    road: osmAddress?.address?.road || osmAddress?.address?.pedestrian || null,
    district: osmAddress?.address?.suburb || osmAddress?.address?.neighbourhood || nearestLandmark?.district || city,
    nearestLandmark: nearestLandmark ? { name: nearestLandmark.name, distanceMeters: Math.round(nearestLandmark.distKm * 1000), district: nearestLandmark.district } : null,
    source: osmAddress ? "openstreetmap_nominatim" : "cityflow_local_proximity",
  };

  geocodeCache.set(cacheKey, result);
  return result;
}
