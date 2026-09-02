import { Router } from "express";
import { getTrafficNodes, getPredictions } from "../controllers/trafficController.js";

const router = Router();

router.get("/nodes", getTrafficNodes);
router.get("/predictions", getPredictions);

export default router;
