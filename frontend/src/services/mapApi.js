// src/services/mapApi.js
// Wrapper to fetch map configuration (tile providers, city config, etc.) from the backend.
// Returns the JSON payload from `/api/map/config`.

export async function fetchMapConfig(city = "Yaoundé") {
  const url = `/api/map/config?city=${encodeURIComponent(city)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch map config: ${response.statusText}`);
  }
  return response.json();
}
