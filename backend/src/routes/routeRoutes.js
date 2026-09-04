import { Router } from "express";
import { calculateRoute, getAvailableLandmarks } from "../controllers/routeController.js";

const router = Router();

router.post("/calculate", calculateRoute);
router.get("/landmarks", getAvailableLandmarks);

export default router;
