export const login = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis." });
  }

  res.json({
    success: true,
    user: {
      id: "usr_001",
      name: email.split("@")[0] || "Paule Noumbissi",
      email,
      city: "Yaoundé",
      role: "user",
      token: "jwt_cityflow_demo_token_" + Date.now(),
    },
  });
};

export const register = (req, res) => {
  const { name, email, password, city = "Yaoundé" } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Tous les champs sont requis." });
  }

  res.status(201).json({
    success: true,
    user: {
      id: "usr_" + Math.floor(Math.random() * 1000),
      name,
      email,
      city,
      role: "user",
      token: "jwt_cityflow_demo_token_" + Date.now(),
    },
  });
};
