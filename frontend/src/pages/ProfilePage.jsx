import {
  User,
  MapPin,
  Route,
  Clock,
  Settings,
  Edit3,
  Mail,
  CalendarDays,
  ChevronRight,
} from "lucide-react";

import "./ProfilePage.css";

function ProfilePage() {
  const recentTrips = [
    {
      departure: "Bastos",
      destination: "Centre-ville",
      distance: "6,8 km",
      duration: "22 min",
      date: "Aujourd'hui, 10:32",
    },
    {
      departure: "Mvan",
      destination: "Nsam",
      distance: "5,2 km",
      duration: "19 min",
      date: "Hier, 17:45",
    },
    {
      departure: "Odza",
      destination: "Bastos",
      distance: "9,4 km",
      duration: "31 min",
      date: "28 août, 08:15",
    },
  ];

  return (
    <main className="profile-page">
      <div className="profile-container">

        {/* HEADER */}

        <div className="profile-header">
          <div>
            <span className="profile-label">
              MON ESPACE
            </span>

            <h1>Mon profil</h1>

            <p>
              Gérez vos informations et consultez votre activité
              sur CityFlow.
            </p>
          </div>

          <button className="edit-profile-button">
            <Edit3 size={17} />
            Modifier le profil
          </button>
        </div>

        {/* PROFIL PRINCIPAL */}

        <section className="profile-card">

          <div className="profile-main">

            <div className="profile-avatar">
              PN
            </div>

            <div className="profile-identity">
              <h2>Paule Noumbissi</h2>

              <p>
                Utilisateur CityFlow
              </p>

              <div className="profile-location">
                <MapPin size={15} />
                Yaoundé, Cameroun
              </div>
            </div>

          </div>

          <div className="profile-status">
            <span></span>
            Compte actif
          </div>

        </section>

        {/* INFORMATIONS */}

        <section className="profile-grid">

          <div className="information-card">

            <div className="card-heading">
              <div className="card-heading-icon">
                <User size={19} />
              </div>

              <div>
                <h2>Informations personnelles</h2>
                <span>Vos informations de compte</span>
              </div>
            </div>

            <div className="information-list">

              <div className="information-item">
                <Mail size={17} />
                <div>
                  <small>Adresse e-mail</small>
                  <strong>paule@cityflow.cm</strong>
                </div>
              </div>

              <div className="information-item">
                <CalendarDays size={17} />
                <div>
                  <small>Membre depuis</small>
                  <strong>Août 2026</strong>
                </div>
              </div>

              <div className="information-item">
                <MapPin size={17} />
                <div>
                  <small>Ville principale</small>
                  <strong>Yaoundé</strong>
                </div>
              </div>

            </div>

          </div>

          {/* PRÉFÉRENCES */}

          <div className="information-card">

            <div className="card-heading">
              <div className="card-heading-icon">
                <Settings size={19} />
              </div>

              <div>
                <h2>Préférences</h2>
                <span>Vos préférences de mobilité</span>
              </div>
            </div>

            <div className="preference-list">

              <div className="preference-item">
                <div>
                  <strong>Ville par défaut</strong>
                  <span>Yaoundé</span>
                </div>

                <ChevronRight size={18} />
              </div>

              <div className="preference-item">
                <div>
                  <strong>Type d'itinéraire</strong>
                  <span>Le plus rapide</span>
                </div>

                <ChevronRight size={18} />
              </div>

              <div className="preference-item">
                <div>
                  <strong>Alertes trafic</strong>
                  <span>Activées</span>
                </div>

                <ChevronRight size={18} />
              </div>

            </div>

          </div>

        </section>

        {/* STATISTIQUES */}

        <section className="profile-statistics">

          <div className="statistics-header">
            <div>
              <span className="profile-label">
                MON ACTIVITÉ
              </span>

              <h2>Mes statistiques</h2>
            </div>
          </div>

          <div className="statistics-grid">

            <div className="stat-box">
              <div className="stat-box-icon">
                <Route size={21} />
              </div>

              <div>
                <strong>24</strong>
                <span>Trajets effectués</span>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-box-icon">
                <MapPin size={21} />
              </div>

              <div>
                <strong>148 km</strong>
                <span>Distance parcourue</span>
              </div>
            </div>

            <div className="stat-box">
              <div className="stat-box-icon">
                <Clock size={21} />
              </div>

              <div>
                <strong>7h 24</strong>
                <span>Temps de trajet</span>
              </div>
            </div>

          </div>

        </section>

        {/* HISTORIQUE */}

        <section className="history-card">

          <div className="history-header">
            <div>
              <span className="profile-label">
                ACTIVITÉ RÉCENTE
              </span>

              <h2>Mes derniers trajets</h2>
            </div>

            <button className="history-link">
              Voir tout
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="trip-list">

            {recentTrips.map((trip, index) => (
              <div className="trip-item" key={index}>

                <div className="trip-route">

                  <div className="trip-point">
                    <span className="trip-dot start"></span>
                    <strong>{trip.departure}</strong>
                  </div>

                  <div className="trip-line"></div>

                  <div className="trip-point">
                    <span className="trip-dot destination"></span>
                    <strong>{trip.destination}</strong>
                  </div>

                </div>

                <div className="trip-details">
                  <strong>{trip.duration}</strong>
                  <span>{trip.distance}</span>
                  <small>{trip.date}</small>
                </div>

              </div>
            ))}

          </div>

        </section>

      </div>
    </main>
  );
}

export default ProfilePage;