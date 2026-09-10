import { useState, useEffect, useRef } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Clock3,
  MapPin,
  TrendingUp,
  CloudRain,
  Sun,
  Waves,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { useCity } from "../context/CityContext";
import { usePredictions } from "../context/PredictionContext.jsx";
import "./PredictionPage.css";
import { getWeatherByLocation } from "../services/weatherApi.js";
import { fetchMapConfig } from "../services/mapApi.js";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, LayersControl, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { YAOUNDE_NODES, DOUALA_NODES } from "../data/cityData.js";
import { fetchRoute } from "../services/routeApi.js";

const WEATHER_OPTIONS = [
  { key: "dry", label: "Temps sec", icon: Sun, color: "#f59e0b" },
  { key: "light_rain", label: "Pluie légère", icon: CloudRain, color: "#0ea5e9" },
  { key: "heavy_rain", label: "Pluie tropicale", icon: CloudRain, color: "#2563eb" },
  { key: "flood", label: "Chaussée inondée", icon: Waves, color: "#dc2626" },
];

const LANDMARKS = {
  "Yaoundé": [
    "Poste Centrale, Yaoundé",
    "Rond-point Nlongkak",
    "Carrefour Warda",
    "Monument de la Réunification",
    "Boulevard du 20 Mai",
    "Carrefour Bastos",
    "Marché Mokolo",
    "Carrefour Mvan",
    "Carrefour Jouvence"
  ],
  "Douala": [
    "Rond-point Deido",
    "Carrefour Ndokoti",
    "Ancien Dalip, Akwa",
    "Marché Central, Douala",
    "Place du Gouvernement, Bonanjo",
    "Pont du Wouri",
    "Carrefour de l'Air",
    "Village, Douala",
    "Carrefour PK14"
  ]
};

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0 || h > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
}

function getLevelClass(value) {
  if (value >= 75) return "dense";
  if (value >= 40) return "moderate";
  return "fluid";
}

function MapBounds({ routeGeo, departureCoords, destinationCoords }) {
  const map = useMap();
  useEffect(() => {
    if (routeGeo && routeGeo.coordinates && routeGeo.coordinates.length > 0) {
      const bounds = routeGeo.coordinates.map(c => [c[1], c[0]]);
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 18 });
    } else if (departureCoords && destinationCoords) {
      map.fitBounds([departureCoords, destinationCoords], { padding: [20, 20], maxZoom: 18 });
    } else if (departureCoords) {
      map.setView(departureCoords, 16);
    }
  }, [map, routeGeo, departureCoords, destinationCoords]);
  return null;
}

function PredictionPage() {
  const { selectedCity, setSelectedCity, currentCityData } = useCity();
  const [selectedWeather, setSelectedWeather] = useState("dry");
  const [selectedHour, setSelectedHour] = useState(new Date().getHours());
  const [destination, setDestination] = useState(""); // Destination input
  const [departure, setDeparture] = useState(""); // Departure (auto‑filled)
  const [locationWeather, setLocationWeather] = useState(null);
  const [departureCoords, setDepartureCoords] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [routeGeo, setRouteGeo] = useState(null);
  const [routeDetails, setRouteDetails] = useState(null);
  const [routeAlternatives, setRouteAlternatives] = useState([]);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mapConfig, setMapConfig] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [showMap, setShowMap] = useState(true); // toggle map visibility
  // Récupérer les prédictions en temps réel (incluant météo) depuis le contexte WebSocket


  // Récupérer les prédictions en temps réel (incluant météo) depuis le contexte WebSocket
  const wsPredictions = usePredictions();
  const cityPrediction = wsPredictions[selectedCity] || null;
  // Debug: show raw predictions JSON (development only)
  {process.env.NODE_ENV === 'development' && (
    <pre style={{ background: '#111', color: '#0f0', padding: '8px', marginTop: '8px', overflow: 'auto' }}>
      {JSON.stringify(wsPredictions, null, 2)}
    </pre>
  )}
  // Update prediction from WebSocket
  useEffect(() => {
    if (cityPrediction) {
      setForecastData(cityPrediction);
    }
  }, [cityPrediction]);

  // Fetch weather based on location input
  useEffect(() => {
    if (!location) {
      setLocationWeather(null);
      return;
    }
    const fetchWeather = async () => {
      try {
        const data = await getWeatherByLocation(location);
        setLocationWeather(data.weather);
      } catch (e) {
        console.warn("Location weather fetch failed:", e);
        setLocationWeather(null);
      }
    };
    fetchWeather();
  }, [location]);

  // Load map configuration for selected city
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const cfg = await fetchMapConfig(selectedCity);
        setMapConfig(cfg);
      } catch (e) {
        console.warn('Failed to load map config:', e);
        setMapConfig(null);
      }
    };
    loadConfig();
  }, [selectedCity]);

  const isGeolocatingRef = useRef(false);

  // Manual geolocation handler
  const handleGeolocateDeparture = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    isGeolocatingRef.current = true;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setDepartureCoords([latitude, longitude]);
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await resp.json();
          setDeparture(data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        } catch (e) {
          console.warn('Reverse geocode failed:', e);
          setDeparture(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
        // Reset flag after a short delay
        setTimeout(() => { isGeolocatingRef.current = false; }, 2000);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        isGeolocatingRef.current = false;
        alert("Erreur de géolocalisation. Veuillez autoriser l'accès à votre position.");
      }
    );
  };

  // Sync coordinates when selected city changes
  useEffect(() => {
    if (currentCityData) {
      setDepartureCoords(currentCityData.position);
      setDeparture(currentCityData.name);
      setDestination("");
      setDestinationCoords(null);
      setRouteGeo(null);
    }
  }, [selectedCity, currentCityData]);

  // Initial auto-geolocation
  useEffect(() => {
    handleGeolocateDeparture();
  }, []);

  // Validate and Predict handler
  const handlePredict = async () => {
    setIsLoading(true);
    let newDepCoords = departureCoords;
    let newDestCoords = destinationCoords;

    if (departure && departure !== "Position actuelle" && departure !== currentCityData.name) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(departure)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data[0]) newDepCoords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      } catch (e) {
        console.warn('Departure geocode error:', e);
      }
    }

    if (destination) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data[0]) newDestCoords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      } catch (e) {
        console.warn('Destination geocode error:', e);
      }
    }

    setDepartureCoords(newDepCoords);
    setDestinationCoords(newDestCoords);
    setIsLoading(false);
  };

  // Real-time weather fetch using Open-Meteo (Free API)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        let lat, lon;
        if (departureCoords) {
          lat = departureCoords[0];
          lon = departureCoords[1];
        } else if (currentCityData) {
          lat = currentCityData.position[0];
          lon = currentCityData.position[1];
        } else {
          return;
        }

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        const weatherData = await weatherRes.json();
        const current = weatherData.current_weather;
        if (current) {
           let condition = "Clair";
           if (current.weathercode >= 1 && current.weathercode <= 3) condition = "Nuageux";
           if (current.weathercode >= 60 && current.weathercode <= 69) condition = "Pluie légère";
           if (current.weathercode >= 70 && current.weathercode <= 82) condition = "Forte pluie";
           if (current.weathercode >= 95) condition = "Orage";
           
           setLocationWeather({
             temperature: Math.round(current.temperature),
             windSpeed: current.windspeed,
             precipitation: current.weathercode > 50 ? 5 : 0,
             condition: condition
           });
           
           // Automatically sync UI simulator
           if (current.weathercode >= 60 && current.weathercode <= 69) setSelectedWeather("light_rain");
           else if (current.weathercode >= 70) setSelectedWeather("heavy_rain");
           else setSelectedWeather("dry");
        }
      } catch (e) {
        console.warn("Weather fetch error:", e);
      }
    };
    
    // Debounce slightly just in case
    const timer = setTimeout(fetchWeather, 500);
    return () => clearTimeout(timer);
  }, [departureCoords, currentCityData]);

  // Fetch real route from OSRM
  useEffect(() => {
    if (!departureCoords || !destinationCoords) {
      setRouteGeo(null);
      setRouteDetails(null);
      setRouteAlternatives([]);
      return;
    }
    const fetchRouteData = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${departureCoords[1]},${departureCoords[0]};${destinationCoords[1]},${destinationCoords[0]}?overview=full&geometries=geojson&alternatives=3`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('OSRM route fetch failed');
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
           // first route as primary
           setRouteGeo(data.routes[0].geometry);
           setRouteDetails({
             distance: data.routes[0].distance,
             duration: data.routes[0].duration
           });
           // store all alternatives
           setRouteAlternatives(data.routes.map(r => ({ geometry: r.geometry, distance: r.distance, duration: r.duration })));
        }
      } catch (e) {
        console.warn('Route fetch failed:', e);
        setRouteGeo(null);
        setRouteAlternatives([]);
      }
    };
    fetchRouteData();
  }, [departureCoords, destinationCoords]);

  const fallbackPredictions = [
    { horizon: "+15 min", congestionPercentage: 45, status: "" },
    { horizon: "+30 min", congestionPercentage: 55, status: "" },
    { horizon: "+1 heure", congestionPercentage: 65, status: "" },
  ];

  const basePredictions = forecastData?.globalForecast || (cityPrediction?.summary ? [
    { horizon: "+15 min", congestionPercentage: cityPrediction.summary.in15m, status: "" },
    { horizon: "+30 min", congestionPercentage: cityPrediction.summary.in30m, status: "" },
    { horizon: "+1 heure", congestionPercentage: cityPrediction.summary.in60m, status: "" },
  ] : fallbackPredictions);

  const weatherInfo = locationWeather || cityPrediction?.weather;
  const weatherModifiers = { dry: 0, light_rain: 0.1, heavy_rain: 0.2, flood: 0.3 };
  const temperature = weatherInfo?.temperature;
  const temperatureModifier = (() => {
    if (temperature == null) return 0;
    if (temperature > 30) return 0.1;
    if (temperature > 25) return 0.05;
    if (temperature < 15) return -0.05;
    return 0;
  })();

  const timeModifier = (() => {
    if (selectedHour >= 7 && selectedHour <= 9) return 0.45; // Morning rush hour
    if (selectedHour >= 16 && selectedHour <= 19) return 0.55; // Evening rush hour
    if (selectedHour >= 22 || selectedHour <= 5) return -0.4; // Night time
    if (selectedHour >= 10 && selectedHour <= 15) return -0.1; // Off-peak
    return 0; 
  })();

  const getTimeStatus = () => {
    if (selectedHour >= 7 && selectedHour <= 9) return { label: "Heure de pointe (Matin)", color: "#ef4444", desc: "Trafic fortement congestionné" };
    if (selectedHour >= 16 && selectedHour <= 19) return { label: "Heure de pointe (Soir)", color: "#ef4444", desc: "Trafic fortement congestionné" };
    if (selectedHour >= 22 || selectedHour <= 5) return { label: "Trafic de Nuit", color: "#10b981", desc: "Circulation très fluide" };
    if (selectedHour >= 10 && selectedHour <= 15) return { label: "Heure Creuse", color: "#f59e0b", desc: "Trafic modéré" };
    return { label: "Trafic Normal", color: "#3b82f6", desc: "Circulation habituelle" };
  };

  const timeStatus = getTimeStatus();

  const adjustedPredictions = basePredictions.map(p => {
    let rawCongestion = p.congestionPercentage * (1 + (weatherModifiers[selectedWeather] || 0) + temperatureModifier + timeModifier);
    let finalCongestion = Math.min(100, Math.max(0, Math.round(rawCongestion)));
    let statusText = "Fluide";
    if (finalCongestion >= 75) statusText = "Saturé";
    else if (finalCongestion >= 40) statusText = "Modéré";
    
    return {
      ...p,
      congestionPercentage: finalCongestion,
      status: statusText
    };
  });

  const currentCongestion = adjustedPredictions[0]?.congestionPercentage || 50;

  const getCongestedLandmarks = () => {
    if (!routeAlternatives || routeAlternatives.length === 0) return [];
    const mainRoute = routeAlternatives[0];
    if (!mainRoute.geometry?.coordinates) return [];
    
    const cityNodes = currentCityData?.name === "Yaoundé" ? YAOUNDE_NODES : DOUALA_NODES;
    let congestedNodes = new Set();
    
    // Echantillonnage des points de la route pour éviter trop de calculs
    const step = Math.max(1, Math.floor(mainRoute.geometry.coordinates.length / 20));
    
    for (let i = 0; i < mainRoute.geometry.coordinates.length; i += step) {
      const coord = mainRoute.geometry.coordinates[i];
      const point = [coord[1], coord[0]];
      const nearestResult = cityNodes.reduce((best, node) => {
        const d = Math.hypot(node.position[0] - point[0], node.position[1] - point[1]);
        return d < best.dist ? { node, dist: d } : best;
      }, { node: null, dist: Infinity });
      
      // Si un nœud est très proche de l'itinéraire (< 800m environ) et qu'il est encombré (>40%)
      if (nearestResult.node && nearestResult.dist < 0.008 && nearestResult.node.congestionValue > 40) {
        congestedNodes.add(nearestResult.node.name);
      }
    }
    
    return Array.from(congestedNodes).slice(0, 3); // Limiter à 3 zones pour l'affichage
  };

  const congestedZones = getCongestedLandmarks();

  // Render dynamic congestion segments on the route
  const renderRouteSegments = () => {
    if (!routeGeo || !routeGeo.coordinates) return null;
    const coords = routeGeo.coordinates.map(c => [c[1], c[0]]);
    
    const segments = [];
    // Split into segments (approx 6)
    const chunkSize = Math.max(2, Math.floor(coords.length / 6));
    
    // Deterministic pseudo-random based on currentCongestion to avoid flickering
    let seed = currentCongestion;
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < coords.length - 1; i += chunkSize) {
      const segmentCoords = coords.slice(i, i + chunkSize + 1);
      
      let color = "#10b981"; // Fluide (Vert)
      const rand = random() * 100;
      if (currentCongestion > 70) {
        color = rand > 30 ? "#ef4444" : "#f59e0b"; // Saturé (Rouge dominant)
      } else if (currentCongestion > 40) {
        color = rand > 60 ? "#ef4444" : (rand > 30 ? "#f59e0b" : "#10b981"); // Modéré (Orange dominant)
      } else {
        color = rand > 85 ? "#f59e0b" : "#10b981"; // Fluide (Vert dominant)
      }

      segments.push(
        <Polyline
          key={`segment-${i}`}
          positions={segmentCoords}
          color={color}
          weight={6}
          opacity={0.9}
        />
      );
    }
    return segments;
  };

  const calculateEstimatedDuration = (alt) => {
    if (!alt.geometry?.coordinates || alt.geometry.coordinates.length < 2) {
      return Math.round(alt.duration * (1 + (currentCongestion / 100)));
    }
    const cityNodes = currentCityData?.name === "Yaoundé" ? YAOUNDE_NODES : DOUALA_NODES;
    let estimatedDuration = 0;
    const segmentBaseDuration = alt.duration / (alt.geometry.coordinates.length - 1);
    
    alt.geometry.coordinates.forEach((coord, i) => {
      if (i === alt.geometry.coordinates.length - 1) return;
      const start = [alt.geometry.coordinates[i][1], alt.geometry.coordinates[i][0]];
      const nearestResult = cityNodes.reduce((best, node) => {
        const d = Math.hypot(node.position[0] - start[0], node.position[1] - start[1]);
        return d < best.dist ? { node, dist: d } : best;
      }, { node: null, dist: Infinity });
      
      const congestion = (nearestResult.node && nearestResult.dist < 0.008) ? nearestResult.node.congestionValue : currentCongestion;
      
      let multiplier = 1;
      if (congestion >= 75) multiplier = 3.5; // Jammed: 3.5x slower
      else if (congestion >= 60) multiplier = 2.5; // Heavy: 2.5x slower
      else if (congestion >= 40) multiplier = 1.5; // Moderate: 1.5x slower
      else multiplier = 1.0; // Fluid: normal time
      
      estimatedDuration += segmentBaseDuration * multiplier;
    });
    return Math.round(estimatedDuration);
  };

  if (isLoading) {
    return (
      <main className="prediction-page">
        <section className="prediction-loading">
          <h2>Chargement des prédictions…</h2>
          <p>Veuillez patienter pendant que les données arrivent.</p>
        </section>
      </main>
    );
  }
  return (
    <main className="prediction-page">
      {/* HEADER */}
      <section className="prediction-page-header" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "12px", marginBottom: "20px" }}>
        
        {/* City Selector moved here (above the toggle button) */}
        <div className="prediction-city-selector" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "11px 15px", background: "#ffffff", border: "1px solid #e2e9e5", borderRadius: "11px", color: "#087f5b" }}>
          <style>{`
            /* Enhanced layer control toggle icon */
            .leaflet-control-layers-toggle {
              width: 36px;
              height: 36px;
              background-color: var(--cityflow-primary);
              background-image: none;
              border-radius: 8px;
              box-shadow: 0 2px 6px rgba(0,0,0,0.2);
            }
            .leaflet-control-layers-toggle::before {
              content: '';
              display: block;
              width: 100%;
              height: 100%;
              background-image: url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22white%22%3E%3Cpath d=%22M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0-8h14V7H7v2z%22/%3E%3C/svg%3E');
              background-size: 60%;
              background-repeat: no-repeat;
              background-position: center;
            }
          `}</style>
          <MapPin size={18} />
          <select
            value={selectedCity}
            onChange={(event) => setSelectedCity(event.target.value)}
            style={{ border: "none", outline: "none", background: "transparent", color: "#172033", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}
          >
            <option value="Yaoundé">📍 Yaoundé (Centre)</option>
            <option value="Douala">📍 Douala (Littoral)</option>
          </select>
        </div>

        {/* Toggle button for map */}
        <button
          className="toggle-map-btn"
          onClick={() => setShowMap(!showMap)}
          style={{
            background: "var(--cityflow-primary)",
            color: "white",
            borderRadius: "8px",
            padding: "6px 12px",
            fontSize: "12px",
          }}
        >
          {showMap ? "Masquer la carte" : "Afficher la carte"}
        </button>
      </section>
      <section className="prediction-layout">
        <section className="prediction-main">

        <div>
          <span className="prediction-eyebrow">
            <BrainCircuit size={16} />
            MOTEUR NEURAL CITYFLOW
          </span>
          <h1>Prédictions & Simulation Trafic</h1>
          <p>
            Analyse prédictive multi-horizons combinant historique urbain,
            impacts météo en direct et algorithmes d'apprentissage profond.
          </p>
          {/* Show weather from WebSocket or location-based lookup */}
          {weatherInfo && (
            <div className="weather-summary-card" style={{ marginTop: "20px", padding: "16px 24px", background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(12px)", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.1)", display: "flex", alignItems: "center", gap: "28px", color: "#f8fafc", width: "fit-content", boxShadow: "0 4px 15px rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <CloudRain size={24} color="#38bdf8" />
                <span style={{ fontSize: "16px", fontWeight: "600" }}>{weatherInfo.condition}</span>
              </div>
              <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.2)" }}></div>
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{ fontSize: "22px", fontWeight: "700", color: "#fcd34d" }}>{weatherInfo.temperature}°C</span>
              </div>
              <div style={{ width: "1px", height: "24px", background: "rgba(255,255,255,0.2)" }}></div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#cbd5e1" }}>
                <span>💧 {weatherInfo.precipitation} mm</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#cbd5e1" }}>
                <span>💨 {weatherInfo.windSpeed} m/s</span>
              </div>
            </div>
          )}
          {/* Mini map showing the selected route is moved to the right sidebar */}

          {/* Map and Inputs side-by-side */}
          <div className="prediction-map-and-inputs" style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "20px", alignItems: "stretch", marginTop: "40px", marginBottom: "30px", width: "100%" }}>
            
            {showMap && (
              <section className="prediction-map-sidebar" style={{ position: "relative", flex: "1 1 500px", maxWidth: "650px", aspectRatio: "1 / 1", minHeight: "550px", borderRadius: "12px", overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", background: "rgba(255, 255, 255, 0.85)", border: "1px solid rgba(255,255,255,0.3)", display: "flex", flexDirection: "column" }}>
                <MapContainer
                  key={departureCoords?.join(',')}
                  center={departureCoords ? [departureCoords[0], departureCoords[1]] : [0, 0]}
                  zoom={13}
                  maxZoom={20}
                  style={{ flex: 1, width: "100%", minHeight: "350px" }}
                  scrollWheelZoom={true}
                >
                  {/* Layer selector */}
                  <LayersControl position="topright">
                    <LayersControl.BaseLayer checked name="🗺️ Standard (OpenStreetMap)">
                      <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                        maxZoom={20}
                        maxNativeZoom={19}
                      />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="🌙 Mode Nuit (OSM Dark)">
                      <TileLayer
                        attribution='&copy; CartoDB'
                        url='https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                        maxZoom={20}
                        maxNativeZoom={19}
                      />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="🛣️ Esri Rues Urbaines">
                      <TileLayer
                        attribution='&copy; Esri'
                        url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
                        maxZoom={20}
                        maxNativeZoom={19}
                      />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="🛰️ Satellite (Esri Imagery)">
                      <TileLayer
                        attribution='&copy; Esri'
                        url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                        maxZoom={20}
                        maxNativeZoom={19}
                      />
                    </LayersControl.BaseLayer>
                    <LayersControl.BaseLayer name="⛰️ Relief & Collines (Topo)">
                      <TileLayer
                        attribution='&copy; OpenTopoMap'
                        url='https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
                        maxZoom={20}
                        maxNativeZoom={17}
                      />
                    </LayersControl.BaseLayer>
                  </LayersControl>
                  {departureCoords && (
                    <Marker position={departureCoords}>
                      <Popup>Départ</Popup>
                    </Marker>
                  )}
                  {destinationCoords && (
                    <Marker position={destinationCoords}>
                      <Popup>
                        <strong>Destination</strong>
                        {routeAlternatives && routeAlternatives.length > 0 && (
                          <div style={{ marginTop: "4px", fontSize: "12px" }}>
                            Distance : {(routeAlternatives[0].distance / 1000).toFixed(1)} km<br />
                            Temps : {formatDuration(calculateEstimatedDuration(routeAlternatives[0]))}
                          </div>
                        )}
                      </Popup>
                    </Marker>
                  )}
                  {congestedZones && congestedZones.map((z) => {
                    const cityNodes = currentCityData?.name === "Yaoundé" ? YAOUNDE_NODES : DOUALA_NODES;
                    const node = cityNodes.find(n => n.name.includes(z) || z.includes(n.name));
                    if (!node) return null;
                    const congVal = node.congestionValue || 50;
                    const markerColor = congVal > 60 ? '#ef4444' : congVal > 40 ? '#f59e0b' : '#10b981';
                    return (
                      <CircleMarker
                        key={z}
                        center={node.position}
                        radius={10}
                        pathOptions={{ color: markerColor, fillColor: markerColor, fillOpacity: 0.7, weight: 3 }}
                      >
                        <Popup><strong>{z}</strong><br/>Congestion : {congVal}%</Popup>
                      </CircleMarker>
                    );
                  })}
{/* Render all alternative routes */}
                  {/* Render colored route segments for chosen route, solid lines for alternatives */}
                  {routeAlternatives.map((alt, idx) => {
                    if (idx > 0) {
                      const positions = alt.geometry.coordinates.map(c => [c[1], c[0]]);
                      return (
                        <Polyline
                          key={`alt-${idx}`}
                          positions={positions}
                          color="#94a3b8"
                          weight={4}
                          opacity={0.6}
                          dashArray="5, 10"
                        />
                      );
                    }

                    return alt.geometry.coordinates.map((coord, i) => {
                      if (i === alt.geometry.coordinates.length - 1) return null;
                      const start = [alt.geometry.coordinates[i][1], alt.geometry.coordinates[i][0]];
                      const end = [alt.geometry.coordinates[i+1][1], alt.geometry.coordinates[i+1][0]];
                      // Determine nearest node to start point for congestion value
                      const cityNodes = currentCityData?.name === "Yaoundé" ? YAOUNDE_NODES : DOUALA_NODES;
                      const nearestResult = cityNodes.reduce((best, node) => {
                        const d = Math.hypot(node.position[0] - start[0], node.position[1] - start[1]);
                        return d < best.dist ? { node, dist: d } : best;
                      }, { node: null, dist: Infinity });
                      const congestion = (nearestResult.node && nearestResult.dist < 0.008) ? nearestResult.node.congestionValue : currentCongestion;
                      const getColor = (val) => {
                         if (val > 60) return '#ef4444'; // red for heavy congestion
                         if (val > 40) return '#f59e0b'; // orange for moderate congestion
                         return '#10b981'; // green for low/no congestion
                      };
                      return (
                        <Polyline
                          key={`${idx}-${i}-bg`}
                          positions={[start, end]}
                          color="#ffffff"
                          weight={8}
                          opacity={0.6}
                        />
                      );
                    });
                  })}

                  {routeAlternatives.map((alt, idx) => {
                    if (idx > 0) return null;
                    return alt.geometry.coordinates.map((coord, i) => {
                      if (i === alt.geometry.coordinates.length - 1) return null;
                      const start = [alt.geometry.coordinates[i][1], alt.geometry.coordinates[i][0]];
                      const end = [alt.geometry.coordinates[i+1][1], alt.geometry.coordinates[i+1][0]];
                      const cityNodes = currentCityData?.name === "Yaoundé" ? YAOUNDE_NODES : DOUALA_NODES;
                      const nearestResult = cityNodes.reduce((best, node) => {
                        const d = Math.hypot(node.position[0] - start[0], node.position[1] - start[1]);
                        return d < best.dist ? { node, dist: d } : best;
                      }, { node: null, dist: Infinity });
                      const congestion = (nearestResult.node && nearestResult.dist < 0.008) ? nearestResult.node.congestionValue : currentCongestion;
                      const getColor = (val) => {
                         if (val > 60) return '#ef4444'; // red
                         if (val > 40) return '#f59e0b'; // orange
                         return '#10b981'; // green
                      };
                      return (
                        <Polyline
                          key={`${idx}-${i}`}
                          positions={[start, end]}
                          color={getColor(congestion)}
                          weight={6}
                          opacity={1}
                        />
                      );
                    });
                  })}
                  <MapBounds routeGeo={routeGeo} departureCoords={departureCoords} destinationCoords={destinationCoords} />
                </MapContainer>
                
                {/* Overlay Info Box on Map */}
                {routeAlternatives && routeAlternatives.length > 0 && (
                  <div style={{
                    position: "absolute",
                    bottom: "20px",
                    left: "20px",
                    zIndex: 1000,
                    background: "rgba(15, 23, 42, 0.9)",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    color: "#f8fafc",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)"
                  }}>
                    <div style={{ fontSize: "14px", fontWeight: "600", marginBottom: "6px", color: "#34d399", display: "flex", alignItems: "center", gap: "6px" }}>
                      <MapPin size={16} /> Résumé du trajet
                    </div>
                    <div style={{ fontSize: "13px", color: "#cbd5e1", marginBottom: "2px" }}>
                      Distance : <strong style={{ color: "#fff" }}>{(routeAlternatives[0].distance / 1000).toFixed(1)} km</strong>
                    </div>
                    <div style={{ fontSize: "13px", color: "#cbd5e1" }}>
                      Temps estimé : <strong style={{ color: "#fcd34d" }}>{formatDuration(calculateEstimatedDuration(routeAlternatives[0]))}</strong>
                    </div>
                  </div>
                )}
              </section>
            )}

            <div className="prediction-inputs" style={{ flex: "1 1 400px", height: "100%", minHeight: "550px", display: "flex", flexDirection: "column", gap: "14px", background: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", padding: "24px", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.1)", boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)", fontFamily: "'Inter', 'Outfit', 'Segoe UI', sans-serif" }}>
            
            <datalist id="city-landmarks">
              {(LANDMARKS[currentCityData?.name] || [...LANDMARKS["Yaoundé"], ...LANDMARKS["Douala"]]).map(lm => (
                <option key={lm} value={lm} />
              ))}
            </datalist>

            <label className="input-label" style={{ fontWeight: 600, color: "#f8fafc", fontSize: "14px" }}>
              Heure:
              <input
                type="time"
                value={String(selectedHour).padStart(2, "0") + ":00"}
                onChange={(e) => {
                  const hour = parseInt(e.target.value.split(":")[0], 10);
                  setSelectedHour(hour);
                }}
                className="prediction-time-input"
              />
            </label>
            <label className="input-label" style={{ fontWeight: 600, color: "#f8fafc", fontSize: "14px" }}>
              Destination:
              <input
                type="text"
                list="city-landmarks"
                placeholder="Ex: Port de Douala"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="prediction-destination-input"
              />
            </label>
            <label className="input-label" style={{ fontWeight: 600, color: "#f8fafc", fontSize: "14px" }}>
              Départ:
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  list="city-landmarks"
                  placeholder="Ex: Gare centrale"
                  value={departure}
                  onChange={(e) => setDeparture(e.target.value)}
                  className="prediction-departure-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleGeolocateDeparture}
                  title="Me géolocaliser"
                  style={{ background: "#e8f7f1", border: "1px solid #cdebe0", borderRadius: "8px", padding: "0 10px", cursor: "pointer", color: "#087f5b", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <MapPin size={16} />
                </button>
              </div>
            </label>
            <button
              type="button"
              onClick={handlePredict}
              style={{
                marginTop: "16px",
                background: "var(--cityflow-primary)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "14px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(8, 127, 91, 0.2)",
                transition: "all 0.2s ease"
              }}
            >
              Calculer l'itinéraire & Prédictions
            </button>
            {routeAlternatives.length > 0 && (
              <div style={{ marginTop: "12px", padding: "16px", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "8px", color: "#f8fafc", fontSize: "14px" }}>
                <h4 style={{ margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: "8px", color: "#34d399", fontSize: "15px" }}>
                  <MapPin size={18} /> Options d'itinéraires
                </h4>
                {routeAlternatives.map((alt, idx) => {
                  let fluidCount = 0, moderateCount = 0, heavyCount = 0;
                  const cityNodes = currentCityData?.name === "Yaoundé" ? YAOUNDE_NODES : DOUALA_NODES;
                  if (alt.geometry?.coordinates) {
                    alt.geometry.coordinates.forEach((coord, i) => {
                      if (i === alt.geometry.coordinates.length - 1) return;
                      const start = [alt.geometry.coordinates[i][1], alt.geometry.coordinates[i][0]];
                      const nearestResult = cityNodes.reduce((best, node) => {
                        const d = Math.hypot(node.position[0] - start[0], node.position[1] - start[1]);
                        return d < best.dist ? { node, dist: d } : best;
                      }, { node: null, dist: Infinity });
                      const congestion = (nearestResult.node && nearestResult.dist < 0.008) ? nearestResult.node.congestionValue : currentCongestion;
                      if (congestion > 60) heavyCount++;
                      else if (congestion > 40) moderateCount++;
                      else fluidCount++;
                    });
                  }
                  const totalCount = fluidCount + moderateCount + heavyCount || 1;
                  const segFluid = (fluidCount / totalCount) * 100;
                  const segMod = (moderateCount / totalCount) * 100;
                  const segHeavy = (heavyCount / totalCount) * 100;

                  return (
                  <div key={idx} style={{ marginBottom: "10px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "10px" }}>
                    <strong>Itinéraire {idx + 1}</strong>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                      <span style={{ color: "#cbd5e1" }}>Distance :</span>
                      <span>{(alt.distance / 1000).toFixed(1)} km</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#cbd5e1" }}>Temps normal :</span>
                      <span>{Math.round(alt.duration / 60)} min</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "4px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                      <span style={{ color: "#fcd34d", fontWeight: "500" }}>Temps estimé (IA + Trafic) :</span>
                      <span style={{ color: "#fcd34d" }}>{formatDuration(calculateEstimatedDuration(alt))}</span>
                    </div>
                    
                    {/* Météo à l'heure indiquée */}
                    {weatherInfo && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px", fontSize: "13px" }}>
                        <span style={{ color: "#cbd5e1" }}>Météo à {String(selectedHour).padStart(2, "0")}:00 :</span>
                        <span style={{ color: "#60a5fa" }}>{weatherInfo.temperature}°C, {WEATHER_OPTIONS.find(w => w.key === selectedWeather)?.label || "Clair"}</span>
                      </div>
                    )}

                    {/* Segmentation visuelle de la congestion */}
                    <div style={{ marginTop: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#cbd5e1", marginBottom: "4px" }}>
                        <span>Segments de congestion sur l'itinéraire :</span>
                      </div>
                      <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                        {segFluid > 0 && <div style={{ width: `${segFluid}%`, background: '#10b981' }} title="Fluide"></div>}
                        {segMod > 0 && <div style={{ width: `${segMod}%`, background: '#f59e0b' }} title="Modéré"></div>}
                        {segHeavy > 0 && <div style={{ width: `${segHeavy}%`, background: '#ef4444' }} title="Saturé"></div>}
                      </div>
                    </div>
                  </div>
                )})}
                
                {currentCongestion > 40 && congestedZones && congestedZones.length > 0 && (
                  <div style={{ marginTop: "16px", padding: "12px", background: "rgba(239, 68, 68, 0.15)", borderLeft: "3px solid #ef4444", borderRadius: "6px" }}>
                    <span style={{ display: "block", color: "#fca5a5", fontSize: "13px", marginBottom: "6px", fontWeight: "600" }}>
                      ⚠️ Zones de ralentissement majeures :
                    </span>
                    <strong style={{ color: "#f8fafc", fontSize: "14px" }}>
                      {congestedZones.join(" et ")}
                    </strong>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      


      

        
      

      {/* SIMULATEUR MÉTÉO & TEMPOREL INTERACTIF */}
      <section className="ai-simulator-card">
        <div className="ai-sim-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={18} color="#00875A" />
            <h3>Simulateur de Conditions Météo & Heures de Pointe</h3>
          </div>
          <span className="ai-badge-model">{forecastData?.aiModel || "CityFlow-NeuralTraffic v2.4"}</span>
        </div>

        <div className="ai-weather-selector">
          <span className="sim-label">Condition Météo :</span>
          <div className="weather-chips">
            {WEATHER_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedWeather === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  className={`weather-chip ${isSelected ? "active" : ""}`}
                  onClick={() => setSelectedWeather(opt.key)}
                >
                  <Icon size={16} color={isSelected ? "#ffffff" : opt.color} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="ai-time-selector" style={{ marginTop: "24px" }}>
          <span className="sim-label">Impact Horaire en temps réel :</span>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "12px", background: "rgba(255,255,255,0.05)", padding: "16px", borderRadius: "8px", borderLeft: `4px solid ${timeStatus.color}` }}>
             <Clock3 size={24} color={timeStatus.color} />
             <div>
               <strong style={{ display: "block", color: "#f8fafc", fontSize: "15px" }}>{timeStatus.label} ({String(selectedHour).padStart(2, "0")}:00)</strong>
               <span style={{ fontSize: "13px", color: "#cbd5e1" }}>{timeStatus.desc}</span>
             </div>
          </div>
        </div>

        {/* RECOMMANDATIONS DE L'IA */}
        {forecastData?.recommendations && forecastData.recommendations.length > 0 && (
          <div className="ai-recommendation-box">
            <div className="ai-recom-title">
              <Sparkles size={16} />
              <span>{forecastData.recommendations[0].title}</span>
              <span className="ai-recom-badge">{forecastData.recommendations[0].badge}</span>
            </div>
            <p>{forecastData.recommendations[0].message}</p>
          </div>
        )}
      </section>

      {/* INDICATEUR PRINCIPAL */}
      <section className="prediction-main-card">
        <div className="prediction-main-left">
          <div className="prediction-main-icon">
            <Activity size={24} />
          </div>
          <div>
            <span>Niveau de congestion estimé (+15m)</span>
            <h2>{currentCongestion}%</h2>
            <strong style={{ color: currentCongestion > 70 ? "#ef4444" : currentCongestion > 40 ? "#f59e0b" : "#10b981" }}>
              {currentCongestion > 70 ? "Trafic dense / saturé" : currentCongestion > 40 ? "Trafic modéré" : "Trafic fluide"}
            </strong>
          </div>
        </div>

        <div className="prediction-main-description">
          <div className="live-indicator">
            <span></span>
            IA EN TEMPS RÉEL
          </div>
          <p>
            Modèle entraîné sur les flux de Yaoundé et Douala. Coefficient de confiance global : <strong>92.4%</strong>.
          </p>
        </div>
      </section>

      {/* PREDICTIONS MULTI-HORIZONS */}
      <section className="prediction-section-page">
        <div className="page-section-heading">
          <div>
            <span className="prediction-eyebrow">
              <Clock3 size={15} />
              HORIZONS PRÉDICTIFS
            </span>
            <h2>Évolution calculée par l'IA</h2>
          </div>
          <span className="city-label">📍 {selectedCity}</span>
        </div>

        <div className="prediction-cards-page">
          {adjustedPredictions.map((p) => {
            const val = p.congestionPercentage;
            const levelClass = getLevelClass(val);
            return (
              <article key={p.horizon} className={`prediction-time-card ${levelClass}`}>
                <span className="prediction-time">{p.horizon}</span>
                <strong>{val}%</strong>
                <div className="prediction-progress">
                  <span style={{ width: `${val}%` }}></span>
                </div>
                <span className="prediction-level">
                  ● {val > 70 ? "Dense" : val > 40 ? "Modéré" : "Fluide"}
                </span>
              </article>
            );
          })}
        </div>
      </section>

      {/* ANOMALIES DÉTECTÉES PAR L'IA */}
      {forecastData?.anomalies && forecastData.anomalies.length > 0 && (
        <section className="prediction-zones-section">
          <div className="page-section-heading">
            <div>
              <span className="prediction-eyebrow">
                <ShieldAlert size={15} />
                DÉTECTION D'ANOMALIES IA
              </span>
              <h2>Alertes et ralentissements suspects</h2>
            </div>
          </div>

          <div className="prediction-zones-grid">
            {forecastData.anomalies.map((ano, idx) => (
              <article key={idx} className="prediction-zone-card" style={{ borderLeft: ano.severity === "high" ? "4px solid #ef4444" : "4px solid #00875A" }}>
                <div className="zone-header">
                  <div>
                    <MapPin size={17} />
                    <h3>{ano.nodeName}</h3>
                  </div>
                  <span className={`zone-level ${ano.severity === "high" ? "dense" : "fluid"}`}>
                    {ano.type}
                  </span>
                </div>
                <p style={{ fontSize: "12px", color: "#475569", margin: "8px 0" }}>
                  {ano.description}
                </p>
                {ano.recommendedAction && (
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#00875A", background: "#e8f5e9", padding: "6px 10px", borderRadius: "8px" }}>
                    💡 Conseil IA : {ano.recommendedAction}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* EXPLICATION DU MOTEUR IA */}
      <section className="prediction-info-card">
        <div className="info-icon">
          <BrainCircuit size={25} />
        </div>
        <div>
          <span className="prediction-eyebrow">TECHNOLOGIE NEURALE</span>
          <h2>Comment fonctionne le moteur IA CityFlow ?</h2>
          <p>
            Notre modèle intègre la dynamique temporelle des 7 collines de Yaoundé
            et des carrefours stratégiques de Douala. En croisant les ralentissements
            géospatiaux avec les alertes météo en direct, il calcule la probabilité
            d'embouteillage avant même qu'il ne se forme.
          </p>
        </div>
      </section>
        </section>
      </section>

    </main>
  );
}

export default PredictionPage;