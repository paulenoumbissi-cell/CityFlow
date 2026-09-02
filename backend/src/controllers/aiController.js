import { AiTrafficEngine, WEATHER_CONDITIONS } from "../services/aiTrafficEngine.js";

export const getAiForecast = (req, res) => {
  const city = req.query.city || "Yaoundé";
  const weather = req.query.weather || "dry";
  const targetHour = req.query.hour ? parseInt(req.query.hour, 10) : new Date().getHours();

  const forecast = AiTrafficEngine.calculateForecast({ city, weather, targetHour });
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
