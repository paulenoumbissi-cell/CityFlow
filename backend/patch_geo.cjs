const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/controllers/emergencyController.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Change resolveCoordinates to async and add Nominatim fallback
const oldResolve = `function resolveCoordinates(point, cityKey) {
  if (Array.isArray(point) && point.length === 2) {
    return [parseFloat(point[0]), parseFloat(point[1])];
  }
  if (typeof point === "string") {
    // Chercher dans les hôpitaux
    const hospitals = EMERGENCY_HOSPITALS_DB[cityKey] || EMERGENCY_HOSPITALS_DB["Yaoundé"];
    const foundHosp = hospitals.find(
      (h) => h.name.toLowerCase().includes(point.toLowerCase()) || point.toLowerCase().includes(h.name.toLowerCase())
    );
    if (foundHosp) return foundHosp.position;

    // Chercher dans les repères de ville
    const cityLandmarks = CITY_LANDMARKS[cityKey] || CITY_LANDMARKS["Yaoundé"];
    const foundLandmark = Object.entries(cityLandmarks).find(
      ([name]) => name.toLowerCase().includes(point.toLowerCase()) || point.toLowerCase().includes(name.toLowerCase())
    );
    if (foundLandmark) return foundLandmark[1].pos;
  }
  // Par défaut centre ville
  return cityKey === "Douala" ? [4.0511, 9.7043] : [3.8667, 11.5167];
}`;

const newResolve = `async function resolveCoordinates(point, cityKey) {
  if (Array.isArray(point) && point.length === 2) {
    return [parseFloat(point[0]), parseFloat(point[1])];
  }
  if (typeof point === "string") {
    // Chercher dans les hôpitaux
    const hospitals = EMERGENCY_HOSPITALS_DB[cityKey] || EMERGENCY_HOSPITALS_DB["Yaoundé"];
    const foundHosp = hospitals.find(
      (h) => h.name.toLowerCase().includes(point.toLowerCase()) || point.toLowerCase().includes(h.name.toLowerCase())
    );
    if (foundHosp) return foundHosp.position;

    // Chercher dans les repères de ville
    const cityLandmarks = CITY_LANDMARKS[cityKey] || CITY_LANDMARKS["Yaoundé"];
    if (cityLandmarks) {
      const foundLandmark = Object.entries(cityLandmarks).find(
        ([name]) => name.toLowerCase().includes(point.toLowerCase()) || point.toLowerCase().includes(name.toLowerCase())
      );
      if (foundLandmark) return foundLandmark[1].pos;
    }

    // Fallback: Geocoding via Nominatim (OpenStreetMap)
    try {
      const query = encodeURIComponent(\`\${point}, \${cityKey}, Cameroon\`);
      const res = await fetch(\`https://nominatim.openstreetmap.org/search?q=\${query}&format=json&limit=1\`, {
        headers: { 'User-Agent': 'CityFlowApp/1.0' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
           return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
      }
    } catch(err) {
      console.warn("Erreur geocoding Nominatim:", err);
    }
  }
  // Par défaut centre ville
  return cityKey === "Douala" ? [4.0511, 9.7043] : [3.8667, 11.5167];
}`;

code = code.replace(oldResolve, newResolve);

// 2. Change the calls to await resolveCoordinates
code = code.replace(
  'const startPos = originCoords || resolveCoordinates(origin, cityKey);',
  'const startPos = originCoords || await resolveCoordinates(origin, cityKey);'
);
code = code.replace(
  'const endPos = destCoords || resolveCoordinates(destination, cityKey);',
  'const endPos = destCoords || await resolveCoordinates(destination, cityKey);'
);

fs.writeFileSync(filePath, code);
console.log("Geocoding added successfully");
