import { Router } from "express";
import { calculateRoute, getAvailableLandmarks, searchPlaces } from "../controllers/routeController.js";

const router = Router();

router.post("/calculate", calculateRoute);
router.get("/landmarks", getAvailableLandmarks);
router.get("/search-places", searchPlaces);

export default router;
