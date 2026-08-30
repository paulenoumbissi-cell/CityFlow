import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import CityMap from "./components/CityMap";

import MapPage from "./pages/MapPage";
import RoutesPage from "./pages/RoutesPage";
import PredictionPage from "./pages/PredictionPage";

import "./index.css";


function Home() {
  return (
    <>

      {/* HERO */}

      <main className="home">

        <section className="hero">

          <div className="hero-content">

            <span className="hero-badge">
              🚦 Mobilité intelligente
            </span>

            <h1>
              Votre trajet,
              <span> plus simple et plus intelligent.</span>
            </h1>

            <p>
              CityFlow vous aide à comprendre le trafic, anticiper les
              congestions et choisir les meilleurs itinéraires à Yaoundé
              et Douala.
            </p>


            {/* RECHERCHE */}

            <div className="search-card">

              <div className="location-input">

                <span className="input-icon start">
                  ●
                </span>

                <div>

                  <label>
                    Départ
                  </label>

                  <input
                    type="text"
                    placeholder="Votre position actuelle"
                  />

                </div>

              </div>


              <div className="search-line"></div>


              <div className="location-input">

                <span className="input-icon destination">
                  ●
                </span>

                <div>

                  <label>
                    Destination
                  </label>

                  <input
                    type="text"
                    placeholder="Où souhaitez-vous aller ?"
                  />

                </div>

              </div>


              <button className="search-button">
                Rechercher
              </button>

            </div>

          </div>


          {/* MINI STATISTIQUES */}

          <div className="hero-stats">

            <div className="stat-card">

              <span className="stat-icon">
                🟢
              </span>

              <div>

                <strong>
                  Trafic actuel
                </strong>

                <span>
                  Modéré
                </span>

              </div>

            </div>


            <div className="stat-card">

              <span className="stat-icon">
                📍
              </span>

              <div>

                <strong>
                  Ville active
                </strong>

                <span>
                  Yaoundé
                </span>

              </div>

            </div>


            <div className="stat-card">

              <span className="stat-icon">
                🔮
              </span>

              <div>

                <strong>
                  Prévision
                </strong>

                <span>
                  Dans 30 min
                </span>

              </div>

            </div>

          </div>

        </section>


        {/* CARTE */}

        <section className="dashboard-grid">

          <div className="map-card">

             <CityMap />

          </div>

          {/* TRAFIC */}

          <div className="traffic-card">

            <div className="section-header">

              <div>

                <span className="section-label">
                  ANALYSE
                </span>

                <h2>
                  État du trafic
                </h2>

              </div>

              <span className="live-badge">
                ● LIVE
              </span>

            </div>


            <div className="traffic-status">

              <div className="traffic-circle">

                <span>
                  68%
                </span>

                <small>
                  fluidité
                </small>

              </div>


              <div className="traffic-info">

                <h3>
                  Trafic modéré
                </h3>

                <p>
                  La circulation est globalement normale,
                  avec quelques ralentissements.
                </p>

              </div>

            </div>


            <div className="traffic-bars">

              <div className="traffic-bar-item">

                <div>

                  <span>
                    Centre-ville
                  </span>

                  <strong>
                    Dense
                  </strong>

                </div>

                <div className="progress">

                  <span
                    style={{
                      width: "82%"
                    }}
                  ></span>

                </div>

              </div>


              <div className="traffic-bar-item">

                <div>

                  <span>
                    Bastos
                  </span>

                  <strong>
                    Modéré
                  </strong>

                </div>

                <div className="progress">

                  <span
                    style={{
                      width: "55%"
                    }}
                  ></span>

                </div>

              </div>


              <div className="traffic-bar-item">

                <div>

                  <span>
                    Mvan
                  </span>

                  <strong>
                    Fluide
                  </strong>

                </div>

                <div className="progress">

                  <span
                    style={{
                      width: "32%"
                    }}
                  ></span>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* PREDICTION */}

        <section className="prediction-section">

          <div className="prediction-header">

            <div>

              <span className="section-label">
                INTELLIGENCE CITYFLOW
              </span>

              <h2>
                Anticipez le trafic
              </h2>

              <p>
                Consultez l'évolution estimée de la circulation
                pour mieux planifier votre déplacement.
              </p>

            </div>

            <div className="prediction-icon">
              🔮
            </div>

          </div>


          <div className="prediction-grid">

            <div className="prediction-card">

              <span>
                Maintenant
              </span>

              <strong>
                68%
              </strong>

              <div className="prediction-status moderate">
                ● Modéré
              </div>

            </div>


            <div className="prediction-card">

              <span>
                Dans 15 min
              </span>

              <strong>
                74%
              </strong>

              <div className="prediction-status moderate">
                ● Modéré
              </div>

            </div>


            <div className="prediction-card">

              <span>
                Dans 30 min
              </span>

              <strong>
                86%
              </strong>

              <div className="prediction-status dense">
                ● Dense
              </div>

            </div>


            <div className="prediction-card">

              <span>
                Dans 60 min
              </span>

              <strong>
                61%
              </strong>

              <div className="prediction-status moderate">
                ● Modéré
              </div>

            </div>

          </div>

        </section>


        {/* ITINERAIRE */}

        <section className="route-section">

          <div className="route-title">

            <span className="section-label">
              MOBILITÉ
            </span>

            <h2>
              Votre itinéraire intelligent
            </h2>

            <p>
              CityFlow prend en compte l'état du trafic pour
              vous proposer une route adaptée.
            </p>

          </div>


          <div className="route-card">

            <div className="route-point">

              <span className="route-dot start-dot"></span>

              <div>

                <small>
                  Départ
                </small>

                <strong>
                  Votre position
                </strong>

              </div>

            </div>


            <div className="route-line">

              <span>
                6,8 km
              </span>

            </div>


            <div className="route-point">

              <span className="route-dot end-dot"></span>

              <div>

                <small>
                  Destination
                </small>

                <strong>
                  Centre-ville
                </strong>

              </div>

            </div>


            <div className="route-result">

              <div>

                <strong>
                  22 min
                </strong>

                <span>
                  Temps estimé
                </span>

              </div>


              <div>

                <strong>
                  6,8 km
                </strong>

                <span>
                  Distance
                </span>

              </div>


              <button>
                Voir l'itinéraire →
              </button>

            </div>

          </div>

        </section>

      </main>


      {/* FOOTER */}

      <footer className="footer">

        <div>

          <strong>
            CityFlow
          </strong>

          <span>
            Votre mobilité, notre intelligence.
          </span>

        </div>

        <p>
          © 2026 CityFlow — Yaoundé & Douala
        </p>

      </footer>

    </>
  );
}


function App() {

  return (

    <BrowserRouter>

      <div className="app">

        <Navbar />

    <Routes>

         <Route
             path="/"
             element={<Home />}
       />

         <Route
           path="/carte"
           element={<MapPage />}
        />

         <Route
             path="/routes"
             element={<RoutesPage />}
        />
        <Route
           path="/prediction"
           element={<PredictionPage />}
       />

    </Routes>

      </div>

    </BrowserRouter>

  );
}


export default App;