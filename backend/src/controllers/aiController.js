import { AiTrafficEngine, WEATHER_CONDITIONS, LOCAL_EVENTS } from "../services/aiTrafficEngine.js";
import { fetchLiveWeatherData, getForecastForHour } from "../services/weatherService.js";
import { getLiveTrafficNodes } from "./trafficController.js";

/**
 * Météo en direct réelle issue d'Open-Meteo pour Yaoundé ou Douala
 * GET /api/ai/live-weather?city=Yaoundé
 */
export const getLiveWeather = async (req, res) => {
  try {
    const city = req.query.city || "Yaoundé";
    const data = await fetchLiveWeatherData(city);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Erreur récupération météo en direct", details: error.message });
  }
};

/**
 * Prévisions complètes IA synchronisées avec la météo temps réel
 * GET /api/ai/forecast?city=Yaoundé&hour=17
 */
export const getAiForecast = async (req, res) => {
  try {
    const city = req.query.city || "Yaoundé";
    const weather = req.query.weather || null; // Si null, utilise automatiquement la météo réelle
    const targetHour = req.query.hour !== undefined ? parseFloat(req.query.hour) : new Date().getHours();
    const dayOfWeek = req.query.dayOfWeek !== undefined ? parseInt(req.query.dayOfWeek, 10) : new Date().getDay();

    let activeEvents = [];
    if (req.query.events) {
      activeEvents = Array.isArray(req.query.events)
        ? req.query.events
        : req.query.events.split(",").map((s) => s.trim()).filter(Boolean);
    }

    const liveNodes = getLiveTrafficNodes(city);

    const forecast = await AiTrafficEngine.calculateForecast({
      city,
      weather,
      targetHour,
      dayOfWeek,
      activeEvents,
      liveNodes,
    });

    res.json(forecast);
  } catch (error) {
    res.status(500).json({ error: "Erreur calcul prévisions IA", details: error.message });
  }
};

/**
 * Diagnostic intelligent de trajet futur (Ex: Aller au CRADAT à 17h)
 * POST /api/ai/predict-trip ou GET /api/ai/predict-trip
 */
export const predictTrip = async (req, res) => {
  try {
    const city = req.body.city || req.query.city || "Yaoundé";
    const origin = req.body.origin || req.query.origin || "Poste Centrale";
    const destination = req.body.destination || req.query.destination || "Carrefour CRADAT";
    const departureHour = req.body.departureHour !== undefined
      ? parseFloat(req.body.departureHour)
      : req.query.departureHour !== undefined
      ? parseFloat(req.query.departureHour)
      : 17;
    const departureDate = req.body.departureDate || req.query.departureDate || new Date().toISOString();

    const result = await AiTrafficEngine.predictTripAndHazards({
      city,
      origin,
      destination,
      departureHour,
      departureDate,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Erreur prédiction trajet IA", details: error.message });
  }
};

export const getAiAnomalies = async (req, res) => {
  try {
    const city = req.query.city || "Yaoundé";
    const liveNodes = getLiveTrafficNodes(city);
    const forecast = await AiTrafficEngine.calculateForecast({ city, liveNodes });

    res.json({
      city,
      timestamp: new Date().toISOString(),
      anomaliesCount: forecast.anomalies.length,
      anomalies: forecast.anomalies,
    });
  } catch (error) {
    res.status(500).json({ error: "Erreur anomalies IA", details: error.message });
  }
};

export const getWeatherConditions = (req, res) => {
  res.json({
    conditions: Object.entries(WEATHER_CONDITIONS).map(([key, value]) => ({
      key,
      ...value,
    })),
  });
};

export const getLocalEvents = (req, res) => {
  res.json({
    events: Object.values(LOCAL_EVENTS),
  });
};
