const fs = require('fs');
let code = fs.readFileSync('src/pages/EmergencyPage.jsx', 'utf8');

// 1. Add state for destination
code = code.replace(
  'const [customOriginText, setCustomOriginText] = useState("");',
  `const [customOriginText, setCustomOriginText] = useState("");
  const [customDestinationText, setCustomDestinationText] = useState("");`
);

// 2. Modify handleCalculateCustom to use customDestinationText
code = code.replace(
  'const originQuery = customOriginText.trim() || (customOriginCoords ? "Position GPS Actuelle" : "Poste Centrale");',
  `const originQuery = customOriginText.trim() || (customOriginCoords ? "Position GPS Actuelle" : "Poste Centrale");
    const destQuery = customDestinationText.trim() || (selectedHospital ? selectedHospital.name : "Centre-Ville");
    const destCoordsFinal = customDestinationText.trim() ? null : (selectedHospital ? selectedHospital.position : null);`
);

code = code.replace(
  'destination: selectedHospital.name,\n        destCoords: selectedHospital.position,',
  `destination: destQuery,
        destCoords: destCoordsFinal,`
);

// 3. Update the UI for destination text input right above the hospital selector
const destUI = `
              {/* Destination Personnalisée */}
              <div className="form-group-custom">
                <label className="input-label">Destination (Lieu exact ou sélectionner un hôpital) :</label>
                <input
                  type="text"
                  className="input-custom-text"
                  placeholder="Ex: Hôpital Général, Carrefour Warda..."
                  value={customDestinationText}
                  onChange={(e) => { setCustomDestinationText(e.target.value); setSelectedHospital(null); }}
                  style={{ marginBottom: '10px' }}
                />
              </div>
`;
code = code.replace(
  '{/* Choix de l\'Hôpital */}',
  destUI + '\n              {/* Choix de l\'Hôpital (Optionnel) */}'
);

// Also modify the validation to allow either selectedHospital OR customDestinationText
code = code.replace(
  'if (!selectedHospital) return;',
  'if (!selectedHospital && !customDestinationText.trim()) return;'
);

code = code.replace(
  'disabled={!selectedHospital || isCalculatingRoute || !customOriginCoords}',
  'disabled={(!selectedHospital && !customDestinationText.trim()) || isCalculatingRoute}'
);

// There are multiple disabled cases, I'll use a regex for safety
code = code.replace(
  /disabled=\{!selectedHospital(?:.*)\}/g,
  'disabled={(!selectedHospital && !customDestinationText.trim()) || isCalculatingRoute}'
);

fs.writeFileSync('src/pages/EmergencyPage.jsx', code);
console.log("Patched destination successfully");
