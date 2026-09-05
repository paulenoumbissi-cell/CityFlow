import { broadcastNewReport, broadcastReportVote } from "../services/websocketServer.js";
import dbService from "../services/dbService.js";

// Contrôleur de signalement citoyen collaboratif & système de récompenses / gamification avec persistance

// Formules d'abonnement CityFlow (Citoyens Particuliers & Entreprises B2B)
export const SUBSCRIPTION_PLANS = [
  {
    id: "plan_citizen_monthly",
    category: "b2c",
    name: "Pass Mensuel Citoyen Premium",
    subtitle: "Pour simples citoyens & conducteurs particuliers",
    priceFcfa: 2000,
    period: "par mois",
    target: "1 Utilisateur",
    features: [
      "Guidage vocal intelligent sans coupure",
      "Alertes d'anticipation météo & bouchons +1h",
      "Calcul multi-destinations & éco-trajets illimités",
      "Statut prioritaire de signalement certifié",
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
    features: [
      "Tous les avantages Premium en illimité",
      "Économie de 4 000 FCFA sur l'année",
      "Badge Citoyen d'Or & Priorité support",
    ],
  },
  {
    id: "plan_enterprise_fleet",
    category: "b2b",
    name: "Pack Flotte Entreprise Pro (B2B)",
    subtitle: "Pour entreprises, livreurs & flottes de véhicules",
    priceFcfa: 50000,
    period: "par mois",
    target: "Jusqu'à 20 collaborateurs inclus",
    features: [
      "Comptes Premium inclus pour jusqu'à 20 chauffeurs / employés",
      "Tableau de bord supervision de flotte en temps réel (Yaoundé & Douala)",
      "Optimisation automatique des tournées de livraison",
      "Rapports mensuels d'économies de carburant & CO₂",
      "Support technique dédié & gestionnaire de compte",
    ],
  },
];

// Catalogue des Réductions d'Abonnement déblocables par Points Citoyens
export const REWARDS_CATALOG = [
  {
    id: "discount_10",
    title: "Réduction 10% sur l'Abonnement",
    discountPercent: 10,
    costPoints: 100,
    badge: "🌱 Débutant",
    icon: "🥉",
    description: "Bénéficiez de 10% de remise immédiate sur votre prochain abonnement CityFlow.",
    savingsEstimate: "200 à 5 000 FCFA d'économie",
  },
  {
    id: "discount_25",
    title: "Réduction 25% sur l'Abonnement",
    discountPercent: 25,
    costPoints: 250,
    badge: "🛡️ Sentinelle",
    icon: "🥈",
    description: "25% de remise sur toute formule d'abonnement grâce à votre participation active.",
    savingsEstimate: "500 à 12 500 FCFA d'économie",
  },
  {
    id: "discount_50",
    title: "Demi-Tarif — 50% sur l'Abonnement",
    discountPercent: 50,
    costPoints: 450,
    badge: "🗺️ Guide Urbain",
    icon: "🥇",
    description: "Ne payez que la moitié de votre abonnement CityFlow pour vos signalements réguliers.",
    savingsEstimate: "1 000 à 25 000 FCFA d'économie",
  },
  {
    id: "discount_75",
    title: "Super Réduction 75% sur l'Abonnement",
    discountPercent: 75,
    costPoints: 700,
    badge: "💎 Pilier de la Cité",
    icon: "⭐",
    description: "75% de réduction exclusive sur votre abonnement pour votre fidélité exemplaire.",
    savingsEstimate: "1 500 à 37 500 FCFA d'économie",
  },
  {
    id: "discount_100",
    title: "100% GRATUIT — 1 Mois Citoyen Offert",
    discountPercent: 100,
    costPoints: 1000,
    badge: "👑 Héros de la Mobilité",
    icon: "🏆",
    description: "Votre abonnement Citoyen 100% gratuit, totalement financé par vos points de citoyenneté !",
    savingsEstimate: "2 000 FCFA offerts",
  },
];

// Helper pour calculer le niveau
function computeLevel(points) {
  if (points >= 701) {
    return {
      number: 4,
      title: "Héros de la Mobilité",
      badgeIcon: "👑",
      minPoints: 701,
      maxPoints: 1500,
      progressPercentage: Math.min(100, Math.round(((points - 701) / 799) * 100)),
    };
  } else if (points >= 301) {
    return {
      number: 3,
      title: "Guide de la Cité",
      badgeIcon: "🗺️",
      minPoints: 301,
      maxPoints: 700,
      progressPercentage: Math.min(100, Math.round(((points - 301) / 399) * 100)),
    };
  } else if (points >= 101) {
    return {
      number: 2,
      title: "Sentinelle Urbaine",
      badgeIcon: "🛡️",
      minPoints: 101,
      maxPoints: 300,
      progressPercentage: Math.min(100, Math.round(((points - 101) / 199) * 100)),
    };
  } else {
    return {
      number: 1,
      title: "Éclaireur Débutant",
      badgeIcon: "🌱",
      minPoints: 0,
      maxPoints: 100,
      progressPercentage: Math.min(100, Math.round((points / 100) * 100)),
    };
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

// 2. Créer un nouveau signalement (persistant + push WS)
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
    } = req.body;

    if (!title || !city || !locationDescription) {
      return res.status(400).json({ error: "Champs obligatoires manquants" });
    }

    const reports = await dbService.getReports();
    const profile = await dbService.getProfile();

    const newReport = {
      id: `rep_${Date.now()}`,
      author: author || profile.userName || "Citoyen CityFlow",
      city: city || "Yaoundé",
      category: category || "accident",
      title,
      locationDescription,
      position: position || (city.toLowerCase().includes("douala") ? [4.0511, 9.7679] : [3.848, 11.5021]),
      severity: severity || "moderate",
      reportedAt: new Date().toISOString(),
      confirmationsCount: 1,
      resolutionsCount: 0,
      isVerified: false,
      status: "active",
      upvotedBy: ["user_current"],
      downvotedBy: [],
    };

    reports.unshift(newReport);
    await dbService.saveReports(reports);

    // Gamification : +25 points pour l'auteur
    const currentScore = (profile.reputationScore || profile.points || 320) + 25;
    profile.reputationScore = currentScore;
    profile.points = currentScore;
    profile.reportsCount = (profile.reportsCount || 0) + 1;
    profile.level = computeLevel(currentScore);

    if (category === "accident" && profile.badges) {
      const angelBadge = profile.badges.find((b) => b.id === "guardian_angel");
      if (angelBadge && !angelBadge.unlockedAt) {
        angelBadge.unlockedAt = new Date().toISOString();
      }
    }

    if (currentScore >= 700 && profile.badges) {
      const heroBadge = profile.badges.find((b) => b.id === "hero_50" || b.id === "city_hero");
      if (heroBadge && !heroBadge.unlockedAt) {
        heroBadge.unlockedAt = new Date().toISOString();
      }
    }

    await dbService.saveProfile(profile);

    // Diffusion push en direct via WebSockets
    broadcastNewReport(newReport);

    res.status(201).json({
      success: true,
      message: "Signalement citoyen enregistré avec succès (+25 points attribués) !",
      report: newReport,
      profileUpdate: {
        points: profile.reputationScore,
        level: profile.level,
      },
    });
  } catch (err) {
    console.error("[createCitizenReport Error]", err);
    res.status(500).json({ error: "Erreur lors de l'enregistrement du signalement" });
  }
};

// 3. Voter sur un signalement
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

    if (type === "confirm") {
      if (!report.upvotedBy.includes(userId)) {
        report.upvotedBy.push(userId);
        report.confirmationsCount += 1;

        const currentScore = (profile.reputationScore || profile.points || 320) + 5;
        profile.reputationScore = currentScore;
        profile.points = currentScore;
        profile.confirmationsGiven = (profile.confirmationsGiven || 0) + 1;
        profile.level = computeLevel(currentScore);

        if (report.confirmationsCount >= 3) {
          report.isVerified = true;
        }
      }
    } else if (type === "resolved") {
      if (!report.downvotedBy.includes(userId)) {
        report.downvotedBy.push(userId);
        report.resolutionsCount += 1;

        if (report.resolutionsCount >= 2) {
          report.status = "resolved";
        }

        const currentScore = (profile.reputationScore || profile.points || 320) + 5;
        profile.reputationScore = currentScore;
        profile.points = currentScore;
        profile.level = computeLevel(currentScore);
      }
    }

    reports[reportIndex] = report;
    await dbService.saveReports(reports);
    await dbService.saveProfile(profile);

    // Diffusion push de la mise à jour du vote
    broadcastReportVote(report);

    res.json({
      success: true,
      message: type === "confirm" ? "Confirmation enregistrée (+5 points) !" : "Signalement de résolution enregistré !",
      report,
      profileUpdate: {
        points: profile.reputationScore,
        level: profile.level,
      },
    });
  } catch (err) {
    console.error("[voteCitizenReport Error]", err);
    res.status(500).json({ error: "Erreur lors du vote" });
  }
};

// 4. Obtenir le profil citoyen et les points
export const getCitizenProfile = async (req, res) => {
  try {
    const profile = await dbService.getProfile();
    const currentScore = profile.reputationScore || profile.points || 320;
    profile.level = computeLevel(currentScore);
    res.json(profile);
  } catch (err) {
    console.error("[getCitizenProfile Error]", err);
    res.status(500).json({ error: "Erreur profil" });
  }
};

// 5. Obtenir les formules d'abonnement et la réduction directe calculée
export const getRewardsCatalog = async (req, res) => {
  try {
    const profile = await dbService.getProfile();
    const userPoints = profile.reputationScore || profile.points || 320;
    // Réduction directe continue : 1 point = 0.1% de réduction (max 100% à 1 000 points)
    const directDiscountPercent = Math.min(100, Math.round((userPoints / 1000) * 100));

    res.json({
      plans: SUBSCRIPTION_PLANS,
      userPoints,
      directDiscountPercent,
    });
  } catch (err) {
    console.error("[getRewardsCatalog Error]", err);
    res.status(500).json({ error: "Erreur catalogue abonnements" });
  }
};

// 6. Souscription directe avec réduction citoyenne
export const subscribeWithDiscount = async (req, res) => {
  try {
    const { planId, paymentMethod } = req.body;
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[0];

    const profile = await dbService.getProfile();
    const userPoints = profile.reputationScore || profile.points || 320;
    const discountPercent = Math.min(100, Math.round((userPoints / 1000) * 100));
    const discountAmount = Math.round((plan.priceFcfa * discountPercent) / 100);
    const finalPrice = Math.max(0, plan.priceFcfa - discountAmount);

    const subscription = {
      id: `sub_${Date.now()}`,
      planId: plan.id,
      planName: plan.name,
      category: plan.category,
      basePrice: plan.priceFcfa,
      discountPercent,
      discountAmount,
      finalPrice,
      paymentMethod: paymentMethod || "MTN Mobile Money",
      status: "active",
      subscribedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    if (!profile.subscriptions) profile.subscriptions = [];
    profile.subscriptions.unshift(subscription);
    await dbService.saveProfile(profile);

    res.json({
      success: true,
      message: `Souscription réussie à "${plan.name}" ! Prix réglé : ${finalPrice.toLocaleString()} FCFA (${discountPercent}% de réduction citoyenne appliquée).`,
      subscription,
    });
  } catch (err) {
    console.error("[subscribeWithDiscount Error]", err);
    res.status(500).json({ error: "Erreur lors de la souscription" });
  }
};

