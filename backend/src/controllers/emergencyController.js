import { broadcastEmergencyUpdate, broadcastEmergencyCancel } from "../services/websocketServer.js";
import dbService from "../services/dbService.js";

// Contrôleur de gestion des missions de secours & régulation d'onde verte (Green Wave) avec persistance

const EMERGENCY_CORRIDORS_DB = {
  "Yaoundé": [
    {
      id: "yde_corridor_hopital_central",
      name: "Corridor Nord ➔ Hôpital Central de Yaoundé",
      origin: "Caserne Sapeurs-Pompiers Nlongkak",
      destination: "Urgences - Hôpital Central de Yaoundé",
      distanceKm: 5.4,
      nominalDurationMinutes: 24,
      priorityDurationMinutes: 9,
      timeSavedMinutes: 15,
      coordinates: [
        [3.8820, 11.5170], // Nlongkak
        [3.8730, 11.5180], // Warda
        [3.8640, 11.5190], // Poste Centrale
        [3.8590, 11.5130], // Carrefour Hôpital Central
      ],
      intersections: [
        { id: "int_yde_1", name: "Carrefour Nlongkak", position: [3.8820, 11.5170], state: "green_wave", crossTrafficLight: "red" },
        { id: "int_yde_2", name: "Carrefour Warda / Mfoundi", position: [3.8730, 11.5180], state: "pending", crossTrafficLight: "red" },
        { id: "int_yde_3", name: "Poste Centrale (Bld 20 Mai)", position: [3.8640, 11.5190], state: "pending", crossTrafficLight: "red" },
        { id: "int_yde_4", name: "Carrefour Hôpital Central", position: [3.8590, 11.5130], state: "pending", crossTrafficLight: "red" },
      ],
    },
    {
      id: "yde_corridor_chuy",
      name: "Corridor Ouest ➔ CHU de Melen (CHUY)",
      origin: "Poste Centrale",
      destination: "Centre Hospitalier Universitaire (CHUY)",
      distanceKm: 6.1,
      nominalDurationMinutes: 28,
      priorityDurationMinutes: 11,
      timeSavedMinutes: 17,
      coordinates: [
        [3.8640, 11.5190], // Poste Centrale
        [3.8690, 11.5050], // Bastos / Tsinga
        [3.8610, 11.4980], // Carrefour Melen
        [3.8550, 11.4920], // CHUY
      ],
      intersections: [
        { id: "int_yde_5", name: "Poste Centrale", position: [3.8640, 11.5190], state: "green_wave", crossTrafficLight: "red" },
        { id: "int_yde_6", name: "Carrefour Bastos", position: [3.8690, 11.5050], state: "pending", crossTrafficLight: "red" },
        { id: "int_yde_7", name: "Carrefour Melen", position: [3.8610, 11.4980], state: "pending", crossTrafficLight: "red" },
        { id: "int_yde_8", name: "Entrée Urgences CHUY", position: [3.8550, 11.4920], state: "pending", crossTrafficLight: "red" },
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
      priorityDurationMinutes: 8,
      timeSavedMinutes: 18,
      coordinates: [
        [4.0620, 9.7120], // Rond-point Deido
        [4.0530, 9.7080], // Carrefour Akwa
        [4.0480, 9.7010], // Boulevard de la Liberté
        [4.0420, 9.6980], // Hôpital Laquintinie
      ],
      intersections: [
        { id: "int_dla_1", name: "Rond-point Deido", position: [4.0620, 9.7120], state: "green_wave", crossTrafficLight: "red" },
        { id: "int_dla_2", name: "Carrefour Akwa Palace", position: [4.0530, 9.7080], state: "pending", crossTrafficLight: "red" },
        { id: "int_dla_3", name: "Boulevard de la Liberté", position: [4.0480, 9.7010], state: "pending", crossTrafficLight: "red" },
        { id: "int_dla_4", name: "Accès Urgences Laquintinie", position: [4.0420, 9.6980], state: "pending", crossTrafficLight: "red" },
      ],
    },
    {
      id: "dla_corridor_hopital_general",
      name: "Corridor Est ➔ Hôpital Général de Douala",
      origin: "Poste de Commandement Ndokoti",
      destination: "Hôpital Général de Douala (Logbessou)",
      distanceKm: 7.2,
      nominalDurationMinutes: 35,
      priorityDurationMinutes: 12,
      timeSavedMinutes: 23,
      coordinates: [
        [4.0450, 9.7420], // Ndokoti
        [4.0510, 9.7550], // Axe Lourd Bassa
        [4.0610, 9.7680], // Carrefour Cité des Palmiers
        [4.0720, 9.7790], // Hôpital Général
      ],
      intersections: [
        { id: "int_dla_5", name: "Carrefour Ndokoti", position: [4.0450, 9.7420], state: "green_wave", crossTrafficLight: "red" },
        { id: "int_dla_6", name: "Axe Lourd Bassa", position: [4.0510, 9.7550], state: "pending", crossTrafficLight: "red" },
        { id: "int_dla_7", name: "Carrefour Cité des Palmiers", position: [4.0610, 9.7680], state: "pending", crossTrafficLight: "red" },
        { id: "int_dla_8", name: "Entrée Hôpital Général", position: [4.0720, 9.7790], state: "pending", crossTrafficLight: "red" },
      ],
    },
  ],
};

let activeEmergencyMission = null;

// Helper : Créer une mission active
function buildMission({ vehicleType, city, corridorId, origin, destination }) {
  const cityKey = city && city.toLowerCase().includes("douala") ? "Douala" : "Yaoundé";
  const corridors = EMERGENCY_CORRIDORS_DB[cityKey] || EMERGENCY_CORRIDORS_DB["Yaoundé"];
  
  let corridor = corridors.find((c) => c.id === corridorId);
  if (!corridor) {
    corridor = corridors[0];
  }

  const vehicleDetails = {
    ambulance: { name: "Ambulance SAMU 119", badge: "Urgence médicale vitale", color: "#EF4444", icon: "Siren" },
    firefighters: { name: "Sapeurs-Pompiers (CCF 118)", badge: "Intervention Incendie & Secours", color: "#EA580C", icon: "Flame" },
    police: { name: "Police Secours 117", badge: "Intervention d'Urgence", color: "#2563EB", icon: "Shield" },
    convoy: { name: "Convoi Sécurisé", badge: "Priorité absolue", color: "#7C3AED", icon: "Sparkles" },
  };

  const vInfo = vehicleDetails[vehicleType] || vehicleDetails.ambulance;

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

// 1. Déclencher une mission de secours
export const dispatchEmergencyMission = async (req, res) => {
  try {
    const { vehicleType = "ambulance", city = "Yaoundé", corridorId, origin, destination } = req.body;

    activeEmergencyMission = buildMission({
      vehicleType,
      city,
      corridorId,
      origin,
      destination,
    });

    const missions = await dbService.getEmergencyMissions();
    missions.unshift(activeEmergencyMission);
    await dbService.saveEmergencyMissions(missions);

    // Broadcast WebSocket en direct
    broadcastEmergencyUpdate(activeEmergencyMission);

    res.status(201).json({
      success: true,
      message: `Mission d'urgence ${activeEmergencyMission.vehicleName} enclenchée avec Onde Verte automatique !`,
      mission: activeEmergencyMission,
    });
  } catch (err) {
    console.error("[dispatchEmergencyMission Error]", err);
    res.status(500).json({ error: "Erreur enclenchement mission d'urgence" });
  }
};

// 2. Obtenir la mission en cours
export const getActiveEmergencyMission = (req, res) => {
  const { city } = req.query;

  if (!activeEmergencyMission) {
    return res.json({
      active: false,
      mission: null,
      corridorsAvailable: city && city.toLowerCase().includes("douala")
        ? EMERGENCY_CORRIDORS_DB["Douala"]
        : EMERGENCY_CORRIDORS_DB["Yaoundé"],
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
