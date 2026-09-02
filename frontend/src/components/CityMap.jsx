import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useCity } from "../context/CityContext";

const cities = {
  Yaoundé: {
    position: [3.848, 11.502],
    zoom: 13,
    traffic: [
      {
        name: "Mvan (Gare)",
        position: [3.822, 11.523],
        level: "dense",
        value: 88,
        description: "Circulation très difficile, ralentissements majeurs",
      },
      {
        name: "Nsam (Carrefour)",
        position: [3.829, 11.511],
        level: "dense",
        value: 81,
        description: "Forte congestion aux heures de pointe",
      },
      {
        name: "Nlongkak (Rond-point)",
        position: [3.890, 11.522],
        level: "moderate",
        value: 59,
        description: "Ralentissements modérés",
      },
      {
        name: "Bastos",
        position: [3.889, 11.512],
        level: "moderate",
        value: 52,
        description: "Trafic régulier, quelques ralentissements",
      },
      {
        name: "Poste Centrale",
        position: [3.8667, 11.5167],
        level: "moderate",
        value: 64,
        description: "Circulation dense en journée",
      },
      {
        name: "Mokolo",
        position: [3.873, 11.503],
        level: "dense",
        value: 85,
        description: "Zone marchande très encombrée",
      },
      {
        name: "Odza",
        position: [3.799, 11.523],
        level: "fluid",
        value: 28,
        description: "Circulation fluide",
      },
      {
        name: "Ahala",
        position: [3.785, 11.505],
        level: "fluid",
        value: 24,
        description: "Circulation fluide",
      },
    ],
  },

  Douala: {
    position: [4.0511, 9.7679],
    zoom: 13,
    traffic: [
      {
        name: "Akwa (Boulevard)",
        position: [4.0511, 9.7043],
        level: "dense",
        value: 91,
        description: "Circulation très difficile et ralentie",
      },
      {
        name: "Rond-point Deido",
        position: [4.0667, 9.7006],
        level: "dense",
        value: 84,
        description: "Forte congestion au carrefour",
      },
      {
        name: "Pont sur le Wouri (Bonabéri)",
        position: [4.0714, 9.6712],
        level: "moderate",
        value: 68,
        description: "Ralentissements importants à l'entrée du pont",
      },
      {
        name: "Bépanda",
        position: [4.047, 9.727],
        level: "moderate",
        value: 61,
        description: "Trafic modéré",
      },
      {
        name: "Bonanjo",
        position: [4.043, 9.691],
        level: "fluid",
        value: 35,
        description: "Circulation dégagée dans le quartier administratif",
      },
      {
        name: "Bonamoussadi",
        position: [4.0867, 9.735],
        level: "fluid",
        value: 31,
        description: "Circulation fluide",
      },
      {
        name: "Logbessou",
        position: [4.105, 9.776],
        level: "fluid",
        value: 26,
        description: "Circulation fluide",
      },
    ],
  },
};

const trafficStyles = {
  dense: {
    color: "#ef4444",
    fillColor: "#ef4444",
  },
  moderate: {
    color: "#f59e0b",
    fillColor: "#f59e0b",
  },
  fluid: {
    color: "#22c55e",
    fillColor: "#22c55e",
  },
};

function ChangeCity({ city }) {
  const map = useMap();
  map.flyTo(city.position, city.zoom, {
    duration: 1.2,
  });
  return null;
}

function CityMap({ customRoute, height = "480px" }) {
  const { selectedCity, setSelectedCity } = useCity();
  const city = cities[selectedCity] || cities["Yaoundé"];

  return (
    <div className="city-map-wrapper">
      {/* HEADER DE LA CARTE */}
      <div className="map-topbar">
        <div>
          <span className="section-label">SURVEILLANCE GÉOSPATIALE</span>
          <h2>Situation du trafic en direct</h2>
        </div>

        <select
          value={selectedCity}
          onChange={(event) => setSelectedCity(event.target.value)}
          className="city-select"
        >
          <option value="Yaoundé">📍 Yaoundé</option>
          <option value="Douala">📍 Douala</option>
        </select>
      </div>

      {/* CARTE LEAFLET */}
      <div className="real-map" style={{ height }}>
        <MapContainer
          center={city.position}
          zoom={city.zoom}
          scrollWheelZoom={true}
          zoomControl={true}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <ChangeCity city={city} />

          {/* TRACÉ D'ITINÉRAIRE ÉVENTUEL */}
          {customRoute && (
            <Polyline
              positions={customRoute.coordinates}
              pathOptions={{
                color: customRoute.color || "#087f5b",
                weight: 6,
                opacity: 0.9,
              }}
            />
          )}

          {/* ZONES DE TRAFIC */}
          {city.traffic.map((point) => {
            const style = trafficStyles[point.level];

            return (
              <CircleMarker
                key={point.name}
                center={point.position}
                radius={13}
                pathOptions={{
                  color: "#ffffff",
                  weight: 3,
                  fillColor: style.fillColor,
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <div className="traffic-popup">
                    <strong>{point.name}</strong>
                    <span className={`popup-status ${point.level}`}>
                      {point.level === "dense" && "🔴 Trafic dense"}
                      {point.level === "moderate" && "🟠 Trafic modéré"}
                      {point.level === "fluid" && "🟢 Trafic fluide"}
                    </span>
                    <span>Congestion : {point.value}%</span>
                    <small>{point.description}</small>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* LÉGENDE */}
        <div className="map-legend-real">
          <span>
            <i className="legend-green"></i>
            Fluide (&lt; 40%)
          </span>
          <span>
            <i className="legend-orange"></i>
            Modéré (40 - 75%)
          </span>
          <span>
            <i className="legend-red"></i>
            Dense (&gt; 75%)
          </span>
        </div>

        {/* BADGE */}
        <div className="map-live">
          <span></span>
          CityFlow Live Traffic
        </div>
      </div>
    </div>
  );
}

export default CityMap;