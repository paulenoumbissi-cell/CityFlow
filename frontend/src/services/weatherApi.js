// src/services/weatherApi.js
// Thin client wrapper to fetch weather data for a given location (city name or coordinates)
// The backend exposes GET /api/weather/current?city=<location>

export async function getWeatherByLocation(location) {
  const encoded = encodeURIComponent(location.trim());
  const response = await fetch(`/api/weather/current?city=${encoded}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch weather for ${location}: ${response.statusText}`);
  }
  const data = await response.json();
  // Expected shape: { city, weather, timestamp }
  return data;
}
