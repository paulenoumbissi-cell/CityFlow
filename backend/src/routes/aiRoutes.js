import express from "express";
import {
  getAiForecast,
  getAiAnomalies,
  getWeatherConditions,
  getLocalEvents,
  getLiveWeather,
  predictTrip,
} from "../controllers/aiController.js";

const router = express.Router();

// GET /api/ai/live-weather?city=Yaoundé (Météo réelle en direct Open-Meteo)
router.get("/live-weather", getLiveWeather);

// GET /api/ai/forecast?city=Yaoundé&hour=17 (Prévisions temps réel automatiques)
router.get("/forecast", getAiForecast);

// POST ou GET /api/ai/predict-trip (Analyse intelligente d'un trajet et prédiction d'obstacles / météo à une heure future)
router.get("/predict-trip", predictTrip);
router.post("/predict-trip", predictTrip);

// GET /api/ai/anomalies?city=Yaoundé
router.get("/anomalies", getAiAnomalies);

// GET /api/ai/weather-options
router.get("/weather-options", getWeatherConditions);

// GET /api/ai/events
router.get("/events", getLocalEvents);

export default router;
