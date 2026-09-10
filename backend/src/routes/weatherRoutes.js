// src/routes/weatherRoutes.js
import express from "express";
import { getCurrentWeather } from "../services/weatherService.js";

const router = express.Router();

// GET /api/weather/current?city=Yaoundé
router.get("/current", async (req, res) => {
  const city = req.query.city || "Yaoundé";
  try {
    const weather = await getCurrentWeather(city);
    res.json({ city, weather, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error("[Weather API] error", err);
    res.status(500).json({ error: err.message || "Failed to fetch weather" });
  }
});

export default router;
