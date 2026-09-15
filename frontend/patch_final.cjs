const fs = require('fs');
let code = fs.readFileSync('src/pages/EmergencyPage.jsx', 'utf8');

// Fix 1: Remove ThermometerSnow import
code = code.replace('ThermometerSnow,', '');

// Fix 2: The null reference on selectedHospital in the calculate payload
// We need to replace exactly this payload in handleCalculateCustom
const oldPayload = `      const data = await apiService.calculateCustomEmergencyCorridor({
        origin: originQuery,
        originCoords: customOriginCoords,
        destination: selectedHospital.name,
        destCoords: selectedHospital.position,
        city: currentCity,
        vehicleType: selectedVehicle.id,
      });`;
const newPayload = `      const data = await apiService.calculateCustomEmergencyCorridor({
        origin: originQuery,
        originCoords: customOriginCoords,
        destination: destQuery,
        destCoords: destCoordsFinal,
        city: currentCity,
        vehicleType: selectedVehicle.id,
      });`;
code = code.replace(oldPayload, newPayload);

// Fix 3: The button disabled condition
const oldBtn = 'disabled={isCalculatingRoute || !selectedHospital}';
const newBtn = 'disabled={isCalculatingRoute || (!selectedHospital && !customDestinationText.trim())}';
code = code.replace(oldBtn, newBtn);

// Fix 4: The null reference on selectedHospital in the dispatch voice announcement
const oldVoice = 'speakAnnouncement(`Priorité d\'urgence activée vers ${selectedHospital.name}. Onde verte en cours.`);';
const newVoice = 'speakAnnouncement(`Priorité d\'urgence activée vers ${customRoutePreview.destination}. Onde verte en cours.`);';
code = code.replace(oldVoice, newVoice);

fs.writeFileSync('src/pages/EmergencyPage.jsx', code);
console.log('Final fixes applied via script');
