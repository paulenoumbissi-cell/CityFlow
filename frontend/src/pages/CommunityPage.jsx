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
  X,
} from "lucide-react";
import { useCity } from "../context/CityContext";
import wsService from "../services/websocketService";
import "./CommunityPage.css";

const API_BASE = "http://localhost:3000/api";

const CATEGORY_CONFIG = {
  accident: { label: "Accident de circulation", icon: AlertTriangle, color: "#EF4444" },
  breakdown: { label: "Véhicule / Camion en panne", icon: Wrench, color: "#F59E0B" },
  roadworks: { label: "Travaux sur la chaussée", icon: Construction, color: "#3B82F6" },
  trafficBlock: { label: "Carrefour bloqué / Embouteillage", icon: Car, color: "#EC4899" },
  hazard: { label: "Obstacle ou nid de poule", icon: AlertCircle, color: "#8B5CF6" },
  flooding: { label: "Inondation / Chaussée submergée", icon: Droplets, color: "#06B6D4" },
};

const SEVERITY_CONFIG = {
  low: { label: "Faible", class: "sev-low" },
  moderate: { label: "Modéré", class: "sev-moderate" },
  high: { label: "Élevé", class: "sev-high" },
  critical: { label: "Critique", class: "sev-critical" },
};

const DEFAULT_PLANS = [
  {
    id: "plan_citizen_monthly",
    category: "b2c",
    name: "Pass Mensuel Citoyen",
    subtitle: "Pour simples citoyens & conducteurs particuliers",
    priceFcfa: 2000,
    period: "par mois",
    target: "1 Utilisateur",
    badge: "Populaire Citoyen",
    features: [
      "Guidage vocal intelligent sans coupure",
      "Alertes d'anticipation météo & bouchons +1h",
      "Calcul multi-destinations & éco-trajets illimités",
      "Statut prioritaire de signalement certifié",
    ],
  },
  {
    id: "plan_enterprise_fleet",
    category: "b2b",
    name: "Pack Flotte Entreprise Pro (B2B)",
    subtitle: "Pour entreprises, livreurs & gestionnaires de flottes",
    priceFcfa: 50000,
    period: "par mois",
    target: "Jusqu'à 20 collaborateurs inclus",
    badge: "Recommandé Entreprise",
    features: [
      "Comptes Premium inclus pour jusqu'à 20 chauffeurs / collaborateurs",
      "Tableau de bord supervision de flotte en direct (Yaoundé & Douala)",
      "Optimisation automatique des tournées de livraison",
      "Rapports mensuels d'économies de carburant & bilan CO₂",
      "Support technique dédié 24/7 & gestionnaire de compte",
    ],
  },
  {
    id: "plan_citizen_annual",
    category: "b2c",
    name: "Pass Annuel Citoyen (12 Mois)",
    subtitle: "Mobilité illimitée avec 2 mois offerts",
    priceFcfa: 20000,
    period: "par an",
    target: "1 Utilisateur",
    badge: "2 Mois Offerts",
    features: [
      "Tous les avantages Citoyen Premium en illimité",
      "Économie de 4 000 FCFA sur l'année",
      "Badge Citoyen d'Or & Priorité support",
    ],
  },
];

export default function CommunityPage() {
  const { selectedCity } = useCity();
  const [activeTab, setActiveTab] = useState("reports"); // 'reports' | 'rewards'
  const [reports, setReports] = useState([]);
  const [profile, setProfile] = useState(null);
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");

  // Modal de nouveau signalement
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    city: selectedCity === "all" ? "Yaoundé" : selectedCity,
    category: "accident",
    severity: "moderate",
    locationDescription: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal de souscription avec réduction
  const [subscribePlan, setSubscribePlan] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("MTN Mobile Money");
  const [phoneNumber, setPhoneNumber] = useState("670000000");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState(null);

  const showToast = (msg) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const cityQuery = selectedCity && selectedCity !== "all" ? `?city=${encodeURIComponent(selectedCity)}` : "";
      
      const [reportsRes, profileRes, catalogRes] = await Promise.all([
        fetch(`${API_BASE}/reports${cityQuery}`).catch(() => null),
        fetch(`${API_BASE}/rewards/profile`).catch(() => null),
        fetch(`${API_BASE}/rewards/catalog`).catch(() => null),
      ]);

      if (reportsRes && reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data.reports || []);
      }
      if (profileRes && profileRes.ok) {
        const pData = await profileRes.json();
        setProfile(pData);
      }
      if (catalogRes && catalogRes.ok) {
        const cData = await catalogRes.json();
        if (cData.plans && cData.plans.length > 0) setPlans(cData.plans);
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

  const handleVote = async (reportId, type) => {
    try {
      const res = await fetch(`${API_BASE}/reports/${reportId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, userId: "user_current" }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(type === "confirm" ? "👍 Confirmation enregistrée (+5 pts) !" : "✅ Signalement de résolution enregistré !");
        
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? data.report : r)).filter((r) => r.status === "active")
        );
        if (data.profileUpdate && profile) {
          setProfile((p) => ({
            ...p,
            reputationScore: data.profileUpdate.points,
            level: data.profileUpdate.level,
          }));
        }
      }
    } catch (err) {
      showToast("Erreur lors de la prise en compte du vote.");
    }
  };

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
          author: profile?.name || "Citoyen CityFlow",
          authorId: "user_current",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast("🎉 Signalement partagé ! +25 points de réputation crédités.");
        setShowModal(false);
        setFormData({
          title: "",
          city: selectedCity === "all" ? "Yaoundé" : selectedCity,
          category: "accident",
          severity: "moderate",
          locationDescription: "",
        });
        fetchData();
      } else {
        showToast("Impossible d'enregistrer le signalement.");
      }
    } catch (err) {
      showToast("Erreur réseau lors de l'envoi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSubscription = async () => {
    if (!subscribePlan) return;
    try {
      setIsProcessingPayment(true);
      const res = await fetch(`${API_BASE}/rewards/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: subscribePlan.id,
          paymentMethod,
          phoneNumber,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`🎉 ${data.message}`);
        setSubscribePlan(null);
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

  const userPoints = profile?.reputationScore || profile?.points || 320;
  const userDiscountPercent = Math.min(100, Math.round((userPoints / 1000) * 100));

  return (
    <main className="community-page">
      {feedbackToast && (
        <div className="community-toast animate-slide-in">
          <Sparkles size={18} className="toast-icon" />
          <span>{feedbackToast}</span>
        </div>
      )}

      <section className="community-hero">
        <div className="community-hero-content">
          <div className="hero-tag">
            <Users size={16} />
            <span>Crowdsourcing Urbain & Mobilité Intelligente</span>
          </div>
          <h1>
            Communauté & <span>Abonnements avec Réduction Citoyenne</span>
          </h1>
          <p>
            Participez activement à l'information routière de votre ville. Chaque contribution crédite vos points 
            qui s'appliquent <strong>automatiquement en réduction directe sur tous vos abonnements CityFlow</strong>.
          </p>

          <div className="community-quick-stats">
            <div className="stat-pill">
              <span className="pill-number">{reports.length}</span>
              <span className="pill-label">Signalements actifs</span>
            </div>
            <div className="stat-pill">
              <span className="pill-number">{userPoints} pts</span>
              <span className="pill-label">Mes Points Citoyens</span>
            </div>
            <div className="stat-pill highlight-pill">
              <span className="pill-number">-{userDiscountPercent}%</span>
              <span className="pill-label">Ma Réduction Directe</span>
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
          <span>Signaler un incident (+25 pts)</span>
        </button>
      </section>

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
          <Tag size={18} />
          <span>Tarifs & Abonnements Réduits</span>
          <span className="tab-discount-tag">-{userDiscountPercent}%</span>
        </button>
      </nav>

      {activeTab === "reports" && (
        <section className="reports-section">
          <div className="reports-filter-bar">
            <div className="filter-chips">
              <button
                className={`filter-chip ${filterCategory === "all" ? "active" : ""}`}
                onClick={() => setFilterCategory("all")}
              >
                Tous les signalements ({reports.length})
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
                        <span>{report.author || "Citoyen CityFlow"} ({report.city})</span>
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
                      >
                        <ThumbsUp size={15} />
                        <span>Confirmer ({report.confirmationsCount || 0})</span>
                      </button>
                      <button
                        className="btn-vote resolve"
                        onClick={() => handleVote(report.id, "resolved")}
                      >
                        <CheckCircle size={15} />
                        <span>Voie dégagée</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === "rewards" && profile && (
        <section className="rewards-section">
          <div className="gamification-header-card">
            <div className="gamification-summary">
              <div className="points-display-box">
                <span className="points-title">Mes Points de Citoyenneté</span>
                <div className="points-val">
                  <strong>{userPoints}</strong>
                  <span>pts</span>
                </div>
                <div className="active-discount-badge">
                  <Percent size={14} />
                  <span>Réduction automatique directe : <strong>-{userDiscountPercent}%</strong></span>
                </div>
              </div>

              <div className="gamification-progress-col">
                <div className="rank-info-row">
                  <div className="rank-title-box">
                    <span className="rank-badge-icon">{profile.level?.badgeIcon || "🛡️"}</span>
                    <div>
                      <h4>{profile.level?.title || "Sentinelle Urbaine"}</h4>
                      <small>Niveau {profile.level?.number || 2}</small>
                    </div>
                  </div>

                  <span className="next-tier-hint">
                    {userPoints >= 1000 ? (
                      <strong style={{ color: "#00875A" }}>🎉 Félicitations ! Votre abonnement Citoyen est 100% GRATUIT !</strong>
                    ) : (
                      <>
                        Encore <strong>{1000 - userPoints} pts</strong> pour atteindre <strong>100% GRATUIT</strong>
                      </>
                    )}
                  </span>
                </div>

                <div className="points-progress-bar">
                  <div
                    className="points-progress-fill"
                    style={{ width: `${Math.min(100, Math.max(5, (userPoints / 1000) * 100))}%` }}
                  ></div>
                </div>

                <div className="points-scale-markers">
                  <span>0 pt (0%)</span>
                  <span>250 pts (-25%)</span>
                  <span>500 pts (-50% Demi-tarif)</span>
                  <span>750 pts (-75%)</span>
                  <span>1000 pts (100% GRATUIT)</span>
                </div>
              </div>
            </div>

            <div className="points-earning-guide">
              <div className="earn-rule-item">
                <div className="earn-icon plus-icon"><PlusCircle size={18} /></div>
                <div>
                  <strong>+25 points</strong>
                  <span>Par signalement d'incident vérifié</span>
                </div>
              </div>
              <div className="earn-rule-item">
                <div className="earn-icon vote-icon"><ThumbsUp size={18} /></div>
                <div>
                  <strong>+5 points</strong>
                  <span>Par confirmation ou résolution d'alerte</span>
                </div>
              </div>
              <div className="earn-rule-item">
                <div className="earn-icon eco-icon"><Zap size={18} /></div>
                <div>
                  <strong>+10 points</strong>
                  <span>Par trajet éco-mobilité optimisé</span>
                </div>
              </div>
            </div>
          </div>

          <div className="subscription-plans-container">
            <div className="plans-heading">
              <h2>Formules d'Abonnement CityFlow</h2>
              <p>Votre remise citoyenne de <strong>-{userDiscountPercent}%</strong> est automatiquement déduite de tous les tarifs ci-dessous.</p>
            </div>

            <div className="plans-cards-grid">
              {plans.map((plan) => {
                const discountAmount = Math.round((plan.priceFcfa * userDiscountPercent) / 100);
                const finalPrice = Math.max(0, plan.priceFcfa - discountAmount);
                const isFree = finalPrice === 0;
                const isB2B = plan.category === "b2b";

                return (
                  <div
                    key={plan.id}
                    className={`plan-pricing-card ${isB2B ? "b2b-card" : "b2c-card"} ${plan.badge ? "featured-plan" : ""}`}
                  >
                    {plan.badge && <div className="plan-floating-badge">{plan.badge}</div>}

                    <div className="plan-card-header">
                      <div className="plan-category-indicator">
                        {isB2B ? <Building2 size={18} /> : <UserCheck size={18} />}
                        <span>{isB2B ? "🏢 Entreprise & Flotte" : "👤 Simple Citoyen"}</span>
                      </div>
                      <h3 className="plan-name">{plan.name}</h3>
                      <p className="plan-subtitle">{plan.subtitle}</p>
                      <span className="plan-target-tag">{plan.target}</span>
                    </div>

                    <div className="plan-pricing-block">
                      {userDiscountPercent > 0 && (
                        <div className="price-discount-meta">
                          <span className="original-price">{plan.priceFcfa.toLocaleString()} FCFA</span>
                          <span className="discount-tag">-{userDiscountPercent}% appliqué</span>
                        </div>
                      )}

                      <div className="final-price-row">
                        <strong className="final-price-amount">
                          {isFree ? "100% GRATUIT" : `${finalPrice.toLocaleString()} FCFA`}
                        </strong>
                        <span className="price-period">/ {plan.period.replace("par ", "")}</span>
                      </div>

                      {userDiscountPercent > 0 && !isFree && (
                        <div className="savings-inline-pill">
                          <Sparkles size={13} color="#00875A" />
                          <span>Vous économisez <strong>{discountAmount.toLocaleString()} FCFA</strong> grâce à vos points</span>
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
                      className={`btn-subscribe-plan ${isB2B ? "btn-b2b" : "btn-b2c"}`}
                      onClick={() => setSubscribePlan(plan)}
                    >
                      <CreditCard size={18} />
                      <span>
                        {isFree ? "Activer mon mois Gratuit" : `Souscrire (${finalPrice.toLocaleString()} FCFA)`}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {subscribePlan && (
        <div className="modal-backdrop" onClick={() => setSubscribePlan(null)}>
          <div className="modal-card payment-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-box">
                <CreditCard size={22} className="text-emerald-500" />
                <div>
                  <h3>Souscription & Règlement</h3>
                  <small>{subscribePlan.name}</small>
                </div>
              </div>
              <button className="btn-close-modal" onClick={() => setSubscribePlan(null)}>
                <X size={20} />
              </button>
            </div>

            <div className="payment-summary-box">
              <div className="pay-row">
                <span>Formule :</span>
                <strong>{subscribePlan.name}</strong>
              </div>
              <div className="pay-row">
                <span>Prix normal :</span>
                <strong className={userDiscountPercent > 0 ? "line-through text-gray-400" : ""}>
                  {subscribePlan.priceFcfa.toLocaleString()} FCFA
                </strong>
              </div>
              {userDiscountPercent > 0 && (
                <div className="pay-row text-emerald-600">
                  <span>Réduction Citoyenne ({userDiscountPercent}%) :</span>
                  <strong>-{Math.round((subscribePlan.priceFcfa * userDiscountPercent) / 100).toLocaleString()} FCFA</strong>
                </div>
              )}
              <div className="pay-row total-row">
                <span>Montant Net à Régler :</span>
                <strong className="total-amount">
                  {Math.max(0, subscribePlan.priceFcfa - Math.round((subscribePlan.priceFcfa * userDiscountPercent) / 100)).toLocaleString()} FCFA
                </strong>
              </div>
            </div>

            <div className="payment-form">
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

              <div className="modal-actions mt-4">
                <button type="button" className="btn-cancel" onClick={() => setSubscribePlan(null)}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn-submit"
                  disabled={isProcessingPayment}
                  onClick={handleConfirmSubscription}
                >
                  {isProcessingPayment ? "Traitement sécurisé..." : "Confirmer et Activer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

              <div className="form-group">
                <label>Type d'incident</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Niveau de blocage / Urgence</label>
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

              <div className="form-group">
                <label>Titre bref du signalement *</label>
                <input
                  type="text"
                  placeholder="Ex: Camion arrêté, circulation bloquée"
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

              <div className="gamification-prompt">
                <Sparkles size={16} className="text-yellow-500" />
                <span>Ce signalement attribuera <strong>+25 points de réputation</strong> à votre profil.</span>
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
