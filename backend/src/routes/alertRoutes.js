import { Router } from "express";
import { getAlerts, markAsRead } from "../controllers/alertController.js";

const router = Router();

router.get("/", getAlerts);
router.patch("/:id/read", markAsRead);

export default router;
