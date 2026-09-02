import express from "express";
import { getAiForecast, getAiAnomalies, getWeatherConditions } from "../controllers/aiController.js";

const router = express.Router();

// GET /api/ai/forecast?city=Yaoundé&weather=dry&hour=18
router.get("/forecast", getAiForecast);

// GET /api/ai/anomalies?city=Yaoundé
router.get("/anomalies", getAiAnomalies);

// GET /api/ai/weather-options
router.get("/weather-options", getWeatherConditions);

export default router;
