import { broadcastNewReport, broadcastReportVote } from "../services/websocketServer.js";
import dbService from "../services/dbService.js";

// ==========================================================================
// 1. LES ABONNEMENTS PREMIUM (Barème Définitif)
// ==========================================================================
export const SUBSCRIPTION_PLANS = [
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
      "Support prioritaire dédié 24/7",
    ],
  },
];

// ==========================================================================
// 2. LE BARÈME DÉFINITIF DES RÉDUCTIONS
// ==========================================================================
export const DISCOUNT_REWARDS = [
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

// ==========================================================================
// 3. BARÈME DES POINTS PAR TYPE D'INCIDENT (Attribués après confirmation)
// ==========================================================================
export const REPORT_POINTS_CONFIG = {
  trafficBlock: { points: 10, label: "Embouteillage", icon: "🚗" },
  accident: { points: 15, label: "Accident de circulation", icon: "🚨" },
  trafficLight: { points: 20, label: "Feu de circulation en panne", icon: "🚦" },
  roadworks: { points: 15, label: "Route bloquée / Travaux", icon: "🛣️" },
  hazard: { points: 15, label: "Obstacle ou nid de poule", icon: "⚠️" },
  breakdown: { points: 15, label: "Véhicule en panne", icon: "🔧" },
  flooding: { points: 15, label: "Inondation de chaussée", icon: "💧" },
};

// ==========================================================================
// 4. SYSTÈME DE CONFIANCE (Score sur 100)
// ==========================================================================
export function getTrustLevel(score) {
  const s = Math.max(0, Math.min(100, score ?? 75));
  if (s >= 81) {
    return { score: s, level: "Très fiable", icon: "⭐", color: "#00875A", badgeClass: "trust-star", description: "Utilisateur très fiable" };
  } else if (s >= 61) {
    return { score: s, level: "Fiable", icon: "🟢", color: "#10B981", badgeClass: "trust-good", description: "Utilisateur généralement fiable" };
  } else if (s >= 31) {
    return { score: s, level: "À confirmer", icon: "🟠", color: "#F59E0B", badgeClass: "trust-check", description: "Signalements nécessitant des vérifications" };
  } else {
    return { score: s, level: "Faible", icon: "🔴", color: "#EF4444", badgeClass: "trust-low", description: "Signalements peu fiables" };
  }
}

// 1. Obtenir les signalements citoyens
export const getCitizenReports = async (req, res) => {
  try {
    const { city, status, category } = req.query;
    let reports = await dbService.getReports();

    if (city && city !== "all") {
      reports = reports.filter(
        (r) => r.city.toLowerCase() === city.toLowerCase()
      );
    }

    if (status) {
      reports = reports.filter((r) => r.status === status);
    } else {
      reports = reports.filter((r) => r.status === "active");
    }

    if (category && category !== "all") {
      reports = reports.filter((r) => r.category === category);
    }

    reports.sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));

    res.json({
      count: reports.length,
      timestamp: new Date().toISOString(),
      reports,
    });
  } catch (err) {
    console.error("[getCitizenReports Error]", err);
    res.status(500).json({ error: "Erreur lors de la récupération des signalements" });
  }
};

// 2. Créer un nouveau signalement (Règle : 0 point immédiat tant que non confirmé)
export const createCitizenReport = async (req, res) => {
  try {
    const {
      title,
      city,
      locationDescription,
      position,
      severity,
      category,
      author,
      authorId = "user_current",
    } = req.body;

    if (!title || !city || !locationDescription) {
      return res.status(400).json({ error: "Champs obligatoires manquants" });
    }

    const reports = await dbService.getReports();
    const profile = await dbService.getProfile();

    const catKey = category || "accident";
    const expectedPoints = REPORT_POINTS_CONFIG[catKey]?.points || 15;

    const newReport = {
      id: `rep_${Date.now()}`,
      author: author || profile.userName || "Citoyen CityFlow",
      authorId,
      city: city || "Yaoundé",
      category: catKey,
      title,
      locationDescription,
      position: position || (city.toLowerCase().includes("douala") ? [4.0511, 9.7679] : [3.848, 11.5021]),
      severity: severity || "moderate",
      reportedAt: new Date().toISOString(),
      confirmationsCount: 0, // En attente de confirmation
      resolutionsCount: 0,
      isVerified: false,
      status: "active",
      upvotedBy: [],
      downvotedBy: [],
      pointsAwardedToAuthor: false,
      expectedPoints,
    };

    reports.unshift(newReport);
    await dbService.saveReports(reports);

    // Mettre à jour le compteur de signalements de l'auteur sans créditer de points tant qu'il n'y a pas eu confirmation
    profile.reportsCount = (profile.reportsCount || 0) + 1;
    await dbService.saveProfile(profile);

    // Diffusion push WebSockets
    broadcastNewReport(newReport);

    res.status(201).json({
      success: true,
      message: `Signalement publié ! Les +${expectedPoints} points seront crédités dès confirmation par un autre citoyen.`,
      report: newReport,
      profile: {
        points: profile.points || profile.reputationScore || 0,
        trust: getTrustLevel(profile.trustScore),
      },
    });
  } catch (err) {
    console.error("[createCitizenReport Error]", err);
    res.status(500).json({ error: "Erreur lors de l'enregistrement du signalement" });
  }
};

// 3. Confirmer ou Résoudre un signalement
export const voteCitizenReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, userId = "user_current" } = req.body;

    const reports = await dbService.getReports();
    const reportIndex = reports.findIndex((r) => r.id === id);

    if (reportIndex === -1) {
      return res.status(404).json({ error: "Signalement non trouvé" });
    }

    const report = reports[reportIndex];
    const profile = await dbService.getProfile();

    let feedbackMsg = "";
    let pointsEarned = 0;

    if (type === "confirm") {
      // Règle anti-abus 1 : Un utilisateur ne peut pas confirmer son propre signalement
      if (report.authorId === userId) {
        return res.status(400).json({ error: "Vous ne pouvez pas confirmer votre propre signalement." });
      }

      // Règle anti-abus 2 : Une seule confirmation par utilisateur
      if (report.upvotedBy.includes(userId)) {
        return res.status(400).json({ error: "Vous avez déjà confirmé ce signalement." });
      }

      report.upvotedBy.push(userId);
      report.confirmationsCount += 1;

      // Attribution de +5 points au votant qui confirme
      const voterPoints = (profile.points || profile.reputationScore || 0) + 5;
      profile.points = voterPoints;
      profile.reputationScore = voterPoints;
      profile.confirmationsGiven = (profile.confirmationsGiven || 0) + 1;
      pointsEarned = 5;
      feedbackMsg = "👍 Confirmation enregistrée (+5 points attribués) !";

      // Le votant augmente son score de confiance (+1 pt)
      profile.trustScore = Math.min(100, (profile.trustScore ?? 75) + 1);

      // Si c'est la 1ère confirmation et que l'auteur n'a pas encore reçu ses points :
      if (!report.pointsAwardedToAuthor && report.confirmationsCount >= 1) {
        report.pointsAwardedToAuthor = true;
        report.isVerified = true;

        // Si l'auteur est l'utilisateur courant, on lui crédite ses points (+10, +15 ou +20)
        if (report.authorId === profile.userId) {
          const authorBonus = report.expectedPoints || 15;
          profile.points = (profile.points || 0) + authorBonus;
          profile.reputationScore = profile.points;
          profile.confirmedReportsCount = (profile.confirmedReportsCount || 0) + 1;
          profile.trustScore = Math.min(100, (profile.trustScore ?? 75) + 3);
        }
      }
    } else if (type === "resolved") {
      // Règle : Mettre à jour un signalement en indiquant que l'incident est terminé (+5 points)
      if (!report.downvotedBy.includes(userId)) {
        report.downvotedBy.push(userId);
        report.resolutionsCount += 1;

        if (report.resolutionsCount >= 1) {
          report.status = "resolved";
        }

        const voterPoints = (profile.points || profile.reputationScore || 0) + 5;
        profile.points = voterPoints;
        profile.reputationScore = voterPoints;
        profile.resolvedReportsCount = (profile.resolvedReportsCount || 0) + 1;
        pointsEarned = 5;
        feedbackMsg = "🔄 Signalement mis à jour : Voie dégagée (+5 points attribués) !";
      }
    }

    reports[reportIndex] = report;
    await dbService.saveReports(reports);
    await dbService.saveProfile(profile);

    // Diffusion push du vote
    broadcastReportVote(report);

    res.json({
      success: true,
      message: feedbackMsg,
      pointsEarned,
      report,
      profileUpdate: {
        points: profile.points,
        trustScore: profile.trustScore,
        trust: getTrustLevel(profile.trustScore),
      },
    });
  } catch (err) {
    console.error("[voteCitizenReport Error]", err);
    res.status(500).json({ error: "Erreur lors du vote" });
  }
};

// 4. Obtenir le profil citoyen, solde de points et score de confiance
export const getCitizenProfile = async (req, res) => {
  try {
    const profile = await dbService.getProfile();
    const userPoints = profile.points ?? profile.reputationScore ?? 380;
    const trustScore = profile.trustScore ?? 85;

    res.json({
      ...profile,
      points: userPoints,
      trustScore,
      trust: getTrustLevel(trustScore),
    });
  } catch (err) {
    console.error("[getCitizenProfile Error]", err);
    res.status(500).json({ error: "Erreur profil citoyen" });
  }
};

// 5. Obtenir les offres, le barème des réductions et le solde de points
export const getRewardsCatalog = async (req, res) => {
  try {
    const profile = await dbService.getProfile();
    const userPoints = profile.points ?? profile.reputationScore ?? 380;
    const trustScore = profile.trustScore ?? 85;

    res.json({
      plans: SUBSCRIPTION_PLANS,
      rewards: DISCOUNT_REWARDS,
      userPoints,
      trust: getTrustLevel(trustScore),
    });
  } catch (err) {
    console.error("[getRewardsCatalog Error]", err);
    res.status(500).json({ error: "Erreur catalogue abonnements" });
  }
};

// 6. Souscription avec application d'une récompense & déduction des points du solde
export const subscribeWithDiscount = async (req, res) => {
  try {
    const { planId, rewardTierId, paymentMethod, phoneNumber } = req.body;
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[0];

    const profile = await dbService.getProfile();
    let currentPoints = profile.points ?? profile.reputationScore ?? 380;

    let discountPercent = 0;
    let pointsDeducted = 0;
    let isFreeMonth = false;
    let rewardAppliedLabel = "Plein Tarif (Aucun point utilisé)";

    if (rewardTierId) {
      const rewardTier = DISCOUNT_REWARDS.find((r) => r.id === rewardTierId);
      if (!rewardTier) {
        return res.status(404).json({ error: "Palier de réduction introuvable." });
      }

      if (currentPoints < rewardTier.pointsRequired) {
        return res.status(400).json({
          error: `Points insuffisants. Vous disposez de ${currentPoints} points, mais ${rewardTier.pointsRequired} points sont requis pour ${rewardTier.label}.`,
        });
      }

      discountPercent = rewardTier.discountPercent;
      pointsDeducted = rewardTier.pointsRequired;
      isFreeMonth = rewardTier.isFreeMonth;
      rewardAppliedLabel = rewardTier.label;

      // Déduction des points du solde
      currentPoints -= pointsDeducted;
      profile.points = currentPoints;
      profile.reputationScore = currentPoints;
    }

    const discountAmount = Math.round((plan.priceFcfa * discountPercent) / 100);
    const finalPrice = Math.max(0, plan.priceFcfa - discountAmount);

    const subscription = {
      id: `sub_${Date.now()}`,
      planId: plan.id,
      planName: plan.name,
      category: plan.category,
      basePrice: plan.priceFcfa,
      beneficiaries: plan.beneficiaries,
      discountPercent,
      discountAmount,
      pointsDeducted,
      finalPrice,
      isFreeMonth,
      rewardApplied: rewardAppliedLabel,
      paymentMethod: paymentMethod || "MTN Mobile Money",
      phoneNumber: phoneNumber || "670000000",
      status: "active",
      subscribedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    if (!profile.subscriptions) profile.subscriptions = [];
    profile.subscriptions.unshift(subscription);
    await dbService.saveProfile(profile);

    const successMsg = isFreeMonth
      ? `🎉 Félicitations ! Votre mois gratuit pour "${plan.name}" (${plan.beneficiaries}) a été activé avec succès (-${pointsDeducted} pts déduits du solde).`
      : `🎉 Souscription réussie à "${plan.name}" (${plan.beneficiaries}) ! Montant réglé : ${finalPrice.toLocaleString()} FCFA (${discountPercent}% de réduction, -${pointsDeducted} pts déduits).`;

    res.json({
      success: true,
      message: successMsg,
      subscription,
      remainingPoints: currentPoints,
      trust: getTrustLevel(profile.trustScore),
    });
  } catch (err) {
    console.error("[subscribeWithDiscount Error]", err);
    res.status(500).json({ error: "Erreur lors de la souscription" });
  }
};

