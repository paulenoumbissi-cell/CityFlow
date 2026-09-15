const fs = require('fs');
let code = fs.readFileSync('src/pages/EmergencyPage.jsx', 'utf8');

// 1. Add useMapEvents to imports
code = code.replace(
  'useMap, Marker',
  'useMap, useMapEvents, Marker'
);

// 2. Add states for selectingMode and customDestinationCoords
code = code.replace(
  'const [customDestinationText, setCustomDestinationText] = useState("");',
  `const [customDestinationText, setCustomDestinationText] = useState("");
  const [customDestinationCoords, setCustomDestinationCoords] = useState(null);
  const [selectingMode, setSelectingMode] = useState(null);`
);

// 3. Add MapClickHandler component inside EmergencyPage
// We will inject it exactly before "return (" of EmergencyPage.
// To do this safely, we will find "return (" that is followed by "<div className="emergency-dashboard">"
const mapClickHandlerCode = `
  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        if (selectingMode === 'origin') {
          setCustomOriginCoords([e.latlng.lat, e.latlng.lng]);
          setCustomOriginText(\`[\${e.latlng.lat.toFixed(5)}, \${e.latlng.lng.toFixed(5)}]\`);
          setSelectingMode(null);
        } else if (selectingMode === 'destination') {
          setCustomDestinationCoords([e.latlng.lat, e.latlng.lng]);
          setCustomDestinationText(\`[\${e.latlng.lat.toFixed(5)}, \${e.latlng.lng.toFixed(5)}]\`);
          setSelectedHospital(null);
          setSelectingMode(null);
        }
      }
    });
    return null;
  };

  return (
`;
code = code.replace('  return (\n    <div className="emergency-dashboard">', mapClickHandlerCode + '    <div className="emergency-dashboard">');

// 4. Update the MapContainer to include MapClickHandler
code = code.replace(
  'className="emergency-leaflet-container"',
  'className={`emergency-leaflet-container ${selectingMode ? "crosshair-cursor-map" : ""}`}'
);

code = code.replace(
  '<MapController',
  `<MapClickHandler />\n                <MapController`
);

// 5. Update UI for Origin
// The origin input block ends with GPS button
const oldOriginButton = `<Crosshair size={16} />
                    <span>{isLocatingUser ? "GPS..." : "GPS"}</span>
                  </button>`;
const newOriginButton = `<Crosshair size={16} />
                    <span>{isLocatingUser ? "GPS..." : "GPS"}</span>
                  </button>
                  <button
                    className={\`btn-geoloc \${selectingMode === 'origin' ? 'active-select' : ''}\`}
                    onClick={() => setSelectingMode(selectingMode === 'origin' ? null : 'origin')}
                    title="Cliquer sur la carte pour choisir le départ"
                    style={{ marginLeft: '8px', background: selectingMode === 'origin' ? '#3b82f6' : '' }}
                  >
                    <Crosshair size={16} />
                    <span>Carte</span>
                  </button>`;
code = code.replace(oldOriginButton, newOriginButton);

// 6. Update UI for Destination
const oldDestInput = `<input
                  type="text"
                  className="input-custom-text"
                  placeholder="Ex: Hôpital Général, Carrefour Warda..."
                  value={customDestinationText}
                  onChange={(e) => { setCustomDestinationText(e.target.value); setSelectedHospital(null); }}
                  style={{ marginBottom: '10px' }}
                />`;
const newDestInput = `<div className="input-with-action" style={{ marginBottom: '10px' }}>
                  <input
                    type="text"
                    className="input-custom-text"
                    placeholder="Ex: Hôpital Général, Carrefour Warda..."
                    value={customDestinationText}
                    onChange={(e) => { 
                      setCustomDestinationText(e.target.value); 
                      setSelectedHospital(null); 
                      setCustomDestinationCoords(null);
                    }}
                  />
                  <button
                    className={\`btn-geoloc \${selectingMode === 'destination' ? 'active-select' : ''}\`}
                    onClick={() => setSelectingMode(selectingMode === 'destination' ? null : 'destination')}
                    title="Cliquer sur la carte pour choisir la destination"
                    style={{ marginLeft: '8px', background: selectingMode === 'destination' ? '#3b82f6' : '' }}
                  >
                    <Crosshair size={16} />
                    <span>Carte</span>
                  </button>
                </div>`;
code = code.replace(oldDestInput, newDestInput);

// 7. Update handleCalculateCustom to use customDestinationCoords
const oldDestCoordsFinal = `const destCoordsFinal = customDestinationText.trim() ? null : (selectedHospital ? selectedHospital.position : null);`;
const newDestCoordsFinal = `const destCoordsFinal = customDestinationCoords ? customDestinationCoords : (customDestinationText.trim() ? null : (selectedHospital ? selectedHospital.position : null));`;
code = code.replace(oldDestCoordsFinal, newDestCoordsFinal);

fs.writeFileSync('src/pages/EmergencyPage.jsx', code);

// 8. Add CSS class for crosshair cursor to EmergencyPage.css
const cssPath = 'src/pages/EmergencyPage.css';
let css = fs.readFileSync(cssPath, 'utf8');
if (!css.includes('.crosshair-cursor-map')) {
  css += `\n\n.crosshair-cursor-map { cursor: crosshair !important; }\n.active-select { background: #3b82f6 !important; color: white !important; }`;
  fs.writeFileSync(cssPath, css);
}

console.log("Safe map click patch applied");
