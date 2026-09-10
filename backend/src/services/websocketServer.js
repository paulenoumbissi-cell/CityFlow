import { WebSocketServer, WebSocket } from "ws";
import { isIncidentOnRoute } from "./geoUtils.js";

let wss = null;
const clients = new Set();

// ─────────────────────────────────────────────────────────────────────────────
// Seuil de proximité pour les notifications sur trajet (en mètres)
// ─────────────────────────────────────────────────────────────────────────────
const ROUTE_ALERT_THRESHOLD_METERS = 200;

/**
 * Initialise le serveur WebSocket attaché au serveur HTTP Express
 */
export function initWebSocketServer(httpServer) {
  wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  console.log("[CityFlow WebSocket Server] Initialisé sur le chemin /ws");

  wss.on("connection", (ws, req) => {
    clients.add(ws);
    ws.isAlive = true;

    // Données de session du conducteur
    ws.subscribedCity = null;
    ws.activeRoute = null; // { routeId, coordinates: [[lat, lng], ...], city }
    ws.driverId = null;

    console.log(`[WS] Nouveau client connecté (Total actifs : ${clients.size})`);

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

        switch (message.type) {
          // ── Abonnement à une ville ────────────────────────────────────────
          case "SUBSCRIBE_CITY":
            ws.subscribedCity = message.city;
            ws.send(
              JSON.stringify({
                type: "SUBSCRIBE_ACK",
                city: message.city,
                message: `Abonné aux alertes de ${message.city}`,
              })
            );
            break;

          // ── Enregistrement d'une route active (navigation démarrée) ───────
          case "REGISTER_ROUTE": {
            const { routeId, coordinates, city, driverId } = message;
            if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
              ws.send(
                JSON.stringify({
                  type: "REGISTER_ROUTE_ERROR",
                  message: "Coordonnées de route invalides (minimum 2 points requis)",
                })
              );
              break;
            }

            ws.activeRoute = { routeId: routeId || `route_${Date.now()}`, coordinates, city };
            ws.driverId = driverId || null;
            if (city) ws.subscribedCity = city;

            console.log(
              `[WS] 🗺️ Route enregistrée pour client ${driverId || "anonyme"} : ${coordinates.length} points (${city || "ville inconnue"})`
            );

            ws.send(
              JSON.stringify({
                type: "REGISTER_ROUTE_ACK",
                routeId: ws.activeRoute.routeId,
                message: `Route enregistrée (${coordinates.length} pts) — alertes activées`,
              })
            );
            break;
          }

          // ── Désenregistrement de route (navigation arrêtée) ──────────────
          case "UNREGISTER_ROUTE":
            ws.activeRoute = null;
            console.log(`[WS] 🛑 Route désenregistrée pour client ${ws.driverId || "anonyme"}`);
            ws.send(JSON.stringify({ type: "UNREGISTER_ROUTE_ACK" }));
            break;

          default:
            break;
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

  // Interval de Heartbeat (Ping toutes les 30s)
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
      if (
        targetCity &&
        client.subscribedCity &&
        client.subscribedCity.toLowerCase() !== targetCity.toLowerCase()
      ) {
        continue;
      }
      client.send(payload);
    }
  }
}

/**
 * ★ NOUVEAU — Diffuse une alerte CIBLÉE aux conducteurs dont le trajet actif
 * passe à moins de ROUTE_ALERT_THRESHOLD_METERS du rapport citoyen.
 *
 * @param {Object} report - Objet rapport citoyen avec position [lat, lng]
 */
export function broadcastReportToAffectedDrivers(report) {
  if (!wss || clients.size === 0) return;

  // Extraire la position GPS de l'incident
  let incidentLat, incidentLng;

  if (Array.isArray(report.position) && report.position.length >= 2) {
    [incidentLat, incidentLng] = report.position;
  } else if (report.lat && report.lng) {
    incidentLat = report.lat;
    incidentLng = report.lng;
  } else {
    console.warn("[WS] broadcastReportToAffectedDrivers : position de rapport invalide", report);
    return;
  }

  let notifiedCount = 0;

  for (const client of clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    if (!client.activeRoute || !client.activeRoute.coordinates) continue;

    const { onRoute, distanceMeters } = isIncidentOnRoute(
      incidentLat,
      incidentLng,
      client.activeRoute.coordinates,
      ROUTE_ALERT_THRESHOLD_METERS
    );

    if (onRoute) {
      const alertPayload = JSON.stringify({
        type: "ROUTE_INCIDENT_ALERT",
        timestamp: new Date().toISOString(),
        alert: {
          reportId: report.id,
          title: report.title,
          category: report.category,
          severity: report.severity,
          locationDescription: report.locationDescription,
          distanceMeters,
          position: report.position,
          city: report.city,
        },
      });

      client.send(alertPayload);
      notifiedCount++;

      console.log(
        `[WS] 🚨 Alerte trajet → client ${client.driverId || "anonyme"} | Incident : "${report.title}" à ${distanceMeters}m`
      );
    }
  }

  console.log(
    `[WS] broadcastReportToAffectedDrivers : ${notifiedCount}/${clients.size} conducteur(s) notifié(s) pour "${report.title}"`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Fonctions de diffusion existantes (inchangées)
// ─────────────────────────────────────────────────────────────────────────────

export function broadcastTrafficPulse(city, nodes) {
  broadcastEvent({ type: "TRAFFIC_PULSE", city, nodesCount: nodes.length, nodes }, city);
}

export function broadcastNewReport(report) {
  broadcastEvent({
    type: "CITIZEN_REPORT_CREATED",
    report,
    message: `🚨 Nouveau signalement : ${report.title} (${report.city})`,
  });
}

export function broadcastReportVote(report) {
  broadcastEvent({ type: "REPORT_VOTE_UPDATED", report });
}

export function broadcastEmergencyUpdate(mission) {
  broadcastEvent({ type: "EMERGENCY_MISSION_UPDATE", mission });
}

export function broadcastEmergencyCancel() {
  broadcastEvent({ type: "EMERGENCY_MISSION_CANCELLED" });
}

export function broadcastRadioMessage(radioMsg) {
  broadcastEvent(
    { type: "RADIO_MESSAGE_CREATED", radioMsg, message: `📻 Canal Radio [${radioMsg.crossroad}] : ${radioMsg.author}` },
    radioMsg.city
  );
}

export function broadcastSosAlert(sos) {
  broadcastEvent(
    { type: "SOS_ALERT_CREATED", sos, message: `🛠️ SOS Dépannage à ${sos.crossroad} : ${sos.sosType}` },
    sos.city
  );
}
