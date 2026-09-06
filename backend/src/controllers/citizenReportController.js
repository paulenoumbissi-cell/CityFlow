import {
  broadcastNewReport,
  broadcastReportVote,
  broadcastRadioMessage,
  broadcastSosAlert,
} from "../services/websocketServer.js";
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
// 3. BARÈME DES POINTS PAR TYPE D'INCIDENT (Spécialités Camerounaises)
// ==========================================================================
export const REPORT_POINTS_CONFIG = {
  trafficJam: { points: 15, label: "Embouteillage", icon: "🚗" },
  trafficBlock: { points: 15, label: "Bouchon sévère", icon: "🚗" },
  trafficLight: { points: 20, label: "Feu de circulation en panne", icon: "🚦" },
  motoRush: { points: 15, label: "Concentration Motos / Blocage", icon: "🏍️" },
  police: { points: 10, label: "Contrôle Police & Gendarmerie", icon: "👮" },
  accident: { points: 20, label: "Accident de circulation", icon: "🚨" },
  funeral: { points: 15, label: "Deuil / Bâche sur chaussée", icon: "🎪" },
  truckBreakdown: { points: 20, label: "Camion / Grumier en panne", icon: "🚛" },
  hazard: { points: 15, label: "Nid-de-poule ou danger", icon: "⚠️" },
  roadworks: { points: 15, label: "Travaux de voirie", icon: "🚧" },
  closure: { points: 15, label: "Route barrée / Déviation", icon: "⛔" },
  flooding: { points: 20, label: "Inondation de bas-fond", icon: "🌊" },
  gasStation: { points: 15, label: "Disponibilité Carburant", icon: "⛽" },
  breakdown: { points: 15, label: "Véhicule en panne", icon: "🔧" },
  sosHelp: { points: 25, label: "SOS Dépannage", icon: "🆘" },
  other: { points: 10, label: "Info citoyenne", icon: "📢" },
};


// ==========================================================================
// 4. SYSTÈME DE CONFIANCE (Score sur 100)
// ==========================================================================
export function getTrustLevel(score) {
  const s = Math.max(0, Math.min(100, score ?? 75));
  if (s >= 81) {
    return { score: s, level: "Très fiable", icon: "⭐", color: "#2563EB", badgeClass: "trust-star", description: "Utilisateur très fiable" };
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
    const { planId, rewardTierId, paymentMethod, phoneNumber, userId } = req.body;
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[0];

    const targetUserId = userId || "usr_current";
    const profile = await dbService.getProfile(targetUserId);
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

      // Si le solde est inférieur aux points requis, recharger automatiquement à 380 pour démo
      if (currentPoints < rewardTier.pointsRequired) {
        currentPoints = 380;
        profile.points = 380;
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

// ==========================================================================
// 7. CANAL RADIO-TRAFIC DES CONDUCTEURS & TCHAT D'ENTRAIDE EN DIRECT
// ==========================================================================
let RADIO_MESSAGES_STORE = [
  {
    id: "rad_01",
    author: "Taxi Jaune #452",
    authorBadge: "🚕 Chauffeur Expert",
    city: "Yaoundé",
    crossroad: "Carrefour CRADAT",
    message: "Attention les gars, grosse affluence d'étudiants sortie Ngoa-Ekélé, la voie vers Melen commence à saturer !",
    isAudio: false,
    audioDurationSeconds: 0,
    createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
    likesCount: 8,
    isLikedByMe: false,
  },
  {
    id: "rad_02",
    author: "Motard 237",
    authorBadge: "🏍️ Bendskin Éclair",
    city: "Yaoundé",
    crossroad: "Carrefour Nlongkak",
    message: "Nlongkak fluide vers Bastos ! Police présente mais circulation très propre pour le moment.",
    isAudio: true,
    audioDurationSeconds: 12,
    createdAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    likesCount: 14,
    isLikedByMe: true,
  },
  {
    id: "rad_03",
    author: "Capitaine Eric",
    authorBadge: "👑 Guide de la Cité",
    city: "Douala",
    crossroad: "Rond-point Ndokoti",
    message: "Ndokoti bloqué par un grumier en panne au niveau du tunnel. Privilégiez l'axe PK8 ou CCC.",
    isAudio: false,
    audioDurationSeconds: 0,
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    likesCount: 22,
    isLikedByMe: false,
  },
  {
    id: "rad_04",
    author: "Clarisse M.",
    authorBadge: "🌱 Citoyenne Active",
    city: "Douala",
    crossroad: "Carrefour Deido",
    message: "Feu tricolore clignote en orange au Rond-Point Deido, ralentissement vers le pont Wouri.",
    isAudio: true,
    audioDurationSeconds: 8,
    createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    likesCount: 5,
    isLikedByMe: false,
  },
];

export const getRadioMessages = async (req, res) => {
  try {
    const { city } = req.query;
    let msgs = [...RADIO_MESSAGES_STORE];
    if (city && city !== "all") {
      msgs = msgs.filter((m) => m.city.toLowerCase() === city.toLowerCase());
    }
    msgs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ count: msgs.length, messages: msgs });
  } catch (err) {
    console.error("[getRadioMessages Error]", err);
    res.status(500).json({ error: "Erreur radio trafic" });
  }
};

export const postRadioMessage = async (req, res) => {
  try {
    const { message, crossroad, city, isAudio, audioDurationSeconds } = req.body;
    if (!message && !isAudio) {
      return res.status(400).json({ error: "Message ou note vocale requis." });
    }

    const profile = await dbService.getProfile();
    const newMsg = {
      id: `rad_${Date.now()}`,
      author: profile.userName || "Conducteur Citoyen",
      authorBadge: profile.levelBadge || "🚕 Taxi Citoyen",
      city: city || "Yaoundé",
      crossroad: crossroad || "Carrefour Central",
      message: message || "🎤 Note vocale transmise sur le canal radio",
      isAudio: Boolean(isAudio),
      audioDurationSeconds: audioDurationSeconds || 0,
      createdAt: new Date().toISOString(),
      likesCount: 1,
      isLikedByMe: true,
    };

    RADIO_MESSAGES_STORE.unshift(newMsg);
    if (RADIO_MESSAGES_STORE.length > 50) {
      RADIO_MESSAGES_STORE.pop();
    }

    // Récompense immédiate de +5 points pour contribution radio
    profile.points = (profile.points || 380) + 5;
    profile.reputationScore = profile.points;
    await dbService.saveProfile(profile);

    broadcastRadioMessage(newMsg);

    res.status(201).json({
      success: true,
      message: "Message diffusé sur le canal radio (+5 points) !",
      radioMessage: newMsg,
      points: profile.points,
    });
  } catch (err) {
    console.error("[postRadioMessage Error]", err);
    res.status(500).json({ error: "Erreur lors de l'envoi radio" });
  }
};

export const likeRadioMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const msg = RADIO_MESSAGES_STORE.find((m) => m.id === id);
    if (!msg) {
      return res.status(404).json({ error: "Message radio introuvable." });
    }

    msg.likesCount = (msg.likesCount || 0) + 1;
    msg.isLikedByMe = true;

    res.json({ success: true, message: msg });
  } catch (err) {
    console.error("[likeRadioMessage Error]", err);
    res.status(500).json({ error: "Erreur like radio" });
  }
};

// ==========================================================================
// 8. MODE SOS DÉPANNAGE & ASSISTANCE RAPIDE
// ==========================================================================
let SOS_REQUESTS_STORE = [
  {
    id: "sos_01",
    author: "Samuel N.",
    phone: "+237 694 12 34 56",
    city: "Yaoundé",
    crossroad: "Face Station Total Nlongkak",
    sosType: "Crevaison",
    details: "Pneu arrière droit à plat, besoin d'une clé en croix ou d'un cric hydraulique.",
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: "searching",
    helperName: null,
  },
  {
    id: "sos_02",
    author: "Brice T.",
    phone: "+237 675 98 76 54",
    city: "Douala",
    crossroad: "Carrefour Ndokoti (Total)",
    sosType: "Batterie",
    details: "Batterie à plat suite aux feux laissés allumés. Besoin de câbles de démarrage.",
    createdAt: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    status: "assisted",
    helperName: "Fabrice (En route)",
  },
];

export const getSosRequests = async (req, res) => {
  try {
    const { city } = req.query;
    let reqs = [...SOS_REQUESTS_STORE];
    if (city && city !== "all") {
      reqs = reqs.filter((r) => r.city.toLowerCase() === city.toLowerCase());
    }
    res.json({ count: reqs.length, requests: reqs });
  } catch (err) {
    console.error("[getSosRequests Error]", err);
    res.status(500).json({ error: "Erreur requêtes SOS" });
  }
};

export const createSosRequest = async (req, res) => {
  try {
    const { crossroad, city, sosType, details, phone } = req.body;
    const profile = await dbService.getProfile();

    const newSos = {
      id: `sos_${Date.now()}`,
      author: profile.userName || "Conducteur en détresse",
      phone: phone || profile.phone || "+237 690 00 00 00",
      city: city || "Yaoundé",
      crossroad: crossroad || "Carrefour Central",
      sosType: sosType || "Crevaison",
      details: details || "Demande d'assistance mécanique immédiate",
      createdAt: new Date().toISOString(),
      status: "searching",
      helperName: null,
    };

    SOS_REQUESTS_STORE.unshift(newSos);
    broadcastSosAlert(newSos);

    res.status(201).json({
      success: true,
      message: "🚨 Alerte SOS diffusée aux conducteurs et bons samaritains à proximité !",
      sos: newSos,
    });
  } catch (err) {
    console.error("[createSosRequest Error]", err);
    res.status(500).json({ error: "Erreur création SOS" });
  }
};

export const respondToSosRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const sos = SOS_REQUESTS_STORE.find((s) => s.id === id);
    if (!sos) {
      return res.status(404).json({ error: "Alerte SOS introuvable." });
    }

    const profile = await dbService.getProfile();
    sos.status = "assisted";
    sos.helperName = `${profile.userName || "Bon Samaritain"} (En route)`;

    // Attribution de +25 points pour assistance citoyenne
    profile.points = (profile.points || 380) + 25;
    profile.reputationScore = profile.points;
    await dbService.saveProfile(profile);

    res.json({
      success: true,
      message: "Merci pour votre esprit citoyen ! Vous recevez +25 points pour cette assistance.",
      sos,
      points: profile.points,
    });
  } catch (err) {
    console.error("[respondToSosRequest Error]", err);
    res.status(500).json({ error: "Erreur réponse SOS" });
  }
};


