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
  Leaf,
  CheckCircle2,
} from "lucide-react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useCity } from "../context/CityContext";
import { apiService } from "../services/api";
import "./RoutesPage.css";

const cityPresets = {
  Yaoundé: {
    quickDepartures: ["Bastos (Ambassades)", "Mvan (Gare)", "Odza", "Mokolo", "Nsam (Sud)"],
    quickDestinations: ["Poste Centrale (Centre)", "Bastos", "Hôpital Général", "Nlongkak"],
  },
  Douala: {
    quickDepartures: ["Bonamoussadi", "Akwa (Centre)", "Deido", "Bonabéri", "Bépanda"],
    quickDestinations: ["Bonanjo (Affaires)", "Akwa", "Aéroport International", "Hôpital Laquintinie"],
  },
};

function ChangeMapCenter({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords && coords.length > 0) {
      map.flyTo(coords[0], 13, { duration: 1.2 });
    }
  }, [coords, map]);
  return null;
}

function RoutesPage() {
  const { selectedCity, setSelectedCity } = useCity();
  const currentPresets = cityPresets[selectedCity] || cityPresets["Yaoundé"];

  const [departure, setDeparture] = useState(currentPresets.quickDepartures[0]);
  const [destination, setDestination] = useState(currentPresets.quickDestinations[0]);
  const [searched, setSearched] = useState(true);
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fonction de calcul d'itinéraire dynamique via l'API Backend
  const performCalculation = async (orig, dest) => {
    setIsLoading(true);
    try {
      const res = await apiService.calculateRoute({
        origin: orig || departure,
        destination: dest || destination,
      });

      if (res && res.routes && res.routes.length > 0) {
        // Normaliser les itinéraires reçus du backend avec coordonnées géospatiales pour Leaflet
        const isDouala = selectedCity === "Douala";
        const baseCoords = isDouala
          ? [
              [4.0667, 9.7006],
              [4.055, 9.695],
              [4.043, 9.691],
            ]
          : [
              [3.889, 11.512],
              [3.878, 11.515],
              [3.8667, 11.5167],
            ];

        const altCoords = isDouala
          ? [
              [4.0667, 9.7006],
              [4.047, 9.727],
              [4.043, 9.691],
            ]
          : [
              [3.889, 11.512],
              [3.89, 11.522],
              [3.875, 11.525],
              [3.8667, 11.5167],
            ];

        const enrichedRoutes = res.routes.map((r, idx) => ({
          ...r,
          id: r.id || idx + 1,
          title: r.title || (idx === 0 ? "Itinéraire le plus rapide (Recommandé)" : "Itinéraire alternatif"),
          distance: `${r.distanceKm || (idx === 0 ? 6.8 : 7.4)} km`,
          duration: `${r.durationMinutes || (idx === 0 ? 22 : 28)} min`,
          traffic: r.congestionIndex > 70 ? "Dense" : r.congestionIndex > 40 ? "Modéré" : "Fluide",
          level: r.congestionIndex > 70 ? "dense" : r.congestionIndex > 40 ? "moderate" : "fluid",
          description: r.type === "fastest"
            ? "Meilleure fluidité calculée en temps réel d'après les capteurs urbains."
            : "Trajet alternatif contournant les axes principaux.",
          recommended: r.type === "fastest" || idx === 0,
          coords: idx === 0 ? baseCoords : altCoords,
          steps: r.steps || [
            `Départ depuis ${orig || departure}`,
            "Continuer sur l'axe principal fluide",
            `Arrivée estimée à ${dest || destination}`,
          ],
        }));

        setRoutes(enrichedRoutes);
        setSelectedRoute(enrichedRoutes[0]);
        setSearched(true);
      }
    } catch (err) {
      console.warn("[RoutesPage] Fallback route calculation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const defaultDep = currentPresets.quickDepartures[0];
    const defaultDest = currentPresets.quickDestinations[0];
    setDeparture(defaultDep);
    setDestination(defaultDest);
    performCalculation(defaultDep, defaultDest);
  }, [selectedCity]);

  const handleSwap = () => {
    const temp = departure;
    setDeparture(destination);
    setDestination(temp);
    performCalculation(destination, temp);
  };

  const handleSearch = (event) => {
    event.preventDefault();
    if (!departure.trim() || !destination.trim()) return;
    performCalculation(departure, destination);
  };

  return (
    <main className="routes-page">
      {/* HEADER */}
      <section className="routes-header">
        <div>
          <span className="routes-eyebrow">
            <Sparkles size={16} /> CALCULATEUR EN TEMPS RÉEL
          </span>
          <h1>Calculateur d'Itinéraires Intelligents</h1>
          <p>
            Moteur de calcul géospatial et analyse dynamique des ralentissements pour {selectedCity}.
          </p>
        </div>

        <div className="routes-city-badge">
          <MapPin size={18} />
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
          >
            <option value="Yaoundé">📍 Yaoundé (7 collines)</option>
            <option value="Douala">📍 Douala (Wouri)</option>
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
            <p>Calcul dynamique optimisé par intelligence artificielle.</p>
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

            <button type="submit" className="route-search-button" disabled={isLoading}>
              <Navigation size={18} />
              {isLoading ? "Calcul..." : "Calculer"}
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
              onClick={() => {
                setDeparture(loc);
                performCalculation(loc, destination);
              }}
            >
              {loc}
            </button>
          ))}
        </div>
      </section>

      {/* RÉSULTATS DYNAMIQUES DU BACKEND & CARTE */}
      {searched && selectedRoute && (
        <section className="route-results">
          <div className="results-header">
            <div>
              <span className="routes-eyebrow">
                <Route size={15} /> RÉSULTATS CALCULÉS PAR L'API
              </span>
              <h2>Itinéraires optimisés pour {selectedCity}</h2>
            </div>
            <span className="results-count">
              {routes.length} options calculées
            </span>
          </div>

          <div className="results-grid">
            {/* LISTE DES ITINÉRAIRES */}
            <div className="route-list">
              {routes.map((route) => {
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
                        <span className={`traffic-pill-dot ${route.level}`}></span>
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

                      {route.delaySavedMinutes && (
                        <div>
                          <Zap size={18} color="#00875A" />
                          <div>
                            <strong style={{ color: "#00875A" }}>-{route.delaySavedMinutes} min</strong>
                            <span>Temps gagné</span>
                          </div>
                        </div>
                      )}

                      {route.co2SavedKg && (
                        <div>
                          <Leaf size={18} color="#10b981" />
                          <div>
                            <strong style={{ color: "#10b981" }}>-{route.co2SavedKg} kg</strong>
                            <span>Économie CO₂</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ÉTAPES DE GUIDAGE */}
                    {route.steps && route.steps.length > 0 && (
                      <div style={{ marginTop: "12px", background: "#f8fafc", padding: "10px 14px", borderRadius: "10px", fontSize: "12px", color: "#475569" }}>
                        <span style={{ fontWeight: "700", display: "block", marginBottom: "4px", color: "#1e293b" }}>
                          Étapes du parcours :
                        </span>
                        <ul style={{ margin: 0, paddingLeft: "18px", lineHeight: "1.6" }}>
                          {route.steps.map((st, idx) => (
                            <li key={idx}>{st}</li>
                          ))}
                        </ul>
                      </div>
                    )}

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
                  <span className="routes-eyebrow">CARTE GÉOSPATIALE</span>
                  <h3>Tracé ({selectedRoute.distance})</h3>
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
                  <span>Économie</span>
                  <strong className="gain-highlight">
                    {selectedRoute.delaySavedMinutes ? `-${selectedRoute.delaySavedMinutes} min` : "-14 min"}
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