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

  // Modal de récompense débloquée
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

  // Rédemption d'une récompense
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
        showToast(data.error || "Points insuffisants pour cette récompense.");
      }
    } catch (err) {
      showToast("Erreur lors de l'échange.");
    }
  };

  const filteredReports = reports.filter((r) => {
    if (filterCategory !== "all" && r.category !== filterCategory) return false;
    return true;
  });

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
            <span>Crowdsourcing Urbain & Mobilité Solidaire</span>
          </div>
          <h1>
            Communauté <span>CityFlow</span>
          </h1>
          <p>
            Signalez les aléas de la route en direct, entraidez les autres usagers et débloquez des récompenses éco-mobilité.
          </p>

          {/* Quick Stats Bar */}
          <div className="community-quick-stats">
            <div className="stat-pill">
              <span className="pill-number">{reports.length}</span>
              <span className="pill-label">Signalements actifs</span>
            </div>
            <div className="stat-pill">
              <span className="pill-number">{profile?.reputationScore || 0} pts</span>
              <span className="pill-label">Mes Points Citoyens</span>
            </div>
            <div className="stat-pill">
              <span className="pill-number">{profile?.level?.title || "Sentinelle"}</span>
              <span className="pill-label">Rang actuel</span>
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
            <Award size={18} />
            <span>Récompenses & Gamification</span>
            {profile && <span className="tab-badge">{profile.reputationScore} pts</span>}
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
                <span>Publier un signalement</span>
              </button>
            </div>
          ) : (
            <div className="reports-grid">
              {filteredReports.map((report) => {
                const cat = CATEGORY_CONFIG[report.category] || CATEGORY_CONFIG.accident;
                const sev = SEVERITY_CONFIG[report.severity] || SEVERITY_CONFIG.moderate;
                const CatIcon = cat.icon;

                return (
                  <div key={report.id} className="report-card">
                    {/* Header Card */}
                    <div className="report-card-header">
                      <div className="report-cat-badge" style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                        <CatIcon size={16} />
                        <span>{cat.label}</span>
                      </div>
                      <span className={`severity-badge ${sev.class}`}>{sev.label}</span>
                    </div>

                    {/* Title & Description */}
                    <h3 className="report-title">{report.title}</h3>
                    <div className="report-location">
                      <MapPin size={15} className="location-icon" />
                      <span>{report.locationDescription} • <strong>{report.city}</strong></span>
                    </div>

                    {/* Meta Bar */}
                    <div className="report-meta">
                      <div className="author-info">
                        <span className="author-name">Par {report.author}</span>
                        <span className="report-time">
                          <Clock size={12} />
                          {new Date(report.reportedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {report.isVerified && (
                        <div className="verified-badge">
                          <ShieldCheck size={14} />
                          <span>Vérifié par la communauté</span>
                        </div>
                      )}
                    </div>

                    {/* Actions & Votes */}
                    <div className="report-actions">
                      <button
                        className="btn-vote confirm"
                        onClick={() => handleVote(report.id, "confirm")}
                        title="Confirmer que l'incident est toujours présent (+5 pts)"
                      >
                        <ThumbsUp size={15} />
                        <span>Toujours présent ({report.confirmationsCount})</span>
                      </button>

                      <button
                        className="btn-vote resolve"
                        onClick={() => handleVote(report.id, "resolved")}
                        title="Signaler que la voie a été dégagée"
                      >
                        <CheckCircle size={15} />
                        <span>Résolu / Dégagé</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* CONTENU ONGLET 2 : RÉCOMPENSES & GAMIFICATION */}
      {activeTab === "rewards" && profile && (
        <section className="rewards-section">
          {/* User Gamification Card */}
          <div className="profile-gamification-card">
            <div className="profile-header-info">
              <div className="profile-badge-avatar">
                <span className="avatar-emoji">{profile.level?.badgeIcon || "🛡️"}</span>
              </div>
              <div className="profile-text">
                <div className="profile-level-tag">
                  Niveau {profile.level?.number} • {profile.level?.title}
                </div>
                <h2>{profile.userName}</h2>
                <p className="profile-sub">Contributeur actif de la communauté CityFlow</p>
              </div>
              <div className="profile-points-box">
                <span className="points-number">{profile.reputationScore}</span>
                <span className="points-label">Points Disponibles</span>
              </div>
            </div>

            {/* Level Progress */}
            <div className="level-progress-bar-container">
              <div className="progress-info">
                <span>Progression vers le niveau suivant</span>
                <span className="progress-percent">{profile.level?.progressPercentage}%</span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${profile.level?.progressPercentage}%` }}
                ></div>
              </div>
              <div className="progress-limits">
                <span>{profile.level?.minPoints} pts</span>
                <span>{profile.level?.maxPoints} pts</span>
              </div>
            </div>

            {/* Badges Shelf */}
            <div className="badges-shelf">
              <h3>🏆 Badges & Trophées Citoyens</h3>
              <div className="badges-grid">
                {profile.badges.map((badge) => {
                  const isUnlocked = !!badge.unlockedAt;
                  return (
                    <div
                      key={badge.id}
                      className={`badge-card ${isUnlocked ? "unlocked" : "locked"}`}
                    >
                      <span className="badge-card-icon">{badge.icon}</span>
                      <h4 className="badge-card-title">{badge.title}</h4>
                      <p className="badge-card-desc">{badge.description}</p>
                      <span className="badge-card-status">
                        {isUnlocked ? "✅ Débloqué" : "🔒 À débloquer"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Catalog of Rewards */}
          <div className="rewards-catalog-wrapper">
            <div className="catalog-header">
              <Gift size={22} className="catalog-icon" />
              <div>
                <h3>Catalogue des Avantages & Récompenses Partenaires</h3>
                <p>Échangez vos points d'éco-conduite et de signalement contre des services exclusifs.</p>
              </div>
            </div>

            <div className="rewards-grid">
              {catalog.map((item) => {
                const canAfford = profile.reputationScore >= item.costPoints;
                return (
                  <div key={item.id} className={`catalog-card ${canAfford ? "affordable" : "unaffordable"}`}>
                    <div className="catalog-card-icon">{item.icon}</div>
                    <div className="catalog-card-content">
                      <span className="catalog-partner">{item.partner}</span>
                      <h4 className="catalog-title">{item.title}</h4>
                      <p className="catalog-desc">{item.description}</p>
                      
                      <div className="catalog-bottom">
                        <span className="cost-tag">
                          <Sparkles size={14} />
                          {item.costPoints} points
                        </span>
                        <button
                          className={`btn-redeem ${canAfford ? "active" : "disabled"}`}
                          disabled={!canAfford}
                          onClick={() => handleRedeem(item.id)}
                        >
                          {canAfford ? "Échanger" : "Points manquants"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Redeemed coupons history */}
          {profile.redeemedRewards && profile.redeemedRewards.length > 0 && (
            <div className="redeemed-history-wrapper">
              <h3>🎟️ Mes Coupons & Avantages Échangés</h3>
              <div className="coupons-grid">
                {profile.redeemedRewards.map((c) => (
                  <div key={c.id} className="coupon-card">
                    <div className="coupon-left">
                      <Ticket size={24} />
                      <div>
                        <h4>{c.title}</h4>
                        <span className="coupon-date">Obtenu le {new Date(c.redeemedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="coupon-code-box">
                      <span className="coupon-label">Code avantage :</span>
                      <span className="coupon-code">{c.code}</span>
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

              {/* Localisation précise */}
              <div className="form-group">
                <label>Emplacement précis / Repères *</label>
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

      {/* MODAL : RÉCOMPENSE DÉBLOQUÉE */}
      {unlockedReward && (
        <div className="modal-backdrop" onClick={() => setUnlockedReward(null)}>
          <div className="modal-card reward-success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-confetti">🎉</div>
            <h3>Félicitations !</h3>
            <p className="success-sub">Vous avez échangé vos points contre :</p>
            <h2 className="success-reward-title">{unlockedReward.title}</h2>
            <p className="partner-name">Offert par {unlockedReward.partner}</p>

            <div className="generated-coupon-box">
              <span className="coupon-hint">Présentez ce code lors de votre passage :</span>
              <span className="coupon-code-big">{unlockedReward.code}</span>
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
