import db from "./database.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");

/**
 * Service de persistance de données CityFlow universel (PostgreSQL & SQLite)
 */
class DbService {
  constructor() {
    this.db = db;
  }

  // =========================================================================
  // 1. SIGNALEMENTS CITOYENS (REPORTS)
  // =========================================================================

  async getReports(city = null) {
    try {
      let rows;
      if (city && city !== "all") {
        rows = await this.db.all(
          "SELECT * FROM citizen_reports WHERE LOWER(city) = LOWER(?) ORDER BY created_at DESC",
          [city]
        );
      } else {
        rows = await this.db.all("SELECT * FROM citizen_reports ORDER BY created_at DESC");
      }

      return (rows || []).map((r) => ({
        id: r.id,
        author: r.author_name,
        authorId: r.author_id,
        city: r.city,
        category: r.category,
        title: r.title,
        locationDescription: r.location_description,
        position: [parseFloat(r.lat) || 3.8667, parseFloat(r.lng) || 11.5167],
        severity: r.severity,
        status: r.status,
        isVerified: Boolean(r.is_verified),
        confirmationsCount: r.confirmations_count,
        resolutionsCount: r.resolutions_count,
        reportedAt: r.created_at,
        upvotedBy: typeof r.upvoted_by_json === "string" ? JSON.parse(r.upvoted_by_json || "[]") : (r.upvoted_by_json || []),
        downvotedBy: typeof r.downvoted_by_json === "string" ? JSON.parse(r.downvoted_by_json || "[]") : (r.downvoted_by_json || []),
      }));
    } catch (err) {
      console.error("[DbService getReports Error]", err.message);
      return [];
    }
  }

  async saveReports(reports) {
    try {
      const now = new Date().toISOString();
      for (const r of reports) {
        const pos = r.position || [3.8667, 11.5167];
        const reportObj = {
          id: r.id,
          author_id: r.authorId || r.author_id || "usr_current",
          author_name: r.author || r.author_name || "Citoyen CityFlow",
          city: r.city || "Yaoundé",
          category: r.category || "accident",
          title: r.title,
          location_description: r.locationDescription || r.location_description || "",
          lat: pos[0],
          lng: pos[1],
          severity: r.severity || "moderate",
          status: r.status || "active",
          is_verified: r.isVerified ? 1 : 0,
          confirmations_count: r.confirmationsCount || 0,
          resolutions_count: r.resolutionsCount || 0,
          upvoted_by_json: JSON.stringify(r.upvotedBy || []),
          downvoted_by_json: JSON.stringify(r.downvotedBy || []),
          created_at: r.reportedAt || now,
          updated_at: now,
        };

        await this.db.run(
          `
          INSERT INTO citizen_reports (
            id, author_id, author_name, city, category, title, location_description,
            lat, lng, severity, status, is_verified, confirmations_count, resolutions_count,
            upvoted_by_json, downvoted_by_json, created_at, updated_at
          ) VALUES (
            @id, @author_id, @author_name, @city, @category, @title, @location_description,
            @lat, @lng, @severity, @status, @is_verified, @confirmations_count, @resolutions_count,
            @upvoted_by_json, @downvoted_by_json, @created_at, @updated_at
          )
          ON CONFLICT(id) DO UPDATE SET
            author_name = excluded.author_name,
            title = excluded.title,
            location_description = excluded.location_description,
            severity = excluded.severity,
            status = excluded.status,
            is_verified = excluded.is_verified,
            confirmations_count = excluded.confirmations_count,
            resolutions_count = excluded.resolutions_count,
            upvoted_by_json = excluded.upvoted_by_json,
            downvoted_by_json = excluded.downvoted_by_json,
            updated_at = excluded.updated_at
        `,
          reportObj
        );
      }
      return true;
    } catch (err) {
      console.error("[DbService saveReports Error]", err.message);
      return false;
    }
  }

  // =========================================================================
  // 2. PROFIL CITOYEN ET ABONNEMENTS (USERS & SUBSCRIPTIONS)
  // =========================================================================

  async getProfile(userId = "usr_current") {
    try {
      let user = await this.db.get("SELECT * FROM users WHERE id = ? OR email = ? OR phone = ?", [
        userId,
        userId,
        userId,
      ]);

      if (!user) {
        user = await this.db.get("SELECT * FROM users LIMIT 1");
      }

      if (!user) {
        return null;
      }

      // Récupérer les abonnements actifs de cet utilisateur
      const subscriptions = (await this.db.all(
        "SELECT * FROM subscriptions WHERE user_id = ? ORDER BY subscribed_at DESC",
        [user.id]
      )) || [];

      // Déterminer le palier et le badge selon les points
      const pts = user.points || 0;
      let levelTitle = "Observateur Urbain";
      let levelNumber = 1;
      let levelBadge = "🛡️ Sentinelle";
      let minPts = 0;
      let maxPts = 100;

      if (pts >= 700) {
        levelTitle = "Capitaine de la Cité";
        levelNumber = 4;
        levelBadge = "👑 Maître du Trafic";
        minPts = 700;
        maxPts = 1500;
      } else if (pts >= 300) {
        levelTitle = "Guide de la Cité";
        levelNumber = 3;
        levelBadge = "⭐ Sentinelle d'Élite";
        minPts = 300;
        maxPts = 700;
      } else if (pts >= 100) {
        levelTitle = "Sentinelle Active";
        levelNumber = 2;
        levelBadge = "🛡️ Sentinelle";
        minPts = 100;
        maxPts = 300;
      }

      const progressPercentage = Math.min(100, Math.round(((pts - minPts) / (maxPts - minPts)) * 100));

      return {
        userId: user.id,
        userName: user.name,
        username: user.username || (user.name ? user.name.toLowerCase().replace(/\s+/g, "_") : "user"),
        userEmail: user.email,
        phone: user.phone,
        bio: user.bio || "Conducteur quotidien engagé pour une mobilité fluide à Yaoundé et Douala.",
        avatar: user.avatar || null,
        city: user.city,
        role: user.role,
        roleLabel: user.role_label,
        vehicleType: user.vehicle_type,
        fcmToken: user.fcm_token,
        points: user.points,
        reputationScore: user.trust_score,
        trustScore: user.trust_score,
        tripsCount: user.trips_count,
        timeSavedMin: user.time_saved_min,
        co2SavedKg: parseFloat(user.co2_saved_kg) || 0.0,
        level: {
          number: levelNumber,
          title: levelTitle,
          badgeIcon: "🗺️",
          minPoints: minPts,
          maxPoints: maxPts,
          progressPercentage,
        },
        levelBadge,
        subscriptions: subscriptions.map((s) => ({
          id: s.id,
          planId: s.plan_id,
          planName: s.plan_name,
          category: s.category,
          basePrice: s.base_price,
          beneficiaries: s.beneficiaries,
          discountPercent: s.discount_percent,
          discountAmount: s.discount_amount,
          pointsDeducted: s.points_deducted,
          finalPrice: s.final_price,
          isFreeMonth: Boolean(s.is_free_month),
          rewardApplied: s.reward_applied,
          paymentMethod: s.payment_method,
          phoneNumber: s.phone_number,
          status: s.status,
          subscribedAt: s.subscribed_at,
          expiresAt: s.expires_at,
        })),
        badges: [
          { id: "first_report", title: "Premier Signalement", icon: "📍", unlocked: true, unlockedAt: "2026-08-10" },
          { id: "verifier_10", title: "Vérificateur Actif", icon: "🔍", unlocked: true, unlockedAt: "2026-08-22" },
          { id: "eco_driver", title: "Éco-Conducteur", icon: "🌱", unlocked: true, unlockedAt: "2026-08-28" },
          { id: "hero_50", title: "Héros des Carrefours", icon: "🦸‍♂️", unlocked: pts >= 300 },
        ],
      };
    } catch (err) {
      console.error("[DbService getProfile Error]", err.message);
      return null;
    }
  }

  async saveProfile(profile) {
    try {
      const now = new Date().toISOString();
      const userId = profile.userId || "usr_current";

      await this.db.run(
        `
        UPDATE users SET
          name = COALESCE(?, name),
          username = COALESCE(?, username),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          bio = COALESCE(?, bio),
          avatar = COALESCE(?, avatar),
          fcm_token = COALESCE(?, fcm_token),
          points = COALESCE(?, points),
          trust_score = COALESCE(?, trust_score),
          updated_at = ?
        WHERE id = ?
      `,
        [
          profile.userName || profile.name,
          profile.username,
          profile.userEmail || profile.email,
          profile.phone,
          profile.bio,
          profile.avatar,
          profile.fcmToken,
          profile.points,
          profile.trustScore || profile.reputationScore,
          now,
          userId,
        ]
      );

      // Si un abonnement a été ajouté
      if (profile.subscriptions && profile.subscriptions.length > 0) {
        const latestSub = profile.subscriptions[0];
        const existingSub = await this.db.get("SELECT id FROM subscriptions WHERE id = ?", [latestSub.id]);
        if (!existingSub) {
          await this.db.run(
            `
            INSERT INTO subscriptions (
              id, user_id, plan_id, plan_name, category, base_price, beneficiaries,
              discount_percent, discount_amount, points_deducted, final_price,
              is_free_month, reward_applied, payment_method, phone_number, status,
              subscribed_at, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
            [
              latestSub.id,
              userId,
              latestSub.planId,
              latestSub.planName,
              latestSub.category || "b2c",
              latestSub.basePrice,
              latestSub.beneficiaries || "1 personne",
              latestSub.discountPercent || 0,
              latestSub.discountAmount || 0,
              latestSub.pointsDeducted || 0,
              latestSub.finalPrice,
              Boolean(latestSub.isFreeMonth),
              latestSub.rewardApplied || "Aucune réduction",
              latestSub.paymentMethod || "MTN Mobile Money",
              latestSub.phoneNumber,
              latestSub.status || "active",
              latestSub.subscribedAt || now,
              latestSub.expiresAt || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
            ]
          );
        }
      }

      return true;
    } catch (err) {
      console.error("[DbService saveProfile Error]", err.message);
      return false;
    }
  }

  // =========================================================================
  // 3. MISSIONS D'URGENCE (EMERGENCY MISSIONS)
  // =========================================================================

  async getEmergencyMissions(city = null) {
    try {
      let rows;
      if (city && city !== "all") {
        rows = await this.db.all(
          "SELECT * FROM emergency_missions WHERE LOWER(city) = LOWER(?) ORDER BY started_at DESC",
          [city]
        );
      } else {
        rows = await this.db.all("SELECT * FROM emergency_missions ORDER BY started_at DESC");
      }

      return (rows || []).map((m) => ({
        id: m.id,
        status: m.status,
        vehicleType: m.vehicle_type,
        vehicleName: m.vehicle_name,
        badge: m.badge,
        color: m.color,
        city: m.city,
        corridorId: m.corridor_id,
        corridorName: m.corridor_name,
        origin: m.origin,
        destination: m.destination,
        distanceKm: parseFloat(m.distance_km) || 5.0,
        nominalDurationMinutes: m.nominal_duration_min,
        priorityDurationMinutes: m.priority_duration_min,
        timeSavedMinutes: m.time_saved_min,
        speedKmh: m.speed_kmh,
        currentStepIndex: m.current_step_index,
        coordinates: typeof m.coordinates_json === "string" ? JSON.parse(m.coordinates_json || "[]") : (m.coordinates_json || []),
        intersections: typeof m.intersections_json === "string" ? JSON.parse(m.intersections_json || "[]") : (m.intersections_json || []),
        broadcastAlert: typeof m.broadcast_alert_json === "string" ? JSON.parse(m.broadcast_alert_json || "{}") : (m.broadcast_alert_json || {}),
        startedAt: m.started_at,
        completedAt: m.completed_at,
      }));
    } catch (err) {
      console.error("[DbService getEmergencyMissions Error]", err.message);
      return [];
    }
  }

  async saveEmergencyMissions(missions) {
    try {
      for (const m of missions) {
        const missionObj = {
          id: m.id,
          status: m.status || "in_progress",
          vehicle_type: m.vehicleType || "ambulance",
          vehicle_name: m.vehicleName || "Ambulance SAMU 119",
          badge: m.badge || "",
          color: m.color || "#ef4444",
          city: m.city || "Yaoundé",
          corridor_id: m.corridorId || null,
          corridor_name: m.corridorName || null,
          origin: m.origin || "Départ",
          destination: m.destination || "Arrivée",
          distance_km: m.distanceKm || 5.0,
          nominal_duration_min: m.nominalDurationMinutes || 20,
          priority_duration_min: m.priorityDurationMinutes || 8,
          time_saved_min: m.timeSavedMinutes || 12,
          speed_kmh: m.speedKmh || 75,
          current_step_index: m.currentStepIndex || 0,
          coordinates_json: JSON.stringify(m.coordinates || []),
          intersections_json: JSON.stringify(m.intersections || []),
          broadcast_alert_json: JSON.stringify(m.broadcastAlert || {}),
          started_at: m.startedAt || new Date().toISOString(),
          completed_at: m.completedAt || null,
        };

        await this.db.run(
          `
          INSERT INTO emergency_missions (
            id, status, vehicle_type, vehicle_name, badge, color, city, corridor_id,
            corridor_name, origin, destination, distance_km, nominal_duration_min,
            priority_duration_min, time_saved_min, speed_kmh, current_step_index,
            coordinates_json, intersections_json, broadcast_alert_json, started_at, completed_at
          ) VALUES (
            @id, @status, @vehicle_type, @vehicle_name, @badge, @color, @city, @corridor_id,
            @corridor_name, @origin, @destination, @distance_km, @nominal_duration_min,
            @priority_duration_min, @time_saved_min, @speed_kmh, @current_step_index,
            @coordinates_json, @intersections_json, @broadcast_alert_json, @started_at, @completed_at
          )
          ON CONFLICT(id) DO UPDATE SET
            status = excluded.status,
            current_step_index = excluded.current_step_index,
            intersections_json = excluded.intersections_json,
            broadcast_alert_json = excluded.broadcast_alert_json,
            completed_at = excluded.completed_at
        `,
          missionObj
        );
      }
      return true;
    } catch (err) {
      console.error("[DbService saveEmergencyMissions Error]", err.message);
      return false;
    }
  }

  // =========================================================================
  // 4. GESTION DES CODES OTP (OTP CODES)
  // =========================================================================

  async saveOtp(identifier, code, channel, meta = {}) {
    try {
      const now = new Date().toISOString();
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

      await this.db.run(
        `
        INSERT INTO otp_codes (
          identifier, code, channel, name, role, city, vehicle_type, expires_at, verified, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, false, ?)
      `,
        [
          identifier,
          code,
          channel,
          meta.name || null,
          meta.role || "citizen",
          meta.city || "Yaoundé",
          meta.vehicleType || null,
          expiresAt,
          now,
        ]
      );

      return { identifier, code, expiresAt };
    } catch (err) {
      console.error("[DbService saveOtp Error]", err.message);
      return null;
    }
  }

  async verifyOtp(identifier, code) {
    try {
      const now = Date.now();
      const record = await this.db.get(
        `
        SELECT * FROM otp_codes
        WHERE identifier = ? AND code = ? AND expires_at > ? AND (verified = false OR verified = 0)
        ORDER BY id DESC LIMIT 1
      `,
        [identifier, code, now]
      );

      if (record) {
        await this.db.run("UPDATE otp_codes SET verified = true WHERE id = ?", [record.id]);
        return { valid: true, record };
      }
      return { valid: false };
    } catch (err) {
      console.error("[DbService verifyOtp Error]", err.message);
      return { valid: false };
    }
  }
}

export const dbService = new DbService();
export default dbService;
