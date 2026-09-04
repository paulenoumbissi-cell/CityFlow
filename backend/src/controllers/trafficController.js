import { YAOUNDE_NODES, DOUALA_NODES } from "../data/cityData.js";
import { broadcastTrafficPulse } from "../services/websocketServer.js";

// État dynamique en mémoire
let liveYaoundeNodes = JSON.parse(JSON.stringify(YAOUNDE_NODES));
let liveDoualaNodes = JSON.parse(JSON.stringify(DOUALA_NODES));
let lastUpdate = Date.now();

// Moteur de micro-fluctuations temps réel
const updateLiveTrafficState = () => {
  const now = Date.now();
  if (now - lastUpdate < 1500) return; // Limiter la fréquence de calcul à 1.5s
  lastUpdate = now;

  const updateNodes = (list) => {
    return list.map((node) => {
      const speedVariation = (Math.random() * 3.0) - 1.5;
      const newSpeed = Math.min(60.0, Math.max(4.0, parseFloat((node.averageSpeedKmh + speedVariation).toFixed(1))));

      // Calcul dynamique de la congestion
      let currentCongestion;
      let congestionValue;
      let delay;

      if (newSpeed < 10.0) {
        currentCongestion = "jammed";
        congestionValue = Math.min(100, Math.floor(90 + Math.random() * 10));
        delay = Math.floor(30 + Math.random() * 20);
      } else if (newSpeed < 20.0) {
        currentCongestion = "heavy";
        congestionValue = Math.floor(75 + Math.random() * 15);
        delay = Math.floor(15 + Math.random() * 15);
      } else if (newSpeed < 35.0) {
        currentCongestion = "moderate";
        congestionValue = Math.floor(45 + Math.random() * 25);
        delay = Math.floor(5 + Math.random() * 10);
      } else {
        currentCongestion = "fluid";
        congestionValue = Math.floor(15 + Math.random() * 25);
        delay = Math.floor(1 + Math.random() * 4);
      }

      const vehicleVariation = Math.floor(Math.random() * 60) - 30;
      const newVehicles = Math.max(400, Math.min(7000, node.vehicleCountPerHour + vehicleVariation));

      return {
        ...node,
        averageSpeedKmh: newSpeed,
        currentCongestion,
        congestionValue,
        estimatedDelayMinutes: delay,
        vehicleCountPerHour: newVehicles,
      };
    });
  };

  liveYaoundeNodes = updateNodes(liveYaoundeNodes);
  liveDoualaNodes = updateNodes(liveDoualaNodes);

  // Broadcast push via WebSockets
  broadcastTrafficPulse("Yaoundé", liveYaoundeNodes);
  broadcastTrafficPulse("Douala", liveDoualaNodes);
};

// Démarrer la boucle de simulation toutes les 3 secondes
setInterval(updateLiveTrafficState, 3000);

export const getTrafficNodes = (req, res) => {
  updateLiveTrafficState();
  const city = req.query.city || "Yaoundé";
  const isDouala = city.toLowerCase().includes("douala");
  const nodes = isDouala ? liveDoualaNodes : liveYaoundeNodes;

  res.json({
    city: isDouala ? "Douala" : "Yaoundé",
    count: nodes.length,
    timestamp: new Date().toISOString(),
    isLive: true,
    nodes,
  });
};

export const getPredictions = (req, res) => {
  updateLiveTrafficState();
  const city = req.query.city || "Yaoundé";
  const isDouala = city.toLowerCase().includes("douala");
  const nodes = isDouala ? liveDoualaNodes : liveYaoundeNodes;

  // Calcul du résumé global estimé par l'IA
  const avgCongestion = Math.round(
    nodes.reduce((acc, n) => acc + n.congestionValue, 0) / nodes.length
  );

  res.json({
    city: isDouala ? "Douala" : "Yaoundé",
    timestamp: new Date().toISOString(),
    isLive: true,
    summary: {
      now: avgCongestion,
      in15m: Math.min(100, Math.round(avgCongestion * 1.06)),
      in30m: Math.min(100, Math.round(avgCongestion * 1.14)),
      in60m: Math.max(10, Math.round(avgCongestion * 0.88)),
    },
    nodesPredictions: nodes.map((n) => ({
      id: n.id,
      name: n.name,
      current: n.congestionValue,
      predictions: n.predictions,
    })),
  });
};
