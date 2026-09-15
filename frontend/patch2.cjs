const fs = require('fs');
let code = fs.readFileSync('src/pages/EmergencyPage.jsx', 'utf8');

// Inject V2X Radar Circle around current vehicle
code = code.replace(
  '<Marker\n                    position={currentVehiclePosition}\n                    icon={createVehicleDivIcon(selectedVehicle.color, activeMission.vehicleName)}\n                  >',
  `{/* V2X HALO RADAR */}
                  {isMajorIncident && <Circle center={currentVehiclePosition} radius={500} color={selectedVehicle.color} fillColor={selectedVehicle.color} fillOpacity={0.15} dashArray="4 4" />}
                  <Marker
                    position={currentVehiclePosition}
                    icon={createVehicleDivIcon(selectedVehicle.color, activeMission.vehicleName)}
                  >`
);

// Add activeFlotilla rendering (alternative/multi routes) right after Polyline
code = code.replace(
  '{/* Marqueurs des Carrefours / Feux Tricolores */}',
  `{/* ALTERNATIVE ROUTES / FLOTILLA */}
                {isMajorIncident && activeFlotilla.map((flot, idx) => (
                   <Polyline key={'flot-'+idx} positions={flot.coords} color={flot.color} weight={4} dashArray="8, 8" opacity={0.6} />
                ))}
                
                {/* Marqueurs des Carrefours / Feux Tricolores */}`
);

fs.writeFileSync('src/pages/EmergencyPage.jsx', code);
console.log("Patched 2 successfully");
