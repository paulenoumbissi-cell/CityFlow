import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Hook de gestion des alertes trafic CityFlow.
 * - Affiche des toasts animés (in-app)
 * - Demande et utilise l'API Notification du navigateur si autorisée
 */
export function useTrafficAlerts() {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);
  const permissionRef = useRef("default");

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        permissionRef.current = perm;
      });
    } else if ("Notification" in window) {
      permissionRef.current = Notification.permission;
    }
  }, []);

  const dismissAlert = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 320);
  }, []);

  const showAlert = useCallback(
    ({
      type = "info",
      icon = "🔔",
      title,
      message,
      duration = 5000,
      browserNotify = false,
    }) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, type, icon, title, message, duration }]);

      if (browserNotify && permissionRef.current === "granted") {
        try {
          const notif = new Notification(`CityFlow — ${title}`, {
            body: message,
            icon: "/logo.png",
            tag: `cityflow-alert-${id}`,
          });
          setTimeout(() => notif.close(), duration);
        } catch (_) {}
      }

      if (duration > 0) {
        setTimeout(() => dismissAlert(id), duration);
      }
      return id;
    },
    [dismissAlert]
  );

  const alertCongestion = useCallback(
    ({ zone, score, eta }) => {
      showAlert({
        type: "danger",
        icon: "🚨",
        title: "Congestion critique détectée !",
        message: `${zone} — Score ${score}%${eta ? ` dans ${eta}` : ""}. Anticipez votre départ.`,
        duration: 7000,
        browserNotify: true,
      });
    },
    [showAlert]
  );

  const alertWeather = useCallback(
    ({ condition, impact }) => {
      showAlert({
        type: "warning",
        icon: "🌧️",
        title: `Météo : ${condition}`,
        message: impact,
        duration: 5000,
      });
    },
    [showAlert]
  );

  const alertSuccess = useCallback(
    ({ title, message }) => {
      showAlert({ type: "success", icon: "✅", title, message, duration: 4000 });
    },
    [showAlert]
  );

  return { toasts, showAlert, dismissAlert, alertCongestion, alertWeather, alertSuccess };
}

/**
 * Composant ToastContainer — à placer dans la page qui utilise le hook.
 */
export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div className="cf-toast-container" role="region" aria-live="polite" aria-label="Alertes trafic">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`cf-toast ${toast.type || "info"}${toast.exiting ? " exiting" : ""}`}
          role="alert"
          style={{ position: "relative", overflow: "hidden" }}
        >
          <div className="cf-toast-icon">{toast.icon}</div>
          <div className="cf-toast-body">
            <div className="cf-toast-title">{toast.title}</div>
            {toast.message && <div className="cf-toast-message">{toast.message}</div>}
          </div>
          <button className="cf-toast-close" onClick={() => onDismiss(toast.id)} aria-label="Fermer">
            ✕
          </button>
          {toast.duration > 0 && (
            <div className="cf-toast-progress" style={{ animationDuration: `${toast.duration}ms` }} />
          )}
        </div>
      ))}
    </div>
  );
}
