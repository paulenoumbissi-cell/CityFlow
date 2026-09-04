import { broadcastNewReport, broadcastReportVote } from "../services/websocketServer.js";
import dbService from "../services/dbService.js";

// Contrôleur de signalement citoyen collaboratif & système de récompenses / gamification avec persistance

// Catalogue de récompenses partenaires
const REWARDS_CATALOG = [
  {
    id: "reward_parking_1h",
    title: "1 Heure de Stationnement Offerte",
    partner: "Vinci & Parkings Municipaux",
    category: "parking",
    costPoints: 150,
    icon: "🅿️",
    description: "Valable dans tous les parkings souterrains et en voirie partenaires.",
  },
  {
    id: "reward_bike_pass",
    title: "Pass 24h Vélo / Trottinette Libre-service",
    partner: "CityBike Express",
    category: "micromobility",
    costPoints: 200,
    icon: "🚲",
    description: "Trajets illimités de 30 min pendant 24h sur toute la flotte urbaine.",
  },
  {
    id: "reward_ev_charge",
    title: "Recharge Borne Électrique -20%",
    partner: "EcoCharge Cameroon",
    category: "energy",
    costPoints: 250,
    icon: "⚡",
    description: "Réduction immédiate sur votre prochaine session de recharge rapide.",
  },
  {
    id: "reward_coffee_break",
    title: "Café & Pause Détente Offerts",
    partner: "Station TotalEnergies / Café Urbain",
    category: "lifestyle",
    costPoints: 100,
    icon: "☕",
    description: "Un bon café chaud ou une boisson fraîche dans les stations partenaires.",
  },
  {
    id: "reward_plant_tree",
    title: "Planter un Arbre au Nom du Citoyen",
    partner: "Initiative Forêt Urbaine",
    category: "ecology",
    costPoints: 500,
    icon: "🌳",
    description: "Un arbre sera planté pour végétaliser les axes routiers majeurs.",
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

// 5. Obtenir le catalogue des récompenses
export const getRewardsCatalog = async (req, res) => {
  try {
    const profile = await dbService.getProfile();
    const userPoints = profile.reputationScore || profile.points || 320;
    res.json({
      count: REWARDS_CATALOG.length,
      catalog: REWARDS_CATALOG,
      userPoints,
    });
  } catch (err) {
    console.error("[getRewardsCatalog Error]", err);
    res.status(500).json({ error: "Erreur catalogue" });
  }
};

// 6. Échanger des points contre une récompense
export const redeemReward = async (req, res) => {
  try {
    const { rewardId } = req.body;
    const reward = REWARDS_CATALOG.find((r) => r.id === rewardId);

    if (!reward) {
      return res.status(404).json({ error: "Récompense introuvable dans le catalogue" });
    }

    const profile = await dbService.getProfile();
    let currentScore = profile.reputationScore || profile.points || 320;

    if (currentScore < reward.costPoints) {
      return res.status(400).json({
        error: "Points insuffisants",
        required: reward.costPoints,
        available: currentScore,
      });
    }

    currentScore -= reward.costPoints;
    profile.reputationScore = currentScore;
    profile.points = currentScore;
    profile.level = computeLevel(currentScore);

    const uniqueCode = `CITY-${reward.category.toUpperCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const redemption = {
      id: `red_${Date.now()}`,
      catalogId: reward.id,
      title: reward.title,
      partner: reward.partner,
      code: uniqueCode,
      costPoints: reward.costPoints,
      redeemedAt: new Date().toISOString(),
      status: "active",
    };

    if (!profile.redeemedRewards) profile.redeemedRewards = [];
    profile.redeemedRewards.unshift(redemption);

    await dbService.saveProfile(profile);

    res.json({
      success: true,
      message: `Félicitations ! Vous avez débloqué "${reward.title}".`,
      redemption,
      remainingPoints: currentScore,
      level: profile.level,
    });
  } catch (err) {
    console.error("[redeemReward Error]", err);
    res.status(500).json({ error: "Erreur échange récompense" });
  }
};
