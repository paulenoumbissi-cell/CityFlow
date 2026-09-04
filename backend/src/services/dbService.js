import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dossier de stockage des données persistantes
const DATA_DIR = path.resolve(__dirname, "../../data");

// Données initiales (Seeds)
const INITIAL_REPORTS = [
  {
    id: "rep_yde_01",
    author: "Marc T.",
    city: "Yaoundé",
    category: "accident",
    title: "Collision légère entre 2 taxis",
    locationDescription: "Carrefour Nlongkak, voie droite vers Bastos",
    position: [3.8825, 11.5175],
    severity: "high",
    reportedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    confirmationsCount: 4,
    resolutionsCount: 0,
    isVerified: true,
    status: "active",
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
    position: [3.868, 11.521],
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
    position: [4.062, 9.712],
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
    position: [4.045, 9.742],
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

const INITIAL_PROFILE = {
  userId: "user_current",
  userName: "Paul Enoumbissi",
  userEmail: "paul.enoumbissi@cityflow.cm",
  points: 485,
  level: "Sentinelle Urbaine",
  levelBadge: "🛡️ Sentinelle",
  reportsCount: 14,
  votesCount: 38,
  resolvedCount: 9,
  streakDays: 5,
  badges: [
    { id: "first_report", title: "Premier Signalement", icon: "📍", unlocked: true, unlockedAt: "2026-08-10" },
    { id: "verifier_10", title: "Vérificateur Actif", icon: "🔍", unlocked: true, unlockedAt: "2026-08-22" },
    { id: "eco_driver", title: "Éco-Conducteur", icon: "🌱", unlocked: true, unlockedAt: "2026-08-28" },
    { id: "hero_50", title: "Héros des Carrefours", icon: "🦸‍♂️", unlocked: false, progress: 14, maxProgress: 50 },
  ],
};

class DbService {
  constructor() {
    this.initialized = false;
  }

  async ensureDataDir() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (err) {
      console.error("[DbService] Erreur création dossier data:", err);
    }
  }

  async init() {
    if (this.initialized) return;
    await this.ensureDataDir();

    // Initialiser citizen_reports.json si inexistant
    const reportsPath = path.join(DATA_DIR, "citizen_reports.json");
    try {
      await fs.access(reportsPath);
    } catch {
      await fs.writeFile(reportsPath, JSON.stringify(INITIAL_REPORTS, null, 2), "utf-8");
      console.log("[DbService] Initialisé citizen_reports.json avec les données par défaut");
    }

    // Initialiser citizen_profile.json si inexistant
    const profilePath = path.join(DATA_DIR, "citizen_profile.json");
    try {
      await fs.access(profilePath);
    } catch {
      await fs.writeFile(profilePath, JSON.stringify(INITIAL_PROFILE, null, 2), "utf-8");
      console.log("[DbService] Initialisé citizen_profile.json");
    }

    // Initialiser emergency_missions.json si inexistant
    const emergencyPath = path.join(DATA_DIR, "emergency_missions.json");
    try {
      await fs.access(emergencyPath);
    } catch {
      await fs.writeFile(emergencyPath, JSON.stringify([], null, 2), "utf-8");
      console.log("[DbService] Initialisé emergency_missions.json");
    }

    this.initialized = true;
  }

  async read(filename, defaultValue = []) {
    await this.init();
    const filePath = path.join(DATA_DIR, filename);
    try {
      const data = await fs.readFile(filePath, "utf-8");
      return JSON.parse(data);
    } catch (err) {
      console.warn(`[DbService] Lecture impossible pour ${filename}, utilisation valeur par défaut`, err.message);
      return defaultValue;
    }
  }

  async write(filename, data) {
    await this.init();
    const filePath = path.join(DATA_DIR, filename);
    const tempPath = `${filePath}.tmp`;
    try {
      // Écriture atomique avec fichier temporaire
      await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8");
      await fs.rename(tempPath, filePath);
    } catch (err) {
      console.error(`[DbService] Erreur écriture dans ${filename}:`, err);
      throw err;
    }
  }

  // Getters & Setters helpers
  async getReports() {
    return this.read("citizen_reports.json", INITIAL_REPORTS);
  }

  async saveReports(reports) {
    return this.write("citizen_reports.json", reports);
  }

  async getProfile() {
    return this.read("citizen_profile.json", INITIAL_PROFILE);
  }

  async saveProfile(profile) {
    return this.write("citizen_profile.json", profile);
  }

  async getEmergencyMissions() {
    return this.read("emergency_missions.json", []);
  }

  async saveEmergencyMissions(missions) {
    return this.write("emergency_missions.json", missions);
  }
}

export const dbService = new DbService();
export default dbService;
