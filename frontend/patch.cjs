const fs = require('fs');
let code = fs.readFileSync('src/pages/EmergencyPage.jsx', 'utf8');

// 1. Add new icons
code = code.replace(
  'Crosshair,',
  'Crosshair, Layers, CloudRain, Thermometer, ThermometerSun, AlertOctagon, Navigation2, ThermometerSnow,'
);

// 2. Add imports for Leaflet Layers
code = code.replace(
  'Marker, Tooltip } from "react-leaflet";',
  'Marker, Tooltip, LayersControl, LayerGroup, Circle } from "react-leaflet";'
);

// 3. Add states for Map Layer, Weather, Congestion, etc. inside EmergencyPage component
code = code.replace(
  'const [cameraFollow, setCameraFollow] = useState(true);',
  `const [cameraFollow, setCameraFollow] = useState(true);
  const [mapType, setMapType] = useState('standard');
  const [weatherData, setWeatherData] = useState({ temp: 28, condition: 'Dégagé', icon: ThermometerSun });
  const [congestionLevel, setCongestionLevel] = useState('Fluide');
  const [etaText, setEtaText] = useState('14:32');
  const [v2xAlerted, setV2xAlerted] = useState(0);
  const [activeFlotilla, setActiveFlotilla] = useState([]);
  const [isMajorIncident, setIsMajorIncident] = useState(false);`
);

// 4. Update the TileLayer in MapContainer
code = code.replace(
  '<TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />',
  `<LayersControl position="topright">
    <LayersControl.BaseLayer checked name="Standard">
      <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
    </LayersControl.BaseLayer>
    <LayersControl.BaseLayer name="Satellite">
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
    </LayersControl.BaseLayer>
  </LayersControl>`
);

// 5. Inject new UI components in activeMission banner
const telemetryGaugesRegex = /<div className="telemetry-gauges-grid">([\s\S]*?)<\/div>\s*<\/div>\s*<!-- End telemetry -->/g;
// Wait, I need to inject the Weather, ETA, Congestion badges.
// I will just append them inside the telemetry-gauges-grid.
code = code.replace(
  '<div className="telemetry-gauge-card">\n              <div className="gauge-icon-box"><Clock size={18} color="#6366f1" /></div>\n              <div className="gauge-info">\n                <span className="gauge-label">Temps Écoulé</span>\n                <span className="gauge-value">{elapsedTime}s</span>\n              </div>\n            </div>',
  `<div className="telemetry-gauge-card">
              <div className="gauge-icon-box"><Clock size={18} color="#6366f1" /></div>
              <div className="gauge-info">
                <span className="gauge-label">ETA / Écoulé</span>
                <span className="gauge-value">{etaText} <small>({elapsedTime}s)</small></span>
              </div>
            </div>
            <div className="telemetry-gauge-card">
              <div className="gauge-icon-box"><CloudRain size={18} color="#0ea5e9" /></div>
              <div className="gauge-info">
                <span className="gauge-label">Météo Route</span>
                <span className="gauge-value">{weatherData.temp}°C <small>{weatherData.condition}</small></span>
              </div>
            </div>
            <div className="telemetry-gauge-card">
              <div className="gauge-icon-box"><Activity size={18} color={congestionLevel === 'Saturé' ? '#ef4444' : '#f59e0b'} /></div>
              <div className="gauge-info">
                <span className="gauge-label">Congestion</span>
                <span className="gauge-value">{congestionLevel}</span>
              </div>
            </div>`
);

// 6. Inject Major Incident button
code = code.replace(
  '<button\n                className="btn-dispatch-emergency"\n                onClick={handleCustomDispatch}\n                disabled={!selectedHospital || isCalculatingRoute || !customOriginCoords}\n              >',
  `<button
                className="btn-dispatch-emergency"
                style={{ background: "#991b1b", marginTop: "10px", width: "100%", padding: "12px", color: "white", borderRadius: "10px", fontWeight: "bold" }}
                onClick={() => {
                  setIsMajorIncident(true);
                  // Generate Flotilla logic
                  handleCustomDispatch();
                }}
              >
                <AlertOctagon size={18} /> Déclarer Incident Majeur (Multi-Dispatch)
              </button>
              <button
                className="btn-dispatch-emergency"
                onClick={handleCustomDispatch}
                disabled={!selectedHospital || isCalculatingRoute || !customOriginCoords}
              >`
);

fs.writeFileSync('src/pages/EmergencyPage.jsx', code);
console.log("Patched successfully");
