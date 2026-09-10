import { sendRealEmail, sendRealWhatsApp, sendRealSms } from "../services/notificationService.js";
import db from "../services/database.js";
import dbService from "../services/dbService.js";

// Magasin en mémoire temporaire des codes OTP générés pour validation ultra-rapide
const otpStore = new Map();

const getRoleLabel = (role) => {
  switch (role) {
    case "emergency":
      return "Services d'Urgence / SAMU";
    case "traffic_manager":
      return "Régulateur Urbain / Communauté Urbaine";
    default:
      return "Conducteur / Citoyen";
  }
};

// Helper : Trouver un utilisateur dans la base de données (PostgreSQL ou SQLite)
async function findUserInDb(cleanId) {
  const isEmail = cleanId.includes("@");
  if (isEmail) {
    return await db.get("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [cleanId]);
  }
  return await db.get("SELECT * FROM users WHERE phone = ? OR id = ?", [cleanId, cleanId]);
}

/**
 * 1. ENVOI DU CODE OTP PAR WHATSAPP, SMS OU EMAIL (POUR INSCRIPTION OU RÉCUPÉRATION)
 */
export const sendOtp = async (req, res) => {
  const {
    identifier,
    phone,
    email,
    channel = "whatsapp",
    name,
    role = "citizen",
    city = "Yaoundé",
    vehicleType = "Voiture particulière",
  } = req.body;

  const rawId = (identifier || phone || email || "").trim();
  if (!rawId || rawId.length < 4) {
    return res.status(400).json({ error: "Numéro de téléphone ou adresse e-mail requis." });
  }

  const isEmail = rawId.includes("@");
  const cleanId = isEmail ? rawId.toLowerCase() : rawId.replace(/\s+/g, "");

  let effectiveChannel = channel;
  if (isEmail && channel !== "email") {
    effectiveChannel = "email";
  }

  // Générer un code à 6 chiffres
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  const existing = await findUserInDb(cleanId);
  const userName = name ? name.trim() : existing ? existing.name : (isEmail ? cleanId.split("@")[0] : `Utilisateur ${cleanId.slice(-4)}`);

  otpStore.set(cleanId, {
    code,
    expiresAt,
    channel: effectiveChannel,
    isEmail,
    name: userName,
    role: role || (existing ? existing.role : "citizen"),
    city: city || (existing ? existing.city : "Yaoundé"),
    vehicleType: vehicleType || (existing ? existing.vehicle_type : "Voiture particulière"),
  });

  // Sauvegarder dans la base table otp_codes
  dbService.saveOtp(cleanId, code, effectiveChannel, {
    name: userName,
    role: role || (existing ? existing.role : "citizen"),
    city: city || (existing ? existing.city : "Yaoundé"),
    vehicleType,
  }).catch((e) => console.warn("[DB OTP Save Warning]", e.message));

  // Message formaté selon le canal
  let previewMessage = "";
  let channelLabel = "";
  if (effectiveChannel === "whatsapp") {
    channelLabel = "WhatsApp";
    previewMessage = `💬 [WhatsApp CityFlow] 🚦 Votre code de sécurité CityFlow est : ${code}. Valable 5 minutes. Ne le partagez avec personne.`;
    sendRealWhatsApp({ toPhone: cleanId, name: userName, code }).catch((err) =>
      console.warn("Erreur envoi WhatsApp :", err.message)
    );
  } else if (effectiveChannel === "sms") {
    channelLabel = "SMS";
    previewMessage = `📱 [SMS CityFlow] Votre code de connexion sécurisé est ${code}. Valable 5 minutes.`;
    sendRealSms({ toPhone: cleanId, name: userName, code }).catch((err) =>
      console.warn("Erreur envoi SMS :", err.message)
    );
  } else {
    channelLabel = "E-mail";
    previewMessage = `📧 [E-mail CityFlow Sécurité] Bonjour ${userName}, votre code de vérification est : ${code}. Valable 5 minutes.`;
    sendRealEmail({ to: cleanId, name: userName, code }).catch((err) =>
      console.warn("Erreur envoi E-mail :", err.message)
    );
  }

  console.log(`\n======================================================`);
  console.log(`📤 DISPATCH OTP [${effectiveChannel.toUpperCase()}] vers ${cleanId}`);
  console.log(`🔑 CODE : ${code}`);
  console.log(`📩 MESSAGE : ${previewMessage}`);
  console.log(`======================================================\n`);

  res.json({
    success: true,
    message: `Code de vérification envoyé avec succès par ${channelLabel} à ${cleanId}`,
    identifier: cleanId,
    phone: isEmail ? undefined : cleanId,
    email: isEmail ? cleanId : undefined,
    channel: effectiveChannel,
    previewCode: code,
    previewMessage,
    expiresInSeconds: 300,
  });
};

/**
 * 2. VÉRIFICATION DU CODE OTP & FINALISATION INSCRIPTION / CONNEXION
 */
export const verifyOtp = async (req, res) => {
  const {
    identifier,
    phone,
    email,
    code,
    channel,
    name,
    password,
    role,
    city,
    vehicleType,
  } = req.body;

  const rawId = (identifier || phone || email || "").trim();
  if (!rawId || !code) {
    return res.status(400).json({ error: "Identifiant et code OTP requis." });
  }

  const isEmail = rawId.includes("@");
  const cleanId = isEmail ? rawId.toLowerCase() : rawId.replace(/\s+/g, "");
  const storedOtp = otpStore.get(cleanId);

  // Vérifier dans le store mémoire ou dans la base de données
  let isValid = false;
  if (storedOtp && Date.now() <= storedOtp.expiresAt && storedOtp.code === code.trim()) {
    isValid = true;
    otpStore.delete(cleanId);
  } else {
    const dbOtp = await dbService.verifyOtp(cleanId, code.trim());
    if (dbOtp?.valid) isValid = true;
  }

  if (!isValid) {
    return res.status(400).json({
      error: "Code de vérification incorrect ou expiré. Veuillez vérifier et réessayer.",
    });
  }

  // Chercher ou créer l'utilisateur en base
  let user = await findUserInDb(cleanId);
  const now = new Date().toISOString();
  const token = "jwt_cityflow_otp_" + Date.now() + "_" + Math.random().toString(36).substring(7);
  const finalChannel = channel || (storedOtp ? storedOtp.channel : isEmail ? "email" : "whatsapp");

  if (!user) {
    const finalRole = role || (storedOtp ? storedOtp.role : "citizen");
    const userName = name || (storedOtp ? storedOtp.name : isEmail ? cleanId.split("@")[0] : `Utilisateur ${cleanId.slice(-4)}`);
    const newId = "usr_" + Date.now();

    const newUserObj = {
      id: newId,
      name: userName,
      username: (userName.toLowerCase().replace(/[^a-z0-9]/g, "_") || "user") + "_" + Math.floor(Math.random() * 1000),
      phone: isEmail ? "+237 699 00 11 22" : cleanId,
      email: isEmail ? cleanId : `${userName.toLowerCase().replace(/\s+/g, "")}@cityflow.cm`,
      password: password || "password123",
      bio: "Conducteur engagé pour une mobilité fluide.",
      avatar: null,
      city: city || (storedOtp ? storedOtp.city : "Yaoundé"),
      role: finalRole,
      role_label: getRoleLabel(finalRole),
      vehicle_type: vehicleType || (storedOtp ? storedOtp.vehicleType : "Voiture particulière"),
      points: 380,
      trust_score: 85,
      trips_count: 1,
      time_saved_min: 12,
      co2_saved_kg: 1.0,
      channel: finalChannel,
      created_at: now,
      updated_at: now,
    };

    try {
      await db.run(
        `
        INSERT INTO users (
          id, name, username, phone, email, password, bio, avatar, city, role, role_label, vehicle_type,
          points, trust_score, trips_count, time_saved_min, co2_saved_kg, channel, created_at, updated_at
        ) VALUES (
          @id, @name, @username, @phone, @email, @password, @bio, @avatar, @city, @role, @role_label, @vehicle_type,
          @points, @trust_score, @trips_count, @time_saved_min, @co2_saved_kg, @channel, @created_at, @updated_at
        )
      `,
        newUserObj
      );
      user = newUserObj;
    } catch (e) {
      console.warn("[DB Insert User Warning]", e.message);
      user = newUserObj;
    }
  } else {
    // Mettre à jour l'utilisateur existant
    await db.run(
      `
      UPDATE users SET
        name = COALESCE(?, name),
        role = COALESCE(?, role),
        role_label = COALESCE(?, role_label),
        city = COALESCE(?, city),
        vehicle_type = COALESCE(?, vehicle_type),
        password = COALESCE(?, password),
        updated_at = ?
      WHERE id = ?
    `,
      [
        name || user.name,
        role || user.role,
        getRoleLabel(role || user.role),
        city || user.city,
        vehicleType || user.vehicle_type,
        password || user.password,
        now,
        user.id,
      ]
    );
    user = await findUserInDb(cleanId);
  }

  const userResponse = {
    id: user.id,
    name: user.name,
    username: user.username || (user.name ? user.name.toLowerCase().replace(/\s+/g, "_") : "user"),
    phone: user.phone,
    email: user.email,
    bio: user.bio || "",
    avatar: user.avatar || null,
    city: user.city,
    role: user.role,
    roleLabel: user.role_label || getRoleLabel(user.role),
    vehicleType: user.vehicle_type,
    points: user.points,
    trustScore: user.trust_score,
    tripsCount: user.trips_count,
    timeSavedMin: user.time_saved_min,
    co2SavedKg: parseFloat(user.co2_saved_kg) || 0.0,
    verifiedVia: finalChannel.toUpperCase(),
    token,
  };

  res.json({
    success: true,
    token,
    user: userResponse,
  });
};

/**
 * 3. RENVOI D'UN NOUVEAU CODE OTP
 */
export const resendOtp = (req, res) => {
  return sendOtp(req, res);
};

/**
 * 4. RÉINITIALISATION DU MOT DE PASSE APRÈS CODE OTP
 */
export const resetPassword = async (req, res) => {
  const { identifier, phone, email, newPassword } = req.body;
  const rawId = (identifier || phone || email || "").trim();

  if (!rawId || !newPassword) {
    return res.status(400).json({ error: "Identifiant et nouveau mot de passe requis." });
  }

  const isEmail = rawId.includes("@");
  const cleanId = isEmail ? rawId.toLowerCase() : rawId.replace(/\s+/g, "");

  let user = await findUserInDb(cleanId);
  const now = new Date().toISOString();

  if (user) {
    await db.run("UPDATE users SET password = ?, updated_at = ? WHERE id = ?", [newPassword, now, user.id]);
    user = await findUserInDb(cleanId);
  } else {
    return res.status(404).json({ error: "Aucun compte trouvé avec cet identifiant. Veuillez vous inscrire." });
  }

  const token = "jwt_cityflow_reset_" + Date.now() + "_" + Math.random().toString(36).substring(7);
  const userResponse = {
    id: user.id,
    name: user.name,
    username: user.username,
    phone: user.phone,
    email: user.email,
    bio: user.bio,
    avatar: user.avatar,
    city: user.city,
    role: user.role,
    roleLabel: user.role_label || getRoleLabel(user.role),
    vehicleType: user.vehicle_type,
    points: user.points,
    trustScore: user.trust_score,
    token,
  };

  res.json({
    success: true,
    message: "Mot de passe modifié avec succès en base de données.",
    token,
    user: userResponse,
  });
};

/**
 * 5. CONNEXION CLASSIQUE EMAIL / MOT DE PASSE
 */
export const login = async (req, res) => {
  const { email, identifier, password } = req.body;
  const targetId = (email || identifier || "").trim();

  if (!targetId || !password) {
    return res.status(400).json({ error: "Veuillez renseigner votre e-mail et votre mot de passe." });
  }

  const cleanEmail = targetId.toLowerCase();
  let existing = await findUserInDb(cleanEmail);

  // SI LE COMPTE N'EXISTE PAS : ON NE CRÉE PAS UN COMPTE FANTÔME, ON DEMANDE L'INSCRIPTION !
  if (!existing) {
    return res.status(404).json({
      error: "Ce compte n'existe pas. Veuillez vous inscrire avant de vous connecter pour la première fois.",
      needRegister: true,
    });
  }

  // VÉRIFICATION DU MOT DE PASSE
  if (existing.password && existing.password !== password) {
    return res.status(401).json({
      error: "Mot de passe incorrect. Veuillez vérifier votre saisie ou cliquer sur Mot de passe oublié.",
    });
  }

  const token = "jwt_cityflow_" + Date.now() + "_" + Math.random().toString(36).substring(7);

  const userResponse = {
    id: existing.id,
    name: existing.name,
    username: existing.username || (existing.name ? existing.name.toLowerCase().replace(/\s+/g, "_") : "user"),
    phone: existing.phone,
    email: existing.email,
    bio: existing.bio || "Conducteur quotidien engagé pour une mobilité fluide à Yaoundé et Douala.",
    avatar: existing.avatar || null,
    city: existing.city,
    role: existing.role,
    roleLabel: existing.role_label || getRoleLabel(existing.role),
    vehicleType: existing.vehicle_type,
    points: existing.points,
    trustScore: existing.trust_score,
    tripsCount: existing.trips_count,
    timeSavedMin: existing.time_saved_min,
    co2SavedKg: parseFloat(existing.co2_saved_kg) || 0.0,
    token,
  };

  return res.json({
    success: true,
    token,
    user: userResponse,
  });
};

/**
 * 6. INSCRIPTION OBLIGATOIRE DE NOUVEL UTILISATEUR (EMAIL + MOT DE PASSE + INFOS)
 */
export const register = async (req, res) => {
  const {
    name,
    email,
    password,
    phone = "+237699000000",
    city = "Yaoundé",
    role = "citizen",
    vehicleType = "Voiture particulière",
    bio = "",
    avatar = null,
  } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Le nom, l'adresse e-mail et le mot de passe sont obligatoires." });
  }

  const cleanEmail = email.toLowerCase().trim();

  // VÉRIFIER SI L'EMAIL EXISTE DÉJÀ
  const existing = await db.get("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [cleanEmail]);
  if (existing) {
    return res.status(409).json({
      error: "Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.",
    });
  }

  const token = "jwt_cityflow_" + Date.now() + "_" + Math.random().toString(36).substring(7);
  const now = new Date().toISOString();
  const newId = "usr_" + Date.now();
  const rawName = name.trim();
  const generatedUsername = rawName.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Math.floor(Math.random() * 1000);

  const newUser = {
    id: newId,
    name: rawName,
    username: generatedUsername,
    email: cleanEmail,
    phone,
    password, // Mot de passe enregistré en base de données
    bio: bio || "Conducteur quotidien engagé pour une mobilité fluide à Yaoundé et Douala.",
    avatar: avatar || null,
    city,
    role,
    role_label: getRoleLabel(role),
    vehicle_type: vehicleType,
    points: 380,
    trust_score: 85,
    trips_count: 1,
    time_saved_min: 15,
    co2_saved_kg: 1.2,
    channel: "email",
    created_at: now,
    updated_at: now,
  };

  try {
    await db.run(
      `
      INSERT INTO users (
        id, name, username, phone, email, password, bio, avatar, city, role, role_label, vehicle_type,
        points, trust_score, trips_count, time_saved_min, co2_saved_kg, channel, created_at, updated_at
      ) VALUES (
        @id, @name, @username, @phone, @email, @password, @bio, @avatar, @city, @role, @role_label, @vehicle_type,
        @points, @trust_score, @trips_count, @time_saved_min, @co2_saved_kg, @channel, @created_at, @updated_at
      )
    `,
      newUser
    );
  } catch (e) {
    console.error("[DB Register User Error]", e.message);
    return res.status(500).json({ error: "Erreur lors de l'enregistrement en base de données." });
  }

  res.status(201).json({
    success: true,
    token,
    user: {
      ...newUser,
      roleLabel: newUser.role_label,
      trustScore: newUser.trust_score,
      token,
    },
  });
};

/**
 * 7. MISE À JOUR PERMANENTE DU PROFIL EN BASE DE DONNÉES
 */
export const updateProfile = async (req, res) => {
  const { id, originalEmail, email, phone, name, username, bio, avatar, city, role, vehicleType, password } = req.body;
  const now = new Date().toISOString();

  let user = null;
  if (id) user = await db.get("SELECT * FROM users WHERE id = ?", [id]);
  if (!user && originalEmail) user = await db.get("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [originalEmail.toLowerCase().trim()]);
  if (!user && email) user = await db.get("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email.toLowerCase().trim()]);
  if (!user && phone) user = await db.get("SELECT * FROM users WHERE phone = ?", [phone]);
  if (!user) user = await db.get("SELECT * FROM users LIMIT 1");

  if (user) {
    const targetEmail = email ? email.toLowerCase().trim() : user.email;
    const targetPassword = (password && password.trim().length >= 4) ? password.trim() : user.password;

    await db.run(
      `
      UPDATE users SET
        name = COALESCE(?, name),
        username = COALESCE(?, username),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        city = COALESCE(?, city),
        role = COALESCE(?, role),
        role_label = COALESCE(?, role_label),
        vehicle_type = COALESCE(?, vehicle_type),
        bio = COALESCE(?, bio),
        avatar = COALESCE(?, avatar),
        password = COALESCE(?, password),
        updated_at = ?
      WHERE id = ?
    `,
      [
        name !== undefined && name !== "" ? name : user.name,
        username !== undefined && username !== "" ? username : user.username,
        targetEmail,
        phone !== undefined && phone !== "" ? phone : user.phone,
        city || user.city,
        role || user.role,
        getRoleLabel(role || user.role),
        vehicleType || user.vehicle_type,
        bio !== undefined ? bio : user.bio,
        avatar !== undefined ? avatar : user.avatar,
        targetPassword,
        now,
        user.id,
      ]
    );

    user = await db.get("SELECT * FROM users WHERE id = ?", [user.id]);
  }

  res.json({
    success: true,
    message: "Profil mis à jour avec succès en base de données.",
    user: {
      id: user ? user.id : (id || "usr_current"),
      name: user ? user.name : name,
      username: user ? user.username : username,
      email: user ? user.email : email,
      phone: user ? user.phone : phone,
      bio: user ? user.bio : bio,
      avatar: user ? user.avatar : avatar,
      city: user ? user.city : city,
      role: user ? user.role : role,
      roleLabel: user ? user.role_label : getRoleLabel(role || "citizen"),
      vehicleType: user ? user.vehicle_type : vehicleType,
      points: user ? user.points : 380,
      trustScore: user ? user.trust_score : 85,
      tripsCount: user ? user.trips_count : 0,
      timeSavedMin: user ? user.time_saved_min : 0,
      co2SavedKg: user ? parseFloat(user.co2_saved_kg) || 0.0 : 0.0,
    },
  });
};

/**
 * 8. SUPPRESSION DÉFINITIVE D'UN COMPTE UTILISATEUR DE LA BASE DE DONNÉES
 */
export const deleteAccount = async (req, res) => {
  const { id, email, phone } = req.body;

  let user = null;
  if (id) user = await db.get("SELECT * FROM users WHERE id = ?", [id]);
  if (!user && email) user = await db.get("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email.toLowerCase().trim()]);
  if (!user && phone) user = await db.get("SELECT * FROM users WHERE phone = ?", [phone]);

  if (!user) {
    return res.status(404).json({ error: "Utilisateur non trouvé ou déjà supprimé." });
  }

  try {
    await db.run("DELETE FROM users WHERE id = ?", [user.id]);
    res.json({
      success: true,
      message: `Le compte ${user.email || user.phone || user.name} a été supprimé définitivement de la base de données.`,
    });
  } catch (err) {
    console.error("[Delete Account Error]", err.message);
    res.status(500).json({ error: "Erreur lors de la suppression du compte." });
  }
};

/**
 * 9. MISE À JOUR DU TOKEN FCM POUR LES NOTIFICATIONS PUSH
 */
export const updateFcmToken = async (req, res) => {
  const { id, email, phone, fcmToken } = req.body;

  if (!fcmToken) {
    return res.status(400).json({ error: "Le token FCM est requis." });
  }

  let user = null;
  if (id) user = await db.get("SELECT * FROM users WHERE id = ?", [id]);
  if (!user && email) user = await db.get("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", [email.toLowerCase().trim()]);
  if (!user && phone) user = await db.get("SELECT * FROM users WHERE phone = ?", [phone]);

  if (!user) {
    return res.status(404).json({ error: "Utilisateur non trouvé." });
  }

  try {
    const now = new Date().toISOString();
    await db.run("UPDATE users SET fcm_token = ?, updated_at = ? WHERE id = ?", [fcmToken, now, user.id]);
    
    console.log(`[FCM] 📲 Token Push mis à jour pour ${user.name || user.email}`);
    
    res.json({
      success: true,
      message: "Token FCM enregistré avec succès.",
    });
  } catch (err) {
    console.error("[Update FCM Token Error]", err.message);
    res.status(500).json({ error: "Erreur lors de l'enregistrement du token FCM." });
  }
};

