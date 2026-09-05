import { Router } from "express";
import {
  getMapConfig,
  searchMapPlaces,
  reverseGeocodeController,
  getLandmarks,
  getMapLayers,
} from "../controllers/mapController.js";

const router = Router();

router.get("/config", getMapConfig);
router.get("/search", searchMapPlaces);
router.get("/reverse", reverseGeocodeController);
router.get("/landmarks", getLandmarks);
router.get("/layers", getMapLayers);

export default router;
