import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "../../data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.SQLITE_DB_PATH || path.join(DATA_DIR, "cityflow.db");

// Initialisation de la base de données (PostgreSQL si DATABASE_URL est fourni, sinon SQLite)
let sqliteDb = null;
let pgPool = null;
export let isPostgres = false;

// Helper pour convertir le SQL SQLite (?, @named) en syntaxe PostgreSQL ($1, $2)
function formatSqlForPg(sql, params) {
  let paramIndex = 1;
  let formattedSql = sql;
  let formattedParams = params;

  if (Array.isArray(params)) {
    formattedSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
  } else if (params && typeof params === "object") {
    formattedParams = [];
    formattedSql = sql.replace(/@([a-zA-Z0-9_]+)/g, (_, key) => {
      formattedParams.push(params[key]);
      return `$${paramIndex++}`;
    });
  }

  return { formattedSql, formattedParams: formattedParams || [] };
}

if (process.env.DATABASE_URL) {
  try {
    const { default: pg } = await import("pg");
    const { Pool } = pg;
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
    });

    // Test de connexion
    const client = await pgPool.connect();
    client.release();
    isPostgres = true;
    console.log(`[CityFlow Database] 🐘 Connecté avec succès à PostgreSQL : ${process.env.DATABASE_URL.split('@')[1] || 'localhost'}`);
  } catch (err) {
    console.warn(`[CityFlow Database] ⚠️ Impossible de joindre PostgreSQL (${err.message}). Bascule automatique sur SQLite.`);
    pgPool = null;
    isPostgres = false;
  }
}

if (!isPostgres) {
  try {
    sqliteDb = new Database(DB_PATH, {});
    sqliteDb.pragma("journal_mode = WAL");
    sqliteDb.pragma("synchronous = NORMAL");
    sqliteDb.pragma("foreign_keys = ON");
    console.log(`[CityFlow Database] 💾 Connecté avec succès à SQLite : ${DB_PATH}`);
  } catch (err) {
    console.error("[CityFlow Database] Erreur critique initialisation SQLite :", err);
    throw err;
  }
}

/**
 * Création et migration des tables CityFlow
 */
export async function initDatabaseSchema() {
  if (isPostgres && pgPool) {
    const pgSchemaPath = path.resolve(__dirname, "../../data/schema_postgres.sql");
    if (fs.existsSync(pgSchemaPath)) {
      const sql = fs.readFileSync(pgSchemaPath, "utf-8");
      try {
        await pgPool.query(sql);
        console.log("[CityFlow Database] 🐘 Schéma des tables PostgreSQL synchronisé avec succès");
      } catch (err) {
        console.warn("[CityFlow Database] Avertissement init schéma PostgreSQL :", err.message);
      }
    }
    return;
  }

  const schemaSql = `
    -- 1. TABLE UTILISATEURS
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT,
      city TEXT NOT NULL DEFAULT 'Yaoundé',
      role TEXT NOT NULL DEFAULT 'citizen',
      role_label TEXT DEFAULT 'Conducteur / Citoyen',
      vehicle_type TEXT DEFAULT 'Voiture particulière',
      points INTEGER NOT NULL DEFAULT 380,
      trust_score INTEGER NOT NULL DEFAULT 85,
      trips_count INTEGER NOT NULL DEFAULT 0,
      time_saved_min INTEGER NOT NULL DEFAULT 0,
      co2_saved_kg REAL NOT NULL DEFAULT 0.0,
      channel TEXT DEFAULT 'whatsapp',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);

    -- 2. TABLE DES SIGNALEMENTS CITOYENS
    CREATE TABLE IF NOT EXISTS citizen_reports (
      id TEXT PRIMARY KEY,
      author_id TEXT,
      author_name TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT 'Yaoundé',
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      location_description TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      severity TEXT NOT NULL DEFAULT 'moderate',
      status TEXT NOT NULL DEFAULT 'active',
      is_verified INTEGER NOT NULL DEFAULT 0,
      confirmations_count INTEGER NOT NULL DEFAULT 0,
      resolutions_count INTEGER NOT NULL DEFAULT 0,
      upvoted_by_json TEXT DEFAULT '[]',
      downvoted_by_json TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reports_city ON citizen_reports(city);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON citizen_reports(status);
    CREATE INDEX IF NOT EXISTS idx_reports_category ON citizen_reports(category);

    -- 3. TABLE DES MISSIONS D'URGENCE
    CREATE TABLE IF NOT EXISTS emergency_missions (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'in_progress',
      vehicle_type TEXT NOT NULL,
      vehicle_name TEXT NOT NULL,
      badge TEXT,
      color TEXT,
      city TEXT NOT NULL,
      corridor_id TEXT,
      corridor_name TEXT,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      distance_km REAL,
      nominal_duration_min INTEGER,
      priority_duration_min INTEGER,
      time_saved_min INTEGER,
      speed_kmh INTEGER DEFAULT 75,
      current_step_index INTEGER DEFAULT 0,
      coordinates_json TEXT NOT NULL,
      intersections_json TEXT NOT NULL,
      broadcast_alert_json TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_emergency_city ON emergency_missions(city);
    CREATE INDEX IF NOT EXISTS idx_emergency_status ON emergency_missions(status);

    -- 4. TABLE DES ABONNEMENTS
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT NOT NULL,
      plan_name TEXT NOT NULL,
      category TEXT DEFAULT 'b2c',
      base_price INTEGER NOT NULL,
      beneficiaries TEXT,
      discount_percent INTEGER DEFAULT 0,
      discount_amount INTEGER DEFAULT 0,
      points_deducted INTEGER DEFAULT 0,
      final_price INTEGER NOT NULL,
      is_free_month INTEGER DEFAULT 0,
      reward_applied TEXT,
      payment_method TEXT DEFAULT 'MTN Mobile Money',
      phone_number TEXT,
      status TEXT DEFAULT 'active',
      subscribed_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

    -- 5. TABLE DES CODES OTP
    CREATE TABLE IF NOT EXISTS otp_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      code TEXT NOT NULL,
      channel TEXT NOT NULL,
      name TEXT,
      role TEXT,
      city TEXT,
      vehicle_type TEXT,
      expires_at INTEGER NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_otp_identifier ON otp_codes(identifier);

    -- 6. TABLE DES LOGS DE TRAFIC
    CREATE TABLE IF NOT EXISTS traffic_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      city TEXT NOT NULL,
      node_id TEXT NOT NULL,
      node_name TEXT NOT NULL,
      congestion_level TEXT NOT NULL,
      speed_kmh REAL NOT NULL,
      delay_min REAL NOT NULL,
      recorded_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_traffic_city_time ON traffic_logs(city, recorded_at);
  `;

  sqliteDb.exec(schemaSql);
  console.log("[CityFlow Database] 💾 Schéma des tables SQLite initialisé avec succès");

  // Seeder SQLite
  seedInitialData();
}

function seedInitialData() {
  if (!sqliteDb) return;
  const usersCount = sqliteDb.prepare("SELECT COUNT(*) as count FROM users").get().count;

  if (usersCount === 0) {
    console.log("[CityFlow Database] Seeding des données par défaut...");
    const now = new Date().toISOString();

    const insertUser = sqliteDb.prepare(`
      INSERT INTO users (
        id, name, phone, email, password, city, role, role_label, vehicle_type,
        points, trust_score, trips_count, time_saved_min, co2_saved_kg, channel, created_at, updated_at
      ) VALUES (
        @id, @name, @phone, @email, @password, @city, @role, @role_label, @vehicle_type,
        @points, @trust_score, @trips_count, @time_saved_min, @co2_saved_kg, @channel, @created_at, @updated_at
      )
    `);

    const initialUsers = [
      {
        id: "usr_current",
        name: "Paul Enoumbissi",
        phone: "+237699123456",
        email: "paul.enoumbissi@cityflow.cm",
        password: "password123",
        city: "Yaoundé",
        role: "citizen",
        role_label: "Conducteur / Citoyen",
        vehicle_type: "Voiture particulière",
        points: 380,
        trust_score: 85,
        trips_count: 47,
        time_saved_min: 184,
        co2_saved_kg: 14.2,
        channel: "whatsapp",
        created_at: now,
        updated_at: now,
      },
      {
        id: "usr_002",
        name: "Dr. Paul Ebanda (SAMU 119)",
        phone: "+237677889900",
        email: "samu@cityflow.cm",
        password: "password123",
        city: "Yaoundé",
        role: "emergency",
        role_label: "Services d'Urgence / SAMU",
        vehicle_type: "Ambulance / SAMU",
        points: 520,
        trust_score: 99,
        trips_count: 128,
        time_saved_min: 640,
        co2_saved_kg: 48.0,
        channel: "sms",
        created_at: now,
        updated_at: now,
      },
      {
        id: "usr_003",
        name: "Ing. Christian Haman",
        phone: "+237695001122",
        email: "regulateur@cityflow.cm",
        password: "password123",
        city: "Douala",
        role: "traffic_manager",
        role_label: "Régulateur Urbain / Communauté Urbaine",
        vehicle_type: "Poste Central de Contrôle",
        points: 430,
        trust_score: 96,
        trips_count: 230,
        time_saved_min: 1240,
        co2_saved_kg: 110.5,
        channel: "whatsapp",
        created_at: now,
        updated_at: now,
      },
    ];

    const insertManyUsers = sqliteDb.transaction((users) => {
      for (const u of users) insertUser.run(u);
    });
    insertManyUsers(initialUsers);

    const insertReport = sqliteDb.prepare(`
      INSERT INTO citizen_reports (
        id, author_id, author_name, city, category, title, location_description,
        lat, lng, severity, status, is_verified, confirmations_count, resolutions_count,
        upvoted_by_json, downvoted_by_json, created_at, updated_at
      ) VALUES (
        @id, @author_id, @author_name, @city, @category, @title, @location_description,
        @lat, @lng, @severity, @status, @is_verified, @confirmations_count, @resolutions_count,
        @upvoted_by_json, @downvoted_by_json, @created_at, @updated_at
      )
    `);

    const initialReports = [
      {
        id: "rep_yde_01",
        author_id: "usr_001",
        author_name: "Marc T.",
        city: "Yaoundé",
        category: "accident",
        title: "Collision légère entre 2 taxis",
        location_description: "Carrefour Nlongkak, voie droite vers Bastos",
        lat: 3.8825,
        lng: 11.5175,
        severity: "high",
        status: "active",
        is_verified: 1,
        confirmations_count: 4,
        resolutions_count: 0,
        upvoted_by_json: JSON.stringify(["user_demo_1", "user_demo_2"]),
        downvoted_by_json: JSON.stringify([]),
        created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        updated_at: now,
      },
      {
        id: "rep_yde_02",
        author_id: "usr_001",
        author_name: "Sophie M.",
        city: "Yaoundé",
        category: "roadworks",
        title: "Nid de poule béant en cours de comblement",
        location_description: "Avenue Kennedy face pharmacie",
        lat: 3.868,
        lng: 11.521,
        severity: "moderate",
        status: "active",
        is_verified: 0,
        confirmations_count: 2,
        resolutions_count: 0,
        upvoted_by_json: JSON.stringify(["user_demo_3"]),
        downvoted_by_json: JSON.stringify([]),
        created_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
        updated_at: now,
      },
      {
        id: "rep_dla_01",
        author_id: "usr_003",
        author_name: "Christian B.",
        city: "Douala",
        category: "breakdown",
        title: "Camion conteneur arrêté sur la voie",
        location_description: "Rond-point Deido, sortie vers Pont Wouri",
        lat: 4.062,
        lng: 9.712,
        severity: "critical",
        status: "active",
        is_verified: 1,
        confirmations_count: 6,
        resolutions_count: 0,
        upvoted_by_json: JSON.stringify(["user_demo_4", "user_demo_5", "user_demo_6"]),
        downvoted_by_json: JSON.stringify([]),
        created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        updated_at: now,
      },
    ];

    const insertManyReports = sqliteDb.transaction((reports) => {
      for (const r of reports) insertReport.run(r);
    });
    insertManyReports(initialReports);
  }
}

// Initialiser le schéma automatiquement au démarrage
await initDatabaseSchema();

/**
 * Interface d'accès générique à la base de données (Universal PostgreSQL / SQLite)
 */
export const db = {
  raw: sqliteDb || pgPool,
  isPostgres,

  // Requête retournant une seule ligne
  async get(sql, params = []) {
    try {
      if (isPostgres && pgPool) {
        const { formattedSql, formattedParams } = formatSqlForPg(sql, params);
        const res = await pgPool.query(formattedSql, formattedParams);
        return res.rows[0] || null;
      }
      const stmt = sqliteDb.prepare(sql);
      return Array.isArray(params) ? stmt.get(...params) : stmt.get(params);
    } catch (err) {
      console.error("[Database GET Error]", sql, err.message);
      throw err;
    }
  },

  // Requête retournant toutes les lignes
  async all(sql, params = []) {
    try {
      if (isPostgres && pgPool) {
        const { formattedSql, formattedParams } = formatSqlForPg(sql, params);
        const res = await pgPool.query(formattedSql, formattedParams);
        return res.rows;
      }
      const stmt = sqliteDb.prepare(sql);
      return Array.isArray(params) ? stmt.all(...params) : stmt.all(params);
    } catch (err) {
      console.error("[Database ALL Error]", sql, err.message);
      throw err;
    }
  },

  // Exécution d'une commande (INSERT / UPDATE / DELETE)
  async run(sql, params = []) {
    try {
      if (isPostgres && pgPool) {
        const { formattedSql, formattedParams } = formatSqlForPg(sql, params);
        const res = await pgPool.query(formattedSql, formattedParams);
        return { changes: res.rowCount, rowCount: res.rowCount };
      }
      const stmt = sqliteDb.prepare(sql);
      return Array.isArray(params) ? stmt.run(...params) : stmt.run(params);
    } catch (err) {
      console.error("[Database RUN Error]", sql, err.message);
      throw err;
    }
  },

  // Exécution de transactions
  async transaction(fn) {
    if (isPostgres && pgPool) {
      const client = await pgPool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
    return sqliteDb.transaction(fn);
  },

  // Exécution de scripts SQL bruts
  async exec(sql) {
    if (isPostgres && pgPool) {
      return await pgPool.query(sql);
    }
    return sqliteDb.exec(sql);
  },
};

export default db;
