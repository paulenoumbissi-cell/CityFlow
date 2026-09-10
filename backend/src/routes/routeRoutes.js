import { Router } from "express";
import fetch from "node-fetch";
import { calculateRoute, getAvailableLandmarks, searchPlaces } from "../controllers/routeController.js";

const router = Router();

router.post("/calculate", calculateRoute);
router.get("/landmarks", getAvailableLandmarks);
router.get("/search-places", searchPlaces);
router.get("/", async (req, res) => {
  try {
    const { lat, lon, dest, hour } = req.query;
    if (!lat || !lon || !dest) {
      return res.status(400).json({ error: "Missing required query parameters: lat, lon, dest" });
    }
    const start = { lat: parseFloat(lat), lon: parseFloat(lon) };
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dest)}`;
    const geoRes = await fetch(nominatimUrl);
    if (!geoRes.ok) {
      throw new Error(`Geocoding failed: ${geoRes.statusText}`);
    }
    const geoData = await geoRes.json();
    if (!geoData[0]) {
      throw new Error("No results for destination");
    }
    const end = { lat: parseFloat(geoData[0].lat), lon: parseFloat(geoData[0].lon) };
    const geometry = {
      type: "LineString",
      coordinates: [
        [start.lon, start.lat],
        [end.lon, end.lat],
      ],
    };
    const detours = [];
    res.json({ geometry, detours });
  } catch (e) {
    console.error("[Route API] error", e);
    res.status(500).json({ error: e.message || "Failed to compute route" });
  }
});

export default router;
