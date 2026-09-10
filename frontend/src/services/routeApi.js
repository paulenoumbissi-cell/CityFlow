// src/services/routeApi.js
// Wrapper to request a route (including possible detours) from the backend.
// The backend returns a GeoJSON Feature for the main route and an array of detour Features.

export async function fetchRoute(startCoords, destination, hour) {
  const url = `/api/routes?lat=${startCoords[0]}&lon=${startCoords[1]}&dest=${encodeURIComponent(
    destination,
  )}&hour=${hour}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch route: ${response.statusText}`);
  }
  return response.json(); // { geometry, detours }
}
