
async function testSmartRoutesApi() {
  console.log('🧪 Test du Moteur d\'Itinéraires Multi-Critères & Éco-Mobilité...');

  // 1. Test Calcul d'Itinéraire pour Yaoundé
  console.log('📍 Test 1 : Calcul Mvan -> Bastos (Yaoundé)');
  const resYde = await fetch('http://localhost:3000/api/routes/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      city: 'Yaoundé',
      origin: 'Mvan (Gare)',
      destination: 'Bastos',
    }),
  });

  const dataYde = await resYde.json();
  console.log('   ✅ Nombre d\'itinéraires générés :', dataYde.routes?.length);
  console.log('   ✅ Types d\'itinéraires :', dataYde.routes?.map(r => `${r.type} (${r.durationMinutes} min, ${r.distanceKm} km, Eco-Score: ${r.ecoScore})`));
  console.log('   ✅ Comparateur Multimodal :', dataYde.multimodal?.map(m => `${m.label}: ${m.durationMinutes} min (${m.costLabel})`));

  // 2. Test Calcul d'Itinéraire pour Douala
  console.log('\n📍 Test 2 : Calcul Deido -> Bonanjo (Douala)');
  const resDla = await fetch('http://localhost:3000/api/routes/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      city: 'Douala',
      origin: 'Deido (Rond-point)',
      destination: 'Bonanjo',
    }),
  });

  const dataDla = await resDla.json();
  console.log('   ✅ Nombre d\'itinéraires Douala :', dataDla.routes?.length);
  console.log('   ✅ Coordonnées reçues pour le tracé :', dataDla.routes?.[0]?.coordinates?.length, 'points polyline');

  // 3. Test Récupération des Repères / Landmarks
  console.log('\n📍 Test 3 : Récupération des repères urbains /api/routes/landmarks');
  const resLandmarks = await fetch('http://localhost:3000/api/routes/landmarks?city=Yaound%C3%A9');
  const dataLandmarks = await resLandmarks.json();
  console.log('   ✅ Repères disponibles à Yaoundé :', dataLandmarks.landmarks?.length, 'lieux clés');

  const isValid = dataYde.routes?.length === 3 && dataDla.routes?.length === 3 && dataLandmarks.landmarks?.length > 0;

  if (isValid) {
    console.log('\n🎉 TOUS LES TESTS DU MOTEUR D\'ITINÉRAIRES ONT RÉUSSI !');
    process.exit(0);
  } else {
    console.error('\n❌ Échec des tests de validation.');
    process.exit(1);
  }
}

testSmartRoutesApi().catch(err => {
  console.error('Erreur test API routes:', err);
  process.exit(1);
});
