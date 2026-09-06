import { broadcastEmergencyUpdate, broadcastEmergencyCancel } from "../services/websocketServer.js";
import dbService from "../services/dbService.js";
import { CITY_LANDMARKS, fetchOsrmRoutes } from "./routeController.js";

// Contrôleur de gestion des missions de secours & régulation d'onde verte (Green Wave) dynamique

// Base de données des hôpitaux et pôles d'urgences de référence
export const EMERGENCY_HOSPITALS_DB = {
  "Yaoundé": [
    {
      id: "hosp_yde_central",
      name: "Hôpital Central de Yaoundé (HCY)",
      category: "CHU & Traumatologie Lourde",
      badge: "Pôle Déchocage Niveau 1",
      district: "Centre / Boulevard 20 Mai",
      position: [3.8650, 11.5080],
      phone: "+237 222 23 40 20",
      hotline: "119",
      bedsAvailable: 14,
      totalBeds: 24,
      occupancyRate: 72,
      status: "available", // available | high_load | saturated
      specialties: ["Urgences vitales", "Chirurgie traumatique", "Réanimation", "Déchocage 24/7"],
      etaMinutesDefault: 8,
    },
    {
      id: "hosp_yde_chuy",
      name: "Centre Hospitalier Universitaire (CHUY)",
      category: "Urgences Universitaires & Réanimation",
      badge: "Neurochirurgie & Soins Intensifs",
      district: "Melen / Polytechnique",
      position: [3.8550, 11.4920],
      phone: "+237 222 22 28 80",
      hotline: "119",
      bedsAvailable: 8,
      totalBeds: 18,
      occupancyRate: 85,
      status: "available",
      specialties: ["Cardiologie d'urgence", "Neuro-traumatologie", "Brûlés graves"],
      etaMinutesDefault: 10,
    },
    {
      id: "hosp_yde_general",
      name: "Hôpital Général de Yaoundé (HGY)",
      category: "Pôle Spécialisé Haut Standing",
      badge: "Grands Brûlés & Imagerie 24/7",
      district: "Ngousso",
      position: [3.8980, 11.5430],
      phone: "+237 222 20 28 01",
      hotline: "119",
      bedsAvailable: 12,
      totalBeds: 20,
      occupancyRate: 68,
      status: "available",
      specialties: ["Chirurgie cardiaque", "Oncologie d'urgence", "Soins intensifs pédiatriques"],
      etaMinutesDefault: 12,
    },
    {
      id: "hosp_yde_hgopy",
      name: "Hôpital Gynéco-Obstétrique (HGOPY)",
      category: "Centre Mère & Enfant",
      badge: "Néonatologie d'Urgence",
      district: "Ngousso / Biyem",
      position: [3.8410, 11.5620],
      phone: "+237 222 21 24 30",
      hotline: "119",
      bedsAvailable: 6,
      totalBeds: 15,
      occupancyRate: 88,
      status: "available",
      specialties: ["Urgences obstétricales", "Pédiatrie d'extrême urgence", "Couveuses réa"],
      etaMinutesDefault: 14,
    },
    {
      id: "hosp_yde_militaire",
      name: "Hôpital Militaire de Région n°1",
      category: "Hôpital d'Instruction Militaire",
      badge: "Chirurgie Tactique & Balistique",
      district: "Ngoa-Ekélé / Centre",
      position: [3.8590, 11.5160],
      phone: "+237 222 23 11 00",
      hotline: "117",
      bedsAvailable: 11,
      totalBeds: 16,
      occupancyRate: 60,
      status: "available",
      specialties: ["Traumatisme de guerre", "Chirurgie polyvalente", "Banque de sang"],
      etaMinutesDefault: 7,
    },
  ],
  "Douala": [
    {
      id: "hosp_dla_laquintinie",
      name: "Hôpital Laquintinie de Douala",
      category: "Centre Hospitalier Régional N°1",
      badge: "Pavillon Samuel Kondo (Urgences)",
      district: "Akwa / Deido",
      position: [4.0550, 9.7020],
      phone: "+237 233 42 15 40",
      hotline: "119",
      bedsAvailable: 16,
      totalBeds: 30,
      occupancyRate: 75,
      status: "available",
      specialties: ["Pavillon des urgences 24/7", "Déchocage adulte/enfant", "Scanner d'urgence"],
      etaMinutesDefault: 8,
    },
    {
      id: "hosp_dla_general",
      name: "Hôpital Général de Douala (HGD)",
      category: "Pôle Hospitalier Universitaire",
      badge: "Grands Brûlés & Hémodialyse Urgence",
      district: "Logbessou",
      position: [4.0620, 9.7480],
      phone: "+237 233 46 25 15",
      hotline: "119",
      bedsAvailable: 10,
      totalBeds: 22,
      occupancyRate: 80,
      status: "available",
      specialties: ["Réanimation médico-chirurgicale", "Cardiologie interventionnelle"],
      etaMinutesDefault: 11,
    },
    {
      id: "hosp_dla_militaire",
      name: "Hôpital Militaire de Région n°2",
      category: "Urgences Tactiques & Armées",
      badge: "Bloc Opératoire d'Urgence",
      district: "Bonanjo",
      position: [4.0420, 9.6950],
      phone: "+237 233 42 09 88",
      hotline: "117",
      bedsAvailable: 7,
      totalBeds: 14,
      occupancyRate: 65,
      status: "available",
      specialties: ["Chirurgie d'urgence", "Soins intensifs", "Traumatologie"],
      etaMinutesDefault: 9,
    },
    {
      id: "hosp_dla_muna",
      name: "Clinique Muna de Bonanjo",
      category: "Clinique Médico-Chirurgicale Privée",
      badge: "Prise en charge Immédiate VIP",
      district: "Bonanjo",
      position: [4.0410, 9.6980],
      phone: "+237 233 42 42 00",
      hotline: "119",
      bedsAvailable: 5,
      totalBeds: 10,
      occupancyRate: 70,
      status: "available",
      specialties: ["Unité de soins intensifs", "Ambulance médicalisée privée"],
      etaMinutesDefault: 10,
    },
    {
      id: "hosp_dla_bonassama",
      name: "Hôpital de District de Bonassama",
      category: "Hôpital Public Douala Ouest",
      badge: "Urgences Rive Droite Wouri",
      district: "Bonabéri",
      position: [4.0750, 9.6640],
      phone: "+237 233 39 12 04",
      hotline: "119",
      bedsAvailable: 9,
      totalBeds: 18,
      occupancyRate: 78,
      status: "available",
      specialties: ["Urgences de proximité Bonabéri", "Traumatologie routière N5"],
      etaMinutesDefault: 12,
    },
  ],
};

// Corridors préconfigurés haute vitesse
const EMERGENCY_CORRIDORS_DB = {
  "Yaoundé": [
    {
      id: "yde_corridor_hopital_central",
      name: "Corridor Nord ➔ Hôpital Central de Yaoundé",
      origin: "Caserne Sapeurs-Pompiers Nlongkak",
      destination: "Urgences - Hôpital Central de Yaoundé",
      distanceKm: 5.4,
      nominalDurationMinutes: 24,
      priorityDurationMinutes: 8,
      timeSavedMinutes: 16,
      coordinates: [
        [3.8820, 11.5170],
        [3.8770, 11.5175],
        [3.8730, 11.5180],
        [3.8680, 11.5185],
        [3.8640, 11.5190],
        [3.8610, 11.5160],
        [3.8590, 11.5130],
        [3.8650, 11.5080],
      ],
      intersections: [
        { id: "int_yde_1", name: "Carrefour Nlongkak", position: [3.8820, 11.5170], state: "green_wave", crossTrafficLight: "red" },
        { id: "int_yde_2", name: "Carrefour Warda / Mfoundi", position: [3.8730, 11.5180], state: "pending", crossTrafficLight: "red" },
        { id: "int_yde_3", name: "Poste Centrale (Bld 20 Mai)", position: [3.8640, 11.5190], state: "pending", crossTrafficLight: "red" },
        { id: "int_yde_4", name: "Carrefour Hôpital Central", position: [3.8590, 11.5130], state: "pending", crossTrafficLight: "red" },
        { id: "int_yde_4b", name: "Entrée Pavillon Urgences HCY", position: [3.8650, 11.5080], state: "pending", crossTrafficLight: "red" },
      ],
    },
    {
      id: "yde_corridor_chuy",
      name: "Corridor Ouest ➔ CHU de Melen (CHUY)",
      origin: "Poste Centrale",
      destination: "Centre Hospitalier Universitaire (CHUY)",
      distanceKm: 6.1,
      nominalDurationMinutes: 28,
      priorityDurationMinutes: 9,
      timeSavedMinutes: 19,
      coordinates: [
        [3.8640, 11.5190],
        [3.8660, 11.5120],
        [3.8690, 11.5050],
        [3.8650, 11.5010],
        [3.8610, 11.4980],
        [3.8580, 11.4950],
        [3.8550, 11.4920],
      ],
      intersections: [
        { id: "int_yde_5", name: "Poste Centrale", position: [3.8640, 11.5190], state: "green_wave", crossTrafficLight: "red" },
        { id: "int_yde_6", name: "Carrefour Bastos / Tsinga", position: [3.8690, 11.5050], state: "pending", crossTrafficLight: "red" },
        { id: "int_yde_7", name: "Carrefour Melen (Polytechnique)", position: [3.8610, 11.4980], state: "pending", crossTrafficLight: "red" },
        { id: "int_yde_8", name: "Entrée Urgences CHUY", position: [3.8550, 11.4920], state: "pending", crossTrafficLight: "red" },
      ],
    },
    {
      id: "yde_corridor_ngousso",
      name: "Corridor Est ➔ Hôpital Général de Yaoundé",
      origin: "Poste Centrale (Bld 20 Mai)",
      destination: "Hôpital Général de Yaoundé (Ngousso)",
      distanceKm: 7.6,
      nominalDurationMinutes: 32,
      priorityDurationMinutes: 11,
      timeSavedMinutes: 21,
      coordinates: [
        [3.8640, 11.5190],
        [3.8710, 11.5240],
        [3.8810, 11.5360],
        [3.8890, 11.5420],
        [3.8980, 11.5430],
      ],
      intersections: [
        { id: "int_yde_9", name: "Poste Centrale", position: [3.8640, 11.5190], state: "green_wave", crossTrafficLight: "red" },
        { id: "int_yde_10", name: "Carrefour Elig-Essono", position: [3.8710, 11.5240], state: "pending", crossTrafficLight: "red" },
        { id: "int_yde_11", name: "Carrefour Omnisports", position: [3.8810, 11.5360], state: "pending", crossTrafficLight: "red" },
        { id: "int_yde_12", name: "Carrefour Ngousso / Hôpital Général", position: [3.8980, 11.5430], state: "pending", crossTrafficLight: "red" },
      ],
    },
  ],
  "Douala": [
    {
      id: "dla_corridor_laquintinie",
      name: "Corridor Nord-Sud ➔ Hôpital Laquintinie",
      origin: "Caserne Sapeurs-Pompiers Deido",
      destination: "Urgences - Hôpital Laquintinie",
      distanceKm: 4.8,
      nominalDurationMinutes: 26,
      priorityDurationMinutes: 7,
      timeSavedMinutes: 19,
      coordinates: [
        [4.0620, 9.7120],
        [4.0580, 9.7100],
        [4.0530, 9.7080],
        [4.0480, 9.7010],
        [4.0420, 9.6980],
        [4.0550, 9.7020],
      ],
      intersections: [
        { id: "int_dla_1", name: "Rond-point Deido", position: [4.0620, 9.7120], state: "green_wave", crossTrafficLight: "red" },
        { id: "int_dla_2", name: "Carrefour Akwa Palace", position: [4.0530, 9.7080], state: "pending", crossTrafficLight: "red" },
        { id: "int_dla_3", name: "Boulevard de la Liberté", position: [4.0480, 9.7010], state: "pending", crossTrafficLight: "red" },
        { id: "int_dla_4", name: "Accès Urgences Laquintinie", position: [4.0550, 9.7020], state: "pending", crossTrafficLight: "red" },
      ],
    },
    {
      id: "dla_corridor_hopital_general",
      name: "Corridor Est ➔ Hôpital Général de Douala",
      origin: "Poste de Commandement Ndokoti",
      destination: "Hôpital Général de Douala (Logbessou)",
      distanceKm: 7.2,
      nominalDurationMinutes: 35,
      priorityDurationMinutes: 11,
      timeSavedMinutes: 24,
      coordinates: [
        [4.0450, 9.7420],
        [4.0510, 9.7550],
        [4.0570, 9.7620],
        [4.0610, 9.7680],
        [4.0620, 9.7480],
      ],
      intersections: [
        { id: "int_dla_5", name: "Carrefour Ndokoti", position: [4.0450, 9.7420], state: "green_wave", crossTrafficLight: "red" },
        { id: "int_dla_6", name: "Axe Lourd Bassa", position: [4.0510, 9.7550], state: "pending", crossTrafficLight: "red" },
        { id: "int_dla_7", name: "Carrefour Cité des Palmiers", position: [4.0610, 9.7680], state: "pending", crossTrafficLight: "red" },
        { id: "int_dla_8", name: "Entrée Hôpital Général Logbessou", position: [4.0620, 9.7480], state: "pending", crossTrafficLight: "red" },
      ],
    },
  ],
};

let activeEmergencyMission = null;

// Helper : Déterminer la coordonnée GPS d'une chaîne ou d'un tableau
function resolveCoordinates(point, cityKey) {
  if (Array.isArray(point) && point.length === 2) {
    return [parseFloat(point[0]), parseFloat(point[1])];
  }
  if (typeof point === "string") {
    // Chercher dans les hôpitaux
    const hospitals = EMERGENCY_HOSPITALS_DB[cityKey] || EMERGENCY_HOSPITALS_DB["Yaoundé"];
    const foundHosp = hospitals.find(
      (h) => h.name.toLowerCase().includes(point.toLowerCase()) || point.toLowerCase().includes(h.name.toLowerCase())
    );
    if (foundHosp) return foundHosp.position;

    // Chercher dans les repères de ville
    const cityLandmarks = CITY_LANDMARKS[cityKey] || CITY_LANDMARKS["Yaoundé"];
    const foundLandmark = Object.entries(cityLandmarks).find(
      ([name]) => name.toLowerCase().includes(point.toLowerCase()) || point.toLowerCase().includes(name.toLowerCase())
    );
    if (foundLandmark) return foundLandmark[1].pos;
  }
  // Par défaut centre ville
  return cityKey === "Douala" ? [4.0511, 9.7043] : [3.8667, 11.5167];
}

// Helper pour calculer la distance euclidienne / haversine
function calculateDistKm(pos1, pos2) {
  const [lat1, lon1] = pos1;
  const [lat2, lon2] = pos2;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper : Créer une mission active
function buildMission({ vehicleType, city, corridorId, origin, destination, customData }) {
  const cityKey = city && city.toLowerCase().includes("douala") ? "Douala" : "Yaoundé";

  const vehicleDetails = {
    ambulance: { name: "Ambulance SAMU 119", badge: "Urgence médicale vitale", color: "#EF4444", icon: "Siren" },
    firefighters: { name: "Sapeurs-Pompiers (CCF 118)", badge: "Intervention Incendie & Secours", color: "#EA580C", icon: "Flame" },
    police: { name: "Police Secours 117", badge: "Intervention d'Urgence", color: "#2563EB", icon: "Shield" },
    convoy: { name: "Convoi Sécurisé", badge: "Priorité absolue", color: "#7C3AED", icon: "Sparkles" },
  };

  const vInfo = vehicleDetails[vehicleType] || vehicleDetails.ambulance;

  // Si c'est un corridor custom (calculé sur-mesure)
  if (customData) {
    return {
      id: `mission_${Date.now()}`,
      status: "in_progress",
      vehicleType: vehicleType || "ambulance",
      vehicleName: vInfo.name,
      badge: vInfo.badge,
      color: vInfo.color,
      city: cityKey,
      corridorId: customData.id || `custom_${Date.now()}`,
      corridorName: customData.name || `Corridor Sur-Mesure ➔ ${destination}`,
      origin: origin || customData.origin,
      destination: destination || customData.destination,
      distanceKm: customData.distanceKm,
      nominalDurationMinutes: customData.nominalDurationMinutes,
      priorityDurationMinutes: customData.priorityDurationMinutes,
      timeSavedMinutes: customData.timeSavedMinutes,
      startedAt: new Date().toISOString(),
      speedKmh: 75,
      currentStepIndex: 0,
      coordinates: customData.coordinates,
      intersections: (customData.intersections || []).map((int, idx) => ({
        ...int,
        state: idx === 0 ? "green_wave" : "pending",
      })),
      broadcastAlert: {
        active: true,
        title: `🚨 VÉHICULE D'URGENCE EN APPROCHE (${vInfo.name.toUpperCase()})`,
        message: `Corridor prioritaire activé de ${origin || customData.origin} vers ${destination || customData.destination}. Automobilistes : serrez à droite et libérez l'axe central.`,
        advisedAction: "Serrer immédiatement à droite et maintenir les intersections dégagées",
        zoneRadiusKm: 3.0,
      },
    };
  }

  // Sinon chercher dans les corridors préconfigurés
  const corridors = EMERGENCY_CORRIDORS_DB[cityKey] || EMERGENCY_CORRIDORS_DB["Yaoundé"];
  let corridor = corridors.find((c) => c.id === corridorId) || corridors[0];

  return {
    id: `mission_${Date.now()}`,
    status: "in_progress",
    vehicleType: vehicleType || "ambulance",
    vehicleName: vInfo.name,
    badge: vInfo.badge,
    color: vInfo.color,
    city: cityKey,
    corridorId: corridor.id,
    corridorName: corridor.name,
    origin: origin || corridor.origin,
    destination: destination || corridor.destination,
    distanceKm: corridor.distanceKm,
    nominalDurationMinutes: corridor.nominalDurationMinutes,
    priorityDurationMinutes: corridor.priorityDurationMinutes,
    timeSavedMinutes: corridor.timeSavedMinutes,
    startedAt: new Date().toISOString(),
    speedKmh: 74,
    currentStepIndex: 0,
    coordinates: corridor.coordinates,
    intersections: corridor.intersections.map((int, idx) => ({
      ...int,
      state: idx === 0 ? "green_wave" : "pending",
    })),
    broadcastAlert: {
      active: true,
      title: `🚨 VÉHICULE D'URGENCE EN APPROCHE (${vInfo.name.toUpperCase()})`,
      message: `Corridor prioritaire activé entre ${origin || corridor.origin} et ${destination || corridor.destination}. Automobilistes : serrez à droite et libérez l'axe central.`,
      advisedAction: "Serrer à droite et maintenir les intersections dégagées",
      zoneRadiusKm: 2.5,
    },
  };
}

// =========================================================================
// ROUTES & CONTRÔLEURS EXPORTÉS
// =========================================================================

// 1. Déclencher une mission de secours (Préconfigurée ou Sur-Mesure)
export const dispatchEmergencyMission = async (req, res) => {
  try {
    const { vehicleType = "ambulance", city = "Yaoundé", corridorId, origin, destination, customData } = req.body;

    activeEmergencyMission = buildMission({
      vehicleType,
      city,
      corridorId,
      origin,
      destination,
      customData,
    });

    const missions = await dbService.getEmergencyMissions();
    missions.unshift(activeEmergencyMission);
    await dbService.saveEmergencyMissions(missions);

    // Broadcast WebSocket en direct
    broadcastEmergencyUpdate(activeEmergencyMission);

    res.status(201).json({
      success: true,
      message: `Mission d'urgence ${activeEmergencyMission.vehicleName} enclenchée avec Onde Verte prioritaire !`,
      mission: activeEmergencyMission,
    });
  } catch (err) {
    console.error("[dispatchEmergencyMission Error]", err);
    res.status(500).json({ error: "Erreur enclenchement mission d'urgence" });
  }
};

// 2. Obtenir la mission en cours ou la liste des corridors et hôpitaux
export const getActiveEmergencyMission = (req, res) => {
  const { city } = req.query;
  const cityKey = city && city.toLowerCase().includes("douala") ? "Douala" : "Yaoundé";

  if (!activeEmergencyMission) {
    return res.json({
      active: false,
      mission: null,
      corridorsAvailable: EMERGENCY_CORRIDORS_DB[cityKey] || EMERGENCY_CORRIDORS_DB["Yaoundé"],
      hospitals: EMERGENCY_HOSPITALS_DB[cityKey] || EMERGENCY_HOSPITALS_DB["Yaoundé"],
    });
  }

  const elapsedSeconds = Math.floor((Date.now() - new Date(activeEmergencyMission.startedAt).getTime()) / 1000);

  res.json({
    active: true,
    elapsedSeconds,
    mission: activeEmergencyMission,
  });
};

// 3. Faire avancer la progression de la mission (Step Onde Verte)
export const stepEmergencyMission = async (req, res) => {
  try {
    if (!activeEmergencyMission) {
      return res.status(404).json({ error: "Aucune mission d'urgence active" });
    }

    const nextIndex = activeEmergencyMission.currentStepIndex + 1;
    const totalIntersections = activeEmergencyMission.intersections.length;

    if (nextIndex >= totalIntersections) {
      activeEmergencyMission.intersections.forEach((i) => (i.state = "cleared"));
      activeEmergencyMission.status = "completed";
      activeEmergencyMission.currentStepIndex = totalIntersections - 1;
      activeEmergencyMission.broadcastAlert.active = false;
      activeEmergencyMission.completedAt = new Date().toISOString();

      const completedMission = { ...activeEmergencyMission };
      activeEmergencyMission = null;

      const missions = await dbService.getEmergencyMissions();
      const idx = missions.findIndex((m) => m.id === completedMission.id);
      if (idx !== -1) {
        missions[idx] = completedMission;
      } else {
        missions.unshift(completedMission);
      }
      await dbService.saveEmergencyMissions(missions);

      broadcastEmergencyCancel();

      return res.json({
        success: true,
        message: "🎉 Véhicule de secours arrivé à destination ! Feux remis en cycle régulier.",
        missionCompleted: true,
        mission: completedMission,
      });
    }

    activeEmergencyMission.currentStepIndex = nextIndex;
    activeEmergencyMission.intersections = activeEmergencyMission.intersections.map((int, idx) => {
      if (idx < nextIndex) {
        return { ...int, state: "cleared" };
      } else if (idx === nextIndex) {
        return { ...int, state: "green_wave" };
      } else {
        return { ...int, state: "pending" };
      }
    });

    broadcastEmergencyUpdate(activeEmergencyMission);

    res.json({
      success: true,
      message: `Onde verte synchronisée sur : ${activeEmergencyMission.intersections[nextIndex].name}`,
      mission: activeEmergencyMission,
    });
  } catch (err) {
    console.error("[stepEmergencyMission Error]", err);
    res.status(500).json({ error: "Erreur avancement mission" });
  }
};

// 4. Clôturer / Annuler la mission d'urgence
export const cancelEmergencyMission = (req, res) => {
  if (!activeEmergencyMission) {
    return res.json({ success: true, message: "Aucune mission d'urgence active" });
  }

  activeEmergencyMission = null;
  broadcastEmergencyCancel();

  res.json({
    success: true,
    message: "Mission d'urgence annulée. Tous les carrefours ont été réinitialisés au cycle nominal.",
  });
};

// 5. Obtenir les alertes broadcast pour les conducteurs
export const getEmergencyBroadcast = (req, res) => {
  if (activeEmergencyMission && activeEmergencyMission.broadcastAlert?.active) {
    return res.json({
      hasActiveEmergency: true,
      broadcast: activeEmergencyMission.broadcastAlert,
      vehicle: {
        name: activeEmergencyMission.vehicleName,
        badge: activeEmergencyMission.badge,
        color: activeEmergencyMission.color,
      },
      currentIntersection:
        activeEmergencyMission.intersections[activeEmergencyMission.currentStepIndex]?.name,
    });
  }

  res.json({
    hasActiveEmergency: false,
    broadcast: null,
  });
};

// 6. NOUVEAU : Obtenir la télémétrie des hôpitaux et pôles de réanimation
export const getEmergencyHospitals = (req, res) => {
  try {
    const { city } = req.query;
    const cityKey = city && city.toLowerCase().includes("douala") ? "Douala" : "Yaoundé";
    const list = EMERGENCY_HOSPITALS_DB[cityKey] || EMERGENCY_HOSPITALS_DB["Yaoundé"];

    res.json({
      city: cityKey,
      count: list.length,
      hospitals: list,
    });
  } catch (err) {
    console.error("[getEmergencyHospitals Error]", err);
    res.status(500).json({ error: "Erreur chargement hôpitaux d'urgence" });
  }
};

// 7. NOUVEAU : Calculer un corridor d'urgence sur-mesure (OSRM ou repères réels)
export const calculateCustomEmergencyCorridor = async (req, res) => {
  try {
    const { origin, destination, originCoords, destCoords, city = "Yaoundé", vehicleType = "ambulance" } = req.body;

    const cityKey = city && city.toLowerCase().includes("douala") ? "Douala" : "Yaoundé";

    const startPos = originCoords || resolveCoordinates(origin, cityKey);
    const endPos = destCoords || resolveCoordinates(destination, cityKey);

    const originLabel = typeof origin === "string" ? origin : "Position de Départ";
    const destLabel = typeof destination === "string" ? destination : "Centre Hospitalier";

    // 1. Tenter le calcul d'itinéraire réel via OSRM
    let osrmRoutes = null;
    try {
      osrmRoutes = await fetchOsrmRoutes(startPos, endPos, originLabel, destLabel);
    } catch (osrmErr) {
      console.warn("[calculateCustomEmergencyCorridor] OSRM fallback:", osrmErr.message);
    }

    let coordinates = [];
    let distanceKm = 0;
    let nominalDurationMinutes = 0;

    if (osrmRoutes && osrmRoutes.length > 0) {
      const best = osrmRoutes[0];
      coordinates = best.coordinates;
      distanceKm = best.distanceKm;
      nominalDurationMinutes = best.durationMinutes;
    } else {
      // Fallback : Générer un tracé réaliste multi-points
      const directDist = calculateDistKm(startPos, endPos);
      distanceKm = parseFloat((directDist * 1.3).toFixed(1));
      nominalDurationMinutes = Math.max(5, Math.round(distanceKm * 4.2));

      // Génération de 12 points intermédiaires
      coordinates = [startPos];
      const steps = 12;
      for (let i = 1; i < steps; i++) {
        const ratio = i / steps;
        const lat = startPos[0] + (endPos[0] - startPos[0]) * ratio + (Math.sin(ratio * Math.PI) * 0.003);
        const lng = startPos[1] + (endPos[1] - startPos[1]) * ratio + (Math.cos(ratio * Math.PI) * 0.002);
        coordinates.push([lat, lng]);
      }
      coordinates.push(endPos);
    }

    // Calcul de l'Onde Verte : Réduction de 60% du temps de trajet
    const priorityDurationMinutes = Math.max(3, Math.round(nominalDurationMinutes * 0.38));
    const timeSavedMinutes = nominalDurationMinutes - priorityDurationMinutes;

    // 2. Extraire ou générer les carrefours clés à asservir le long du tracé
    const landmarks = CITY_LANDMARKS[cityKey] || CITY_LANDMARKS["Yaoundé"];
    const detectedIntersections = [];

    // Trouver les repères proches du tracé (< 500m)
    for (const [name, lm] of Object.entries(landmarks)) {
      if (lm.category === "landmark" || lm.category === "hospital") {
        for (const coord of coordinates) {
          if (calculateDistKm(coord, lm.pos) < 0.45) {
            if (!detectedIntersections.some((it) => it.name === name)) {
              detectedIntersections.push({
                id: `int_dyn_${detectedIntersections.length + 1}`,
                name: name,
                position: lm.pos,
                state: detectedIntersections.length === 0 ? "green_wave" : "pending",
                crossTrafficLight: "red",
              });
            }
            break;
          }
        }
      }
      if (detectedIntersections.length >= 6) break;
    }

    // Si moins de 3 carrefours détectés, échantillonner le tracé
    if (detectedIntersections.length < 3) {
      detectedIntersections.length = 0; // réinitialiser
      const count = Math.min(5, Math.max(3, Math.floor(coordinates.length / 3)));
      const stepInterval = Math.floor(coordinates.length / count);

      for (let i = 0; i < count; i++) {
        const ptIdx = Math.min(coordinates.length - 1, i * stepInterval);
        const pt = coordinates[ptIdx];
        const label = i === 0 ? `Départ : ${originLabel}` : i === count - 1 ? `Arrivée : ${destLabel}` : `Axe Régulé n°${i + 1} (${cityKey})`;
        detectedIntersections.push({
          id: `int_sample_${i + 1}`,
          name: label,
          position: pt,
          state: i === 0 ? "green_wave" : "pending",
          crossTrafficLight: "red",
        });
      }
    }

    const customCorridor = {
      id: `custom_corridor_${Date.now()}`,
      name: `Corridor Express ➔ ${destLabel}`,
      origin: originLabel,
      destination: destLabel,
      distanceKm,
      nominalDurationMinutes,
      priorityDurationMinutes,
      timeSavedMinutes,
      coordinates,
      intersections: detectedIntersections,
    };

    res.json({
      success: true,
      corridor: customCorridor,
    });
  } catch (err) {
    console.error("[calculateCustomEmergencyCorridor Error]", err);
    res.status(500).json({ error: "Erreur calcul corridor d'urgence sur-mesure" });
  }
};

// 8. NOUVEAU : Obtenir l'historique des missions d'urgence
export const getEmergencyMissionHistory = async (req, res) => {
  try {
    const missions = await dbService.getEmergencyMissions();
    const completed = missions.filter((m) => m.status === "completed" || !m.status);

    // Calculer les statistiques globales d'impact
    const totalMinutesSaved = completed.reduce((acc, m) => acc + (m.timeSavedMinutes || 15), 0);
    const totalKmCovered = completed.reduce((acc, m) => acc + (m.distanceKm || 5), 0);

    res.json({
      count: completed.length,
      stats: {
        totalMissions: completed.length,
        totalMinutesSaved,
        totalKmCovered: parseFloat(totalKmCovered.toFixed(1)),
        avgTimeSavedMinutes: completed.length ? Math.round(totalMinutesSaved / completed.length) : 16,
      },
      missions: completed.slice(0, 30),
    });
  } catch (err) {
    console.error("[getEmergencyMissionHistory Error]", err);
    res.status(500).json({ error: "Erreur récupération historique urgences" });
  }
};

// 9. NOUVEAU : Intervenir directement sur un signalement citoyen (Accident / Obstacle)
export const interveneOnReport = async (req, res) => {
  try {
    const { reportId, vehicleType = "ambulance", city = "Yaoundé" } = req.body;
    const reports = await dbService.getCitizenReports();
    const report = reports.find((r) => r.id === reportId);

    if (!report) {
      return res.status(404).json({ error: "Signalement introuvable" });
    }

    const cityKey = report.city || city || "Yaoundé";
    const hospitals = EMERGENCY_HOSPITALS_DB[cityKey] || EMERGENCY_HOSPITALS_DB["Yaoundé"];
    const nearestHospital = hospitals[0];

    const originPos = report.position || [3.8667, 11.5167];
    const destPos = nearestHospital.position;

    // Calculer le corridor d'intervention
    const customCorridor = {
      id: `report_corridor_${report.id}`,
      name: `Urgence : ${report.title} ➔ ${nearestHospital.name}`,
      origin: report.locationName || "Lieu de l'accident",
      destination: nearestHospital.name,
      distanceKm: 5.2,
      nominalDurationMinutes: 22,
      priorityDurationMinutes: 7,
      timeSavedMinutes: 15,
      coordinates: [originPos, destPos],
      intersections: [
        { id: "int_rep_1", name: `Lieu de l'incident : ${report.locationName || report.title}`, position: originPos, state: "green_wave", crossTrafficLight: "red" },
        { id: "int_rep_2", name: `Entrée Urgences : ${nearestHospital.name}`, position: destPos, state: "pending", crossTrafficLight: "red" },
      ],
    };

    activeEmergencyMission = buildMission({
      vehicleType,
      city: cityKey,
      corridorId: customCorridor.id,
      origin: customCorridor.origin,
      destination: customCorridor.destination,
      customData: customCorridor,
    });

    const missions = await dbService.getEmergencyMissions();
    missions.unshift(activeEmergencyMission);
    await dbService.saveEmergencyMissions(missions);

    broadcastEmergencyUpdate(activeEmergencyMission);

    res.status(201).json({
      success: true,
      message: `🚨 Secours en route vers le signalement "${report.title}" ! Onde verte activée.`,
      mission: activeEmergencyMission,
    });
  } catch (err) {
    console.error("[interveneOnReport Error]", err);
    res.status(500).json({ error: "Erreur intervention sur signalement" });
  }
};
