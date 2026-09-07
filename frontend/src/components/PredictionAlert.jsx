import { CloudRain, CalendarClock, ShieldCheck, GraduationCap, ShoppingBag, Construction, AlertTriangle } from "lucide-react";

const CAUSE_ICONS = {
  "la pluie": <CloudRain size={15} />,
  "un orage violent": <CloudRain size={15} />,
  "un évènement à proximité": <CalendarClock size={15} />,
  "l'affluence de pointe": <CalendarClock size={15} />,
  "la sortie des cours et amphis": <GraduationCap size={15} />,
  "l'affluence du grand marché": <ShoppingBag size={15} />,
  "des travaux de voirie": <Construction size={15} />,
  "l'état dégradé de la chaussée": <AlertTriangle size={15} />,
};

export default function PredictionAlert({ message, confidence = 0.85, causes = [] }) {
  if (!message) {
    return (
      <div className="prediction-alert prediction-alert--calm">
        <div className="prediction-alert__icon-wrap">
          <ShieldCheck size={22} className="text-emerald-500" />
        </div>
        <div className="prediction-alert__content">
          <strong className="prediction-alert__title">Aucun bouchon critique prévu</strong>
          <p className="prediction-alert__desc">La circulation devrait rester fluide sur les 2 prochaines heures.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="prediction-alert prediction-alert--warning">
      <div className="prediction-alert__icon-wrap">
        <span className="prediction-alert__emoji">⚠️</span>
      </div>
      <div className="prediction-alert__content">
        <strong className="prediction-alert__title">{message}</strong>
        {causes && causes.length > 0 && (
          <div className="prediction-alert__causes">
            {causes.map((c) => (
              <span key={c} className="prediction-alert__cause-chip">
                {CAUSE_ICONS[c] || <CloudRain size={15} />} {c}
              </span>
            ))}
          </div>
        )}
        <p className="prediction-alert__confidence">
          Fiabilité estimée du modèle IA : <strong>{Math.round(confidence * 100)}%</strong>
        </p>
      </div>
    </div>
  );
}
