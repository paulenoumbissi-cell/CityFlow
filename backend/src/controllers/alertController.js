import { INCIDENT_ALERTS } from "../data/cityData.js";

let alerts = [...INCIDENT_ALERTS];

export const getAlerts = (req, res) => {
  const city = req.query.city;
  let filtered = alerts;
  if (city && city !== "all") {
    filtered = alerts.filter((a) => a.city.toLowerCase() === city.toLowerCase());
  }

  res.json({
    count: filtered.length,
    timestamp: new Date().toISOString(),
    alerts: filtered,
  });
};

export const markAsRead = (req, res) => {
  const { id } = req.params;
  const alert = alerts.find((a) => a.id === id);
  if (alert) {
    alert.read = true;
    return res.json({ success: true, alert });
  }
  res.status(404).json({ error: "Alerte non trouvée" });
};
