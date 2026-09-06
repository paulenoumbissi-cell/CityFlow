-- ============================================================================
-- CITYFLOW - SCHÉMA COMPLET POSTGRESQL & DONNÉES INITIALES
-- Compatible avec PostgreSQL 12, 13, 14, 15, 16, 17, 18
-- ============================================================================

-- 1. TABLE DES UTILISATEURS (Citoyens, SAMU, Régulateurs)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    phone VARCHAR(64) UNIQUE,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    bio TEXT,
    avatar TEXT,
    city VARCHAR(100) NOT NULL DEFAULT 'Yaoundé',
    role VARCHAR(50) NOT NULL DEFAULT 'citizen',
    role_label VARCHAR(100) DEFAULT 'Conducteur / Citoyen',
    vehicle_type VARCHAR(100) DEFAULT 'Voiture particulière',
    points INTEGER NOT NULL DEFAULT 380,
    trust_score INTEGER NOT NULL DEFAULT 85,
    trips_count INTEGER NOT NULL DEFAULT 0,
    time_saved_min INTEGER NOT NULL DEFAULT 0,
    co2_saved_kg NUMERIC(8, 2) NOT NULL DEFAULT 0.0,
    channel VARCHAR(50) DEFAULT 'whatsapp',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migration automatique des colonnes et contraintes
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);

-- 2. TABLE DES SIGNALEMENTS CITOYENS (Incidents, Nids-de-poule, Accidents)
CREATE TABLE IF NOT EXISTS citizen_reports (
    id VARCHAR(64) PRIMARY KEY,
    author_id VARCHAR(64),
    author_name VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL DEFAULT 'Yaoundé',
    category VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    location_description TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'moderate',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    confirmations_count INTEGER NOT NULL DEFAULT 0,
    resolutions_count INTEGER NOT NULL DEFAULT 0,
    upvoted_by_json TEXT DEFAULT '[]',
    downvoted_by_json TEXT DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reports_city ON citizen_reports(city);
CREATE INDEX IF NOT EXISTS idx_reports_status ON citizen_reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON citizen_reports(category);

-- 3. TABLE DES MISSIONS D'URGENCE (SAMU / Onde Verte & Priorité Feux)
CREATE TABLE IF NOT EXISTS emergency_missions (
    id VARCHAR(64) PRIMARY KEY,
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    vehicle_type VARCHAR(50) NOT NULL,
    vehicle_name VARCHAR(255) NOT NULL,
    badge VARCHAR(50),
    color VARCHAR(50),
    city VARCHAR(100) NOT NULL,
    corridor_id VARCHAR(100),
    corridor_name VARCHAR(255),
    origin VARCHAR(255) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    distance_km NUMERIC(8, 2),
    nominal_duration_min INTEGER,
    priority_duration_min INTEGER,
    time_saved_min INTEGER,
    speed_kmh INTEGER DEFAULT 75,
    current_step_index INTEGER DEFAULT 0,
    coordinates_json TEXT NOT NULL,
    intersections_json TEXT NOT NULL,
    broadcast_alert_json TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_emergency_city ON emergency_missions(city);
CREATE INDEX IF NOT EXISTS idx_emergency_status ON emergency_missions(status);

-- 4. TABLE DES ABONNEMENTS ET PROGRAMME DE RÉCOMPENSES
CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL,
    plan_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'b2c',
    base_price INTEGER NOT NULL,
    beneficiaries VARCHAR(100),
    discount_percent INTEGER DEFAULT 0,
    discount_amount INTEGER DEFAULT 0,
    points_deducted INTEGER DEFAULT 0,
    final_price INTEGER NOT NULL,
    is_free_month BOOLEAN DEFAULT FALSE,
    reward_applied VARCHAR(255),
    payment_method VARCHAR(100) DEFAULT 'MTN Mobile Money',
    phone_number VARCHAR(64),
    status VARCHAR(50) DEFAULT 'active',
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- 5. TABLE DES CODES OTP (SMS / WhatsApp / Email)
CREATE TABLE IF NOT EXISTS otp_codes (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    code VARCHAR(10) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50),
    city VARCHAR(100),
    vehicle_type VARCHAR(100),
    expires_at BIGINT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_identifier ON otp_codes(identifier);

-- 6. TABLE DES LOGS DE TRAFIC ET TÉLÉMÉTRIE
CREATE TABLE IF NOT EXISTS traffic_logs (
    id SERIAL PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    node_id VARCHAR(100) NOT NULL,
    node_name VARCHAR(255) NOT NULL,
    congestion_level VARCHAR(50) NOT NULL,
    speed_kmh NUMERIC(8, 2) NOT NULL,
    delay_min NUMERIC(8, 2) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_traffic_city_time ON traffic_logs(city, recorded_at);

-- ============================================================================
-- INSERTION DES DONNÉES PAR DÉFAUT (SEEDING)
-- ============================================================================

INSERT INTO users (
    id, name, username, phone, email, password, bio, city, role, role_label, vehicle_type,
    points, trust_score, trips_count, time_saved_min, co2_saved_kg, channel
) VALUES 
(
    'usr_current', 'Paul Enoumbissi', 'paul_237', '+237699123456', 'paul.enoumbissi@cityflow.cm', 'password123',
    'Conducteur quotidien engagé pour une mobilité fluide à Yaoundé et Douala.',
    'Yaoundé', 'citizen', 'Conducteur / Citoyen', 'Voiture particulière',
    380, 85, 47, 184, 14.20, 'whatsapp'
),
(
    'usr_001', 'Conducteur Démo', 'conducteur_yde', '+237699000000', 'conducteur@cityflow.cm', 'password123',
    'Conducteur régulier sur les axes Yaoundé et Douala.',
    'Yaoundé', 'citizen', 'Conducteur / Citoyen', 'Voiture particulière',
    380, 85, 47, 184, 14.20, 'email'
),
(
    'usr_002', 'Dr. Paul Ebanda (SAMU 119)', 'samu_119', '+237677889900', 'samu@cityflow.cm', 'password123',
    'Médecin urgentiste et coordinateur SAMU 119 Onde Verte.',
    'Yaoundé', 'emergency', 'Services d''Urgence / SAMU', 'Ambulance / SAMU',
    520, 99, 128, 640, 48.00, 'sms'
),
(
    'usr_003', 'Ing. Christian Haman', 'regulateur_cuy', '+237695001122', 'regulateur@cityflow.cm', 'password123',
    'Ingénieur régulation du trafic urbain de Douala.',
    'Douala', 'traffic_manager', 'Régulateur Urbain / Communauté Urbaine', 'Poste Central de Contrôle',
    430, 96, 230, 1240, 110.50, 'whatsapp'
)
ON CONFLICT (email) DO UPDATE SET password = excluded.password, name = excluded.name;
