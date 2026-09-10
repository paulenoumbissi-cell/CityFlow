/**
 * geoUtils.js — CityFlow Geo-Matching Utilities
 *
 * Algorithmes géodésiques pour le système de notifications
 * contextuelles sur trajet (Haversine + point-to-polyline distance)
 */

const EARTH_RADIUS_METERS = 6371000;

/**
 * Convertit des degrés en radians
 */
function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Calcule la distance Haversine entre deux coordonnées GPS (en mètres)
 */
export function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calcule la distance minimale entre un point GPS
 * et un segment de droite [A → B] sur la surface terrestre.
 */
export function pointToSegmentDistanceMeters(pLat, pLng, aLat, aLng, bLat, bLng) {
  const scale = Math.cos(toRad((aLat + bLat) / 2));

  const ax = aLng * scale;
  const ay = aLat;
  const bx = bLng * scale;
  const by = bLat;
  const px = pLng * scale;
  const py = pLat;

  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;

  const ab2 = abx * abx + aby * aby;

  if (ab2 === 0) {
    return haversineDistanceMeters(pLat, pLng, aLat, aLng);
  }

  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
  const closestLat = aLat + t * (bLat - aLat);
  const closestLng = aLng + t * (bLng - aLng);

  return haversineDistanceMeters(pLat, pLng, closestLat, closestLng);
}

/**
 * Calcule la distance minimale (en mètres) entre un point GPS
 * et une polyligne (liste de coordonnées [[lat, lng], ...]).
 */
export function pointToPolylineDistanceMeters(pLat, pLng, polyline) {
  if (!polyline || polyline.length === 0) return Infinity;
  if (polyline.length === 1) {
    return haversineDistanceMeters(pLat, pLng, polyline[0][0], polyline[0][1]);
  }

  let minDist = Infinity;

  for (let i = 0; i < polyline.length - 1; i++) {
    const [aLat, aLng] = polyline[i];
    const [bLat, bLng] = polyline[i + 1];
    const dist = pointToSegmentDistanceMeters(pLat, pLng, aLat, aLng, bLat, bLng);
    if (dist < minDist) {
      minDist = dist;
    }
  }

  return minDist;
}

/**
 * Vérifie si un incident se trouve à moins de `thresholdMeters`
 * d'une route (polyligne).
 *
 * @param {number} incidentLat
 * @param {number} incidentLng
 * @param {Array<[number, number]>} routeCoordinates - [[lat, lng], ...]
 * @param {number} thresholdMeters - Seuil de détection (défaut: 200m)
 * @returns {{ onRoute: boolean, distanceMeters: number }}
 */
export function isIncidentOnRoute(
  incidentLat,
  incidentLng,
  routeCoordinates,
  thresholdMeters = 200
) {
  const distanceMeters = pointToPolylineDistanceMeters(
    incidentLat,
    incidentLng,
    routeCoordinates
  );

  return {
    onRoute: distanceMeters <= thresholdMeters,
    distanceMeters: Math.round(distanceMeters),
  };
}
