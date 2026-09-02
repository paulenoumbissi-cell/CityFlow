import {
  Map,
  Activity,
  MapPin,
  Navigation,
  Clock3,
} from "lucide-react";

import CityMap from "../components/CityMap";

import "./MapPage.css";

function MapPage() {
  return (
    <main className="map-page">

      {/* HEADER */}

      <section className="map-page-header">

        <div className="map-page-title">

          <span className="map-page-eyebrow">
            <Activity size={16} />
            SURVEILLANCE DU TRAFIC
          </span>

          <h1>
            Carte du trafic
          </h1>

          <p>
            Visualisez l'état actuel de la circulation
            à Yaoundé et Douala.
          </p>

        </div>

        <div className="map-page-status">

          <span className="status-dot"></span>

          Données de démonstration

        </div>

      </section>


      {/* CARTE */}

      <section className="map-page-card">

        <div className="map-page-card-header">

          <div>

            <div className="map-card-icon">
              <Map size={20} />
            </div>

            <div>
              <h2>
                Situation du trafic
              </h2>

              <p>
                Sélectionnez une ville pour explorer
                les zones de circulation.
              </p>
            </div>

          </div>

          <div className="map-update">

            <Clock3 size={16} />

            Mis à jour maintenant

          </div>

        </div>


        <div className="map-page-content">

          <CityMap />

        </div>

      </section>


      {/* INDICATEURS */}

      <section className="map-info-grid">

        <article className="map-info-card">

          <div className="map-info-icon fluid-icon">
            <Navigation size={20} />
          </div>

          <div>

            <span>
              Circulation fluide
            </span>

            <strong>
              🟢
            </strong>

          </div>

          <p>
            Trafic faible, déplacements généralement
            rapides.
          </p>

        </article>


        <article className="map-info-card">

          <div className="map-info-icon moderate-icon">
            <Activity size={20} />
          </div>

          <div>

            <span>
              Circulation modérée
            </span>

            <strong>
              🟠
            </strong>

          </div>

          <p>
            Ralentissements présents sur certains axes.
          </p>

        </article>


        <article className="map-info-card">

          <div className="map-info-icon dense-icon">
            <MapPin size={20} />
          </div>

          <div>

            <span>
              Circulation dense
            </span>

            <strong>
              🔴
            </strong>

          </div>

          <p>
            Forte congestion et temps de déplacement
            potentiellement élevé.
          </p>

        </article>

      </section>

    </main>
  );
}

export default MapPage;