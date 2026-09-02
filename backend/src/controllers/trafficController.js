import { YAOUNDE_NODES, DOUALA_NODES } from "../data/cityData.js";

export const getTrafficNodes = (req, res) => {
  const city = req.query.city || "Yaoundé";
  const nodes = city.toLowerCase().includes("douala") ? DOUALA_NODES : YAOUNDE_NODES;
  
  res.json({
    city,
    count: nodes.length,
    timestamp: new Date().toISOString(),
    nodes,
  });
};

export const getPredictions = (req, res) => {
  const city = req.query.city || "Yaoundé";
  const nodes = city.toLowerCase().includes("douala") ? DOUALA_NODES : YAOUNDE_NODES;

  // Calcul du résumé global estimé par l'IA
  const avgCongestion = Math.round(
    nodes.reduce((acc, n) => acc + n.congestionValue, 0) / nodes.length
  );

  res.json({
    city,
    timestamp: new Date().toISOString(),
    summary: {
      now: avgCongestion,
      in15m: Math.min(100, Math.round(avgCongestion * 1.08)),
      in30m: Math.min(100, Math.round(avgCongestion * 1.15)),
      in60m: Math.max(10, Math.round(avgCongestion * 0.85)),
    },
    nodesPredictions: nodes.map((n) => ({
      id: n.id,
      name: n.name,
      current: n.congestionValue,
      predictions: n.predictions,
    })),
  });
};
