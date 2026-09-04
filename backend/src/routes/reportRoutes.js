import { Router } from "express";
import {
  getCitizenReports,
  createCitizenReport,
  voteCitizenReport,
  getCitizenProfile,
  getRewardsCatalog,
  redeemReward,
} from "../controllers/citizenReportController.js";

const router = Router();

// Routes des signalements citoyens
router.get("/reports", getCitizenReports);
router.post("/reports", createCitizenReport);
router.post("/reports/:id/vote", voteCitizenReport);

// Routes des récompenses & gamification
router.get("/rewards/profile", getCitizenProfile);
router.get("/rewards/catalog", getRewardsCatalog);
router.post("/rewards/redeem", redeemReward);

export default router;
