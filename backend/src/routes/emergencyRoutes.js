import { Router } from "express";
import {
  dispatchEmergencyMission,
  getActiveEmergencyMission,
  stepEmergencyMission,
  cancelEmergencyMission,
  getEmergencyBroadcast,
} from "../controllers/emergencyController.js";

const router = Router();

router.post("/dispatch", dispatchEmergencyMission);
router.get("/active", getActiveEmergencyMission);
router.post("/step", stepEmergencyMission);
router.post("/cancel", cancelEmergencyMission);
router.get("/broadcast", getEmergencyBroadcast);

export default router;
