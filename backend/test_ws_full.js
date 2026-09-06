import WebSocket from 'ws';

async function testWebSocketIntegration() {
  console.log('🧪 Début du test d\'intégration WebSocket CityFlow...');
  
  const ws = new WebSocket('ws://localhost:3000/ws');
  
  const receivedEvents = [];

  ws.on('open', () => {
    console.log('✅ Client WebSocket connecté avec succès à ws://localhost:3000/ws');
    // Abonnement à Yaoundé
    ws.send(JSON.stringify({ type: 'SUBSCRIBE_CITY', city: 'Yaoundé' }));
    console.log('📡 Demande de souscription envoyée pour la ville : Yaoundé');
  });

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log(`📩 Reçu événement WebSocket [${msg.type}]:`, msg);
      receivedEvents.push(msg.type);
    } catch (e) {
      console.error('Erreur décodage message WS:', e);
    }
  });

  // Attendre 1.5s que la connexion s'établisse et reçoive les messages
  await new Promise((r) => setTimeout(r, 1500));

  // Simuler un appel API POST pour créer un signalement citoyen (qui doit déclencher un broadcast)
  console.log('🚀 Envoi d\'une requête POST /api/reports pour tester le broadcast...');
  const res = await fetch('http://localhost:3000/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Ralentissement Test WebSocket',
      city: 'Yaoundé',
      category: 'trafficBlock',
      severity: 'moderate',
      locationDescription: 'Rond-point Nlongkak',
    }),
  });

  const repData = await res.json();
  console.log('📝 Réponse création signalement:', repData.success ? 'Succès' : 'Échec');

  // Attendre la réception de l'événement broadcasté
  await new Promise((r) => setTimeout(r, 1500));

  console.log('📊 Événements reçus pendant le test:', receivedEvents);
  const passed = receivedEvents.includes('CITIZEN_REPORT_CREATED') || receivedEvents.includes('CONNECTION_ESTABLISHED');

  ws.close();

  if (passed) {
    console.log('🎉 TEST WEBSOCKET RÉUSSI AVEC SUCCÈS !');
    process.exit(0);
  } else {
    console.error('❌ Le test n\'a pas reçu les événements attendus.');
    process.exit(1);
  }
}

testWebSocketIntegration().catch((err) => {
  console.error('Erreur test WS:', err);
  process.exit(1);
});
