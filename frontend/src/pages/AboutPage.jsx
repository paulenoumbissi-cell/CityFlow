import { Activity, ShieldCheck, Cpu, Users, MapPin, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import "./AboutPage.css";

function AboutPage() {
  const teamMembers = [
    {
      name: "Paule Noumbissi",
      role: "Lead Frontend & UX/UI Designer",
      initials: "PN",
      desc: "Conception de l'architecture React, des dashboards interactifs et de l'expérience utilisateur.",
    },
    {
      name: "Équipe Backend & IA",
      role: "Ingénierie Données & Modèles Prédictifs",
      initials: "CF",
      desc: "Développement des API REST, traitement des flux de trafic et algorithmes d'estimation.",
    },
  ];

  const features = [
    {
      icon: <Activity size={22} />,
      title: "Analyse en temps réel",
      desc: "Surveillance continue de la densité du trafic sur les carrefours clés de Yaoundé et Douala.",
    },
    {
      icon: <Cpu size={22} />,
      title: "Prédiction intelligente",
      desc: "Modèles d'anticipation pour estimer l'évolution des bouchons à 15, 30 et 60 minutes.",
    },
    {
      icon: <MapPin size={22} />,
      title: "Itinéraires optimisés",
      desc: "Calcul de routes alternatives pour contourner les points critiques et réduire le temps de trajet.",
    },
    {
      icon: <ShieldCheck size={22} />,
      title: "Mobilité urbaine durable",
      desc: "Optimisation des flux pour réduire le temps passé à l'arrêt et limiter l'empreinte carbone.",
    },
  ];

  return (
    <main className="about-page">
      <div className="about-container">

        {/* HERO SECTION */}
        <section className="about-hero">
          <span className="about-badge">
            <Sparkles size={14} /> NOTRE MISSION
          </span>
          <h1>Repenser la mobilité urbaine au Cameroun</h1>
          <p>
            CityFlow est une plateforme intelligente dédiée à la fluidification du
            trafic routier à Yaoundé et Douala. Notre solution combine analyse
            spatiale et modélisation prédictive pour offrir des déplacements plus sereins.
          </p>
        </section>

        {/* VALEURS / FEATURES */}
        <section className="about-grid">
          {features.map((item, index) => (
            <div className="about-card" key={index}>
              <div className="about-icon-box">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
          ))}
        </section>

        {/* ÉQUIPE & PROJET */}
        <section className="about-section">
          <div className="section-title">
            <span className="about-badge">PROJET</span>
            <h2>L'équipe CityFlow</h2>
          </div>

          <div className="team-grid">
            {teamMembers.map((member, index) => (
              <div className="team-card" key={index}>
                <div className="team-avatar">{member.initials}</div>
                <div className="team-info">
                  <h3>{member.name}</h3>
                  <span className="team-role">{member.role}</span>
                  <p>{member.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CALL TO ACTION */}
        <section className="about-cta">
          <div>
            <h2>Prêt à optimiser vos trajets ?</h2>
            <p>Explorez la carte interactive ou planifiez votre prochain déplacement dès maintenant.</p>
          </div>
          <div className="cta-actions">
            <Link to="/carte" className="cta-btn primary">
              Voir la carte
            </Link>
            <Link to="/routes" className="cta-btn secondary">
              Calculer un trajet
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}

export default AboutPage;