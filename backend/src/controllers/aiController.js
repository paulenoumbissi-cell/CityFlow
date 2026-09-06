import { AiTrafficEngine, WEATHER_CONDITIONS, LOCAL_EVENTS } from "../services/aiTrafficEngine.js";

export const getAiForecast = (req, res) => {
  const city = req.query.city || "Yaoundé";
  const weather = req.query.weather || "dry";
  const targetHour = req.query.hour !== undefined ? parseFloat(req.query.hour) : new Date().getHours();
  const dayOfWeek = req.query.dayOfWeek !== undefined ? parseInt(req.query.dayOfWeek, 10) : new Date().getDay();
  
  // Parse events (comma-separated or array)
  let activeEvents = [];
  if (req.query.events) {
    activeEvents = Array.isArray(req.query.events)
      ? req.query.events
      : req.query.events.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const forecast = AiTrafficEngine.calculateForecast({
    city,
    weather,
    targetHour,
    dayOfWeek,
    activeEvents,
  });

  res.json(forecast);
};

export const getAiAnomalies = (req, res) => {
  const city = req.query.city || "Yaoundé";
  const weather = req.query.weather || "dry";
  const forecast = AiTrafficEngine.calculateForecast({ city, weather });

  res.json({
    city,
    timestamp: new Date().toISOString(),
    anomaliesCount: forecast.anomalies.length,
    anomalies: forecast.anomalies,
  });
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

