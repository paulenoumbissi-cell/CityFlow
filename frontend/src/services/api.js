const API_BASE_URL = "http://localhost:3000/api";

export async function fetchTrafficNodes(city = "Yaoundé") {
  try {
    const res = await fetch(`${API_BASE_URL}/traffic/nodes?city=${encodeURIComponent(city)}`);
    if (!res.ok) throw new Error("Erreur de récupération du trafic");
    return await res.json();
  } catch (err) {
    console.warn("Backend API non joignable, fallback local activé:", err.message);
    return null;
  }
}

export async function fetchPredictions(city = "Yaoundé") {
  try {
    const res = await fetch(`${API_BASE_URL}/traffic/predictions?city=${encodeURIComponent(city)}`);
    if (!res.ok) throw new Error("Erreur de récupération des prédictions");
    return await res.json();
  } catch (err) {
    console.warn("Backend API non joignable, fallback local activé:", err.message);
    return null;
  }
}

export async function fetchAlerts(city = "Yaoundé") {
  try {
    const res = await fetch(`${API_BASE_URL}/alerts?city=${encodeURIComponent(city)}`);
    if (!res.ok) throw new Error("Erreur de récupération des alertes");
    return await res.json();
  } catch (err) {
    console.warn("Backend API non joignable, fallback local activé:", err.message);
    return null;
  }
}

export async function calculateRoute(origin, destination, options = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}/routes/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin, destination, ...options }),
    });
    if (!res.ok) throw new Error("Erreur de calcul d'itinéraire");
    return await res.json();
  } catch (err) {
    console.warn("Backend API non joignable, fallback local activé:", err.message);
    return null;
  }
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
