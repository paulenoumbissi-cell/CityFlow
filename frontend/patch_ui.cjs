const fs = require('fs');

let jsx = fs.readFileSync('src/pages/EmergencyPage.jsx', 'utf8');

// 1. Clean up Origin Button
const oldOriginBtn = `<button
                    className={\`btn-geoloc \${selectingMode === 'origin' ? 'active-select' : ''}\`}
                    onClick={() => setSelectingMode(selectingMode === 'origin' ? null : 'origin')}
                    title="Cliquer sur la carte pour choisir le départ"
                    style={{ marginLeft: '8px', background: selectingMode === 'origin' ? '#3b82f6' : '' }}
                  >`;
const newOriginBtn = `<button
                    className={\`btn-geoloc \${selectingMode === 'origin' ? 'active-select' : ''}\`}
                    onClick={() => setSelectingMode(selectingMode === 'origin' ? null : 'origin')}
                    title="Cliquer sur la carte pour choisir le départ"
                  >`;
jsx = jsx.replace(oldOriginBtn, newOriginBtn);

// 2. Clean up Destination Input & Button
const oldDestInput = `<div className="input-with-action" style={{ marginBottom: '10px' }}>
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
const newDestInput = `<div className="input-with-action">
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
                </div>`;
jsx = jsx.replace(oldDestInput, newDestInput);

// 3. Inject Floating Banner into Map Container
const oldMapContainer = `<div className="leaflet-emergency-wrapper" style={{ position: "relative" }}>
              {/* POP-UP D'ALERTE CONDUCTEUR / DIFFUSION EN DIRECT */}
              <EmergencyAlertOverlay onFocusVehicle={() => { setCameraFollow(true); }} />`;
const newMapContainer = `<div className="leaflet-emergency-wrapper" style={{ position: "relative" }}>
              {/* POP-UP D'ALERTE CONDUCTEUR / DIFFUSION EN DIRECT */}
              <EmergencyAlertOverlay onFocusVehicle={() => { setCameraFollow(true); }} />
              
              {/* BANNIÈRE DE SÉLECTION CARTE */}
              {selectingMode && (
                <div className="map-selection-banner animate-fade-in">
                  <Crosshair size={18} className="spin-slow" />
                  <span>
                    Veuillez cliquer sur la carte pour définir le <strong>{selectingMode === 'origin' ? 'Point de Départ' : 'Point de Destination'}</strong>.
                  </span>
                  <button className="btn-cancel-select" onClick={() => setSelectingMode(null)}>Annuler</button>
                </div>
              )}`;
jsx = jsx.replace(oldMapContainer, newMapContainer);

fs.writeFileSync('src/pages/EmergencyPage.jsx', jsx);

// 4. Update CSS in EmergencyPage.css
let css = fs.readFileSync('src/pages/EmergencyPage.css', 'utf8');

// Remove the old simple injected styles
css = css.replace('.crosshair-cursor-map { cursor: crosshair !important; }', '');
css = css.replace('.active-select { background: #3b82f6 !important; color: white !important; }', '');

// Append polished styles
const newCss = `
/* UI ERGONOMY IMPROVEMENTS */
.input-with-action {
  display: flex;
  gap: 12px;
  margin-bottom: 15px; /* Better spacing between form groups */
}

.btn-geoloc {
  transition: all 0.2s ease;
}

.btn-geoloc:hover {
  background: #e2e8f0;
}

.btn-geoloc.active-select {
  background: #ef4444 !important;
  color: white !important;
  border-color: #ef4444;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
  animation: pulse-border 2s infinite;
}

.crosshair-cursor-map .leaflet-container {
  cursor: crosshair !important;
}

.map-selection-banner {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(8px);
  color: white;
  padding: 12px 24px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  font-size: 0.95rem;
  pointer-events: auto;
}

.map-selection-banner strong {
  color: #ef4444;
}

.btn-cancel-select {
  background: rgba(255,255,255,0.15);
  border: none;
  color: white;
  padding: 6px 12px;
  border-radius: 15px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.2s;
  margin-left: 8px;
}

.btn-cancel-select:hover {
  background: rgba(255,255,255,0.3);
}

.spin-slow {
  animation: spin 4s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

@keyframes pulse-border {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  70% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}
`;
css += newCss;

fs.writeFileSync('src/pages/EmergencyPage.css', css);
console.log('UI patches applied');
