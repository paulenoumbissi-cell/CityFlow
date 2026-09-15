const fs = require('fs');
let code = fs.readFileSync('src/pages/EmergencyPage.jsx', 'utf8');

// Fix handleCalculateCustom payload
code = code.replace(
  'destination: selectedHospital.name,\n        destCoords: selectedHospital.position,',
  `destination: destQuery,
        destCoords: destCoordsFinal,`
);

// Fix the disabled state of the 'Calculer' button
// The button has: disabled={isCalculatingRoute || (!selectedHospital && !customDestinationText.trim()) || isCalculatingRoute}
// Because my regex earlier replaced all "disabled={!selectedHospital ...}" instances.
// Wait, my regex in patch_dest.cjs was:
// code = code.replace(
//   /disabled=\{!selectedHospital(?:.*)\}/g,
//   'disabled={(!selectedHospital && !customDestinationText.trim()) || isCalculatingRoute}'
// );
// So the button already says: `disabled={(!selectedHospital && !customDestinationText.trim()) || isCalculatingRoute}`
// Let's verify by just logging the button code
const calculateButtonIndex = code.indexOf('btn-calculate-route');
console.log(code.substring(calculateButtonIndex, calculateButtonIndex + 150));

fs.writeFileSync('src/pages/EmergencyPage.jsx', code);
