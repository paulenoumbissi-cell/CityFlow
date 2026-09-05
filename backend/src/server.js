import http from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import trafficRoutes from "./routes/trafficRoutes.js";
import routeRoutes from "./routes/routeRoutes.js";
import alertRoutes from "./routes/alertRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import emergencyRoutes from "./routes/emergencyRoutes.js";
import mapRoutes from "./routes/mapRoutes.js";
import { initWebSocketServer } from "./services/websocketServer.js";

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
app.use("/api/ai", aiRoutes);
app.use("/api/map", mapRoutes);
app.use("/api", reportRoutes);
app.use("/api/emergency", emergencyRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "CityFlow Backend API & WebSockets",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

const server = http.createServer(app);
initWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`[CityFlow Backend API & WebSockets] running on http://localhost:${PORT}`);
});
