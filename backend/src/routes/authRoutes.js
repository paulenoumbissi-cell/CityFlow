import { Router } from "express";
import { login, register, updateProfile } from "../controllers/authController.js";

const router = Router();

router.post("/login", login);
router.post("/register", register);
router.put("/profile", updateProfile);

export default router;
