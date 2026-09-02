import { useState, useEffect } from "react";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  TrafficCone,
  Route,
  Info,
  Clock,
  Sparkles,
  MapPin,
} from "lucide-react";
import { useCity } from "../context/CityContext";
import { fetchAlerts } from "../services/api";
import "./NotificationsPage.css";

const defaultFallbackNotifications = [
  {
    id: 1,
    type: "danger",
    icon: AlertTriangle,
    title: "Embouteillage important",
    message: "Une forte congestion est actuellement détectée dans la zone de Mvan.",
    time: "Il y a 5 min",
    unread: true,
  },
  {
    id: 2,
    type: "warning",
    icon: TrafficCone,
    title: "Ralentissements à Nsam",
    message: "La circulation est difficile à Nsam. Prévoyez quelques minutes supplémentaires.",
    time: "Il y a 18 min",
    unread: true,
  },
  {
    id: 3,
    type: "route",
    icon: Route,
    title: "Itinéraire modifié",
    message: "Un itinéraire alternatif est disponible pour votre trajet vers le Centre-ville.",
    time: "Il y a 27 min",
    unread: true,
  },
  {
    id: 4,
    type: "success",
    icon: CheckCheck,
    title: "Circulation améliorée",
    message: "La circulation est redevenue fluide dans la zone d'Odza.",
    time: "Il y a 32 min",
    unread: false,
  },
  {
    id: 5,
    type: "info",
    icon: Info,
    title: "Prévision de trafic",
    message: "Une augmentation du trafic est prévue dans les prochaines 30 minutes.",
    time: "Il y a 45 min",
    unread: false,
  },
];

function NotificationsPage() {
  const { selectedCity, setSelectedCity } = useCity();
  const [notifications, setNotifications] = useState(defaultFallbackNotifications);
  const [isLiveApi, setIsLiveApi] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchAlerts(selectedCity).then((data) => {
      if (!isMounted) return;
      if (data && data.alerts && data.alerts.length > 0) {
        setNotifications(
          data.alerts.map((a, idx) => ({
            id: a.id || idx,
            type: a.severity === "critical" || a.severity === "danger"
              ? "danger"
              : a.severity === "warning"
              ? "warning"
              : "info",
            icon: a.severity === "critical" ? AlertTriangle : a.severity === "warning" ? TrafficCone : Info,
            title: a.title || "Alerte de circulation",
            message: a.message || a.description,
            time: a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : "Récemment",
            unread: true,
          }))
        );
        setIsLiveApi(true);
      } else {
        setNotifications(defaultFallbackNotifications);
        setIsLiveApi(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedCity]);

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <main className="notifications-page">
      <div className="notifications-container">
        {/* EN-TÊTE */}
        <div className="notifications-header">
          <div>
            <span className="section-label">
              CENTRE D'ALERTES {isLiveApi ? "• API LIVE" : ""}
            </span>
            <h1>Notifications & Alertes</h1>
            <p>
              Restez informé de l'état du trafic et des changements de circulation en direct à {selectedCity}.
            </p>
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <div className="city-indicator" style={{ background: "#ffffff", border: "1px solid #e2e8f0" }}>
              <MapPin size={16} />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                style={{ border: "none", background: "transparent", fontWeight: "700", color: "#087f5b" }}
              >
                <option value="Yaoundé">Yaoundé</option>
                <option value="Douala">Douala</option>
              </select>
            </div>

            <button className="mark-all-button" onClick={handleMarkAllAsRead}>
              <CheckCheck size={18} />
              Tout marquer comme lu
            </button>
          </div>
        </div>

        {/* LISTE DES NOTIFICATIONS */}
        <div className="notifications-list">
          {notifications.map((notif) => {
            const Icon = notif.icon || Bell;
            return (
              <article
                key={notif.id}
                className={`notification-item ${notif.type} ${notif.unread ? "unread" : ""}`}
              >
                <div className={`notification-icon-box ${notif.type}`}>
                  <Icon size={20} />
                </div>

                <div className="notification-content">
                  <div className="notification-title-row">
                    <h3>{notif.title}</h3>
                    <span className="notification-time">
                      <Clock size={13} /> {notif.time}
                    </span>
                  </div>

                  <p>{notif.message}</p>
                </div>

                {notif.unread && <span className="unread-dot"></span>}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default NotificationsPage;