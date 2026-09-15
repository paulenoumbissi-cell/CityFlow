const fs = require('fs');
let code = fs.readFileSync('src/pages/EmergencyPage.jsx', 'utf8');

code = code.replace(
  'disabled={isCalculatingRoute || !selectedHospital}',
  'disabled={isCalculatingRoute || (!selectedHospital && !customDestinationText.trim())}'
);

fs.writeFileSync('src/pages/EmergencyPage.jsx', code);
console.log("Fixed button disabled state");
