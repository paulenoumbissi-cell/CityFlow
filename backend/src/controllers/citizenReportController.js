import { broadcastNewReport, broadcastReportVote } from "../services/websocketServer.js";

// Contrôleur de signalement citoyen collaboratif & système de récompenses / gamification

// Base de données en mémoire des signalements citoyens
let citizenReports = [
  {
    id: "rep_yde_01",
    author: "Marc T.",
    city: "Yaoundé",
    category: "accident", // accident, breakdown, roadworks, trafficBlock, hazard, flooding
    title: "Collision légère entre 2 taxis",
    locationDescription: "Carrefour Nlongkak, voie droite vers Bastos",
    position: [3.8825, 11.5175],
    severity: "high", // low, moderate, high, critical
    reportedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    confirmationsCount: 4,
    resolutionsCount: 0,
    isVerified: true,
    status: "active", // active, resolved
    upvotedBy: ["user_demo_1", "user_demo_2"],
    downvotedBy: [],
  },
  {
    id: "rep_yde_02",
    author: "Sophie M.",
    city: "Yaoundé",
    category: "roadworks",
    title: "Nid de poule béant en cours de comblement",
    locationDescription: "Avenue Kennedy face pharmacie",
    position: [3.8680, 11.5210],
    severity: "moderate",
    reportedAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    confirmationsCount: 2,
    resolutionsCount: 0,
    isVerified: false,
    status: "active",
    upvotedBy: ["user_demo_3"],
    downvotedBy: [],
  },
  {
    id: "rep_dla_01",
    author: "Christian B.",
    city: "Douala",
    category: "breakdown",
    title: "Camion conteneur arrêté sur la voie",
    locationDescription: "Rond-point Deido, sortie vers Pont Wouri",
    position: [4.0620, 9.7120],
    severity: "critical",
    reportedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    confirmationsCount: 6,
    resolutionsCount: 0,
    isVerified: true,
    status: "active",
    upvotedBy: ["user_demo_4", "user_demo_5", "user_demo_6"],
    downvotedBy: [],
  },
  {
    id: "rep_dla_02",
    author: "Pauline E.",
    city: "Douala",
    category: "trafficBlock",
    title: "Embouteillage monstre - feux tricolores éteints",
    locationDescription: "Carrefour Ndokoti vers Zone Industrielle",
    position: [4.0450, 9.7420],
    severity: "high",
    reportedAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    confirmationsCount: 5,
    resolutionsCount: 0,
    isVerified: true,
    status: "active",
    upvotedBy: ["user_demo_7"],
    downvotedBy: [],
  },
];

// Profil citoyen de démonstration (gamification)
let citizenProfile = {
  userId: "user_current",
  userName: "Paul Enoumbissi",
  reputationScore: 320,
  reportsCount: 8,
  confirmationsGiven: 14,
  level: {
    number: 3,
    title: "Guide de la Cité",
    badgeIcon: "🗺️",
    minPoints: 301,
    maxPoints: 700,
    progressPercentage: 55, // (320-301)/(700-301)
  },
  badges: [
    {
      id: "first_report",
      title: "Première Sentinelle",
      description: "A soumis son premier signalement citoyen",
      icon: "🛡️",
      unlockedAt: "2026-08-15T10:00:00.000Z",
    },
    {
      id: "verified_scout",
      title: "Vérificateur Hors Pair",
      description: "A validé plus de 10 incidents communautaires",
      icon: "🔍",
      unlockedAt: "2026-08-28T14:30:00.000Z",
    },
    {
      id: "eco_driver",
      title: "Éco-Citoyen",
      description: "A permis d'éviter 50kg d'émissions CO2 par le guidage",
      icon: "🌱",
      unlockedAt: "2026-09-01T09:15:00.000Z",
    },
    {
      id: "guardian_angel",
      title: "Ange Gardien",
      description: "Signalement d'accident ayant accéléré l'arrivée des secours",
      icon: "🚑",
      unlockedAt: null, // À débloquer
    },
    {
      id: "city_hero",
      title: "Héros de la Mobilité",
      description: "Atteindre 700+ points de réputation citoyenne",
      icon: "👑",
      unlockedAt: null, // À débloquer
    },
  ],
  redeemedRewards: [
    {
      id: "red_01",
      catalogId: "reward_parking_1h",
      title: "1 Heure de Parking Gratuit",
      code: "CITY-PARK-8429",
      redeemedAt: "2026-08-20T16:00:00.000Z",
      status: "used",
    },
  ],
};

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
export const getCitizenReports = (req, res) => {
  const { city, status, category } = req.query;

  let filtered = citizenReports;

  if (city && city !== "all") {
    filtered = filtered.filter(
      (r) => r.city.toLowerCase() === city.toLowerCase()
    );
  }

  if (status) {
    filtered = filtered.filter((r) => r.status === status);
  } else {
    // Par défaut, retourner les signalements actifs
    filtered = filtered.filter((r) => r.status === "active");
  }

  if (category && category !== "all") {
    filtered = filtered.filter((r) => r.category === category);
  }

  // Tri par date décroissante
  filtered.sort((a, b) => new Date(b.reportedAt) - new Date(a.reportedAt));

  res.json({
    count: filtered.length,
    timestamp: new Date().toISOString(),
    reports: filtered,
  });
};

// 2. Créer un nouveau signalement
export const createCitizenReport = (req, res) => {
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

  const newReport = {
    id: `rep_${Date.now()}`,
    author: author || citizenProfile.userName,
    city: city || "Yaoundé",
    category: category || "accident",
    title,
    locationDescription,
    position: position || (city.toLowerCase().includes("douala") ? [4.0511, 9.7679] : [3.8480, 11.5021]),
    severity: severity || "moderate",
    reportedAt: new Date().toISOString(),
    confirmationsCount: 1,
    resolutionsCount: 0,
    isVerified: false,
    status: "active",
    upvotedBy: ["user_current"],
    downvotedBy: [],
  };

  citizenReports.unshift(newReport);

  // Gamification : +25 points pour l'auteur
  citizenProfile.reputationScore += 25;
  citizenProfile.reportsCount += 1;
  citizenProfile.level = computeLevel(citizenProfile.reputationScore);

  // Vérifier déblocage du badge "Ange Gardien" si accident
  if (category === "accident") {
    const angelBadge = citizenProfile.badges.find((b) => b.id === "guardian_angel");
    if (angelBadge && !angelBadge.unlockedAt) {
      angelBadge.unlockedAt = new Date().toISOString();
    }
  }

  // Vérifier déblocage du badge "Héros de la Mobilité"
  if (citizenProfile.reputationScore >= 700) {
    const heroBadge = citizenProfile.badges.find((b) => b.id === "city_hero");
    if (heroBadge && !heroBadge.unlockedAt) {
      heroBadge.unlockedAt = new Date().toISOString();
    }
  }

  // Diffusion push en direct via WebSockets
  broadcastNewReport(newReport);

  res.status(201).json({
    success: true,
    message: "Signalement citoyen enregistré avec succès (+25 points attribués) !",
    report: newReport,
    profileUpdate: {
      points: citizenProfile.reputationScore,
      level: citizenProfile.level,
    },
  });
};

// 3. Voter sur un signalement (confirmer ou déclarer résolu)
export const voteCitizenReport = (req, res) => {
  const { id } = req.params;
  const { type, userId = "user_current" } = req.body; // type: "confirm" ou "resolved"

  const report = citizenReports.find((r) => r.id === id);
  if (!report) {
    return res.status(404).json({ error: "Signalement non trouvé" });
  }

  if (type === "confirm") {
    if (!report.upvotedBy.includes(userId)) {
      report.upvotedBy.push(userId);
      report.confirmationsCount += 1;

      // Attribution de 5 points à l'utilisateur qui confirme
      citizenProfile.reputationScore += 5;
      citizenProfile.confirmationsGiven += 1;
      citizenProfile.level = computeLevel(citizenProfile.reputationScore);

      // Si au moins 3 confirmations -> certifié vérifié
      if (report.confirmationsCount >= 3) {
        report.isVerified = true;
      }
    }
  } else if (type === "resolved") {
    if (!report.downvotedBy.includes(userId)) {
      report.downvotedBy.push(userId);
      report.resolutionsCount += 1;

      // Si au moins 2 votes de résolution -> archivé
      if (report.resolutionsCount >= 2) {
        report.status = "resolved";
      }

      citizenProfile.reputationScore += 5;
      citizenProfile.level = computeLevel(citizenProfile.reputationScore);
    }
  }

  // Diffusion push de la mise à jour du vote
  broadcastReportVote(report);

  res.json({
    success: true,
    message: type === "confirm" ? "Confirmation enregistrée (+5 points) !" : "Signalement de résolution enregistré !",
    report,
    profileUpdate: {
      points: citizenProfile.reputationScore,
      level: citizenProfile.level,
    },
  });
};

// 4. Obtenir le profil citoyen et les points
export const getCitizenProfile = (req, res) => {
  citizenProfile.level = computeLevel(citizenProfile.reputationScore);
  res.json(citizenProfile);
};

// 5. Obtenir le catalogue des récompenses
export const getRewardsCatalog = (req, res) => {
  res.json({
    count: REWARDS_CATALOG.length,
    catalog: REWARDS_CATALOG,
    userPoints: citizenProfile.reputationScore,
  });
};

// 6. Échanger des points contre une récompense
export const redeemReward = (req, res) => {
  const { rewardId } = req.body;
  const reward = REWARDS_CATALOG.find((r) => r.id === rewardId);

  if (!reward) {
    return res.status(404).json({ error: "Récompense introuvable dans le catalogue" });
  }

  if (citizenProfile.reputationScore < reward.costPoints) {
    return res.status(400).json({
      error: "Points insuffisants",
      required: reward.costPoints,
      available: citizenProfile.reputationScore,
    });
  }

  // Déduire les points
  citizenProfile.reputationScore -= reward.costPoints;
  citizenProfile.level = computeLevel(citizenProfile.reputationScore);

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

  citizenProfile.redeemedRewards.unshift(redemption);

  res.json({
    success: true,
    message: `Félicitations ! Vous avez débloqué "${reward.title}".`,
    redemption,
    remainingPoints: citizenProfile.reputationScore,
    level: citizenProfile.level,
  });
};
