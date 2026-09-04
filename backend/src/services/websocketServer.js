import { WebSocketServer, WebSocket } from "ws";

let wss = null;
const clients = new Set();

/**
 * Initialise le serveur WebSocket attaché au serveur HTTP Express
 */
export function initWebSocketServer(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  console.log("[CityFlow WebSocket Server] Initialisé sur le chemin /ws");

  wss.on("connection", (ws, req) => {
    clients.add(ws);
    ws.isAlive = true;

    console.log(`[WS] Nouveau client connecté (Total actifs : ${clients.size})`);

    // Envoi du message d'accueil et d'accusé de connexion
    ws.send(
      JSON.stringify({
        type: "CONNECTION_ACK",
        message: "Connecté au flux push temps réel CityFlow",
        timestamp: new Date().toISOString(),
        clientsCount: clients.size,
      })
    );

    // Heartbeat ping-pong
    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (rawMessage) => {
      try {
        const message = JSON.parse(rawMessage.toString());
        console.log(`[WS Message Reçu] Type: ${message.type}`);

        // Exemple : client souscrivant à une ville en particulier
        if (message.type === "SUBSCRIBE_CITY") {
          ws.subscribedCity = message.city;
          ws.send(
            JSON.stringify({
              type: "SUBSCRIBE_ACK",
              city: message.city,
              message: `Abonné aux alertes de ${message.city}`,
            })
          );
        }
      } catch (err) {
        console.error("[WS] Erreur parsing message", err);
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      console.log(`[WS] Client déconnecté (Restants : ${clients.size})`);
    });

    ws.on("error", (err) => {
      console.error("[WS Error]", err);
      clients.delete(ws);
    });
  });

  // Interval de Heartbeat (Ping toutes les 30s pour maintenir les connexions)
  const heartbeatInterval = setInterval(() => {
    if (!wss) return;
    for (const ws of clients) {
      if (!ws.isAlive) {
        ws.terminate();
        clients.delete(ws);
        continue;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

/**
 * Diffuse un message à tous les clients connectés (avec filtrage optionnel par ville)
 */
export function broadcastEvent(eventData, targetCity = null) {
  if (!wss || clients.size === 0) return;

  const payload = JSON.stringify({
    ...eventData,
    timestamp: new Date().toISOString(),
  });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      if (targetCity && client.subscribedCity && client.subscribedCity.toLowerCase() !== targetCity.toLowerCase()) {
        continue;
      }
      client.send(payload);
    }
  }
}

/**
 * 1. Broadcast du pouls de trafic
 */
export function broadcastTrafficPulse(city, nodes) {
  broadcastEvent({
    type: "TRAFFIC_PULSE",
    city,
    nodesCount: nodes.length,
    nodes,
  }, city);
}

/**
 * 2. Broadcast d'un nouveau signalement citoyen
 */
export function broadcastNewReport(report) {
  broadcastEvent({
    type: "CITIZEN_REPORT_CREATED",
    report,
    message: `🚨 Nouveau signalement : ${report.title} (${report.city})`,
  });
}

/**
 * 3. Broadcast de mise à jour d'un vote
 */
export function broadcastReportVote(report) {
  broadcastEvent({
    type: "REPORT_VOTE_UPDATED",
    report,
  });
}

/**
 * 4. Broadcast de mise à jour de mission de secours (Onde Verte)
 */
export function broadcastEmergencyUpdate(mission) {
  broadcastEvent({
    type: "EMERGENCY_MISSION_UPDATE",
    mission,
  });
}

/**
 * 5. Broadcast d'annulation / fin de mission de secours
 */
export function broadcastEmergencyCancel() {
  broadcastEvent({
    type: "EMERGENCY_MISSION_CANCELLED",
  });
}
