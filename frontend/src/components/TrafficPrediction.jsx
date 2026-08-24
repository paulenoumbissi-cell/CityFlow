import { useState } from "react";

const predictionData = {
  Yaoundé: {
    Mvan: {
      current: 68,
      predictions: [68, 74, 86, 82, 61],
    },

    Nsam: {
      current: 76,
      predictions: [76, 81, 89, 92, 78],
    },

    Bastos: {
      current: 52,
      predictions: [52, 55, 61, 58, 49],
    },

    Nlongkak: {
      current: 59,
      predictions: [59, 64, 72, 69, 57],
    },
  },

  Douala: {
    Akwa: {
      current: 82,
      predictions: [82, 87, 93, 90, 79],
    },

    Deido: {
      current: 78,
      predictions: [78, 84, 89, 86, 73],
    },

    Bépanda: {
      current: 61,
      predictions: [61, 67, 74, 70, 58],
    },

    Bonamoussadi: {
      current: 31,
      predictions: [31, 35, 42, 39, 30],
    },
  },
};

function getTrafficStatus(value) {
  if (value >= 80) {
    return {
      label: "Dense",
      className: "prediction-dense",
      icon: "🔴",
    };
  }

  if (value >= 50) {
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
  const [city, setCity] = useState("Yaoundé");
  const [zone, setZone] = useState("Mvan");

  const cityData = predictionData[city];
  const data = cityData[zone];

  const timeLabels = [
    "Maintenant",
    "15 min",
    "30 min",
    "45 min",
    "60 min",
  ];

  const maxValue = Math.max(...data.predictions);

  return (
    <section className="prediction-page">

      {/* HEADER */}

      <div className="prediction-page-header">

        <div>

          <span className="section-label">
            INTELLIGENCE CITYFLOW
          </span>

          <h2>
            🔮 Prédiction du trafic
          </h2>

          <p>
            Anticipez l'évolution de la circulation et
            adaptez votre trajet en conséquence.
          </p>

        </div>

        <div className="prediction-ai-badge">
          ✨ Analyse intelligente
        </div>

      </div>

      {/* FILTRES */}

      <div className="prediction-filters">

        <div className="prediction-filter">

          <label>Ville</label>

          <select
            value={city}
            onChange={(event) => {
              const newCity = event.target.value;

              setCity(newCity);

              setZone(
                Object.keys(predictionData[newCity])[0]
              );
            }}
          >

            <option value="Yaoundé">
              Yaoundé
            </option>

            <option value="Douala">
              Douala
            </option>

          </select>

        </div>

        <div className="prediction-filter">

          <label>Zone</label>

          <select
            value={zone}
            onChange={(event) =>
              setZone(event.target.value)
            }
          >

            {Object.keys(cityData).map((zoneName) => (
              <option
                key={zoneName}
                value={zoneName}
              >
                {zoneName}
              </option>
            ))}

          </select>

        </div>

      </div>

      {/* CARDS */}

      <div className="prediction-time-grid">

        {data.predictions.slice(0, 4).map(
          (value, index) => {

            const status = getTrafficStatus(value);

            return (
              <div
                className="prediction-time-card"
                key={timeLabels[index]}
              >

                <span>
                  {timeLabels[index]}
                </span>

                <strong>
                  {value}%
                </strong>

                <div
                  className={`prediction-card-status ${status.className}`}
                >
                  {status.icon} {status.label}
                </div>

              </div>
            );
          }
        )}

      </div>

      {/* GRAPHIQUE */}

      <div className="prediction-chart-card">

        <div className="prediction-chart-header">

          <div>

            <span className="section-label">
              ÉVOLUTION
            </span>

            <h3>
              Évolution prévue du trafic
            </h3>

          </div>

          <span className="prediction-zone">
            📍 {zone}
          </span>

        </div>

        <div className="prediction-chart">

          {data.predictions.map(
            (value, index) => {

              const height =
                (value / 100) * 180;

              const status =
                getTrafficStatus(value);

              return (
                <div
                  className="chart-column"
                  key={timeLabels[index]}
                >

                  <div className="chart-value">
                    {value}%
                  </div>

                  <div
                    className={`chart-bar ${status.className}`}
                    style={{
                      height: `${height}px`,
                    }}
                  ></div>

                  <span>
                    {timeLabels[index]}
                  </span>

                </div>
              );
            }
          )}

        </div>

      </div>

      {/* ALERTE */}

      <PredictionAlert
        predictions={data.predictions}
        zone={zone}
      />

    </section>
  );
}

function PredictionAlert({ predictions, zone }) {

  const futureValues = predictions.slice(1);

  const maxValue = Math.max(...futureValues);

  if (maxValue >= 80) {

    const index =
      predictions.indexOf(maxValue);

    return (
      <div className="prediction-alert danger">

        <div className="alert-icon">
          ⚠️
        </div>

        <div>

          <strong>
            Risque de congestion élevé
          </strong>

          <p>
            Une forte congestion pourrait être
            observée à <b>{zone}</b> dans environ{" "}
            {index * 15} minutes.
          </p>

        </div>

      </div>
    );
  }

  return (
    <div className="prediction-alert success">

      <div className="alert-icon">
        ✅
      </div>

      <div>

        <strong>
          Circulation relativement stable
        </strong>

        <p>
          Aucun risque important de congestion
          n'est actuellement détecté pour cette zone.
        </p>

      </div>

    </div>
  );
}

export default TrafficPrediction;