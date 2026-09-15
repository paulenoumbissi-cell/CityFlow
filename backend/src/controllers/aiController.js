import { AiTrafficEngine, WEATHER_CONDITIONS, LOCAL_EVENTS } from "../services/aiTrafficEngine.js";

export const getAiForecast = (req, res) => {
  const city = req.query.city || "Yaoundé";
  const weather = req.query.weather || "dry";
  const targetHour = req.query.hour !== undefined ? parseFloat(req.query.hour) : new Date().getHours();
  const dayOfWeek = req.query.dayOfWeek !== undefined ? parseInt(req.query.dayOfWeek, 10) : new Date().getDay();
  
  // Parse events (comma-separated or array)
  let activeEvents = [];
  if (req.query.events) {
    activeEvents = Array.isArray(req.query.events)
      ? req.query.events
      : req.query.events.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const forecast = AiTrafficEngine.calculateForecast({
    city,
    weather,
    targetHour,
    dayOfWeek,
    activeEvents,
  });

  res.json(forecast);
};

export const getAiAnomalies = (req, res) => {
  const city = req.query.city || "Yaoundé";
  const weather = req.query.weather || "dry";
  const forecast = AiTrafficEngine.calculateForecast({ city, weather });

  res.json({
    city,
    timestamp: new Date().toISOString(),
    anomaliesCount: forecast.anomalies.length,
    anomalies: forecast.anomalies,
  });
};

export const getWeatherConditions = (req, res) => {
  res.json({
    conditions: Object.entries(WEATHER_CONDITIONS).map(([key, value]) => ({
      key,
      ...value,
    })),
  });
};

export const getLocalEvents = (req, res) => {
  res.json({
    events: Object.values(LOCAL_EVENTS),
  });
};

export const simulateTraining = (req, res) => {
  const { epochs = 10, datasetSize = 4250, learningRate = 0.01 } = req.body;

  // Simulate an AI training process which adjusts the internal weights
  // For now, we return mock logs and updated weight examples.
  
  const logs = [];
  let loss = 1.45;
  for (let i = 1; i <= epochs; i++) {
    loss = loss * (0.85 + Math.random() * 0.1);
    logs.push({
      epoch: i,
      loss: parseFloat(loss.toFixed(4)),
      accuracy: parseFloat((min(0.98, 0.70 + (i / epochs) * 0.28)).toFixed(4))
    });
  }

  function min(a, b) { return a < b ? a : b; }

  const updatedWeights = [
    { factor: "heavy_rain_congestion", oldWeight: 1.75, newWeight: 1.82 },
    { factor: "market_day_speed", oldWeight: 0.58, newWeight: 0.54 },
    { factor: "evening_peak_multiplier", oldWeight: 1.85, newWeight: 1.88 }
  ];

  res.json({
    status: "success",
    message: "Training simulation completed",
    datasetProcessed: datasetSize,
    finalLoss: loss.toFixed(4),
    trainingLogs: logs,
    updatedWeights,
    timestamp: new Date().toISOString()
  });
};
