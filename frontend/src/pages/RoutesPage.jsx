import { useState } from "react";
import {
  ArrowRight,
  Car,
  Clock3,
  MapPin,
  Navigation,
  Route,
  Sparkles,
} from "lucide-react";

import "./RoutesPage.css";

const routes = [
  {
    id: 1,
    title: "Itinéraire recommandé",
    distance: "6,8 km",
    duration: "22 min",
    traffic: "Fluide",
    level: "fluid",
    description:
      "Le meilleur compromis entre distance, temps de trajet et circulation.",
    recommended: true,
  },
  {
    id: 2,
    title: "Itinéraire alternatif",
    distance: "7,4 km",
    duration: "25 min",
    traffic: "Modéré",
    level: "moderate",
    description:
      "Un trajet légèrement plus long avec quelques ralentissements.",
    recommended: false,
  },
  {
    id: 3,
    title: "Itinéraire secondaire",
    distance: "8,1 km",
    duration: "29 min",
    traffic: "Fluide",
    level: "fluid",
    description:
      "Une autre possibilité avec une circulation actuellement fluide.",
    recommended: false,
  },
];

function RoutesPage() {
  const [departure, setDeparture] = useState("");
  const [destination, setDestination] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = (event) => {
    event.preventDefault();

    if (!departure.trim() || !destination.trim()) {
      return;
    }

    setSearched(true);
  };

  return (
    <main className="routes-page">

      {/* HEADER */}

      <section className="routes-header">

        <div>

          <span className="routes-eyebrow">
            <Sparkles size={16} />
            MOBILITÉ INTELLIGENTE
          </span>

          <h1>
            Trouvez le meilleur itinéraire
          </h1>

          <p>
            Comparez les trajets disponibles en tenant compte
            des conditions de circulation.
          </p>

        </div>

        <div className="routes-header-icon">
          <Route size={28} />
        </div>

      </section>


      {/* RECHERCHE */}

      <section className="route-search-card">

        <div className="route-search-title">

          <div className="route-search-icon">
            <Navigation size={20} />
          </div>

          <div>

            <h2>
              Préparez votre trajet
            </h2>

            <p>
              Indiquez votre point de départ et votre destination.
            </p>

          </div>

        </div>


        <form onSubmit={handleSearch}>

          <div className="route-fields">

            {/* DEPART */}

            <div className="route-field">

              <span className="route-field-icon start">
                <MapPin size={19} />
              </span>

              <div>

                <label htmlFor="departure">
                  Départ
                </label>

                <input
                  id="departure"
                  type="text"
                  value={departure}
                  onChange={(event) =>
                    setDeparture(event.target.value)
                  }
                  placeholder="Votre position actuelle"
                />

              </div>

            </div>


            <div className="route-arrow">
              <ArrowRight size={20} />
            </div>


            {/* DESTINATION */}

            <div className="route-field">

              <span className="route-field-icon destination">
                <MapPin size={19} />
              </span>

              <div>

                <label htmlFor="destination">
                  Destination
                </label>

                <input
                  id="destination"
                  type="text"
                  value={destination}
                  onChange={(event) =>
                    setDestination(event.target.value)
                  }
                  placeholder="Où souhaitez-vous aller ?"
                />

              </div>

            </div>


            <button
              type="submit"
              className="route-search-button"
            >
              <Navigation size={18} />
              Rechercher
            </button>

          </div>

        </form>

      </section>


      {/* MESSAGE AVANT RECHERCHE */}

      {!searched && (

        <section className="route-empty-state">

          <div className="empty-icon">
            <Car size={28} />
          </div>

          <h2>
            Votre trajet commence ici
          </h2>

          <p>
            Entrez un départ et une destination pour
            découvrir les itinéraires disponibles.
          </p>

        </section>

      )}


      {/* RESULTATS */}

      {searched && (

        <section className="route-results">

          <div className="results-header">

            <div>

              <span className="routes-eyebrow">
                <Route size={15} />
                RÉSULTATS
              </span>

              <h2>
                Itinéraires disponibles
              </h2>

            </div>

            <span className="results-count">
              {routes.length} itinéraires
            </span>

          </div>


          <div className="results-grid">

            {/* ROUTES */}

            <div className="route-list">

              {routes.map((route) => (

                <article
                  key={route.id}
                  className={`route-result-card ${
                    route.recommended ? "recommended" : ""
                  }`}
                >

                  {route.recommended && (

                    <div className="recommended-badge">
                      <Sparkles size={14} />
                      Recommandé par CityFlow
                    </div>

                  )}


                  <div className="route-result-top">

                    <div>

                      <h3>
                        {route.title}
                      </h3>

                      <p>
                        {route.description}
                      </p>

                    </div>

                    <div className="traffic-pill">
                      <span
                        className={`traffic-pill-dot ${route.level}`}
                      ></span>

                      {route.traffic}

                    </div>

                  </div>


                  <div className="route-metrics">

                    <div>

                      <Clock3 size={18} />

                      <div>
                        <strong>
                          {route.duration}
                        </strong>

                        <span>
                          Temps estimé
                        </span>
                      </div>

                    </div>


                    <div>

                      <Route size={18} />

                      <div>
                        <strong>
                          {route.distance}
                        </strong>

                        <span>
                          Distance
                        </span>
                      </div>

                    </div>

                  </div>


                  <div className="route-path">

                    <div className="path-point">

                      <span className="path-dot start"></span>

                      <div>
                        <small>
                          Départ
                        </small>

                        <strong>
                          {departure}
                        </strong>
                      </div>

                    </div>


                    <div className="path-line"></div>


                    <div className="path-point">

                      <span className="path-dot end"></span>

                      <div>
                        <small>
                          Destination
                        </small>

                        <strong>
                          {destination}
                        </strong>
                      </div>

                    </div>

                  </div>


                  <button className="choose-route-button">

                    {route.recommended
                      ? "Choisir cet itinéraire"
                      : "Voir cet itinéraire"}

                    <ArrowRight size={17} />

                  </button>

                </article>

              ))}

            </div>


            {/* APERÇU CARTE */}

            <aside className="route-map-preview">

              <div className="preview-header">

                <div>

                  <span>
                    APERÇU
                  </span>

                  <h3>
                    Votre trajet
                  </h3>

                </div>

                <MapPin size={20} />

              </div>


              <div className="fake-route-map">

                <div className="map-road road-one"></div>
                <div className="map-road road-two"></div>
                <div className="map-road road-three"></div>

                <div className="fake-route-line"></div>

                <div className="fake-map-point start">
                  <span></span>
                </div>

                <div className="fake-map-point end">
                  <span></span>
                </div>

                <div className="map-label start-label">
                  Départ
                </div>

                <div className="map-label end-label">
                  Destination
                </div>

              </div>


              <div className="preview-summary">

                <div>

                  <span>
                    Meilleur trajet
                  </span>

                  <strong>
                    22 min
                  </strong>

                </div>

                <div>

                  <span>
                    Distance
                  </span>

                  <strong>
                    6,8 km
                  </strong>

                </div>

              </div>

            </aside>

          </div>

        </section>

      )}

    </main>
  );
}

export default RoutesPage;