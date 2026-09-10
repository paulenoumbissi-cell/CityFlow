// src/services/weatherService.js
// Service to fetch current weather for a city using OpenWeatherMap (or any configured provider).
// Utilise le cache en mémoire pour éviter les appels répétés (TTL 5 minutes).

import fetch from 'node-fetch';
import cache from './cache.js';

const API_URL = process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5/weather';
// Retrieve API key from environment. If not set, use a placeholder and log a warning.
const API_KEY = process.env.WEATHER_API_KEY || "YOUR_WEATHER_API_KEY";
if (!process.env.WEATHER_API_KEY) {
  console.warn("[WeatherService] WEATHER_API_KEY is not set. Using placeholder key which will likely fail external API calls. Ensure you set a valid key in backend/.env.");
}

/**
 * Retourne les données météo simplifiées pour la ville donnée.
 * @param {string} city - Nom de la ville (ex: "Yaoundé").
 * @returns {Promise<{temperature:number, precipitation:number, windSpeed:number, condition:string}>}
 */
export async function getCurrentWeather(city) {
  const cacheKey = `weather_${city.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const url = `${API_URL}?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch weather for ${city}: ${res.statusText}`);
  }
  const data = await res.json();
  const weather = {
    temperature: data.main.temp,
    precipitation: data.rain?.['1h'] || 0,
    windSpeed: data.wind.speed,
    condition: data.weather?.[0]?.main || 'Clear',
  };
  cache.set(cacheKey, weather, 300); // TTL 300 s (5 min)
  return weather;
}
