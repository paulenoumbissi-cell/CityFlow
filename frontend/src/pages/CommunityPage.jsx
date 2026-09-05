import React, { useState, useEffect } from "react";
import {
  Users,
  AlertTriangle,
  Award,
  PlusCircle,
  ThumbsUp,
  CheckCircle,
  Gift,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  Car,
  Wrench,
  Construction,
  Droplets,
  AlertCircle,
  Ticket,
  ChevronRight,
  TrendingUp,
  Percent,
  Check,
  Copy,
  Zap,
  Tag,
  Shield,
  Crown,
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

export default function CommunityPage() {
  const { selectedCity } = useCity();
  const [activeTab, setActiveTab] = useState("reports"); // 'reports' | 'rewards'
  const [reports, setReports] = useState([]);
  const [profile, setProfile] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");

  // Simulateur de prix d'abonnement
  const [selectedPlanId, setSelectedPlanId] = useState("plan_monthly");
  const [copiedCode, setCopiedCode] = useState(null);

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

  // Modal de réduction d'abonnement débloquée
  const [unlockedReward, setUnlockedReward] = useState(null);
  const [feedbackToast, setFeedbackToast] = useState(null);

  const showToast = (msg) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Chargement des données
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
        setCatalog(cData.catalog || []);
        if (cData.plans) setPlans(cData.plans);
      }
    } catch (err) {
      console.error("Erreur chargement données communautaires", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Écoute temps réel des nouveaux signalements et votes
    const unsubNew = wsService.on("CITIZEN_REPORT_CREATED", (data) => {
      if (data?.report) {
        if (!selectedCity || selectedCity === "all" || data.report.city === selectedCity) {
          setReports((prev) => {
            if (prev.some((r) => r.id === data.report.id)) return prev;
            return [data.report, ...prev];
          });
          showToast(`⚡ Nouveau signalement en direct : ${data.report.title} (${data.report.city})`);
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

  // Vote sur un incident
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
        
        // Rafraîchir
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

  // Soumission du formulaire de signalement
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.locationDescription) {
      showToast("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json();
        showToast("🎉 Signalement partagé avec succès (+25 points) !");
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

  // Rédemption d'une réduction d'abonnement
  const handleRedeem = async (rewardId) => {
    try {
      const res = await fetch(`${API_BASE}/rewards/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId }),
      });

      const data = await res.json();
      if (res.ok) {
        setUnlockedReward(data.redemption);
        if (profile) {
          setProfile((p) => ({
            ...p,
            reputationScore: data.remainingPoints,
            level: data.level,
            redeemedRewards: [data.redemption, ...(p.redeemedRewards || [])],
          }));
        }
      } else {
        showToast(data.error || "Points insuffisants pour débloquer cette réduction.");
      }
    } catch (err) {
      showToast("Erreur lors de l'échange.");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    showToast(`📋 Code "${text}" copié dans le presse-papiers !`);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const filteredReports = reports.filter((r) => {
    if (filterCategory !== "all" && r.category !== filterCategory) return false;
    return true;
  });

  const userPoints = profile?.reputationScore || 320;

  // Calcul du taux de réduction maximal actuellement déblocable
  const currentMaxDiscount = catalog.reduce((max, item) => {
    if (userPoints >= item.costPoints && item.discountPercent > max) {
      return item.discountPercent;
    }
    return max;
  }, 0);

  // Prochain palier
  const nextTier = catalog.find((item) => userPoints < item.costPoints);
  const pointsToNext = nextTier ? nextTier.costPoints - userPoints : 0;

  // Formule active pour le simulateur
  const currentPlan = (plans.length > 0 ? plans : [
    {
      id: "plan_citizen_monthly",
      category: "b2c",
      name: "Pass Mensuel Citoyen Premium",
      subtitle: "Pour simples citoyens & conducteurs particuliers",
      priceFcfa: 2000,
      period: "par mois",
      target: "1 Utilisateur",
    },
    {
      id: "plan_citizen_annual",
      category: "b2c",
      name: "Pass Annuel Citoyen (12 Mois)",
      subtitle: "Mobilité illimitée avec 2 mois offerts",
      priceFcfa: 20000,
      period: "par an",
      target: "1 Utilisateur",
    },
    {
      id: "plan_enterprise_fleet",
      category: "b2b",
      name: "Pack Flotte Entreprise Pro (B2B)",
      subtitle: "Pour entreprises & flottes jusqu'à 20 personnes",
      priceFcfa: 50000,
      period: "par mois",
      target: "Jusqu'à 20 collaborateurs",
    },
  ]).find((p) => p.id === selectedPlanId) || {
    id: "plan_citizen_monthly",
    category: "b2c",
    name: "Pass Mensuel Citoyen Premium",
    priceFcfa: 2000,
    period: "par mois",
    target: "1 Utilisateur",
  };

  const simulatedDiscountPercent = currentMaxDiscount > 0 ? currentMaxDiscount : 10;
  const simulatedSavings = Math.round((currentPlan.priceFcfa * simulatedDiscountPercent) / 100);
  const simulatedFinalPrice = Math.max(0, currentPlan.priceFcfa - simulatedSavings);

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
            <span>Crowdsourcing Urbain & Éco-Mobilité</span>
          </div>
          <h1>
            Communauté & <span>Récompenses d'Abonnement</span>
          </h1>
          <p>
            Signalez les aléas de la route en direct, cumulez des points de citoyenneté et obtenez 
            <strong> jusqu'à 100% de réduction sur votre abonnement CityFlow Premium</strong>.
          </p>

          {/* Quick Stats Bar */}
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
              <span className="pill-number">-{currentMaxDiscount}%</span>
              <span className="pill-label">Réduction accessible</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="community-hero-action">
          <button className="btn-create-report pulse-glow" onClick={() => setShowModal(true)}>
            <PlusCircle size={20} />
            <span>Signaler un incident (+25 pts)</span>
          </button>
        </div>
      </section>

      {/* NAVIGATION TABS */}
      <div className="community-tabs-wrapper">
        <div className="community-tabs">
          <button
            className={`tab-btn ${activeTab === "reports" ? "active" : ""}`}
            onClick={() => setActiveTab("reports")}
          >
            <AlertTriangle size={18} />
            <span>Signalements en direct ({reports.length})</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "rewards" ? "active" : ""}`}
            onClick={() => setActiveTab("rewards")}
          >
            <Percent size={18} />
            <span>Réductions sur l'Abonnement</span>
            <span className="tab-badge">{userPoints} pts</span>
          </button>
        </div>
      </div>

      {/* CONTENU ONGLET 1 : SIGNALEMENTS EN DIRECT */}
      {activeTab === "reports" && (
        <section className="reports-section">
          {/* Filters Bar */}
          <div className="reports-filter-bar">
            <span className="filter-label">Filtrer par catégorie :</span>
            <div className="filter-pills">
              <button
                className={`filter-btn ${filterCategory === "all" ? "active" : ""}`}
                onClick={() => setFilterCategory("all")}
              >
                Tous ({reports.length})
              </button>
              {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => {
                const count = reports.filter((r) => r.category === key).length;
                return (
                  <button
                    key={key}
                    className={`filter-btn ${filterCategory === key ? "active" : ""}`}
                    onClick={() => setFilterCategory(key)}
                  >
                    <cfg.icon size={14} style={{ color: cfg.color }} />
                    <span>{cfg.label.split(" ")[0]} ({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reports Grid */}
          {isLoading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Chargement des signalements communautaires en temps réel...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="empty-state">
              <ShieldCheck size={48} className="empty-icon" />
              <h3>Aucun incident signalé actuellement</h3>
              <p>La voie est libre ! Soyez le premier à avertir la communauté en cas d'imprévu.</p>
              <button className="btn-create-report mt-4" onClick={() => setShowModal(true)}>
                <PlusCircle size={18} />
                <span>Publier le premier signalement (+25 pts)</span>
              </button>
            </div>
          ) : (
            <div className="reports-grid">
              {filteredReports.map((report) => {
                const catCfg = CATEGORY_CONFIG[report.category] || CATEGORY_CONFIG.accident;
                const IconComponent = catCfg.icon;
                const sevCfg = SEVERITY_CONFIG[report.severity] || SEVERITY_CONFIG.moderate;

                return (
                  <article key={report.id} className="report-card">
                    <div className="report-card-top">
                      <div className="category-pill" style={{ borderColor: catCfg.color }}>
                        <IconComponent size={16} style={{ color: catCfg.color }} />
                        <span>{catCfg.label}</span>
                      </div>
                      <span className={`severity-tag ${sevCfg.class}`}>{sevCfg.label}</span>
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
                        title="Confirmer la présence de cet incident"
                      >
                        <ThumbsUp size={15} />
                        <span>Confirmer ({report.confirmationsCount || 0})</span>
                      </button>

                      <button
                        className="btn-vote resolve"
                        onClick={() => handleVote(report.id, "resolved")}
                        title="Signaler que la voie est désormais dégagée"
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

      {/* CONTENU ONGLET 2 : RÉDUCTIONS SUR L'ABONNEMENT */}
      {activeTab === "rewards" && profile && (
        <section className="rewards-section">
          {/* BANDEAU GAUGE DES POINTS & REMISE */}
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
                  <span>Réduction max débloquée : <strong>-{currentMaxDiscount}%</strong></span>
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

                  {nextTier && (
                    <span className="next-tier-hint">
                      Encore <strong>{pointsToNext} pts</strong> pour débloquer <strong>-{nextTier.discountPercent}%</strong>
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="points-progress-bar">
                  <div
                    className="points-progress-fill"
                    style={{ width: `${Math.min(100, Math.max(10, (userPoints / 1000) * 100))}%` }}
                  ></div>
                </div>

                <div className="points-scale-markers">
                  <span>0 pt (0%)</span>
                  <span>100 pts (-10%)</span>
                  <span>250 pts (-25%)</span>
                  <span>450 pts (-50%)</span>
                  <span>700 pts (-75%)</span>
                  <span>1000 pts (100% GRATUIT)</span>
                </div>
              </div>
            </div>

            {/* RÈGLES D'ACQUISITION DE POINTS */}
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
                  <span>Par trajet optimisé éco-mobilité</span>
                </div>
              </div>
            </div>
          </div>

          {/* SIMULATEUR DE PRIX AVEC RÉDUCTION */}
          <div className="subscription-simulator-card">
            <div className="simulator-header">
              <Tag size={22} color="#00875A" />
              <div>
                <h3>Simulateur de Réduction sur votre Abonnement CityFlow</h3>
                <p>Voyez immédiatement le prix réduit de votre abonnement en appliquant vos points de citoyenneté.</p>
              </div>
            </div>

            <div className="simulator-body">
              <div className="plans-selector-group">
                <label>Choisissez la formule à simuler :</label>
                <div className="plans-pills-grid">
                  {(plans.length > 0 ? plans : [
                    {
                      id: "plan_citizen_monthly",
                      category: "b2c",
                      name: "Pass Mensuel Citoyen Premium",
                      subtitle: "Pour simples citoyens & conducteurs",
                      priceFcfa: 2000,
                      period: "par mois",
                      target: "1 Utilisateur",
                    },
                    {
                      id: "plan_citizen_annual",
                      category: "b2c",
                      name: "Pass Annuel Citoyen (12 Mois)",
                      subtitle: "Mobilité illimitée avec 2 mois offerts",
                      priceFcfa: 20000,
                      period: "par an",
                      target: "1 Utilisateur",
                    },
                    {
                      id: "plan_enterprise_fleet",
                      category: "b2b",
                      name: "Pack Flotte Entreprise Pro (B2B)",
                      subtitle: "Pour entreprises & flottes jusqu'à 20 personnes",
                      priceFcfa: 50000,
                      period: "par mois",
                      target: "Jusqu'à 20 collaborateurs",
                    },
                  ]).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`plan-pill-btn ${selectedPlanId === p.id ? "selected" : ""}`}
                      onClick={() => setSelectedPlanId(p.id)}
                    >
                      <div className="plan-pill-info">
                        <div className="plan-pill-title-row">
                          <span className={`plan-category-badge ${p.category || "b2c"}`}>
                            {p.category === "b2b" ? "🏢 B2B Entreprise" : "👤 B2C Citoyen"}
                          </span>
                          <strong>{p.name}</strong>
                        </div>
                        <small className="plan-pill-subtitle">{p.subtitle || p.target}</small>
                      </div>
                      <div className="plan-pill-price">
                        <strong>{p.priceFcfa.toLocaleString()} FCFA</strong>
                        <small>{p.period}</small>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* RÉSULTAT DU CALCUL */}
              <div className="simulator-result-box">
                <div className="sim-stat">
                  <span>Prix standard :</span>
                  <strong className="strikethrough">{currentPlan.priceFcfa.toLocaleString()} FCFA</strong>
                </div>

                <div className="sim-stat highlight">
                  <span>Remise accordée ({simulatedDiscountPercent}%) :</span>
                  <strong className="savings-badge">-{simulatedSavings.toLocaleString()} FCFA</strong>
                </div>

                <div className="sim-divider"></div>

                <div className="sim-stat final-price">
                  <span>Votre Prix avec Points :</span>
                  <strong className="final-amount">
                    {simulatedFinalPrice === 0 ? "100% GRATUIT 🎉" : `${simulatedFinalPrice.toLocaleString()} FCFA`}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* PALIERS DE RÉDUCTION DÉBLOCABLES */}
          <div className="rewards-catalog-wrapper">
            <div className="catalog-header">
              <div>
                <h3>Paliers de Réduction Déblocables</h3>
                <p>Échangez vos points contre un coupon de réduction officiel applicable sur l'application.</p>
              </div>
            </div>

            <div className="discount-tiers-grid">
              {catalog.map((tier) => {
                const canAfford = userPoints >= tier.costPoints;
                const pointsMissing = tier.costPoints - userPoints;

                return (
                  <div key={tier.id} className={`discount-tier-card ${canAfford ? "unlocked" : "locked"}`}>
                    <div className="tier-badge-row">
                      <span className="tier-icon">{tier.icon}</span>
                      <span className="tier-rank-badge">{tier.badge}</span>
                      <span className="tier-percent-tag">-{tier.discountPercent}%</span>
                    </div>

                    <h4 className="tier-title">{tier.title}</h4>
                    <p className="tier-desc">{tier.description}</p>
                    
                    <div className="tier-savings-hint">
                      <Sparkles size={14} color="#00875A" />
                      <span>{tier.savingsEstimate}</span>
                    </div>

                    <div className="tier-bottom-action">
                      <div className="tier-cost">
                        <strong>{tier.costPoints}</strong>
                        <span>points requis</span>
                      </div>

                      <button
                        className={`btn-redeem-tier ${canAfford ? "active" : "disabled"}`}
                        disabled={!canAfford}
                        onClick={() => handleRedeem(tier.id)}
                      >
                        {canAfford ? (
                          <>
                            <Gift size={16} />
                            <span>Débloquer mon coupon</span>
                          </>
                        ) : (
                          <span>+{pointsMissing} pts restants</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* HISTORIQUE DES COUPONS ÉCHANGÉS */}
          {profile.redeemedRewards && profile.redeemedRewards.length > 0 && (
            <div className="redeemed-history-wrapper">
              <h3>🎟️ Mes Coupons de Réduction Débloqués</h3>
              <div className="coupons-grid">
                {profile.redeemedRewards.map((c) => (
                  <div key={c.id} className="coupon-card">
                    <div className="coupon-left">
                      <div className="coupon-icon-box">
                        <Percent size={22} />
                      </div>
                      <div>
                        <h4>{c.title}</h4>
                        <span className="coupon-date">
                          Débloqué le {new Date(c.redeemedAt).toLocaleDateString()} pour {c.costPoints} points
                        </span>
                      </div>
                    </div>

                    <div className="coupon-code-box">
                      <span className="coupon-label">Code réduction :</span>
                      <div className="coupon-code-display">
                        <span className="coupon-code-text">{c.code}</span>
                        <button
                          type="button"
                          className="copy-coupon-btn"
                          onClick={() => copyToClipboard(c.code)}
                          title="Copier le code"
                        >
                          {copiedCode === c.code ? <Check size={16} color="#15803d" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* MODAL : NOUVEAU SIGNALEMENT */}
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

              {/* Type d'incident */}
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

              {/* Sévérité */}
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

              {/* Titre */}
              <div className="form-group">
                <label>Titre bref du signalement *</label>
                <input
                  type="text"
                  placeholder="Ex: Camion arrêté en double file, circulation bloquée"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Localisation précise avec bouton GPS */}
              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ margin: 0 }}>Emplacement précis / Repères *</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!navigator.geolocation) {
                        alert("Géolocalisation non supportée");
                        return;
                      }
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const lat = parseFloat(pos.coords.latitude.toFixed(5));
                          const lng = parseFloat(pos.coords.longitude.toFixed(5));
                          setFormData((prev) => ({
                            ...prev,
                            position: [lat, lng],
                            locationDescription: prev.locationDescription || `Position GPS en direct [${lat}, ${lng}]`,
                          }));
                          showToast("📍 Position GPS capturée avec succès !");
                        },
                        () => showToast("Impossible d'obtenir la position GPS.")
                      );
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "#e8f5e9",
                      border: "1px solid #a7f3d0",
                      borderRadius: "6px",
                      padding: "3px 8px",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#00875A",
                      cursor: "pointer",
                    }}
                  >
                    <MapPin size={12} />
                    <span>Capturer ma position GPS</span>
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Ex: Rond-point Deido face station Total, voie gauche"
                  value={formData.locationDescription}
                  onChange={(e) => setFormData({ ...formData, locationDescription: e.target.value })}
                  required
                />
              </div>

              {/* Bonus Gamification Reminder */}
              <div className="gamification-prompt">
                <Sparkles size={16} className="text-yellow-500" />
                <span>Ce signalement attribuera <strong>+25 points de réputation</strong> à votre profil.</span>
              </div>

              {/* Submit Buttons */}
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

      {/* MODAL : RÉDUCTION D'ABONNEMENT DÉBLOQUÉE */}
      {unlockedReward && (
        <div className="modal-backdrop" onClick={() => setUnlockedReward(null)}>
          <div className="modal-card reward-success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-confetti">🎉</div>
            <h3>Félicitations !</h3>
            <p className="success-sub">Vous avez débloqué avec vos points :</p>
            <h2 className="success-reward-title">{unlockedReward.title}</h2>
            <p className="partner-name">Applicable immédiatement sur CityFlow Premium</p>

            <div className="generated-coupon-box">
              <span className="coupon-hint">Votre code promo exclusif :</span>
              <div className="coupon-modal-copy-row">
                <span className="coupon-code-big">{unlockedReward.code}</span>
                <button
                  type="button"
                  className="modal-copy-btn"
                  onClick={() => copyToClipboard(unlockedReward.code)}
                >
                  <Copy size={18} /> Copier
                </button>
              </div>
            </div>

            <button className="btn-submit w-full mt-4" onClick={() => setUnlockedReward(null)}>
              Enregistrer et Fermer
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
