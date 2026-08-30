import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Clock3,
  MapPin,
  TrendingUp,
} from "lucide-react";

import "./PredictionPage.css";

const predictionData = {
  Yaoundé: {
    current: 68,
    predictions: [
      { time: "Maintenant", value: 68, level: "Modéré" },
      { time: "15 min", value: 74, level: "Modéré" },
      { time: "30 min", value: 86, level: "Dense" },
      { time: "60 min", value: 61, level: "Modéré" },
    ],
    zones: [
      { name: "Mvan", value: 88, level: "Dense" },
      { name: "Nsam", value: 81, level: "Dense" },
      { name: "Nlongkak", value: 59, level: "Modéré" },
      { name: "Bastos", value: 52, level: "Modéré" },
    ],
  },

  Douala: {
    current: 72,
    predictions: [
      { time: "Maintenant", value: 72, level: "Modéré" },
      { time: "15 min", value: 79, level: "Modéré" },
      { time: "30 min", value: 89, level: "Dense" },
      { time: "60 min", value: 67, level: "Modéré" },
    ],
    zones: [
      { name: "Akwa", value: 91, level: "Dense" },
      { name: "Deido", value: 84, level: "Dense" },
      { name: "Bonabéri", value: 68, level: "Modéré" },
      { name: "Bépanda", value: 61, level: "Modéré" },
    ],
  },
};

function getLevelClass(level) {
  if (level === "Dense") {
    return "dense";
  }

  if (level === "Fluide") {
    return "fluid";
  }

  return "moderate";
}

function PredictionPage() {
  const [selectedCity, setSelectedCity] = useState("Yaoundé");

  const data = predictionData[selectedCity];

  return (
    <main className="prediction-page">

      {/* HEADER */}

      <section className="prediction-page-header">

        <div>

          <span className="prediction-eyebrow">
            <BrainCircuit size={16} />
            INTELLIGENCE CITYFLOW
          </span>

          <h1>
            Anticipez le trafic
          </h1>

          <p>
            Consultez l'évolution estimée de la circulation
            afin de mieux planifier vos déplacements.
          </p>

        </div>

        <div className="prediction-city">

          <MapPin size={18} />

          <select
            value={selectedCity}
            onChange={(event) =>
              setSelectedCity(event.target.value)
            }
          >
            <option value="Yaoundé">
              Yaoundé
            </option>

            <option value="Douala">
              Douala
            </option>
          </select>

        </div>

      </section>


      {/* INDICATEUR PRINCIPAL */}

      <section className="prediction-main-card">

        <div className="prediction-main-left">

          <div className="prediction-main-icon">
            <Activity size={24} />
          </div>

          <div>

            <span>
              Niveau de circulation actuel
            </span>

            <h2>
              {data.current}%
            </h2>

            <strong>
              Trafic modéré
            </strong>

          </div>

        </div>


        <div className="prediction-main-description">

          <div className="live-indicator">
            <span></span>
            DONNÉES ACTUELLES
          </div>

          <p>
            Les conditions de circulation sont analysées
            afin d'estimer leur évolution dans les prochaines
            minutes.
          </p>

        </div>

      </section>


      {/* PREDICTIONS */}

      <section className="prediction-section-page">

        <div className="page-section-heading">

          <div>

            <span className="prediction-eyebrow">
              <Clock3 size={15} />
              ÉVOLUTION
            </span>

            <h2>
              Prévisions de circulation
            </h2>

          </div>

          <span className="city-label">
            📍 {selectedCity}
          </span>

        </div>


        <div className="prediction-cards-page">

          {data.predictions.map((prediction) => (

            <article
              key={prediction.time}
              className={`prediction-time-card ${getLevelClass(
                prediction.level
              )}`}
            >

              <span className="prediction-time">
                {prediction.time}
              </span>

              <strong>
                {prediction.value}%
              </strong>

              <div className="prediction-progress">

                <span
                  style={{
                    width: `${prediction.value}%`,
                  }}
                ></span>

              </div>

              <span className="prediction-level">
                ● {prediction.level}
              </span>

            </article>

          ))}

        </div>

      </section>


      {/* GRAPHIQUE */}

      <section className="prediction-chart-section">

        <div className="page-section-heading">

          <div>

            <span className="prediction-eyebrow">
              <TrendingUp size={15} />
              ANALYSE
            </span>

            <h2>
              Évolution prévue
            </h2>

          </div>

        </div>


        <div className="traffic-chart">

          <div className="chart-y-axis">
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>


          <div className="chart-area">

            <div className="chart-grid-line one"></div>
            <div className="chart-grid-line two"></div>
            <div className="chart-grid-line three"></div>
            <div className="chart-grid-line four"></div>

            <div className="chart-line">

              <span
                className="chart-point point-one"
                style={{
                  bottom: `${data.predictions[0].value}%`,
                }}
              ></span>

              <span
                className="chart-point point-two"
                style={{
                  bottom: `${data.predictions[1].value}%`,
                }}
              ></span>

              <span
                className="chart-point point-three"
                style={{
                  bottom: `${data.predictions[2].value}%`,
                }}
              ></span>

              <span
                className="chart-point point-four"
                style={{
                  bottom: `${data.predictions[3].value}%`,
                }}
              ></span>

            </div>


            <div className="chart-values">

              {data.predictions.map((prediction) => (
                <div key={prediction.time}>
                  <strong>
                    {prediction.value}%
                  </strong>

                  <span>
                    {prediction.time}
                  </span>
                </div>
              ))}

            </div>

          </div>

        </div>

      </section>


      {/* ZONES */}

      <section className="prediction-zones-section">

        <div className="page-section-heading">

          <div>

            <span className="prediction-eyebrow">
              <AlertTriangle size={15} />
              ZONES À SURVEILLER
            </span>

            <h2>
              Zones susceptibles d'être congestionnées
            </h2>

          </div>

        </div>


        <div className="prediction-zones-grid">

          {data.zones.map((zone) => (

            <article
              key={zone.name}
              className="prediction-zone-card"
            >

              <div className="zone-header">

                <div>

                  <MapPin size={17} />

                  <h3>
                    {zone.name}
                  </h3>

                </div>

                <span
                  className={`zone-level ${getLevelClass(
                    zone.level
                  )}`}
                >
                  {zone.level}
                </span>

              </div>


              <div className="zone-value">

                <strong>
                  {zone.value}%
                </strong>

                <span>
                  congestion
                </span>

              </div>


              <div className="zone-progress">

                <span
                  style={{
                    width: `${zone.value}%`,
                  }}
                ></span>

              </div>

            </article>

          ))}

        </div>

      </section>


      {/* EXPLICATION IA */}

      <section className="prediction-info-card">

        <div className="info-icon">
          <BrainCircuit size={25} />
        </div>

        <div>

          <span className="prediction-eyebrow">
            INTELLIGENCE CITYFLOW
          </span>

          <h2>
            Comment fonctionne la prévision ?
          </h2>

          <p>
            CityFlow analyse les données de circulation
            disponibles pour identifier les tendances et
            estimer l'évolution du trafic. Ces prévisions
            pourront ensuite être alimentées directement
            par le modèle d'intelligence artificielle du
            système.
          </p>

        </div>

      </section>

    </main>
  );
}

export default PredictionPage;