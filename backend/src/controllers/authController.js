// Stockage simulé en mémoire des utilisateurs
const usersDb = new Map([
  [
    "+237699123456",
    {
      id: "usr_001",
      name: "Paule Noumbissi",
      phone: "+237699123456",
      email: "conducteur@cityflow.cm",
      city: "Yaoundé",
      role: "citizen",
      roleLabel: "Conducteur / Citoyen",
      vehicleType: "Voiture particulière",
      tripsCount: 47,
      timeSavedMin: 184,
      co2SavedKg: 14.2,
      score: 92,
      channel: "whatsapp",
      password: "password123",
    },
  ],
  [
    "+237677889900",
    {
      id: "usr_002",
      name: "Dr. Paul Ebanda (SAMU 119)",
      phone: "+237677889900",
      email: "samu@cityflow.cm",
      city: "Yaoundé",
      role: "emergency",
      roleLabel: "Services d'Urgence / SAMU",
      vehicleType: "Ambulance / SAMU",
      tripsCount: 128,
      timeSavedMin: 640,
      co2SavedKg: 48.0,
      score: 99,
      channel: "sms",
      password: "password123",
    },
  ],
  [
    "+237695001122",
    {
      id: "usr_003",
      name: "Ing. Christian Haman",
      phone: "+237695001122",
      email: "regulateur@cityflow.cm",
      city: "Douala",
      role: "traffic_manager",
      roleLabel: "Régulateur Urbain / Communauté Urbaine",
      vehicleType: "Poste Central de Contrôle",
      tripsCount: 230,
      timeSavedMin: 1240,
      co2SavedKg: 110.5,
      score: 96,
      channel: "whatsapp",
      password: "password123",
    },
  ],
]);

// Magasin en mémoire des codes OTP générés (clé: phone, valeur: { code, expiresAt, channel, ... })
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

/**
 * 1. ENVOI DU CODE OTP PAR WHATSAPP, SMS OU EMAIL
 */
export const sendOtp = (req, res) => {
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

  // L'identifiant peut être un téléphone ou un email
  const rawId = (identifier || phone || email || "").trim();
  if (!rawId || rawId.length < 4) {
    return res.status(400).json({ error: "Numéro de téléphone ou adresse e-mail requis." });
  }

  const isEmail = rawId.includes("@");
  const cleanId = isEmail ? rawId.toLowerCase() : rawId.replace(/\s+/g, "");

  // Déterminer le canal effectif
  let effectiveChannel = channel;
  if (isEmail && channel !== "email") {
    effectiveChannel = "email";
  }

  // Générer un code à 6 chiffres
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore.set(cleanId, {
    code,
    expiresAt,
    channel: effectiveChannel,
    isEmail,
    name: name ? name.trim() : (isEmail ? cleanId.split("@")[0] : `Utilisateur ${cleanId.slice(-4)}`),
    role,
    city,
    vehicleType,
  });

  // Message formaté selon le canal
  let previewMessage = "";
  let channelLabel = "";
  if (effectiveChannel === "whatsapp") {
    channelLabel = "WhatsApp";
    previewMessage = `💬 [WhatsApp CityFlow] 🚦 Votre code de sécurité CityFlow est : ${code}. Valable 5 minutes. Ne le partagez avec personne.`;
  } else if (effectiveChannel === "sms") {
    channelLabel = "SMS";
    previewMessage = `📱 [SMS CityFlow] Votre code de connexion sécurisé est ${code}. Valable 5 minutes.`;
  } else {
    channelLabel = "E-mail";
    previewMessage = `📧 [E-mail CityFlow Sécurité] Bonjour ${name || "Utilisateur"}, votre code de vérification est : ${code}. Valable 5 minutes.`;
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
 * 2. VÉRIFICATION DU CODE OTP & AUTHENTIFICATION
 */
export const verifyOtp = (req, res) => {
  const {
    identifier,
    phone,
    email,
    code,
    channel,
    name,
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

  if (!storedOtp) {
    return res.status(400).json({
      error: "Aucun code en attente pour cet identifiant ou code expiré. Veuillez renvoyer un code.",
    });
  }

  if (Date.now() > storedOtp.expiresAt) {
    otpStore.delete(cleanId);
    return res.status(400).json({ error: "Ce code a expiré. Veuillez demander un nouveau code." });
  }

  if (storedOtp.code !== code.trim()) {
    return res.status(400).json({ error: "Code de vérification incorrect. Veuillez vérifier et réessayer." });
  }

  // Code valide ! Supprimer l'OTP consommé
  otpStore.delete(cleanId);

  // Chercher ou créer l'utilisateur
  let user = usersDb.get(cleanId);
  const token = "jwt_cityflow_otp_" + Date.now() + "_" + Math.random().toString(36).substring(7);
  const finalChannel = channel || storedOtp.channel || (isEmail ? "email" : "whatsapp");

  if (!user) {
    const finalRole = role || storedOtp.role || "citizen";
    const userName = name || storedOtp.name || (isEmail ? cleanId.split("@")[0] : `Utilisateur ${cleanId.slice(-4)}`);

    user = {
      id: "usr_" + Math.floor(Math.random() * 10000),
      name: userName,
      phone: isEmail ? "+237 699 00 11 22" : cleanId,
      email: isEmail ? cleanId : `${userName.toLowerCase().replace(/\s+/g, "")}@cityflow.cm`,
      city: city || storedOtp.city || "Yaoundé",
      role: finalRole,
      roleLabel: getRoleLabel(finalRole),
      vehicleType: vehicleType || storedOtp.vehicleType || "Voiture particulière",
      channel: finalChannel,
      tripsCount: 1,
      timeSavedMin: 12,
      co2SavedKg: 1.0,
      score: 90,
      verifiedVia: finalChannel.toUpperCase(),
    };

    usersDb.set(cleanId, user);
  } else {
    user.verifiedVia = finalChannel.toUpperCase();
    if (name) user.name = name;
    if (role) {
      user.role = role;
      user.roleLabel = getRoleLabel(role);
    }
    if (city) user.city = city;
    if (vehicleType) user.vehicleType = vehicleType;
  }

  const userResponse = { ...user };
  delete userResponse.password;
  userResponse.token = token;

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
 * 4. CONNEXION CLASSIQUE EMAIL / MOT DE PASSE (FALLBACK)
 */
export const login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  const cleanEmail = email.toLowerCase().trim();
  let existing = null;

  for (const u of usersDb.values()) {
    if (u.email && u.email.toLowerCase() === cleanEmail) {
      existing = u;
      break;
    }
  }

  const token = "jwt_cityflow_" + Date.now() + "_" + Math.random().toString(36).substring(7);

  if (existing) {
    const userResponse = { ...existing };
    delete userResponse.password;
    userResponse.token = token;

    return res.json({
      success: true,
      token,
      user: userResponse,
    });
  }

  // Création automatique en mode démo si non trouvé
  const name = email.split("@")[0].replace(".", " ");
  const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
  const newUser = {
    id: "usr_" + Date.now(),
    name: formattedName,
    email: cleanEmail,
    phone: "+237699000000",
    city: "Yaoundé",
    role: "citizen",
    roleLabel: "Conducteur / Citoyen",
    vehicleType: "Voiture particulière",
    tripsCount: 1,
    timeSavedMin: 12,
    co2SavedKg: 0.8,
    score: 85,
  };

  usersDb.set(cleanEmail, { ...newUser, password });

  res.json({
    success: true,
    token,
    user: { ...newUser, token },
  });
};

export const register = (req, res) => {
  const { name, email, password, phone = "+237699000000", city = "Yaoundé", role = "citizen", vehicleType = "Voiture particulière" } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Tous les champs obligatoires doivent être renseignés." });
  }

  const cleanEmail = email.toLowerCase().trim();
  const token = "jwt_cityflow_" + Date.now() + "_" + Math.random().toString(36).substring(7);

  const newUser = {
    id: "usr_" + Math.floor(Math.random() * 10000),
    name: name.trim(),
    email: cleanEmail,
    phone,
    city,
    role,
    roleLabel: getRoleLabel(role),
    vehicleType,
    tripsCount: 1,
    timeSavedMin: 15,
    co2SavedKg: 1.2,
    score: 88,
  };

  usersDb.set(cleanEmail, { ...newUser, password });

  res.status(201).json({
    success: true,
    token,
    user: { ...newUser, token },
  });
};

export const updateProfile = (req, res) => {
  const { email, phone, name, city, role, vehicleType } = req.body;

  let key = phone || email;
  let existing = usersDb.get(key);

  if (!existing && email) {
    for (const u of usersDb.values()) {
      if (u.email === email) {
        existing = u;
        key = u.phone || email;
        break;
      }
    }
  }

  if (!existing) {
    existing = {
      id: "usr_" + Date.now(),
      email: email || "conducteur@cityflow.cm",
      phone: phone || "+237699123456",
      tripsCount: 10,
      timeSavedMin: 45,
      co2SavedKg: 3.5,
      score: 90,
    };
  }

  const updatedUser = {
    ...existing,
    name: name || existing.name,
    city: city || existing.city,
    role: role || existing.role,
    roleLabel: getRoleLabel(role || existing.role),
    vehicleType: vehicleType || existing.vehicleType,
  };

  usersDb.set(key, updatedUser);

  const userResponse = { ...updatedUser };
  delete userResponse.password;

  res.json({
    success: true,
    user: userResponse,
  });
};
