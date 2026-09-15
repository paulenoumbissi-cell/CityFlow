const fs = require('fs');
let code = fs.readFileSync('src/pages/EmergencyPage.jsx', 'utf8');

// Fix 1: Remove ThermometerSnow import
code = code.replace(/ThermometerSnow,/g, '');

// Fix 2: destination and destCoords in calculateCustomEmergencyCorridor
code = code.replace(
  /destination:\s*selectedHospital\.name,\s*destCoords:\s*selectedHospital\.position,/g,
  `destination: destQuery,
        destCoords: destCoordsFinal,`
);

// Fix 3: Button disabled state
code = code.replace(
  /disabled=\{isCalculatingRoute\s*\|\|\s*!selectedHospital\}/g,
  `disabled={isCalculatingRoute || (!selectedHospital && !customDestinationText.trim())}`
);

// Fix 4: speakAnnouncement destination
code = code.replace(
  /speakAnnouncement\(`Priorité d'urgence activée vers \$\{selectedHospital\.name\}\. Onde verte en cours\.`\);/g,
  `speakAnnouncement(\`Priorité d'urgence activée vers \$\{customRoutePreview.destination\}. Onde verte en cours.\`);`
);

fs.writeFileSync('src/pages/EmergencyPage.jsx', code);
console.log('Regex fixes applied');
