import { Clock, CloudRain, CalendarDays, Construction } from "lucide-react";

export default function PredictionFactors({ isPeakHour, rainMm = 0, hasEvent = false, roadDegraded = false }) {
  const factors = [
    {
      icon: <Clock size={16} />,
      label: isPeakHour ? "Heure de pointe" : "Heure creuse",
      active: isPeakHour,
      type: "time",
    },
    {
      icon: <CloudRain size={16} />,
      label: rainMm > 0 ? `Pluie (${rainMm} mm)` : "Pas de pluie prévue",
      active: rainMm > 0,
      type: "rain",
    },
    {
      icon: <CalendarDays size={16} />,
      label: hasEvent ? "Évènement à proximité" : "Aucun évènement",
      active: hasEvent,
      type: "event",
    },
    {
      icon: <Construction size={16} />,
      label: roadDegraded ? "Route dégradée signalée" : "Chaussée en état normal",
      active: roadDegraded,
      type: "road",
    },
  ];

  return (
    <div className="prediction-factors">
      <h3 className="prediction-factors__title">Facteurs déterminants analysés</h3>
      <div className="prediction-factors__grid">
        {factors.map((f) => (
          <div
            key={f.label}
            className={`prediction-factors__item ${f.active ? "prediction-factors__item--active" : ""}`}
          >
            <span className="prediction-factors__icon">{f.icon}</span>
            <span className="prediction-factors__label">{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
