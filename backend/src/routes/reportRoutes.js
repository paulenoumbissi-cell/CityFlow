import { Router } from "express";
import {
  getCitizenReports,
  createCitizenReport,
  voteCitizenReport,
  getCitizenProfile,
  getRewardsCatalog,
  subscribeWithDiscount,
  getRadioMessages,
  postRadioMessage,
  likeRadioMessage,
  getSosRequests,
  createSosRequest,
  respondToSosRequest,
} from "../controllers/citizenReportController.js";

const router = Router();

// Routes des signalements citoyens
router.get("/reports", getCitizenReports);
router.post("/reports", createCitizenReport);
router.post("/reports/:id/vote", voteCitizenReport);

// Routes Canal Radio-Trafic & Tchat d'Entraide
router.get("/reports/radio-chat", getRadioMessages);
router.post("/reports/radio-chat", postRadioMessage);
router.post("/reports/radio-chat/:id/like", likeRadioMessage);

// Routes SOS Dépannage & Assistance Rapide
router.get("/reports/sos", getSosRequests);
router.post("/reports/sos", createSosRequest);
router.post("/reports/sos/:id/respond", respondToSosRequest);

// Routes des abonnements & réductions citoyennes directes
router.get("/rewards/profile", getCitizenProfile);
router.get("/rewards/catalog", getRewardsCatalog);
router.post("/rewards/subscribe", subscribeWithDiscount);

export default router;


