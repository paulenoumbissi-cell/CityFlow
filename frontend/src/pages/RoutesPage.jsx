import { useState, useEffect } from "react";
import {
  ArrowRight,
  ArrowUpDown,
  Car,
  Clock3,
  MapPin,
  Navigation,
  Route,
  Sparkles,
  Zap,
} from "lucide-react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useCity } from "../context/CityContext";
import "./RoutesPage.css";

const cityPresets = {
  Yaoundé: {
    quickDepartures: ["Bastos", "Mvan (Gare)", "Odza", "Mokolo", "Nsam"],
    quickDestinations: ["Poste Centrale", "Bastos", "Hôpital Général", "Nlongkak"],
    routes: [
      {
        id: 1,
        title: "Itinéraire recommandé (via Boulevard du 20 Mai)",
        distance: "6,8 km",
        duration: "22 min",
        traffic: "Fluide",
        level: "fluid",
        description: "Le meilleur compromis entre distance, temps de trajet et circulation.",
        recommended: true,
        coords: [
          [3.889, 11.512],
          [3.878, 11.515],
          [3.8667, 11.5167],
        ],
      },
      {
        id: 2,
        title: "Itinéraire alternatif (via Bastos / Dragages)",
        distance: "7,4 km",
        duration: "26 min",
        traffic: "Modéré",
        level: "moderate",
        description: "Trajet légèrement plus long avec quelques ralentissements au carrefour.",
        recommended: false,
        coords: [
          [3.889, 11.512],
          [3.890, 11.522],
          [3.875, 11.525],
          [3.8667, 11.5167],
        ],
      },
      {
        id: 3,
        title: "Itinéraire secondaire (Contournement Ouest)",
        distance: "8,6 km",
        duration: "31 min",
        traffic: "Fluide",
        level: "fluid",
        description: "Évite les grands axes centraux avec une vitesse constante.",
        recommended: false,
        coords: [
          [3.889, 11.512],
          [3.873, 11.503],
          [3.860, 11.505],
          [3.8667, 11.5167],
        ],
      },
    ],
  },
  Douala: {
    quickDepartures: ["Bonamoussadi", "Akwa", "Deido", "Bonabéri", "Bépanda"],
    quickDestinations: ["Bonanjo", "Akwa", "Aéroport International", "Hôpital Laquintinie"],
    routes: [
      {
        id: 1,
        title: "Itinéraire recommandé (via Boulevard de la Liberté)",
        distance: "5,4 km",
        duration: "18 min",
        traffic: "Fluide",
        level: "fluid",
        description: "Axe direct avec bonne régulation des feux.",
        recommended: true,
        coords: [
          [4.0667, 9.7006],
          [4.0511, 9.7043],
          [4.043, 9.691],
        ],
      },
      {
        id: 2,
        title: "Itinéraire alternatif (via Bépanda)",
        distance: "6,8 km",
        duration: "24 min",
        traffic: "Modéré",
        level: "moderate",
        description: "Contourne le centre d'Akwa en passant par l'est.",
        recommended: false,
        coords: [
          [4.0667, 9.7006],
          [4.047, 9.727],
          [4.043, 9.691],
        ],
      },
      {
        id: 3,
        title: "Itinéraire secondaire (Zone Portuaire)",
        distance: "7,9 km",
        duration: "29 min",
        traffic: "Dense",
        level: "dense",
        description: "Présence de camions et trafic lourd en journée.",
        recommended: false,
        coords: [
          [4.0667, 9.7006],
          [4.055, 9.685],
          [4.043, 9.691],
        ],
      },
    ],
  },
};

function ChangeMapCenter({ coords }) {
  const map = useMap();
  if (coords && coords.length > 0) {
    map.flyTo(coords[0], 13, { duration: 1 });
  }
  return null;
}

function RoutesPage() {
  const { selectedCity, setSelectedCity } = useCity();
  const currentPresets = cityPresets[selectedCity] || cityPresets["Yaoundé"];

  const [departure, setDeparture] = useState(currentPresets.quickDepartures[0]);
  const [destination, setDestination] = useState(currentPresets.quickDestinations[0]);
  const [searched, setSearched] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(currentPresets.routes[0]);

  useEffect(() => {
    setDeparture(currentPresets.quickDepartures[0]);
    setDestination(currentPresets.quickDestinations[0]);
    setSelectedRoute(currentPresets.routes[0]);
  }, [selectedCity]);

  const handleSwap = () => {
    const temp = departure;
    setDeparture(destination);
    setDestination(temp);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    if (!departure.trim() || !destination.trim()) return;
    setSearched(true);
  };

  return (
    <main className="routes-page">
      {/* HEADER */}
      <section className="routes-header">
        <div>
          <span className="routes-eyebrow">
            <Sparkles size={16} /> MOBILITÉ INTELLIGENTE
          </span>
          <h1>Calculateur d'Itinéraires Intelligents</h1>
          <p>
            Comparez les trajets optimaux à Yaoundé et Douala en tenant compte des
            prévisions de circulation en temps réel.
          </p>
        </div>

        <div className="routes-city-badge">
          <MapPin size={18} />
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
          >
            <option value="Yaoundé">Yaoundé</option>
            <option value="Douala">Douala</option>
          </select>
        </div>
      </section>

      {/* FORMULAIRE DE RECHERCHE */}
      <section className="route-search-card">
        <div className="route-search-title">
          <div className="route-search-icon">
            <Navigation size={20} />
          </div>
          <div>
            <h2>Préparez votre trajet</h2>
            <p>Indiquez vos points de repère ou sélectionnez une suggestion rapide.</p>
          </div>
        </div>

        <form onSubmit={handleSearch}>
          <div className="route-fields">
            {/* DÉPART */}
            <div className="route-field">
              <span className="route-field-icon start">
                <MapPin size={19} />
              </span>
              <div>
                <label htmlFor="departure">Départ</label>
                <input
                  id="departure"
                  type="text"
                  value={departure}
                  onChange={(event) => setDeparture(event.target.value)}
                  placeholder="Ex: Bastos, Mvan..."
                  list="departures-list"
                />
                <datalist id="departures-list">
                  {currentPresets.quickDepartures.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* SWAP BUTTON */}
            <button
              type="button"
              className="route-swap-btn"
              onClick={handleSwap}
              title="Inverser départ et destination"
            >
              <ArrowUpDown size={18} />
            </button>

            {/* DESTINATION */}
            <div className="route-field">
              <span className="route-field-icon destination">
                <MapPin size={19} />
              </span>
              <div>
                <label htmlFor="destination">Destination</label>
                <input
                  id="destination"
                  type="text"
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="Ex: Poste Centrale, Akwa..."
                  list="destinations-list"
                />
                <datalist id="destinations-list">
                  {currentPresets.quickDestinations.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
            </div>

            <button type="submit" className="route-search-button">
              <Navigation size={18} />
              Calculer
            </button>
          </div>
        </form>

        {/* SUGGESTIONS RAPIDES */}
        <div className="quick-suggestions">
          <span>Suggestions rapides :</span>
          {currentPresets.quickDepartures.slice(0, 4).map((loc) => (
            <button
              key={loc}
              type="button"
              className="suggestion-tag"
              onClick={() => setDeparture(loc)}
            >
              {loc}
            </button>
          ))}
        </div>
      </section>

      {/* ÉTAT AVANT RECHERCHE */}
      {!searched && (
        <section className="route-empty-state">
          <div className="empty-icon">
            <Car size={28} />
          </div>
          <h2>Votre trajet commence ici</h2>
          <p>
            Entrez un point de départ et une destination pour découvrir les itinéraires optimisés.
          </p>
        </section>
      )}

      {/* RÉSULTATS & CARTE */}
      {searched && (
        <section className="route-results">
          <div className="results-header">
            <div>
              <span className="routes-eyebrow">
                <Route size={15} /> RÉSULTATS
              </span>
              <h2>Itinéraires analysés pour {selectedCity}</h2>
            </div>
            <span className="results-count">
              {currentPresets.routes.length} options disponibles
            </span>
          </div>

          <div className="results-grid">
            {/* LISTE DES ITINÉRAIRES */}
            <div className="route-list">
              {currentPresets.routes.map((route) => {
                const isSelected = selectedRoute.id === route.id;
                return (
                  <article
                    key={route.id}
                    className={`route-result-card ${
                      route.recommended ? "recommended" : ""
                    } ${isSelected ? "selected-route-card" : ""}`}
                    onClick={() => setSelectedRoute(route)}
                  >
                    {route.recommended && (
                      <div className="recommended-badge">
                        <Sparkles size={14} /> Recommandé par CityFlow
                      </div>
                    )}

                    <div className="route-result-top">
                      <div>
                        <h3>{route.title}</h3>
                        <p>{route.description}</p>
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
                          <strong>{route.duration}</strong>
                          <span>Temps estimé</span>
                        </div>
                      </div>

                      <div>
                        <Route size={18} />
                        <div>
                          <strong>{route.distance}</strong>
                          <span>Distance</span>
                        </div>
                      </div>
                    </div>

                    <div className="route-path">
                      <div className="path-point">
                        <span className="path-dot start"></span>
                        <div>
                          <small>Départ</small>
                          <strong>{departure}</strong>
                        </div>
                      </div>

                      <div className="path-line"></div>

                      <div className="path-point">
                        <span className="path-dot end"></span>
                        <div>
                          <small>Destination</small>
                          <strong>{destination}</strong>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="choose-route-button"
                      onClick={() => setSelectedRoute(route)}
                    >
                      {isSelected ? "Itinéraire sélectionné ✓" : "Choisir cet itinéraire"}
                      <ArrowRight size={17} />
                    </button>
                  </article>
                );
              })}
            </div>

            {/* CARTE LEAFLET INTERACTIVE EN APERÇU */}
            <aside className="route-map-preview">
              <div className="preview-header">
                <div>
                  <span className="routes-eyebrow">CARTE INTERACTIVE</span>
                  <h3>Tracé du trajet ({selectedRoute.distance})</h3>
                </div>
                <div className="preview-traffic-badge">
                  ● Trafic {selectedRoute.traffic}
                </div>
              </div>

              <div className="real-route-leaflet-box">
                <MapContainer
                  center={selectedRoute.coords[0]}
                  zoom={13}
                  scrollWheelZoom={true}
                  className="route-leaflet-map"
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <ChangeMapCenter coords={selectedRoute.coords} />

                  {/* TRACÉ */}
                  <Polyline
                    positions={selectedRoute.coords}
                    pathOptions={{
                      color:
                        selectedRoute.level === "dense"
                          ? "#ef4444"
                          : selectedRoute.level === "moderate"
                          ? "#f59e0b"
                          : "#087f5b",
                      weight: 6,
                      opacity: 0.95,
                    }}
                  />

                  {/* DÉPART */}
                  <CircleMarker
                    center={selectedRoute.coords[0]}
                    radius={10}
                    pathOptions={{
                      color: "#ffffff",
                      weight: 3,
                      fillColor: "#087f5b",
                      fillOpacity: 1,
                    }}
                  >
                    <Popup>
                      <strong>Départ :</strong> {departure}
                    </Popup>
                  </CircleMarker>

                  {/* ARRIVÉE */}
                  <CircleMarker
                    center={selectedRoute.coords[selectedRoute.coords.length - 1]}
                    radius={10}
                    pathOptions={{
                      color: "#ffffff",
                      weight: 3,
                      fillColor: "#2563eb",
                      fillOpacity: 1,
                    }}
                  >
                    <Popup>
                      <strong>Arrivée :</strong> {destination}
                    </Popup>
                  </CircleMarker>
                </MapContainer>
              </div>

              <div className="preview-summary">
                <div>
                  <span>Temps estimé</span>
                  <strong>{selectedRoute.duration}</strong>
                </div>
                <div>
                  <span>Distance totale</span>
                  <strong>{selectedRoute.distance}</strong>
                </div>
                <div>
                  <span>Économie estimée</span>
                  <strong className="gain-highlight">-14 min</strong>
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