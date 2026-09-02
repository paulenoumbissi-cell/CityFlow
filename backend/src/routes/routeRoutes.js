import { Router } from "express";
import { calculateRoute } from "../controllers/routeController.js";

const router = Router();

router.post("/calculate", calculateRoute);

export default router;
