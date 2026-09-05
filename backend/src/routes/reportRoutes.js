import { Router } from "express";
import {
  getCitizenReports,
  createCitizenReport,
  voteCitizenReport,
  getCitizenProfile,
  getRewardsCatalog,
  subscribeWithDiscount,
} from "../controllers/citizenReportController.js";

const router = Router();

// Routes des signalements citoyens
router.get("/reports", getCitizenReports);
router.post("/reports", createCitizenReport);
router.post("/reports/:id/vote", voteCitizenReport);

// Routes des abonnements & réductions citoyennes directes
router.get("/rewards/profile", getCitizenProfile);
router.get("/rewards/catalog", getRewardsCatalog);
router.post("/rewards/subscribe", subscribeWithDiscount);

export default router;

