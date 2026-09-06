import { useState, useEffect } from "react";
import { useCity } from "../context/CityContext";
import { apiService } from "../services/api";

function getTrafficStatus(value) {
  if (value >= 75) {
    return {
      label: "Dense / Saturé",
      className: "prediction-dense",
      icon: "🔴",
    };
  }

  if (value >= 40) {
    return {
      label: "Modéré",
      className: "prediction-moderate",
      icon: "🟠",
    };
  }

  return {
    label: "Fluide",
    className: "prediction-fluid",
    icon: "🟢",
  };
}

function TrafficPrediction() {
  const { selectedCity, setSelectedCity } = useCity();
  const [forecast, setForecast] = useState(null);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    apiService.getAiForecast({ city: selectedCity }).then((res) => {
      if (isMounted && res) {
        setForecast(res);
      }
    });
    return () => { isMounted = false; };
  }, [selectedCity]);

  const nodes = forecast?.nodeForecasts || [];
  const activeNode = nodes[selectedNodeIndex] || nodes[0] || {
    name: "Carrefour Central",
    congestionValue: 50,
    predictions: [
      { horizon: "15 min", congestionPercentage: 55 },
      { horizon: "30 min", congestionPercentage: 65 },
      { horizon: "1h", congestionPercentage: 75 },
      { horizon: "2h", congestionPercentage: 60 },
      { horizon: "3h", congestionPercentage: 40 },
    ],
  };

  const timeLabels = ["Maintenant", "15 min", "30 min", "1h", "2h"];
  const predictionsList = [
    activeNode.congestionValue || 50,
    ...(activeNode.predictions || []).map((p) => p.congestionPercentage).slice(0, 4),
  ];

  return (
    <section className="prediction-page">
      {/* HEADER */}
      <div className="prediction-page-header">
        <div>
          <span className="section-label">
            INTELLIGENCE CITYFLOW
          </span>
          <h2>
            🔮 Prédiction du trafic • {selectedCity}
          </h2>
          <p>
            Anticipez l'évolution de la circulation et adaptez votre trajet en conséquence.
          </p>
        </div>
        <div className="prediction-ai-badge">
          ✨ {forecast?.aiModel || "Analyse intelligente"}
        </div>
      </div>

      {/* FILTRES */}
      <div className="prediction-filters">
        <div className="prediction-filter">
          <label>Ville</label>
          <select
            value={selectedCity}
            onChange={(e) => {
              setSelectedCity(e.target.value);
              setSelectedNodeIndex(0);
            }}
          >
            <option value="Yaoundé">Yaoundé</option>
            <option value="Douala">Douala</option>
          </select>
        </div>

        <div className="prediction-filter">
          <label>Zone / Carrefour</label>
          <select
            value={selectedNodeIndex}
            onChange={(e) => setSelectedNodeIndex(parseInt(e.target.value, 10))}
          >
            {nodes.map((node, idx) => (
              <option key={node.id || idx} value={idx}>
                {node.name}
              </option>
            ))}
import { useState, useEffect } from "react";
import { useCity } from "../context/CityContext";
import { apiService } from "../services/api";

function getTrafficStatus(value) {
  if (value >= 75) {
    return {
      label: "Dense / Saturé",
      className: "prediction-dense",
      icon: "🔴",
    };
  }

  if (value >= 40) {
    return {
      label: "Modéré",
      className: "prediction-moderate",
      icon: "🟠",
    };
  }

  return {
    label: "Fluide",
    className: "prediction-fluid",
    icon: "🟢",
  };
}

function TrafficPrediction() {
  const { selectedCity, setSelectedCity } = useCity();
  const [forecast, setForecast] = useState(null);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;
    apiService.getAiForecast({ city: selectedCity }).then((res) => {
      if (isMounted && res) {
        setForecast(res);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  const nodes = forecast?.nodeForecasts || [];
  const activeNode = nodes[selectedNodeIndex] || nodes[0] || {
    name: "Carrefour Central",
    congestionValue: 50,
    predictions: [
      { horizon: "15 min", congestionPercentage: 55 },
      { horizon: "30 min", congestionPercentage: 65 },
      { horizon: "1h", congestionPercentage: 75 },
      { horizon: "2h", congestionPercentage: 60 },
      { horizon: "3h", congestionPercentage: 40 },
    ],
  };

  const timeLabels = ["Maintenant", "+15 min", "+30 min", "+1h", "+2h"];
  const predictionsList = [
    activeNode.congestionValue || 50,
    ...(activeNode.predictions || []).map((p) => p.congestionPercentage).slice(0, 4),
  ];

  return (
    <section className="prediction-page">
      {/* HEADER */}
      <div className="prediction-page-header">
        <div>
          <span className="section-label">INTELLIGENCE CITYFLOW</span>
          <h2>🔮 Prédiction du trafic • {selectedCity}</h2>
          <p>
            Anticipez l'évolution de la circulation et adaptez votre trajet en conséquence.
          </p>
        </div>
        <div className="prediction-ai-badge">
          ✨ {forecast?.aiModel || "Analyse intelligente"}
        </div>
      </div>

      {/* FILTRES */}
      <div className="prediction-filters">
        <div className="prediction-filter">
          <label>Ville</label>
          <select
            value={selectedCity}
            onChange={(e) => {
              setSelectedCity(e.target.value);
              setSelectedNodeIndex(0);
            }}
          >
            <option value="Yaoundé">Yaoundé</option>
            <option value="Douala">Douala</option>
          </select>
        </div>

        <div className="prediction-filter">
          <label>Zone / Carrefour</label>
          <select
            value={selectedNodeIndex}
            onChange={(e) => setSelectedNodeIndex(parseInt(e.target.value, 10))}
          >
            {nodes.map((node, idx) => (
              <option key={node.id || idx} value={idx}>
                {node.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* CARDS */}
      <div className="prediction-time-grid">
        {predictionsList.map((value, index) => {
          const status = getTrafficStatus(value);
          return (
            <div className="prediction-time-card" key={timeLabels[index] || index}>
              <span>{timeLabels[index] || `H+${index}`}</span>
              <strong>{value}%</strong>
              <div className={`prediction-card-status ${status.className}`}>
                {status.icon} {status.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* GRAPHIQUE */}
      <div className="prediction-chart-card">
        <div className="prediction-chart-header">
          <div>
            <span className="section-label">ÉVOLUTION</span>
            <h3>Évolution prévue du trafic</h3>
          </div>
          <span className="prediction-zone">📍 {activeNode.name}</span>
        </div>

        <div className="prediction-chart">
          {predictionsList.map((value, index) => {
            const height = (value / 100) * 180;
            const status = getTrafficStatus(value);
            return (
              <div className="chart-column" key={timeLabels[index] || index}>
                <div className="chart-value">{value}%</div>
                <div
                  className={`chart-bar ${status.className}`}
                  style={{ height: `${height}px` }}
                ></div>
                <span>{timeLabels[index] || `H+${index}`}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ALERTE */}
      <PredictionAlert
        predictions={predictionsList}
        zone={activeNode.name}
      />
    </section>
  );
}

function PredictionAlert({ predictions, zone }) {
  const futureValues = predictions.slice(1);
  const maxValue = futureValues.length > 0 ? Math.max(...futureValues) : predictions[0];

  if (maxValue >= 75) {
    const index = predictions.indexOf(maxValue);
    return (
      <div className="prediction-alert danger">
        <div className="alert-icon">⚠️</div>
        <div>
          <strong>Risque de congestion élevé</strong>
          <p>
            Une forte congestion pourrait être observée à <b>{zone}</b> d'ici{" "}
            {index * 15} minutes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="prediction-alert success">
      <div className="alert-icon">✅</div>
      <div>
        <strong>Circulation relativement stable</strong>
        <p>
          Aucun risque important de congestion n'est actuellement détecté pour {zone}.
        </p>
      </div>
    </div>
  );
}

export default TrafficPrediction;