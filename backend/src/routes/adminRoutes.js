import express from "express";
import { getPendingUsers, approveUser, rejectUser } from "../controllers/adminController.js";

const router = express.Router();

router.get("/users/pending", getPendingUsers);
router.post("/users/:id/approve", approveUser);
router.post("/users/:id/reject", rejectUser);

export default router;
