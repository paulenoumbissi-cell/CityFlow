import {
  Bell,
  CheckCheck,
  AlertTriangle,
  TrafficCone,
  Route,
  Info,
  Clock,
} from "lucide-react";

import "./NotificationsPage.css";

function NotificationsPage() {
  const notifications = [
    {
      id: 1,
      type: "danger",
      icon: AlertTriangle,
      title: "Embouteillage important",
      message:
        "Une forte congestion est actuellement détectée dans la zone de Mvan.",
      time: "Il y a 5 min",
      unread: true,
    },
    {
      id: 2,
      type: "warning",
      icon: TrafficCone,
      title: "Ralentissements à Nsam",
      message:
        "La circulation est difficile à Nsam. Prévoyez quelques minutes supplémentaires.",
      time: "Il y a 18 min",
      unread: true,
    },
    {
      id: 3,
      type: "route",
      icon: Route,
      title: "Itinéraire modifié",
      message:
        "Un itinéraire alternatif est disponible pour votre trajet vers le Centre-ville.",
      time: "Il y a 27 min",
      unread: true,
    },
    {
      id: 4,
      type: "success",
      icon: CheckCheck,
      title: "Circulation améliorée",
      message:
        "La circulation est redevenue fluide dans la zone d'Odza.",
      time: "Il y a 32 min",
      unread: false,
    },
    {
      id: 5,
      type: "info",
      icon: Info,
      title: "Prévision de trafic",
      message:
        "Une augmentation du trafic est prévue dans les prochaines 30 minutes.",
      time: "Il y a 45 min",
      unread: false,
    },
  ];

  return (
    <main className="notifications-page">
      <div className="notifications-container">

        {/* EN-TÊTE */}

        <div className="notifications-header">
          <div>
            <span className="section-label">
              CENTRE D'ALERTES
            </span>

            <h1>
              Notifications
            </h1>

            <p>
              Restez informé de l'état du trafic et des changements
              concernant vos déplacements.
            </p>
          </div>

          <button className="mark-all-button">
            <CheckCheck size={18} />
            Tout marquer comme lu
          </button>
        </div>

        {/* RÉSUMÉ */}

        <div className="notifications-summary">

          <div className="summary-card">
            <div className="summary-icon">
              <Bell size={22} />
            </div>

            <div>
              <strong>3</strong>
              <span>Notifications non lues</span>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon warning">
              <AlertTriangle size={22} />
            </div>

            <div>
              <strong>2</strong>
              <span>Alertes importantes</span>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon time">
              <Clock size={22} />
            </div>

            <div>
              <strong>Aujourd'hui</strong>
              <span>Dernières activités</span>
            </div>
          </div>

        </div>

        {/* LISTE */}

        <section className="notifications-section">

          <div className="notifications-section-header">
            <div>
              <h2>
                Activité récente
              </h2>

              <span>
                Vos dernières alertes CityFlow
              </span>
            </div>

            <span className="notification-count">
              {notifications.length} notifications
            </span>
          </div>

          <div className="notifications-list">

            {notifications.map((notification) => {

              const Icon = notification.icon;

              return (
                <article
                  key={notification.id}
                  className={`notification-item ${
                    notification.unread ? "unread" : ""
                  }`}
                >

                  <div
                    className={`notification-icon ${notification.type}`}
                  >
                    <Icon size={22} />
                  </div>

                  <div className="notification-content">

                    <div className="notification-title-row">

                      <h3>
                        {notification.title}
                      </h3>

                      {notification.unread && (
                        <span className="unread-dot"></span>
                      )}

                    </div>

                    <p>
                      {notification.message}
                    </p>

                    <span className="notification-time">
                      <Clock size={14} />
                      {notification.time}
                    </span>

                  </div>

                </article>
              );
            })}

          </div>

        </section>

      </div>
    </main>
  );
}

export default NotificationsPage;