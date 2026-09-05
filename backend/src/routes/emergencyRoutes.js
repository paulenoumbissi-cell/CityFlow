import { Router } from "express";
import {
  dispatchEmergencyMission,
  getActiveEmergencyMission,
  stepEmergencyMission,
  cancelEmergencyMission,
  getEmergencyBroadcast,
  getEmergencyHospitals,
  calculateCustomEmergencyCorridor,
  getEmergencyMissionHistory,
  interveneOnReport,
} from "../controllers/emergencyController.js";

const router = Router();

// Routes principales de gestion des missions
router.post("/dispatch", dispatchEmergencyMission);
router.get("/active", getActiveEmergencyMission);
router.post("/step", stepEmergencyMission);
router.post("/cancel", cancelEmergencyMission);
router.get("/broadcast", getEmergencyBroadcast);

// Nouvelles routes dynamiques pour le mode urgence
router.get("/hospitals", getEmergencyHospitals);
router.post("/calculate-custom", calculateCustomEmergencyCorridor);
router.get("/history", getEmergencyMissionHistory);
router.post("/intervene-report", interveneOnReport);

export default router;
