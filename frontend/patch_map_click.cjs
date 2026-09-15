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
// We can inject it right after the states or hooks. Let's find a good spot, e.g. after the last useEffect or just before return (
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
`;
code = code.replace(
  'return (',
  mapClickHandlerCode + '\n  return ('
);

// 4. Update the MapContainer to include MapClickHandler
// Also handle the dynamic cursor styling based on selectingMode
code = code.replace(
  'className="emergency-leaflet-container"',
  'className={`emergency-leaflet-container ${selectingMode ? "crosshair-cursor-map" : ""}`}'
);

code = code.replace(
  '<MapController',
  `<MapClickHandler />
                <MapController`
);

// 5. Update UI for Origin
// Add the "Point on map" button next to Geolocate
const originButton = `
                  <button
                    className={\`btn-geoloc \${selectingMode === 'origin' ? 'active-select' : ''}\`}
                    onClick={() => setSelectingMode(selectingMode === 'origin' ? null : 'origin')}
                    title="Cliquer sur la carte pour choisir le départ"
                  >
                    <Crosshair size={16} />
                    <span>Carte</span>
                  </button>
`;
code = code.replace(
  '<Crosshair size={16} />\n                    <span>{isLocatingUser ? "GPS..." : "GPS"}</span>\n                  </button>',
  `<Crosshair size={16} />
                    <span>{isLocatingUser ? "GPS..." : "GPS"}</span>
                  </button>
${originButton}`
);

// 6. Update UI for Destination
// Wrap the destination input in <div className="input-with-action"> to align the button
const destButton = `
                <div className="input-with-action">
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
                  >
                    <Crosshair size={16} />
                    <span>Carte</span>
                  </button>
                </div>
`;

// Replace the old destination input block
code = code.replace(
  /<input[\s\S]*?onChange=\{\(e\) => \{\s*setCustomDestinationText\(e\.target\.value\);\s*setSelectedHospital\(null\);\s*\}\}[\s\S]*?\/>/m,
  destButton
);


// 7. Update handleCalculateCustom to use customDestinationCoords
code = code.replace(
  /const destCoordsFinal = customDestinationText\.trim\(\) \? null : \(selectedHospital \? selectedHospital\.position : null\);/g,
  `const destCoordsFinal = customDestinationCoords ? customDestinationCoords : (customDestinationText.trim() ? null : (selectedHospital ? selectedHospital.position : null));`
);

fs.writeFileSync('src/pages/EmergencyPage.jsx', code);

// 8. Add CSS class for crosshair cursor to EmergencyPage.css
const cssPath = 'src/pages/EmergencyPage.css';
let css = fs.readFileSync(cssPath, 'utf8');
if (!css.includes('.crosshair-cursor-map')) {
  css += `\n\n.crosshair-cursor-map { cursor: crosshair !important; }\n.active-select { background: #3b82f6 !important; color: white !important; }`;
  fs.writeFileSync(cssPath, css);
}

console.log("Map click patch applied");
