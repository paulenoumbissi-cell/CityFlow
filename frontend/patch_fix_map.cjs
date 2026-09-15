const fs = require('fs');

let code = fs.readFileSync('src/pages/EmergencyPage.jsx', 'utf8');

// The new component definition
const mapClickHandlerCode = `
const MapClickHandler = ({ selectingMode, setCustomOriginCoords, setCustomOriginText, setSelectingMode, setCustomDestinationCoords, setCustomDestinationText, setSelectedHospital }) => {
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

export default function EmergencyPage() {`;

// Replace export statement to include the new component
code = code.replace('export default function EmergencyPage() {', mapClickHandlerCode);

// Fix the usage
const oldUsage = '<MapClickHandler />';
const newUsage = '<MapClickHandler selectingMode={selectingMode} setCustomOriginCoords={setCustomOriginCoords} setCustomOriginText={setCustomOriginText} setSelectingMode={setSelectingMode} setCustomDestinationCoords={setCustomDestinationCoords} setCustomDestinationText={setCustomDestinationText} setSelectedHospital={setSelectedHospital} />';
code = code.replace(oldUsage, newUsage);

// Wait, I also need to remove the broken inline MapClickHandler that I injected earlier inside EmergencyPage!
// Wait, I never actually injected it inside EmergencyPage!
// Let's check patch_map_click_safe.cjs:
// code = code.replace('  return (\n    <div className="emergency-dashboard">', mapClickHandlerCode + '    <div className="emergency-dashboard">');
// Since it threw "MapClickHandler is not defined", it means the injection failed because the `replace` string didn't match!
// Let's verify if `<MapClickHandler />` was injected. Yes, because `code = code.replace('<MapController', '<MapClickHandler />\n                <MapController');` DID match!
// So the definition is completely missing from the file!

fs.writeFileSync('src/pages/EmergencyPage.jsx', code);
console.log('Fixed MapClickHandler injection');
