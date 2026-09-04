// Stockage simulé en mémoire des utilisateurs
const usersDb = new Map([
  [
    "conducteur@cityflow.cm",
    {
      id: "usr_001",
      name: "Paule Noumbissi",
      email: "conducteur@cityflow.cm",
      city: "Yaoundé",
      role: "citizen",
      roleLabel: "Conducteur / Citoyen",
      vehicleType: "Voiture particulière",
      tripsCount: 47,
      timeSavedMin: 184,
      co2SavedKg: 14.2,
      score: 92,
      password: "password123",
    },
  ],
  [
    "samu@cityflow.cm",
    {
      id: "usr_002",
      name: "Dr. Paul Ebanda (SAMU 119)",
      email: "samu@cityflow.cm",
      city: "Yaoundé",
      role: "emergency",
      roleLabel: "Services d'Urgence / SAMU",
      vehicleType: "Ambulance / SAMU",
      tripsCount: 128,
      timeSavedMin: 640,
      co2SavedKg: 48.0,
      score: 99,
      password: "password123",
    },
  ],
  [
    "regulateur@cityflow.cm",
    {
      id: "usr_003",
      name: "Ing. Christian Haman",
      email: "regulateur@cityflow.cm",
      city: "Douala",
      role: "traffic_manager",
      roleLabel: "Régulateur Urbain / Communauté Urbaine",
      vehicleType: "Poste Central de Contrôle",
      tripsCount: 230,
      timeSavedMin: 1240,
      co2SavedKg: 110.5,
      score: 96,
      password: "password123",
    },
  ],
]);

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

export const login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  const existing = usersDb.get(email.toLowerCase().trim());
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

  // Si nouvel utilisateur en mode démo rapide
  const name = email.split("@")[0].replace(".", " ");
  const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
  const newUser = {
    id: "usr_" + Date.now(),
    name: formattedName,
    email: email.toLowerCase().trim(),
    city: "Yaoundé",
    role: "citizen",
    roleLabel: "Conducteur / Citoyen",
    vehicleType: "Voiture particulière",
    tripsCount: 1,
    timeSavedMin: 12,
    co2SavedKg: 0.8,
    score: 85,
  };

  usersDb.set(newUser.email, { ...newUser, password });

  res.json({
    success: true,
    token,
    user: { ...newUser, token },
  });
};

export const register = (req, res) => {
  const { name, email, password, city = "Yaoundé", role = "citizen", vehicleType = "Voiture particulière" } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Tous les champs obligatoires doivent être renseignés." });
  }

  const cleanEmail = email.toLowerCase().trim();
  const token = "jwt_cityflow_" + Date.now() + "_" + Math.random().toString(36).substring(7);

  const newUser = {
    id: "usr_" + Math.floor(Math.random() * 10000),
    name: name.trim(),
    email: cleanEmail,
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
  const { email, name, city, role, vehicleType } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email utilisateur requis." });
  }

  const cleanEmail = email.toLowerCase().trim();
  const existing = usersDb.get(cleanEmail) || {
    id: "usr_" + Date.now(),
    email: cleanEmail,
    tripsCount: 10,
    timeSavedMin: 45,
    co2SavedKg: 3.5,
    score: 90,
  };

  const updatedUser = {
    ...existing,
    name: name || existing.name,
    city: city || existing.city,
    role: role || existing.role,
    roleLabel: getRoleLabel(role || existing.role),
    vehicleType: vehicleType || existing.vehicleType,
  };

  usersDb.set(cleanEmail, updatedUser);

  const userResponse = { ...updatedUser };
  delete userResponse.password;

  res.json({
    success: true,
    user: userResponse,
  });
};
