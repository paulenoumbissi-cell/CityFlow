import React, { useState, useEffect } from "react";
import {
  Users,
  AlertTriangle,
  Award,
  PlusCircle,
  ThumbsUp,
  CheckCircle,
  MapPin,
  Clock,
  Sparkles,
  Car,
  Wrench,
  Construction,
  Droplets,
  AlertCircle,
  TrendingUp,
  Percent,
  Check,
  Zap,
  Tag,
  Shield,
  Crown,
  CreditCard,
  Building2,
  UserCheck,
  Info,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  X,
} from "lucide-react";
import { useCity } from "../context/CityContext";
import wsService from "../services/websocketService";
import "./CommunityPage.css";

const API_BASE = "http://localhost:3000/api";

const CATEGORY_CONFIG = {
  trafficBlock: { label: "Embouteillage", points: 10, icon: Car, color: "#EC4899", desc: "Signaler un embouteillage confirmé (+10 pts)" },
  accident: { label: "Accident de circulation", points: 15, icon: AlertTriangle, color: "#EF4444", desc: "Signaler un accident confirmé (+15 pts)" },
  trafficLight: { label: "Feu de circulation en panne", points: 20, icon: AlertCircle, color: "#8B5CF6", desc: "Signaler un feu en panne confirmé (+20 pts)" },
  roadworks: { label: "Route bloquée / Travaux", points: 15, icon: Construction, color: "#3B82F6", desc: "Signaler route bloquée confirmée (+15 pts)" },
  hazard: { label: "Obstacle ou nid de poule", points: 15, icon: AlertTriangle, color: "#F59E0B", desc: "Signaler un obstacle confirmé (+15 pts)" },
  breakdown: { label: "Véhicule en panne", points: 15, icon: Wrench, color: "#F97316", desc: "Signaler véhicule en panne (+15 pts)" },
  flooding: { label: "Inondation de chaussée", points: 15, icon: Droplets, color: "#06B6D4", desc: "Signaler inondation confirmée (+15 pts)" },
};

const SEVERITY_CONFIG = {
  low: { label: "Faible", class: "sev-low" },
  moderate: { label: "Modéré", class: "sev-moderate" },
  high: { label: "Élevé", class: "sev-high" },
  critical: { label: "Critique", class: "sev-critical" },
};

const SUBSCRIPTION_PLANS = [
  {
    id: "plan_citizen",
    category: "b2c",
    name: "Premium Citoyen",
    subtitle: "Mobilité intelligente et guidage optimisé",
    priceFcfa: 2000,
    period: "par mois",
    beneficiaries: "1 personne",
    features: [
      "Guidage vocal intelligent sans coupure",
      "Alertes d'anticipation météo & bouchons +1h",
      "Calcul multi-destinations & éco-trajets illimités",
      "Statut prioritaire de signalement certifié",
    ],
  },
  {
    id: "plan_enterprise",
    category: "b2b",
    name: "Premium Entreprise",
    subtitle: "Flottes d'entreprises, livraisons & équipes",
    priceFcfa: 50000,
    period: "par mois",
    beneficiaries: "30 personnes",
    features: [
      "Comptes Premium inclus pour 30 personnes (collaborateurs / chauffeurs)",
      "Tableau de bord de supervision de flotte en temps réel (Yaoundé & Douala)",
      "Optimisation automatique des tournées de livraison",
      "Rapports mensuels de carburant & bilan carbone CO₂",
      "Support prioritaire dédié 24/7 & gestionnaire de compte",
    ],
  },
];

const DISCOUNT_REWARDS = [
  {
    id: "tier_100",
    pointsRequired: 100,
    discountPercent: 5,
    isFreeMonth: false,
    label: "5 % de réduction",
    description: "Sur le prochain abonnement",
    citizenPrice: 1900,
    enterprisePrice: 47500,
  },
  {
    id: "tier_300",
    pointsRequired: 300,
    discountPercent: 15,
    isFreeMonth: false,
    label: "15 % de réduction",
    description: "Sur le prochain abonnement",
    citizenPrice: 1700,
    enterprisePrice: 42500,
  },
  {
    id: "tier_600",
    pointsRequired: 600,
    discountPercent: 100,
    isFreeMonth: true,
    label: "1 mois gratuit",
    description: "Sur l'abonnement Premium",
    citizenPrice: 0,
    enterprisePrice: 0,
  },
];

export default function CommunityPage() {
  const { selectedCity } = useCity();
  const [activeTab, setActiveTab] = useState("reports"); // 'reports' | 'rewards'
  const [reports, setReports] = useState([]);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");

  // Sélection du palier de réduction appliqué par formule
  const [selectedRewardCitizen, setSelectedRewardCitizen] = useState(null); // null | 'tier_100' | 'tier_300' | 'tier_600'
  const [selectedRewardEnterprise, setSelectedRewardEnterprise] = useState(null);

  // Modal de nouveau signalement
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    city: selectedCity === "all" ? "Yaoundé" : selectedCity,
    category: "trafficBlock",
    severity: "moderate",
    locationDescription: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal de souscription avec paiement
  const [subscribeModal, setSubscribeModal] = useState(null); // { plan, rewardTier }
  const [paymentMethod, setPaymentMethod] = useState("MTN Mobile Money");
  const [phoneNumber, setPhoneNumber] = useState("670000000");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);

  const showToast = (msg) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 4500);
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const cityQuery = selectedCity && selectedCity !== "all" ? `?city=${encodeURIComponent(selectedCity)}` : "";
      
      const [reportsRes, profileRes] = await Promise.all([
        fetch(`${API_BASE}/reports${cityQuery}`).catch(() => null),
        fetch(`${API_BASE}/rewards/profile`).catch(() => null),
      ]);

      if (reportsRes && reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data.reports || []);
      }
      if (profileRes && profileRes.ok) {
        const pData = await profileRes.json();
        setProfile(pData);
      }
    } catch (err) {
      console.error("Erreur chargement données communautaires", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubNew = wsService.on("CITIZEN_REPORT_CREATED", (data) => {
      if (data?.report) {
        if (!selectedCity || selectedCity === "all" || data.report.city === selectedCity) {
          setReports((prev) => {
            if (prev.some((r) => r.id === data.report.id)) return prev;
            return [data.report, ...prev];
          });
          showToast(`⚡ Nouveau signalement : ${data.report.title}`);
        }
      }
    });

    const unsubVote = wsService.on("REPORT_VOTE_UPDATED", (data) => {
      if (data?.report) {
        setReports((prev) =>
          prev
            .map((r) => (r.id === data.report.id ? data.report : r))
            .filter((r) => r.status === "active")
        );
      }
    });

    return () => {
      unsubNew();
      unsubVote();
    };
  }, [selectedCity]);

  // Vote sur un incident (Confirmation ou Voie dégagée)
  const handleVote = async (reportId, type) => {
    try {
      const res = await fetch(`${API_BASE}/reports/${reportId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, userId: "user_current" }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Action enregistrée avec succès !");
        
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? data.report : r)).filter((r) => r.status === "active")
        );
        if (data.profileUpdate && profile) {
          setProfile((p) => ({
            ...p,
            points: data.profileUpdate.points,
            trustScore: data.profileUpdate.trustScore,
            trust: data.profileUpdate.trust,
          }));
        }
      } else {
        showToast(data.error || "Action impossible.");
      }
    } catch (err) {
      showToast("Erreur lors de la prise en compte du vote.");
    }
  };

  // Envoi d'un nouveau signalement
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.locationDescription.trim()) {
      showToast("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_BASE}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          author: profile?.userName || "Citoyen CityFlow",
          authorId: "user_current",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Signalement partagé ! En attente de confirmation.");
        setShowModal(false);
        setFormData({
          title: "",
          city: selectedCity === "all" ? "Yaoundé" : selectedCity,
          category: "trafficBlock",
          severity: "moderate",
          locationDescription: "",
        });
        fetchData();
      } else {
        showToast(data.error || "Impossible d'enregistrer le signalement.");
      }
    } catch (err) {
      showToast("Erreur réseau lors de l'envoi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Souscription et utilisation des points
  const handleConfirmSubscription = async () => {
    if (!subscribeModal) return;
    try {
      setIsProcessingPayment(true);
      const res = await fetch(`${API_BASE}/rewards/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: subscribeModal.plan.id,
          rewardTierId: subscribeModal.rewardTier?.id || null,
          paymentMethod,
          phoneNumber,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        setSubscribeModal(null);
        fetchData();
      } else {
        showToast(data.error || "Erreur lors de la souscription.");
      }
    } catch (err) {
      showToast("Erreur de communication avec le serveur.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const filteredReports = reports.filter((r) => {
    if (filterCategory !== "all" && r.category !== filterCategory) return false;
    return true;
  });

  const userPoints = profile?.points ?? profile?.reputationScore ?? 380;
  const trustScore = profile?.trustScore ?? 85;
  const trustInfo = profile?.trust || {
    score: trustScore,
    level: "Très fiable",
    icon: "⭐",
    color: "#00875A",
    description: "Utilisateur très fiable",
  };

  return (
    <main className="community-page">
      {/* Toast Notification */}
      {feedbackToast && (
        <div className="community-toast animate-slide-in">
          <Sparkles size={18} className="toast-icon" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* HERO BANNER */}
      <section className="community-hero">
        <div className="community-hero-content">
          <div className="hero-tag">
            <Users size={16} />
            <span>Crowdsourcing Urbain & Programme Citoyen</span>
          </div>
          <h1>
            Communauté & <span>Abonnements Premium CityFlow</span>
          </h1>
          <p>
            Signalez et confirmez les aléas de la route. Cumulez des points de citoyenneté pour 
            <strong> débloquer 5%, 15% ou 1 mois gratuit sur votre abonnement Premium</strong>.
          </p>

          {/* Quick Stats Bar */}
          <div className="community-quick-stats">
            <div className="stat-pill">
              <span className="pill-number">{reports.length}</span>
              <span className="pill-label">Signalements actifs</span>
            </div>
            <div className="stat-pill highlight-points">
              <span className="pill-number">{userPoints} pts</span>
              <span className="pill-label">Solde de Points</span>
            </div>
            <div className="stat-pill highlight-trust">
              <span className="pill-number">{trustInfo.icon} {trustScore}/100</span>
              <span className="pill-label">Score de Confiance</span>
            </div>
          </div>
        </div>

        <button
          className="btn-create-report"
          onClick={() => {
            setFormData((prev) => ({
              ...prev,
              city: selectedCity === "all" ? "Yaoundé" : selectedCity,
            }));
            setShowModal(true);
          }}
        >
          <PlusCircle size={20} />
          <span>Signaler un incident</span>
        </button>
      </section>

      {/* NAVIGATION ONGLETS */}
      <nav className="community-tabs-nav" aria-label="Navigation Communauté">
        <button
          className={`tab-btn ${activeTab === "reports" ? "active" : ""}`}
          onClick={() => setActiveTab("reports")}
        >
          <AlertTriangle size={18} />
          <span>Signalements en Direct ({reports.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === "rewards" ? "active" : ""}`}
          onClick={() => setActiveTab("rewards")}
        >
          <Award size={18} />
          <span>Tarifs & Réductions par Points</span>
          <span className="tab-discount-tag">{userPoints} pts dispo</span>
        </button>
      </nav>

      {/* ===================================================================
          CONTENU ONGLET 1 : SIGNALEMENTS EN DIRECT
          =================================================================== */}
      {activeTab === "reports" && (
        <section className="reports-section">
          {/* BARRE DE FILTRES */}
          <div className="reports-filter-bar">
            <div className="filter-chips">
              <button
                className={`filter-chip ${filterCategory === "all" ? "active" : ""}`}
                onClick={() => setFilterCategory("all")}
              >
                Tous ({reports.length})
              </button>
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                const count = reports.filter((r) => r.category === key).length;
                return (
                  <button
                    key={key}
                    className={`filter-chip ${filterCategory === key ? "active" : ""}`}
                    onClick={() => setFilterCategory(key)}
                  >
                    <cfg.icon size={15} color={cfg.color} />
                    <span>{cfg.label} ({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* LISTE DES SIGNALEMENTS */}
          {isLoading ? (
            <div className="community-loading-box">
              <div className="spinner"></div>
              <p>Chargement des signalements en direct...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="empty-reports-card">
              <ShieldCheck size={48} color="#00875A" />
              <h3>Voies fluides ! Aucun incident actif</h3>
              <p>Soyez le premier à avertir les autres conducteurs en cas de ralentissement.</p>
              <button className="btn-empty-action" onClick={() => setShowModal(true)}>
                <PlusCircle size={16} /> Signaler un aléa
              </button>
            </div>
          ) : (
            <div className="reports-grid">
              {filteredReports.map((report) => {
                const cat = CATEGORY_CONFIG[report.category] || CATEGORY_CONFIG.accident;
                const sev = SEVERITY_CONFIG[report.severity] || SEVERITY_CONFIG.moderate;
                const CatIcon = cat.icon;

                return (
                  <article key={report.id} className="report-card">
                    <div className="report-card-header">
                      <div className="report-category-pill" style={{ borderColor: `${cat.color}40`, background: `${cat.color}15` }}>
                        <CatIcon size={16} color={cat.color} />
                        <span style={{ color: cat.color }}>{cat.label}</span>
                      </div>
                      <span className={`severity-badge ${sev.class}`}>{sev.label}</span>
                    </div>

                    <h3 className="report-title">{report.title}</h3>

                    <div className="report-location">
                      <MapPin size={15} />
                      <span>{report.locationDescription}</span>
                    </div>

                    <div className="report-meta">
                      <div className="meta-author">
                        <span className="author-dot"></span>
                        <span>{report.author || "Citoyen"} ({report.city})</span>
                      </div>
                      <div className="meta-time">
                        <Clock size={13} />
                        <span>{new Date(report.reportedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>

                    <div className="report-actions">
                      <button
                        className="btn-vote confirm"
                        onClick={() => handleVote(report.id, "confirm")}
                        title="Confirmer ce signalement (+5 pts attribués)"
                      >
                        <ThumbsUp size={15} />
                        <span>Confirmer ({report.confirmationsCount || 0}) <strong>+5 pts</strong></span>
                      </button>

                      <button
                        className="btn-vote resolve"
                        onClick={() => handleVote(report.id, "resolved")}
                        title="Indiquer que la voie est dégagée (+5 pts)"
                      >
                        <CheckCircle size={15} />
                        <span>Voie dégagée <strong>+5 pts</strong></span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ===================================================================
          CONTENU ONGLET 2 : TARIFS & RÉDUCTIONS PAR POINTS DÉFINITIVES
          =================================================================== */}
      {activeTab === "rewards" && profile && (
        <section className="rewards-section">
          {/* BANDEAU 1 : SCORE DE CONFIANCE (SUR 100) & SOLDE DE POINTS */}
          <div className="trust-points-dashboard-card">
            {/* Colonne Score de Confiance */}
            <div className="trust-score-column">
              <div className="trust-header-row">
                <Shield size={22} color={trustInfo.color} />
                <div>
                  <h3>Score de Confiance : <strong>{trustScore}/100</strong></h3>
                  <span className="trust-level-badge" style={{ color: trustInfo.color, background: `${trustInfo.color}15`, borderColor: `${trustInfo.color}40` }}>
                    {trustInfo.icon} Niveau : {trustInfo.level} ({trustInfo.description})
                  </span>
                </div>
              </div>

              <div className="trust-progress-bar">
                <div
                  className="trust-progress-fill"
                  style={{ width: `${Math.min(100, Math.max(5, trustScore))}%`, background: trustInfo.color }}
                ></div>
              </div>

              <div className="trust-scale-markers">
                <span className="marker-low">🔴 0–30 (Faible)</span>
                <span className="marker-mid">🟠 31–60 (À confirmer)</span>
                <span className="marker-good">🟢 61–80 (Fiable)</span>
                <span className="marker-star">⭐ 81–100 (Très fiable)</span>
              </div>
            </div>

            {/* Colonne Solde de Points */}
            <div className="points-balance-column">
              <span className="points-col-title">Solde de Points Cumulés</span>
              <div className="points-col-val">
                <strong>{userPoints}</strong>
                <span>points</span>
              </div>
              <p className="points-note">
                <Sparkles size={13} color="#00875A" />
                Les points sont déduits lors de l'application d'une réduction d'abonnement.
              </p>
            </div>
          </div>

          {/* BANDEAU 2 : BARÈME OFFICIEL D'ACQUISITION DES POINTS */}
          <div className="points-rules-guide-card">
            <div className="rules-heading">
              <h4>🎯 Barème des Points Gagnés</h4>
              <p className="rule-warning">
                <Info size={15} color="#00875A" />
                <strong>Règle importante :</strong> Les points de signalement sont attribués <u>uniquement lorsque le signalement est confirmé</u> par d'autres utilisateurs.
              </p>
            </div>

            <div className="rules-grid">
              <div className="rule-box">
                <span className="rule-icon">🚗</span>
                <div>
                  <strong>+10 points</strong>
                  <span>Signaler un embouteillage confirmé</span>
                </div>
              </div>

              <div className="rule-box">
                <span className="rule-icon">🚨</span>
                <div>
                  <strong>+15 points</strong>
                  <span>Signaler un accident confirmé</span>
                </div>
              </div>

              <div className="rule-box">
                <span className="rule-icon">🚦</span>
                <div>
                  <strong>+20 points</strong>
                  <span>Signaler un feu en panne confirmé</span>
                </div>
              </div>

              <div className="rule-box">
                <span className="rule-icon">🛣️</span>
                <div>
                  <strong>+15 points</strong>
                  <span>Signaler route bloquée / obstacle</span>
                </div>
              </div>

              <div className="rule-box highlight-rule">
                <span className="rule-icon">✅</span>
                <div>
                  <strong>+5 points</strong>
                  <span>Confirmer un signalement existant</span>
                </div>
              </div>

              <div className="rule-box highlight-rule">
                <span className="rule-icon">🔄</span>
                <div>
                  <strong>+5 points</strong>
                  <span>Indiquer qu'un incident est terminé</span>
                </div>
              </div>
            </div>
          </div>

          {/* BANDEAU 3 : LES 2 ABONNEMENTS PREMIUM & SÉLECTEUR DE RÉDUCTION */}
          <div className="subscription-plans-container">
            <div className="plans-heading">
              <h2>💳 Les Abonnements Premium & Réductions Débloquées</h2>
              <p>Sélectionnez une réduction disponible selon votre solde de points pour l'appliquer immédiatement sur l'abonnement.</p>
            </div>

            <div className="plans-cards-grid">
              {/* CARTE 1 : 👤 Premium Citoyen (2 000 FCFA / mois - 1 personne) */}
              {(() => {
                const plan = SUBSCRIPTION_PLANS[0];
                const activeTier = DISCOUNT_REWARDS.find((r) => r.id === selectedRewardCitizen);
                const discountPct = activeTier ? activeTier.discountPercent : 0;
                const pointsCost = activeTier ? activeTier.pointsRequired : 0;
                const finalPrice = activeTier ? activeTier.citizenPrice : plan.priceFcfa;
                const isFree = finalPrice === 0;

                return (
                  <div className="plan-pricing-card b2c-card featured-plan">
                    <div className="plan-floating-badge">👤 Citoyen Particulier</div>

                    <div className="plan-card-header">
                      <div className="plan-category-indicator">
                        <UserCheck size={18} />
                        <span>1 personne bénéficiaire</span>
                      </div>
                      <h3 className="plan-name">{plan.name}</h3>
                      <p className="plan-subtitle">{plan.subtitle}</p>
                    </div>

                    {/* SÉLECTEUR DE RÉDUCTIONS PAR POINTS */}
                    <div className="discount-tier-selector-box">
                      <label>Appliquer une réduction par points :</label>
                      <div className="tier-pills-row">
                        <button
                          type="button"
                          className={`tier-pill-btn ${selectedRewardCitizen === null ? "active" : ""}`}
                          onClick={() => setSelectedRewardCitizen(null)}
                        >
                          Plein Tarif (0 pt)
                        </button>
                        {DISCOUNT_REWARDS.map((tier) => {
                          const canAfford = userPoints >= tier.pointsRequired;
                          return (
                            <button
                              key={tier.id}
                              type="button"
                              disabled={!canAfford}
                              className={`tier-pill-btn ${selectedRewardCitizen === tier.id ? "active" : ""} ${!canAfford ? "disabled" : ""}`}
                              onClick={() => setSelectedRewardCitizen(tier.id)}
                            >
                              <strong>{tier.pointsRequired} pts</strong>
                              <span>({tier.label})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* BLOC DE PRIX CALCULÉ */}
                    <div className="plan-pricing-block">
                      {discountPct > 0 && (
                        <div className="price-discount-meta">
                          <span className="original-price">{plan.priceFcfa.toLocaleString()} FCFA</span>
                          <span className="discount-tag">-{discountPct}% ({pointsCost} pts déduits)</span>
                        </div>
                      )}

                      <div className="final-price-row">
                        <strong className="final-price-amount">
                          {isFree ? "1 MOIS GRATUIT" : `${finalPrice.toLocaleString()} FCFA`}
                        </strong>
                        <span className="price-period">/ mois</span>
                      </div>

                      {discountPct > 0 && !isFree && (
                        <div className="savings-inline-pill">
                          <Sparkles size={13} color="#00875A" />
                          <span>Économie de <strong>{(plan.priceFcfa - finalPrice).toLocaleString()} FCFA</strong></span>
                        </div>
                      )}
                    </div>

                    <ul className="plan-features-list">
                      {plan.features.map((feat, idx) => (
                        <li key={idx}>
                          <Check size={16} className="feature-check" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className="btn-subscribe-plan btn-b2c"
                      onClick={() => setSubscribeModal({ plan, rewardTier: activeTier, finalPrice })}
                    >
                      <CreditCard size={18} />
                      <span>
                        {isFree
                          ? `Activer mon mois Gratuit (-${pointsCost} pts)`
                          : `Souscrire (${finalPrice.toLocaleString()} FCFA ${pointsCost > 0 ? `• -${pointsCost} pts` : ""})`}
                      </span>
                    </button>
                  </div>
                );
              })()}

              {/* CARTE 2 : 🏢 Premium Entreprise (50 000 FCFA / mois - 30 personnes) */}
              {(() => {
                const plan = SUBSCRIPTION_PLANS[1];
                const activeTier = DISCOUNT_REWARDS.find((r) => r.id === selectedRewardEnterprise);
                const discountPct = activeTier ? activeTier.discountPercent : 0;
                const pointsCost = activeTier ? activeTier.pointsRequired : 0;
                const finalPrice = activeTier ? activeTier.enterprisePrice : plan.priceFcfa;
                const isFree = finalPrice === 0;

                return (
                  <div className="plan-pricing-card b2b-card">
                    <div className="plan-floating-badge b2b-badge">🏢 Entreprise (30 Personnes)</div>

                    <div className="plan-card-header">
                      <div className="plan-category-indicator">
                        <Building2 size={18} />
                        <span>30 personnes incluses</span>
                      </div>
                      <h3 className="plan-name">{plan.name}</h3>
                      <p className="plan-subtitle">{plan.subtitle}</p>
                    </div>

                    {/* SÉLECTEUR DE RÉDUCTIONS PAR POINTS */}
                    <div className="discount-tier-selector-box">
                      <label>Appliquer une réduction par points :</label>
                      <div className="tier-pills-row">
                        <button
                          type="button"
                          className={`tier-pill-btn ${selectedRewardEnterprise === null ? "active" : ""}`}
                          onClick={() => setSelectedRewardEnterprise(null)}
                        >
                          Plein Tarif (0 pt)
                        </button>
                        {DISCOUNT_REWARDS.map((tier) => {
                          const canAfford = userPoints >= tier.pointsRequired;
                          return (
                            <button
                              key={tier.id}
                              type="button"
                              disabled={!canAfford}
                              className={`tier-pill-btn ${selectedRewardEnterprise === tier.id ? "active" : ""} ${!canAfford ? "disabled" : ""}`}
                              onClick={() => setSelectedRewardEnterprise(tier.id)}
                            >
                              <strong>{tier.pointsRequired} pts</strong>
                              <span>({tier.label})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* BLOC DE PRIX CALCULÉ */}
                    <div className="plan-pricing-block">
                      {discountPct > 0 && (
                        <div className="price-discount-meta">
                          <span className="original-price">{plan.priceFcfa.toLocaleString()} FCFA</span>
                          <span className="discount-tag">-{discountPct}% ({pointsCost} pts déduits)</span>
                        </div>
                      )}

                      <div className="final-price-row">
                        <strong className="final-price-amount">
                          {isFree ? "1 MOIS GRATUIT" : `${finalPrice.toLocaleString()} FCFA`}
                        </strong>
                        <span className="price-period">/ mois (pour 30 pers.)</span>
                      </div>

                      {discountPct > 0 && !isFree && (
                        <div className="savings-inline-pill">
                          <Sparkles size={13} color="#2563eb" />
                          <span>Économie de <strong>{(plan.priceFcfa - finalPrice).toLocaleString()} FCFA</strong></span>
                        </div>
                      )}
                    </div>

                    <ul className="plan-features-list">
                      {plan.features.map((feat, idx) => (
                        <li key={idx}>
                          <Check size={16} className="feature-check" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className="btn-subscribe-plan btn-b2b"
                      onClick={() => setSubscribeModal({ plan, rewardTier: activeTier, finalPrice })}
                    >
                      <CreditCard size={18} />
                      <span>
                        {isFree
                          ? `Activer le mois Gratuit Flotte (-${pointsCost} pts)`
                          : `Souscrire (${finalPrice.toLocaleString()} FCFA ${pointsCost > 0 ? `• -${pointsCost} pts` : ""})`}
                      </span>
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        </section>
      )}

      {/* ===================================================================
          MODAL : SOUSCRIPTION & RÈGLEMENT SÉCURISÉ
          =================================================================== */}
      {subscribeModal && (
        <div className="modal-backdrop" onClick={() => setSubscribeModal(null)}>
          <div className="modal-card payment-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-box">
                <CreditCard size={22} className="text-emerald-500" />
                <div>
                  <h3>Souscription & Règlement</h3>
                  <small>{subscribeModal.plan.name} • {subscribeModal.plan.beneficiaries}</small>
                </div>
              </div>
              <button className="btn-close-modal" onClick={() => setSubscribeModal(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="payment-summary-box">
              <div className="pay-row">
                <span>Formule choisie :</span>
                <strong>{subscribeModal.plan.name} ({subscribeModal.plan.beneficiaries})</strong>
              </div>
              <div className="pay-row">
                <span>Prix standard :</span>
                <strong className={subscribeModal.rewardTier ? "line-through text-gray-400" : ""}>
                  {subscribeModal.plan.priceFcfa.toLocaleString()} FCFA
                </strong>
              </div>
              {subscribeModal.rewardTier && (
                <>
                  <div className="pay-row text-emerald-600">
                    <span>Réduction appliquée :</span>
                    <strong>{subscribeModal.rewardTier.label}</strong>
                  </div>
                  <div className="pay-row text-emerald-600">
                    <span>Points déduits du solde :</span>
                    <strong>-{subscribeModal.rewardTier.pointsRequired} points</strong>
                  </div>
                </>
              )}
              <div className="pay-row total-row">
                <span>Montant Net à Régler :</span>
                <strong className="total-amount">
                  {subscribeModal.finalPrice === 0 ? "0 FCFA (1 MOIS GRATUIT 🎉)" : `${subscribeModal.finalPrice.toLocaleString()} FCFA`}
                </strong>
              </div>
            </div>

            <div className="payment-form">
              {subscribeModal.finalPrice > 0 ? (
                <>
                  <label className="payment-label">Moyen de paiement sécurisé (Cameroun) :</label>
                  <div className="payment-methods-grid">
                    {[
                      { id: "MTN Mobile Money", label: "MTN MoMo", color: "#FACC15" },
                      { id: "Orange Money", label: "Orange Money", color: "#FB923C" },
                      { id: "Carte Bancaire", label: "Carte Bancaire / Visa", color: "#38BDF8" },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={`pay-method-btn ${paymentMethod === m.id ? "selected" : ""}`}
                        onClick={() => setPaymentMethod(m.id)}
                      >
                        <span className="method-dot" style={{ background: m.color }}></span>
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>

                  {paymentMethod.includes("Money") && (
                    <div className="form-group mt-3">
                      <label>Numéro de téléphone ({paymentMethod}) :</label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="6XXXXXXXX"
                        required
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="free-month-notice">
                  <Sparkles size={20} color="#00875A" />
                  <p>Aucun paiement requis. Votre récompense de <strong>1 mois gratuit</strong> sera activée immédiatement et <strong>600 points</strong> seront déduits de votre solde.</p>
                </div>
              )}

              <div className="modal-actions mt-4">
                <button type="button" className="btn-cancel" onClick={() => setSubscribeModal(null)}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn-submit"
                  disabled={isProcessingPayment}
                  onClick={handleConfirmSubscription}
                >
                  {isProcessingPayment ? "Traitement en cours..." : "Confirmer et Activer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL : NOUVEAU SIGNALEMENT
          =================================================================== */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-box">
                <AlertTriangle size={22} className="text-orange-500" />
                <h3>Signaler un incident sur la route</h3>
              </div>
              <button className="btn-close-modal" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitReport} className="modal-form">
              {/* Ville */}
              <div className="form-group">
                <label>Ville concernée</label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                >
                  <option value="Yaoundé">Yaoundé</option>
                  <option value="Douala">Douala</option>
                </select>
              </div>

              {/* Type d'incident & Points prévisionnels */}
              <div className="form-group">
                <label>Type d'incident (Points crédités après confirmation)</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label} (+{cfg.points} pts une fois confirmé)
                    </option>
                  ))}
                </select>
              </div>

              {/* Sévérité */}
              <div className="form-group">
                <label>Niveau de blocage</label>
                <div className="severity-selector">
                  {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
                    <button
                      type="button"
                      key={key}
                      className={`sev-btn ${formData.severity === key ? "selected" : ""} ${cfg.class}`}
                      onClick={() => setFormData({ ...formData, severity: key })}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Titre */}
              <div className="form-group">
                <label>Titre bref du signalement *</label>
                <input
                  type="text"
                  placeholder="Ex: Carrefour bloqué, circulation dense"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Emplacement précis / Repères *</label>
                <input
                  type="text"
                  placeholder="Ex: Rond-point Deido face station Total"
                  value={formData.locationDescription}
                  onChange={(e) => setFormData({ ...formData, locationDescription: e.target.value })}
                  required
                />
              </div>

              {/* Règle Anti-Abus Reminder */}
              <div className="gamification-prompt">
                <ShieldCheck size={18} color="#00875A" />
                <span>
                  Ce signalement vous rapportera <strong>+{CATEGORY_CONFIG[formData.category]?.points || 15} points</strong> dès qu'il sera confirmé par d'autres citoyens.
                </span>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                  {isSubmitting ? "Publication en cours..." : "Partager le signalement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

