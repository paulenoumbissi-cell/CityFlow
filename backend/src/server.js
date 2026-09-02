import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import trafficRoutes from "./routes/trafficRoutes.js";
import routeRoutes from "./routes/routeRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({ origin: "*" }));
app.use(express.json());

// Routes API
app.use("/api/traffic", trafficRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/auth", authRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "CityFlow Backend API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`[CityFlow Backend API] running on http://localhost:${PORT}`);
});
