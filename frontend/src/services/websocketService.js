// Service WebSocket Client pour CityFlow (Web React)

class CityFlowWebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.status = "disconnected"; // 'connected' | 'connecting' | 'disconnected'
    this.statusListeners = new Set();
    this.reconnectTimeout = null;
    this.subscribedCity = null;
  }

  connect(url = "ws://localhost:3000/ws") {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this._setStatus("connecting");

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log("⚡ [CityFlow WebSocket] Connecté avec succès au serveur temps réel.");
        this._setStatus("connected");
        if (this.subscribedCity) {
          this.subscribeCity(this.subscribedCity);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._emit(data.type, data);
          this._emit("*", data); // Écouteur global
        } catch (err) {
          console.error("❌ [CityFlow WebSocket] Erreur décodage message", err);
        }
      };

      this.ws.onclose = () => {
        this._setStatus("disconnected");
        this._scheduleReconnect(url);
      };

      this.ws.onerror = (err) => {
        console.warn("⚠️ [CityFlow WebSocket] Erreur connexion", err);
        this._setStatus("disconnected");
      };
    } catch (err) {
      this._setStatus("disconnected");
      this._scheduleReconnect(url);
    }
  }

  _scheduleReconnect(url) {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      console.log("🔄 [CityFlow WebSocket] Tentative de reconnexion automatique...");
      this.connect(url);
    }, 3000);
  }

  _setStatus(newStatus) {
    this.status = newStatus;
    this.statusListeners.forEach((fn) => fn(newStatus));
  }

  subscribeCity(city) {
    this.subscribedCity = city;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ type: "SUBSCRIBE_CITY", city });
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
    return () => this.off(eventType, callback);
  }

  off(eventType, callback) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).delete(callback);
    }
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  _emit(eventType, data) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error("Erreur listener callback WS", e);
        }
      });
    }
  }

  disconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._setStatus("disconnected");
  }
}

// Instance Singleton
export const wsService = new CityFlowWebSocketService();
export default wsService;
