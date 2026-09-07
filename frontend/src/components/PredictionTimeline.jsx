const LEVEL_HEIGHT = {
  fluide: 25,
  ralenti: 50,
  embouteillage: 75,
  bloque: 100,
};

const LEVEL_LABEL = {
  fluide: "Fluide",
  ralenti: "Ralenti",
  embouteillage: "Embouteillage",
  bloque: "Bloqué",
};

const LEVEL_COLOR = {
  fluide: "#10B981",
  ralenti: "#F59E0B",
  embouteillage: "#EA580C",
  bloque: "#DC2626",
};

export default function PredictionTimeline({ points = [] }) {
  if (!points || points.length === 0) {
    return null;
  }

  return (
    <div className="prediction-timeline">
      <div className="prediction-timeline__header">
        <h4 className="prediction-timeline__title">Évolution estimée du trafic sur 2 heures</h4>
        <div className="prediction-timeline__legend">
          <span className="legend-item"><span className="legend-dot dot-green" /> Fluide</span>
          <span className="legend-item"><span className="legend-dot dot-yellow" /> Ralenti</span>
          <span className="legend-item"><span className="legend-dot dot-orange" /> Bouchon</span>
          <span className="legend-item"><span className="legend-dot dot-red" /> Bloqué</span>
        </div>
      </div>
      <div className="prediction-timeline__bars">
        {points.map((p) => {
          const height = LEVEL_HEIGHT[p.level] || 25;
          const color = LEVEL_COLOR[p.level] || "#94A3B8";
          const label = LEVEL_LABEL[p.level] || p.level;

          return (
            <div key={p.horizon_minutes} className="prediction-timeline__col">
              <span className="prediction-timeline__score">{p.score}/10</span>
              <div className="prediction-timeline__bar-track">
                <div
                  className="prediction-timeline__bar"
                  style={{
                    height: `${height}%`,
                    background: color,
                  }}
                  title={`Dans ${p.horizon_minutes} min : ${label} (${p.score}/10)`}
                />
              </div>
              <span className="prediction-timeline__label">
                {p.horizon_minutes < 60 ? `+${p.horizon_minutes}m` : `+${p.horizon_minutes / 60}h`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
